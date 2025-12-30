import { FormVersion, Prisma } from "@prisma/client";

export interface IFormVersionRepository {
  create(data: Prisma.FormVersionCreateInput): Promise<FormVersion>;
  updateFormVersion(
    id: number,
    data: Prisma.FormVersionUpdateInput
  ): Promise<void>;
  findById(id: number): Promise<FormVersion | null>;
  getFormVersions(filter?: { formId?: number }): Promise<FormVersion[]>;
  delete(id: number): Promise<void>;
}
