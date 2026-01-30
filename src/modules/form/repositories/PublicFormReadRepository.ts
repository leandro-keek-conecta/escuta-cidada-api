import { prisma } from "@/lib/prisma";
import { injectable } from "inversify";
import {
  IPublicFormReadRepository,
  PublicFormWithActiveVersion,
} from "./IPublicFormReadRepository";

const activeVersionInclude = {
  versions: {
    where: { isActive: true },
    orderBy: { version: "desc" as const },
    take: 1,
    include: {
      fields: true,
    },
  },
} as const;

@injectable()
export class PublicFormReadRepository implements IPublicFormReadRepository {
  async getProjetoBySlug(slug: string) {
    return await prisma.projeto.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        corHex: true,
        ativo: true,
      },
    });
  }

  async getActiveFormsByProjetoId(
    projetoId: number
  ): Promise<PublicFormWithActiveVersion[]> {
    return await prisma.form.findMany({
      where: { projetoId },
      orderBy: { id: "asc" },
      include: activeVersionInclude,
    });
  }

  async getActiveFormByProjetoAndId({
    projetoId,
    formId,
  }: {
    projetoId: number;
    formId: number;
  }): Promise<PublicFormWithActiveVersion | null> {
    return await prisma.form.findFirst({
      where: { id: formId, projetoId },
      include: activeVersionInclude,
    });
  }
}
