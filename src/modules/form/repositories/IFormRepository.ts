import { Prisma } from "@prisma/client";

type UserSafeSelect = {
  id: true;
  email: true;
  name: true;
  profession: true;
  role: true;
  createdAt: true;
  updatedAt: true;
};

export type FormWithRelations = Prisma.FormGetPayload<{
  include: {
    versions: {
      include: {
        fields: true;
        responses: {
          include: {
            fields: true;
            user: { select: UserSafeSelect };
          };
        };
      };
    };
  };
}>;

export interface IFormsRepository {
  create(data: Prisma.FormCreateInput): Promise<FormWithRelations>;
  updateForm(
    id: number,
    data: Prisma.FormUpdateInput
  ): Promise<FormWithRelations>;
  findById(id: number): Promise<FormWithRelations | null>;
  getForms(filter?: { projetoId?: number }): Promise<FormWithRelations[]>;
  delete(id: number): Promise<void>;
}
