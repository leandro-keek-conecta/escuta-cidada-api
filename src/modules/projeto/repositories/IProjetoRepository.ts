import { Prisma } from "@prisma/client";

export type ProjetoWithRelations = Prisma.ProjetoGetPayload<{
  include: {
    users: { include: { user: { select: { id: true; email: true; name: true; profession: true; role: true; createdAt: true; updatedAt: true; } } } };
    chats: true;
    forms: {
      include: {
        versions: {
          include: {
            fields: true;
            responses: { include: { fields: true; user: { select: { id: true; email: true; name: true; profession: true; role: true; createdAt: true; updatedAt: true; }; }; }; };
          };
        };
      };
    };
    responses: { include: { fields: true; user: { select: { id: true; email: true; name: true; profession: true; role: true; createdAt: true; updatedAt: true; }; }; }; };
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
