import { Prisma } from "@prisma/client";

export type FormWithRelations = Prisma.FormGetPayload<{
  include: {
    versions: {
      include: {
        fields: true;
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
