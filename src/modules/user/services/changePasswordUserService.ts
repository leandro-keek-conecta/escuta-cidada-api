import { inject, injectable } from "inversify";
import argon2 from "argon2";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import Types from "@/common/container/types";
import { IUserRepository } from "@/modules/user/repositories/IUserRepository";
import { IPasswordResetTokenRepository } from "@/modules/passwordResetToken/repository/IPasswordResetTokenRepository";

interface IRequest {
  uid: number;
  token: string;
  password: string;
}

@injectable()
export class ResetPasswordService {
  @inject(Types.UserRepository) private userRepository!: IUserRepository;
  @inject(Types.PasswordResetTokenRepository) private tokenRepository!: IPasswordResetTokenRepository;

  public async validate({ uid, token }: { uid: number; token: string }) {
    const user = await this.userRepository.findById(uid);
    if (!user) throw new AppError("Usuário não encontrado", 404);

    const storedToken = await this.tokenRepository.findValid(uid);
    if (!storedToken) throw new AppError("Token expirado ou inválido", 400);

    const isTokenValid = await argon2.verify(storedToken.tokenHash, token);
    if (!isTokenValid) throw new AppError("Token inválido", 400);
  }
  

  public async execute({ uid, token, password }: IRequest): Promise<void> {
    // Verifica se o usuário existe
    const user = await this.userRepository.findById(uid);
    if (!user) {
      throw new AppError("Usuário não encontrado", StatusCodes.NOT_FOUND);
    }

    // Busca o token mais recente e válido
    const storedToken = await this.tokenRepository.findValid(uid);
    if (!storedToken) {
      throw new AppError("Token inválido ou expirado", StatusCodes.BAD_REQUEST);
    }

    //Verifica o hash do token
    const isTokenValid = await argon2.verify(storedToken.tokenHash, token);
    if (!isTokenValid) {
      throw new AppError("Token inválido", StatusCodes.BAD_REQUEST);
    }

    //Atualiza a senha
    const newPasswordHash = await argon2.hash(password);
    await this.userRepository.updateUser(uid, { password: newPasswordHash });

    //Marca o token como usado
    await this.tokenRepository.markAsUsed(storedToken.id);
  }
}
