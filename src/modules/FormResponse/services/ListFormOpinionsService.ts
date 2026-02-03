import { Prisma } from "@prisma/client";
import { injectable } from "inversify";

import { prisma } from "@/lib/prisma";
import { OpinionsQueryInput } from "../http/validators/opinionsValidator";

@injectable()
export class ListFormOpinionsService {
  private client = prisma;

  setClient(client: typeof prisma) {
    this.client = client;
  }

  async execute(params: OpinionsQueryInput) {
    const responseWhere: Prisma.FormResponseWhereInput = {
      projetoId: params.projetoId,
    };

    if (params.start || params.end) {
      responseWhere.createdAt = {};
      if (params.start) {
        responseWhere.createdAt.gte = params.start;
      }
      if (params.end) {
        responseWhere.createdAt.lte = params.end;
      }
    }

    const where: Prisma.FormResponseFieldWhereInput = {
      fieldName: params.fieldName,
      response: responseWhere,
    };

    const [items, total] = await Promise.all([
      this.client.formResponseField.findMany({
        where,
        orderBy: [{ response: { createdAt: "desc" } }, { responseId: "desc" }],
        skip: params.offset,
        take: params.limit,
        select: {
          responseId: true,
          value: true,
          valueJson: true,
          valueNumber: true,
          valueBool: true,
          valueDate: true,
          response: { select: { createdAt: true } },
        },
      }),
      this.client.formResponseField.count({ where }),
    ]);

    const normalized = items.map((row) => {
      const raw =
        row.value ??
        row.valueJson ??
        row.valueNumber ??
        row.valueBool ??
        (row.valueDate ? row.valueDate.toISOString() : null);

      return {
        responseId: row.responseId,
        value: raw,
        createdAt: row.response.createdAt.toISOString(),
      };
    });

    return {
      total,
      items: normalized,
      limit: params.limit,
      offset: params.offset,
    };
  }
}
