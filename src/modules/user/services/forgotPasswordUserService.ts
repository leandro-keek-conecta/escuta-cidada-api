import { inject, injectable } from "inversify";
import crypto from "crypto";
import argon2 from "argon2";
import axios from "axios";
import "dotenv/config";
import AppError from "@/common/errors/AppError";
import Types from "@/common/container/types";
import { IUserRepository } from "../repositories/IUserRepository";
import { StatusCodes } from "http-status-codes";
import { IPasswordResetTokenRepository } from "@/modules/passwordResetToken/repository/IPasswordResetTokenRepository";

interface IRequest {
  email: string;
}

@injectable()
export class RestartPasswordService {
  @inject(Types.UserRepository) private userRepository!: IUserRepository;
  @inject(Types.PasswordResetTokenRepository)
  private tokenRepository!: IPasswordResetTokenRepository;

  public async execute({ email }: IRequest): Promise<void> {
    if (!email)
      throw new AppError("Email é obrigatório", StatusCodes.BAD_REQUEST);

    try {
      // 1️⃣ Verifica se o usuário existe
      const existUser = await this.userRepository.findByEmail(email);
      if (!existUser) {
        throw new AppError("Usuário não encontrado", StatusCodes.NOT_FOUND);
      }

      // Remove tokens antigos (caso existam)
      await this.tokenRepository.invalidate(existUser.id);

      // Gera token aleatório e hasheia
      const plainToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = await argon2.hash(plainToken);

      // Define expiração (15 min)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Salva o token no banco
      await this.tokenRepository.create({
        userId: existUser.id,
        tokenHash,
        expiresAt,
      });

      // Monta URL de redefinição
      const resetUrl = `${
        process.env.API_FRONT
      }/change-password?token=${encodeURIComponent(plainToken)}&uid=${
        existUser.id
      }`;

      //Envia o e-mail via n8n
      const webhookUrl = process.env.N8N_RESET_PASSWORD_WEBHOOK!;
      const payload = {
        email,
        name: existUser.name,
        resetUrl,
        appName: "Escuta Cidadã",
        supportEmail: "suporte@keekconecta.com.br",
      };

      const response = await axios.post(webhookUrl, payload);
      if (response.status !== 200 && response.status !== 204) {
        throw new AppError(
          "Falha ao comunicar com o n8n",
          StatusCodes.BAD_GATEWAY
        );
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Falha de integração com n8n: ${error.message}`,
          StatusCodes.BAD_GATEWAY
        );
      }
      throw new AppError(
        "Erro ao processar envio de e-mail de redefinição",
        StatusCodes.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }
}
