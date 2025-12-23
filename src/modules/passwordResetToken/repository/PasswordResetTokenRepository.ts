import { Prisma, PasswordResetToken } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { injectable } from "inversify";
import { IPasswordResetTokenRepository } from "./IPasswordResetTokenRepository";

@injectable()
export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
  /**
   * Cria um novo token de redefinição de senha
   */
  async create(data: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return await prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Invalida (marca como usado) todos os tokens ativos de um usuário
   */
  async invalidate(userId: number): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });
  }

  /**
   * Busca um token válido (não expirado e não usado)
   */
  async findValid(userId: number): Promise<PasswordResetToken | null> {
    return await prisma.passwordResetToken.findFirst({
      where: {
        userId,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Marca um token específico como usado (após redefinir senha)
   */
  async markAsUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }
}
