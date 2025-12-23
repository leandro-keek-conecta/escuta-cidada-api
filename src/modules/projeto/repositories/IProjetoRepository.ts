import { Projeto, Prisma } from "@prisma/client";

export type ProjetoWithUser = Prisma.ProjetoGetPayload<{
  include: { users: { include: { user: true } } };
}>;
export interface IProjetoRepository {
  create(data: Prisma.ProjetoCreateInput): Promise<ProjetoWithUser>;
  updateProjeto(id: number,data: Prisma.ProjetoUpdateInput): Promise<ProjetoWithUser>;
  findById(id: number): Promise<Projeto | null>;
  getProjetos(): Promise<ProjetoWithUser[]>;
  delete(id: number): Promise<void>;
}
