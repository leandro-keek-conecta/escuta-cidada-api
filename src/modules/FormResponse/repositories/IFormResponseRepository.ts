import { FormResponse, Prisma } from "@prisma/client";

export interface IFormResponseRepository {
  create(data: Prisma.FormResponseUncheckedCreateInput): Promise<FormResponse>;
  findById(id: number): Promise<FormResponse | null>;
  listByForm(formId: number): Promise<FormResponse[]>;
  delete(id: number): Promise<void>;
}
