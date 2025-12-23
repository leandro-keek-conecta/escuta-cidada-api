import { PasswordResetToken } from "@prisma/client";

export interface IPasswordResetTokenRepository {
  create(data: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken>;

  invalidate(userId: number): Promise<void>;

  findValid(userId: number): Promise<PasswordResetToken | null>;

  markAsUsed(id: string): Promise<void>;
}
