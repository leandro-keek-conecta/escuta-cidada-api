import { Prisma } from "@prisma/client";

type ActiveVersionInclude = {
  versions: {
    where: { isActive: true };
    orderBy: { version: "desc" };
    take: 1;
    include: {
      fields: true;
    };
  };
};

export type PublicFormWithActiveVersion = Prisma.FormGetPayload<{
  include: ActiveVersionInclude;
}>;

export interface IPublicFormReadRepository {
  getProjetoBySlug(slug: string): Promise<
    | {
        id: number;
        slug: string;
        name: string;
        corHex: string | null;
        ativo: boolean;
      }
    | null
  >;
  getActiveFormsByProjetoId(
    projetoId: number
  ): Promise<PublicFormWithActiveVersion[]>;
  getActiveFormByProjetoAndId(params: {
    projetoId: number;
    formId: number;
  }): Promise<PublicFormWithActiveVersion | null>;
}
