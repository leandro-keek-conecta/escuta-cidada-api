import { FormVersion, Prisma } from "@prisma/client";

export type FormVersionWithForm = Prisma.FormVersionGetPayload<{
  include: {
    form: {
      select: {
        id: true;
        projetoId: true;
      };
    };
  };
}>;

export interface IFormVersionRepository {
  create(data: Prisma.FormVersionCreateInput): Promise<FormVersion>;
  updateFormVersion(
    id: number,
    data: Prisma.FormVersionUpdateInput
  ): Promise<FormVersion>;
  findById(id: number): Promise<FormVersion | null>;
  findByIdWithForm(id: number): Promise<FormVersionWithForm | null>;
  getFormVersions(filter?: { formId?: number }): Promise<FormVersion[]>;
  delete(id: number): Promise<void>;
}
