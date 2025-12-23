import { Prisma } from "@prisma/client";

export type ProjetoWithRelations = Prisma.ProjetoGetPayload<{
  include: {
    users: { include: { user: true } };
    chats: true;
    forms: true;
    responses: true;
    hiddenScreens: true;
  };
}>;

export interface IProjetoRepository {
  create(data: Prisma.ProjetoCreateInput): Promise<ProjetoWithRelations>;
  updateProjeto(
    id: number,
    data: Prisma.ProjetoUpdateInput
  ): Promise<ProjetoWithRelations>;
  findById(id: number): Promise<ProjetoWithRelations | null>;
  getProjetos(): Promise<ProjetoWithRelations[]>;
  delete(id: number): Promise<void>;
}
