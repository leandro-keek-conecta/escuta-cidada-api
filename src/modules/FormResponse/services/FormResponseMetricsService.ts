import { FormResponseStatus, Prisma } from "@prisma/client";
import { injectable } from "inversify";
import { prisma } from "@/lib/prisma";

type MetricsInterval = "day" | "week" | "month";
type MetricsDateField = "createdAt" | "submittedAt" | "completedAt" | "startedAt";
type MetricsValueType = "string" | "number" | "boolean" | "date";

type BaseFilters = {
  projetoId?: number;
  formVersionId?: number;
  status?: FormResponseStatus;
  start?: Date;
  end?: Date;
};

type TimeSeriesParams = BaseFilters & {
  interval: MetricsInterval;
  dateField: MetricsDateField;
};

type DistributionParams = BaseFilters & {
  fieldId?: number;
  fieldName?: string;
  valueType: MetricsValueType;
  limit: number;
};

type NumberStatsParams = BaseFilters & {
  fieldId: number;
};

type FunnelParams = BaseFilters;

type SeriesRow = { bucket: Date; count: number | string };
type DistributionRow = { value: any; count: number | string };
type NumberStatsRow = {
  count: number | string;
  min: number | string | null;
  max: number | string | null;
  avg: number | string | null;
};

function getDateColumn(field: MetricsDateField, alias?: string) {
  const prefix = alias ? `${alias}.` : "";
  switch (field) {
    case "submittedAt":
      return Prisma.raw(`${prefix}"submittedAt"`);
    case "completedAt":
      return Prisma.raw(`${prefix}"completedAt"`);
    case "startedAt":
      return Prisma.raw(`${prefix}"startedAt"`);
    case "createdAt":
    default:
      return Prisma.raw(`${prefix}"createdAt"`);
  }
}

function normalizeCount(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

@injectable()
export class FormResponseMetricsService {
  private client = prisma;

  setClient(client: typeof prisma) {
    this.client = client;
  }

  async timeSeries(params: TimeSeriesParams) {
    const interval = Prisma.sql`${params.interval}`;
    const dateColumn = getDateColumn(params.dateField);

    const whereParts: Prisma.Sql[] = [Prisma.sql`${dateColumn} IS NOT NULL`];
    if (params.projetoId) {
      whereParts.push(Prisma.sql`"projetoId" = ${params.projetoId}`);
    }
    if (params.formVersionId) {
      whereParts.push(Prisma.sql`"formVersionId" = ${params.formVersionId}`);
    }
    if (params.status) {
      whereParts.push(Prisma.sql`"status" = ${params.status}`);
    }
    if (params.start) {
      whereParts.push(Prisma.sql`${dateColumn} >= ${params.start}`);
    }
    if (params.end) {
      whereParts.push(Prisma.sql`${dateColumn} <= ${params.end}`);
    }

    const whereSql = Prisma.join(whereParts, " AND ");
    const rows = await this.client.$queryRaw<SeriesRow[]>(Prisma.sql`
      SELECT date_trunc(${interval}, ${dateColumn}) AS bucket,
             COUNT(*)::int AS count
      FROM "FormResponse"
      WHERE ${whereSql}
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    return rows.map((row) => ({
      bucket: row.bucket.toISOString(),
      count: normalizeCount(row.count),
    }));
  }

  async distribution(params: DistributionParams) {
    const valueColumn = (() => {
      switch (params.valueType) {
        case "number":
          return Prisma.raw('f."valueNumber"');
        case "boolean":
          return Prisma.raw('f."valueBool"');
        case "date":
          return Prisma.raw('date_trunc(\'day\', f."valueDate")');
        case "string":
        default:
          return Prisma.raw('f."value"');
      }
    })();

    const whereParts: Prisma.Sql[] = [Prisma.sql`${valueColumn} IS NOT NULL`];

    if (params.fieldId) {
      whereParts.push(Prisma.sql`f."fieldId" = ${params.fieldId}`);
    }

    if (params.fieldName) {
      whereParts.push(Prisma.sql`f."fieldName" = ${params.fieldName}`);
    }

    if (params.projetoId) {
      whereParts.push(Prisma.sql`r."projetoId" = ${params.projetoId}`);
    }

    if (params.formVersionId) {
      whereParts.push(Prisma.sql`r."formVersionId" = ${params.formVersionId}`);
    }

    if (params.status) {
      whereParts.push(Prisma.sql`r."status" = ${params.status}`);
    }

    if (params.start) {
      whereParts.push(Prisma.sql`r."createdAt" >= ${params.start}`);
    }

    if (params.end) {
      whereParts.push(Prisma.sql`r."createdAt" <= ${params.end}`);
    }

    const whereSql = Prisma.join(whereParts, " AND ");
    const rows = await this.client.$queryRaw<DistributionRow[]>(Prisma.sql`
      SELECT ${valueColumn} AS value,
             COUNT(*)::int AS count
      FROM "FormResponseField" f
      INNER JOIN "FormResponse" r ON r.id = f."responseId"
      WHERE ${whereSql}
      GROUP BY value
      ORDER BY count DESC
      LIMIT ${params.limit}
    `);

    return rows.map((row) => ({
      value: row.value instanceof Date ? row.value.toISOString() : row.value,
      count: normalizeCount(row.count),
    }));
  }

  async numberStats(params: NumberStatsParams) {
    const whereParts: Prisma.Sql[] = [
      Prisma.sql`f."valueNumber" IS NOT NULL`,
      Prisma.sql`f."fieldId" = ${params.fieldId}`,
    ];

    if (params.projetoId) {
      whereParts.push(Prisma.sql`r."projetoId" = ${params.projetoId}`);
    }

    if (params.formVersionId) {
      whereParts.push(Prisma.sql`r."formVersionId" = ${params.formVersionId}`);
    }

    if (params.status) {
      whereParts.push(Prisma.sql`r."status" = ${params.status}`);
    }

    if (params.start) {
      whereParts.push(Prisma.sql`r."createdAt" >= ${params.start}`);
    }

    if (params.end) {
      whereParts.push(Prisma.sql`r."createdAt" <= ${params.end}`);
    }

    const whereSql = Prisma.join(whereParts, " AND ");
    const rows = await this.client.$queryRaw<NumberStatsRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count,
             MIN(f."valueNumber") AS min,
             MAX(f."valueNumber") AS max,
             AVG(f."valueNumber") AS avg
      FROM "FormResponseField" f
      INNER JOIN "FormResponse" r ON r.id = f."responseId"
      WHERE ${whereSql}
    `);

    const row = rows[0];
    if (!row) {
      return { count: 0, min: null, max: null, avg: null };
    }

    const toNumber = (value: number | string | null) =>
      value === null ? null : Number(value);

    return {
      count: normalizeCount(row.count),
      min: toNumber(row.min),
      max: toNumber(row.max),
      avg: toNumber(row.avg),
    };
  }

  async statusFunnel(params: FunnelParams) {
    const where: Prisma.FormResponseWhereInput = {};

    if (params.projetoId) {
      where.projetoId = params.projetoId;
    }

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

    const rows = await this.client.formResponse.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });

    return rows.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));
  }
}
