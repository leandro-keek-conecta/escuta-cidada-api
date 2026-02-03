import { Prisma } from "@prisma/client";
import { injectable } from "inversify";

import { prisma } from "@/lib/prisma";
import { FormResponseExistsQueryInput } from "../http/validators/existsValidator";

@injectable()
export class CheckFormResponseFieldExistsService {
  private client = prisma;

  setClient(client: typeof prisma) {
    this.client = client;
  }

  async execute(params: FormResponseExistsQueryInput) {
    const trimmed = params.value.trim();
    const normalized = trimmed.toLowerCase();

    const orFilters: Prisma.FormResponseFieldWhereInput[] = [{ value: trimmed }];

    const numericValue = Number(trimmed);
    if (!Number.isNaN(numericValue)) {
      orFilters.push({ valueNumber: numericValue });
    }

    if (normalized === "true" || normalized === "false") {
      orFilters.push({ valueBool: normalized === "true" });
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      orFilters.push({ valueDate: parsedDate });
    }

    const responseWhere: Prisma.FormResponseWhereInput = {
      projetoId: params.projetoId,
    };

    if (params.formVersionId) {
      responseWhere.formVersionId = params.formVersionId;
    }

    const match = await this.client.formResponseField.findFirst({
      where: {
        fieldName: params.fieldName,
        response: responseWhere,
        OR: orFilters,
      },
      orderBy: { responseId: "desc" },
      select: {
        responseId: true,
        response: { select: { createdAt: true } },
      },
    });

    return {
      exists: Boolean(match),
      responseId: match?.responseId ?? null,
      createdAt: match?.response.createdAt.toISOString() ?? null,
    };
  }
}
