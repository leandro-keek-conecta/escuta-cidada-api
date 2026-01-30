import { Prisma } from "@prisma/client";
import { injectable } from "inversify";

import { prisma } from "@/lib/prisma";
import { RawListQueryInput } from "../http/validators/rawListValidator";

@injectable()
export class ListFormResponsesRawService {
  private client = prisma;

  setClient(client: typeof prisma) {
    this.client = client;
  }

  async execute(params: RawListQueryInput) {
    const where: Prisma.FormResponseWhereInput = {
      projetoId: params.projetoId,
    };

    if (params.formVersionId) {
      where.formVersionId = params.formVersionId;
    }

    if (params.start || params.end) {
      where.createdAt = {};
      if (params.start) {
        where.createdAt.gte = params.start;
      }
      if (params.end) {
        where.createdAt.lte = params.end;
      }
    }

    const normalizeValue = (field: {
      value: string | null;
      valueJson: Prisma.JsonValue | null;
      valueNumber: number | null;
      valueBool: boolean | null;
      valueDate: Date | null;
    }) =>
      field.value ??
      field.valueJson ??
      field.valueNumber ??
      field.valueBool ??
      (field.valueDate ? field.valueDate.toISOString() : null);

    if (params.select?.length) {
      const selected = params.select;
      const [items, total] = await Promise.all([
        this.client.formResponse.findMany({
          where,
          orderBy: { id: "desc" },
          skip: params.offset,
          take: params.limit,
          select: {
            fields: {
              where: { fieldName: { in: selected } },
              select: {
                fieldName: true,
                value: true,
                valueJson: true,
                valueNumber: true,
                valueBool: true,
                valueDate: true,
              },
            },
          },
        }),
        this.client.formResponse.count({ where }),
      ]);

      const normalized = items.map((item) => {
        const record: Record<string, unknown> = {};
        for (const fieldName of selected) {
          record[fieldName] = null;
        }
        for (const field of item.fields) {
          record[field.fieldName] = normalizeValue(field);
        }
        return record;
      });

      return {
        total,
        limit: params.limit,
        offset: params.offset,
        items: normalized,
      };
    }

    const [items, total] = await Promise.all([
      this.client.formResponse.findMany({
        where,
        orderBy: { id: "desc" },
        skip: params.offset,
        take: params.limit,
        include: {
          fields: true,
          user: true,
          projeto: true,
          formVersion: {
            include: { fields: true },
          },
        },
      }),
      this.client.formResponse.count({ where }),
    ]);

    return {
      total,
      limit: params.limit,
      offset: params.offset,
      items,
    };
  }
}
