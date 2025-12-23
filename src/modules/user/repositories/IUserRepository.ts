import { Prisma, ProjetoAccessLevel } from "@prisma/client";
import { UserWithProjetos } from "./UserRepository";

export type UserWithProjeto = Prisma.UserGetPayload<{
  include: {
    projetos: { include: { projeto: true } };
    hiddenScreens: true;
  }
}>;
export interface IUserRepository {
  create(data: Prisma.UserCreateInput): Promise<UserWithProjetos>;
  updateUser(
    id: number,
    data: Prisma.UserUncheckedUpdateInput
  ): Promise<UserWithProjetos | null>;
  findById(id: number): Promise<UserWithProjetos | null>;
  findByEmail(email: string): Promise<UserWithProjetos | null>;
  getUsers(): Promise<UserWithProjetos[]>;
  delete(id: number): Promise<void>;
  findProjectAccess(userId: number, projetoId: number): Promise<ProjetoAccessLevel | null>;
  replaceHiddenScreens(userId: number, projetoId: number, hiddenTabs: string[]): Promise<void>;
}
