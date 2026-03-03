import { FormResponseStatus, Prisma } from "@prisma/client";
import { injectable } from "inversify";
import { prisma } from "@/lib/prisma";

const shouldLog = process.env.NODE_ENV !== "production";
const debugLog = (...args: unknown[]) => {
  if (shouldLog) {
    console.log("[FormResponseMetricsService]", ...args);
  }
};

type MetricsInterval = "day" | "week" | "month";
type MetricsDateField = "createdAt" | "submittedAt" | "completedAt" | "startedAt";
type MetricsValueType = "string" | "number" | "boolean" | "date";

type FieldFilterInput = {
  temas?: string[];
  tema?: string[];
  tipoOpiniao?: string[];
  tipos?: string[];
  tipo?: string[];
  genero?: string[];
  generos?: string[];
  bairro?: string[];
  bairros?: string[];
  faixaEtaria?: string[];
  faixasEtarias?: string[];
  textoOpiniao?: string[];
  texto?: string[];
  campanhas?: string[];
  campanha?: string[];
};

type NormalizedFieldFilters = {
  temas?: string[];
  tipos?: string[];
  generos?: string[];
  bairros?: string[];
  faixaEtaria?: string[];
  textoOpiniao?: string[];
  campanhas?: string[];
};

type BaseFilters = {
  projetoId?: number;
  formVersionId?: number;
  formId?: number;
  formIds?: number[];
  status?: FormResponseStatus;
  start?: Date;
  end?: Date;
} & FieldFilterInput;

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

type ReportParams = BaseFilters & {
  dateField: MetricsDateField;
  monthStart?: Date;
  monthEnd?: Date;
  dayStart?: Date;
  dayEnd?: Date;
  limitTopThemes: number;
  limitTopNeighborhoods: number;
  limitDistribution: number;
};

type ProjectReportParams = BaseFilters & {
  dateField: MetricsDateField;
  monthStart?: Date;
  monthEnd?: Date;
  dayStart?: Date;
  dayEnd?: Date;
  limitTopForms: number;
};

type FormFiltersParams = BaseFilters & {
  dateField: MetricsDateField;
  limitValuesPerField: number;
};

type SummaryParams = BaseFilters & {
  day?: Date;
  rangeStart?: Date;
  rangeEnd?: Date;
  limitTopThemes: number;
  limitTopNeighborhoods: number;
};

type FiltersParams = BaseFilters & {
  limit: number;
};

type SeriesRow = { bucket: Date; count: number | string };
type DistributionRow = { value: any; count: number | string };
type NumberStatsRow = {
  count: number | string;
  min: number | string | null;
  max: number | string | null;
  avg: number | string | null;
};
type StatusCountRow = { status: FormResponseStatus | string; count: number | string };
type TotalRow = { total: number | string };
type OpinionTypeRow = { tipoOpiniao: string | null; total: number | string };
type FormResponseByFormRow = {
  formId: number;
  formName: string | null;
  total: number | string;
};
type FieldValuesRow = { value: string | null; total: number | string };

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

function formatBucketLabel(bucketIso: string, interval: MetricsInterval) {
  if (interval === "month") {
    return bucketIso.slice(0, 7);
  }
  if (interval === "day") {
    return bucketIso.slice(0, 10);
  }
  return bucketIso;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeLabel(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }
  return String(value);
}

const AGE_BUCKETS = [
  { label: "Ate 18", min: 0, max: 18 },
  { label: "19-25", min: 19, max: 25 },
  { label: "26-35", min: 26, max: 35 },
  { label: "36-45", min: 36, max: 45 },
  { label: "46-60", min: 46, max: 60 },
  { label: "60+", min: 61, max: Infinity },
];

const MAX_AGE = 120;

const THEME_CANONICAL_BY_KEY: Record<string, string> = {
  saude: "Saúde",
  educacao: "Educação",
  seguranca: "Segurança",
  infraestrutura: "Infraestrutura",
  mobilidade: "Mobilidade",
  "meio ambiente": "Meio ambiente",
  outro: "Outro",
};

const OPINION_TYPE_CANONICAL_BY_KEY: Record<string, string> = {
  reclamacao: "Reclamação",
  elogio: "Elogio",
  sugestao: "Sugestão",
};

const ACCENTED_SQL_CHARS = "áàâãäåéèêëíìîïóòôõöúùûüçñ";
const UNACCENTED_SQL_CHARS = "aaaaaaeeeeiiiiooooouuuucn";

function canonicalizeThemeLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "Não informado";
  }
  const normalized = normalizeText(raw);
  return THEME_CANONICAL_BY_KEY[normalized] ?? raw;
}

function canonicalizeOpinionTypeLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "Não informado";
  }
  const normalized = normalizeText(raw);
  return OPINION_TYPE_CANONICAL_BY_KEY[normalized] ?? raw;
}

function aggregateDistributionRows(
  rows: DistributionRow[],
  canonicalizer?: (value: unknown) => string
) {
  const grouped = new Map<string, { value: string; count: number }>();

  for (const row of rows) {
    const count = normalizeCount(row.count);
    const label = canonicalizer
      ? canonicalizer(row.value)
      : normalizeLabel(row.value);
    const key = normalizeText(label);

    const current = grouped.get(key);
    if (current) {
      current.count += count;
      continue;
    }

    grouped.set(key, { value: label, count });
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .map((item) => ({ value: item.value, count: item.count }));
}

@injectable()
export class FormResponseMetricsService {
  private client = prisma;

  setClient(client: typeof prisma) {
    this.client = client;
  }

  private mergeFilterValues(...values: Array<string[] | undefined>) {
    const seen = new Set<string>();
    const merged: string[] = [];

    for (const list of values) {
      if (!list) {
        continue;
      }
      for (const item of list) {
        const trimmed = String(item ?? "").trim();
        if (!trimmed) {
          continue;
        }
        if (!seen.has(trimmed)) {
          seen.add(trimmed);
          merged.push(trimmed);
        }
      }
    }

    return merged.length ? merged : undefined;
  }

  private mergeFormIds(formId?: number, formIds?: number[]) {
    const merged: number[] = [];
    const seen = new Set<number>();

    if (typeof formId === "number" && Number.isFinite(formId) && formId > 0) {
      seen.add(formId);
      merged.push(formId);
    }

    for (const id of formIds ?? []) {
      if (!Number.isFinite(id) || id <= 0 || seen.has(id)) {
        continue;
      }
      seen.add(id);
      merged.push(id);
    }

    return merged.length ? merged : undefined;
  }

  private buildFormScopeSql(responseAlias: string, formIds?: number[]) {
    if (!formIds?.length) {
      return null;
    }

    const responseFormVersionId = Prisma.raw(`${responseAlias}."formVersionId"`);

    return Prisma.sql`EXISTS (
      SELECT 1
      FROM "FormVersion" fv_filter
      WHERE fv_filter."id" = ${responseFormVersionId}
        AND fv_filter."formId" IN (${Prisma.join(formIds)})
    )`;
  }

  private buildProjectFormScopeSql(responseAlias: string, projetoId?: number) {
    if (!projetoId) {
      return null;
    }

    const responseFormVersionId = Prisma.raw(`${responseAlias}."formVersionId"`);

    return Prisma.sql`EXISTS (
      SELECT 1
      FROM "FormVersion" fv_project
      INNER JOIN "Form" f_project ON f_project."id" = fv_project."formId"
      WHERE fv_project."id" = ${responseFormVersionId}
        AND f_project."projetoId" = ${projetoId}
    )`;
  }

  private normalizeFieldFilters(params: FieldFilterInput): NormalizedFieldFilters {
    return {
      temas: this.mergeFilterValues(params.temas, params.tema),
      tipos: this.mergeFilterValues(
        params.tipoOpiniao,
        params.tipos,
        params.tipo
      ),
      generos: this.mergeFilterValues(params.genero, params.generos),
      bairros: this.mergeFilterValues(params.bairro, params.bairros),
      faixaEtaria: this.mergeFilterValues(
        params.faixaEtaria,
        params.faixasEtarias
      ),
      textoOpiniao: this.mergeFilterValues(params.textoOpiniao, params.texto),
      campanhas: this.mergeFilterValues(params.campanhas, params.campanha),
    };
  }

  private getReferenceDate(params: {
    end?: Date;
    dayEnd?: Date;
    monthEnd?: Date;
  }) {
    return params.end ?? params.dayEnd ?? params.monthEnd ?? new Date();
  }

  private getCalendarDateParts(value: Date) {
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth(),
      day: value.getUTCDate(),
    };
  }

  private toLocalCalendarDateStart(value: Date) {
    const { year, month, day } = this.getCalendarDateParts(value);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  private toLocalCalendarDateEnd(value: Date) {
    const { year, month, day } = this.getCalendarDateParts(value);
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  private isUnknownLabel(value: string) {
    return normalizeText(value) === "nao informado";
  }

  private buildNormalizedValueSql(column: Prisma.Sql | ReturnType<typeof Prisma.raw>) {
    return Prisma.sql`LOWER(
      TRANSLATE(
        BTRIM(COALESCE(${column}, '')),
        ${ACCENTED_SQL_CHARS},
        ${UNACCENTED_SQL_CHARS}
      )
    )`;
  }

  private buildValueFilterSql(fieldAlias: string, values: string[]) {
    const knownValues: string[] = [];
    let includeUnknown = false;

    for (const value of values) {
      if (this.isUnknownLabel(value)) {
        includeUnknown = true;
      } else {
        knownValues.push(value);
      }
    }

    const column = Prisma.raw(`${fieldAlias}."value"`);
    const conditions: Prisma.Sql[] = [];

    if (knownValues.length) {
      const normalizedValues = Array.from(
        new Set(
          knownValues
            .map((value) => normalizeText(value))
            .filter((value) => value.length > 0)
        )
      );
      conditions.push(
        Prisma.sql`${this.buildNormalizedValueSql(column)} IN (${Prisma.join(
          normalizedValues
        )})`
      );
    }

    if (includeUnknown) {
      conditions.push(Prisma.sql`${column} IS NULL OR ${column} = ''`);
    }

    if (!conditions.length) {
      return null;
    }

    return Prisma.join(conditions, " OR ");
  }

  private buildTextFilterSql(fieldAlias: string, terms: string[]) {
    const column = Prisma.raw(`${fieldAlias}."value"`);
    const conditions = terms.map(
      (term) => Prisma.sql`${column} ILIKE ${`%${term}%`}`
    );

    if (!conditions.length) {
      return null;
    }

    return Prisma.join(conditions, " OR ");
  }

  private buildAgeFilterData(labels: string[], referenceDate: Date) {
    const referenceYear = referenceDate.getFullYear();
    const years = new Set<string>();
    let includeUnknown = false;

    for (const label of labels) {
      if (this.isUnknownLabel(label)) {
        includeUnknown = true;
        continue;
      }

      const range = this.parseAgeLabel(label);
      if (!range) {
        continue;
      }

      const min = Math.max(0, range.min);
      const max = Math.min(MAX_AGE, range.max);

      for (let age = min; age <= max; age += 1) {
        years.add(String(referenceYear - age));
      }
    }

    return { years: Array.from(years), includeUnknown };
  }

  private parseAgeLabel(label: string) {
    const normalized = normalizeText(label).replace(/\s+/g, " ").trim();
    if (!normalized) {
      return null;
    }

    if (normalized.startsWith("ate")) {
      const numberText = normalized.replace("ate", "").trim();
      const max = Number.parseInt(numberText, 10);
      if (Number.isFinite(max)) {
        return { min: 0, max };
      }
    }

    const plusMatch = normalized.match(/^(\d{1,3})\+$/);
    if (plusMatch) {
      const min = Number.parseInt(plusMatch[1], 10);
      if (Number.isFinite(min)) {
        return { min, max: MAX_AGE };
      }
    }

    const rangeMatch =
      normalized.match(/^(\d{1,3})\s*-\s*(\d{1,3})$/) ||
      normalized.match(/^(\d{1,3})\s*a\s*(\d{1,3})$/);
    if (rangeMatch) {
      const min = Number.parseInt(rangeMatch[1], 10);
      const max = Number.parseInt(rangeMatch[2], 10);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return min <= max ? { min, max } : { min: max, max: min };
      }
    }

    return null;
  }

  private buildFieldExistsSql(
    responseAlias: string,
    fieldName: string,
    predicate: Prisma.Sql
  ) {
    const responseId = Prisma.raw(`${responseAlias}."id"`);

    return Prisma.sql`EXISTS (
      SELECT 1
      FROM "FormResponseField" ff
      WHERE ff."responseId" = ${responseId}
        AND ff."fieldName" = ${fieldName}
        AND (${predicate})
    )`;
  }

  private buildFieldFilterSql(
    responseAlias: string,
    filters: NormalizedFieldFilters,
    referenceDate: Date
  ) {
    const clauses: Prisma.Sql[] = [];

    if (filters.temas?.length) {
      const predicate = this.buildValueFilterSql("ff", filters.temas);
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(responseAlias, "opiniao", predicate)
        );
      }
    }

    if (filters.tipos?.length) {
      const predicate = this.buildValueFilterSql("ff", filters.tipos);
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(responseAlias, "tipo_opiniao", predicate)
        );
      }
    }

    if (filters.generos?.length) {
      const predicate = this.buildValueFilterSql("ff", filters.generos);
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(responseAlias, "genero", predicate)
        );
      }
    }

    if (filters.bairros?.length) {
      const predicate = this.buildValueFilterSql("ff", filters.bairros);
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(responseAlias, "bairro", predicate)
        );
      }
    }

    if (filters.campanhas?.length) {
      const predicate = this.buildValueFilterSql("ff", filters.campanhas);
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(responseAlias, "campanha", predicate)
        );
      }
    }

    if (filters.textoOpiniao?.length) {
      const predicate = this.buildTextFilterSql("ff", filters.textoOpiniao);
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(responseAlias, "texto_opiniao", predicate)
        );
      }
    }

    if (filters.faixaEtaria?.length) {
      const { years, includeUnknown } = this.buildAgeFilterData(
        filters.faixaEtaria,
        referenceDate
      );

      if (years.length || includeUnknown) {
        const column = Prisma.raw('ff."value"');
        const conditions: Prisma.Sql[] = [];

        if (years.length) {
          conditions.push(Prisma.sql`${column} IN (${Prisma.join(years)})`);
        }

        if (includeUnknown) {
          conditions.push(Prisma.sql`${column} IS NULL OR ${column} = ''`);
        }

        clauses.push(
          this.buildFieldExistsSql(
            responseAlias,
            "ano_nascimento",
            Prisma.join(conditions, " OR ")
          )
        );
      }
    }

    return clauses;
  }

  private buildFieldFilterWhere(
    filters: NormalizedFieldFilters,
    referenceDate: Date
  ): Prisma.FormResponseWhereInput {
    const and: Prisma.FormResponseWhereInput[] = [];

    const getCanonicalValueVariants = (fieldName: string, value: string) => {
      const variants = new Set<string>([value]);

      if (fieldName === "opiniao") {
        variants.add(canonicalizeThemeLabel(value));
      }

      if (fieldName === "tipo_opiniao") {
        variants.add(canonicalizeOpinionTypeLabel(value));
      }

      return Array.from(variants).filter((item) => item.trim().length > 0);
    };

    const addValueFilter = (fieldName: string, values?: string[]) => {
      if (!values?.length) {
        return;
      }

      const knownValues: string[] = [];
      let includeUnknown = false;
      for (const value of values) {
        if (this.isUnknownLabel(value)) {
          includeUnknown = true;
        } else {
          knownValues.push(value);
        }
      }

      const or: Prisma.FormResponseFieldWhereInput[] = [];
      if (knownValues.length) {
        for (const value of knownValues) {
          for (const candidate of getCanonicalValueVariants(fieldName, value)) {
            or.push({
              value: { equals: candidate, mode: "insensitive" as const },
            });
          }
        }
      }
      if (includeUnknown) {
        or.push({ value: null }, { value: "" });
      }

      if (!or.length) {
        return;
      }

      and.push({
        fields: {
          some: {
            fieldName,
            OR: or,
          },
        },
      });
    };

    const addTextFilter = (fieldName: string, terms?: string[]) => {
      if (!terms?.length) {
        return;
      }

      const or = terms.map((term) => ({
        value: { contains: term, mode: "insensitive" as const },
      }));

      if (!or.length) {
        return;
      }

      and.push({
        fields: {
          some: {
            fieldName,
            OR: or,
          },
        },
      });
    };

    addValueFilter("opiniao", filters.temas);
    addValueFilter("tipo_opiniao", filters.tipos);
    addValueFilter("genero", filters.generos);
    addValueFilter("bairro", filters.bairros);
    addValueFilter("campanha", filters.campanhas);
    addTextFilter("texto_opiniao", filters.textoOpiniao);

    if (filters.faixaEtaria?.length) {
      const { years, includeUnknown } = this.buildAgeFilterData(
        filters.faixaEtaria,
        referenceDate
      );
      const or: Prisma.FormResponseFieldWhereInput[] = [];
      if (years.length) {
        or.push({ value: { in: years } });
      }
      if (includeUnknown) {
        or.push({ value: null }, { value: "" });
      }
      if (or.length) {
        and.push({
          fields: {
            some: {
              fieldName: "ano_nascimento",
              OR: or,
            },
          },
        });
      }
    }

    return and.length ? { AND: and } : {};
  }

  async timeSeries(params: TimeSeriesParams) {
    const interval = Prisma.sql`${params.interval}`;
    const responseAlias = "r";
    const dateColumn = getDateColumn(params.dateField, responseAlias);
    const fieldFilters = this.normalizeFieldFilters(params);
    const mergedFormIds = this.mergeFormIds(params.formId, params.formIds);
    const referenceDate = this.getReferenceDate(params);

    const whereParts: Prisma.Sql[] = [Prisma.sql`${dateColumn} IS NOT NULL`];
    if (params.projetoId) {
      whereParts.push(
        Prisma.sql`${Prisma.raw(`${responseAlias}."projetoId"`)} = ${
          params.projetoId
        }`
      );
    }
    const projectFormScopeSql = this.buildProjectFormScopeSql(
      responseAlias,
      params.projetoId
    );
    if (projectFormScopeSql) {
      whereParts.push(projectFormScopeSql);
    }
    if (params.formVersionId) {
      whereParts.push(
        Prisma.sql`${Prisma.raw(`${responseAlias}."formVersionId"`)} = ${
          params.formVersionId
        }`
      );
    }
    const formScopeSql = this.buildFormScopeSql(responseAlias, mergedFormIds);
    if (formScopeSql) {
      whereParts.push(formScopeSql);
    }
    if (params.status) {
      whereParts.push(
        Prisma.sql`${Prisma.raw(`${responseAlias}."status"`)} = ${
          params.status
        }::"FormResponseStatus"`
      );
    }
    if (params.start) {
      whereParts.push(Prisma.sql`${dateColumn} >= ${params.start}`);
    }
    if (params.end) {
      whereParts.push(Prisma.sql`${dateColumn} <= ${params.end}`);
    }

    whereParts.push(
      ...this.buildFieldFilterSql(responseAlias, fieldFilters, referenceDate)
    );

    const whereSql = Prisma.join(whereParts, " AND ");
    const rows = await this.client.$queryRaw<SeriesRow[]>(Prisma.sql`
      SELECT date_trunc(${interval}, ${dateColumn}) AS bucket,
             COUNT(*)::int AS count
      FROM "FormResponse" ${Prisma.raw(responseAlias)}
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

    const fieldFilters = this.normalizeFieldFilters(params);
    const mergedFormIds = this.mergeFormIds(params.formId, params.formIds);
    const referenceDate = this.getReferenceDate(params);
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
    const projectFormScopeSql = this.buildProjectFormScopeSql("r", params.projetoId);
    if (projectFormScopeSql) {
      whereParts.push(projectFormScopeSql);
    }

    if (params.formVersionId) {
      whereParts.push(Prisma.sql`r."formVersionId" = ${params.formVersionId}`);
    }
    const formScopeSql = this.buildFormScopeSql("r", mergedFormIds);
    if (formScopeSql) {
      whereParts.push(formScopeSql);
    }

    if (params.status) {
      whereParts.push(
        Prisma.sql`r."status" = ${params.status}::"FormResponseStatus"`
      );
    }

    if (params.start) {
      whereParts.push(Prisma.sql`r."createdAt" >= ${params.start}`);
    }

    if (params.end) {
      whereParts.push(Prisma.sql`r."createdAt" <= ${params.end}`);
    }

    whereParts.push(
      ...this.buildFieldFilterSql("r", fieldFilters, referenceDate)
    );

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

    const fieldFilters = this.normalizeFieldFilters(params);
    const mergedFormIds = this.mergeFormIds(params.formId, params.formIds);
    const referenceDate = this.getReferenceDate(params);

    if (params.projetoId) {
      whereParts.push(Prisma.sql`r."projetoId" = ${params.projetoId}`);
    }
    const projectFormScopeSql = this.buildProjectFormScopeSql("r", params.projetoId);
    if (projectFormScopeSql) {
      whereParts.push(projectFormScopeSql);
    }

    if (params.formVersionId) {
      whereParts.push(Prisma.sql`r."formVersionId" = ${params.formVersionId}`);
    }
    const formScopeSql = this.buildFormScopeSql("r", mergedFormIds);
    if (formScopeSql) {
      whereParts.push(formScopeSql);
    }

    if (params.status) {
      whereParts.push(
        Prisma.sql`r."status" = ${params.status}::"FormResponseStatus"`
      );
    }

    if (params.start) {
      whereParts.push(Prisma.sql`r."createdAt" >= ${params.start}`);
    }

    if (params.end) {
      whereParts.push(Prisma.sql`r."createdAt" <= ${params.end}`);
    }

    whereParts.push(
      ...this.buildFieldFilterSql("r", fieldFilters, referenceDate)
    );

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
    const fieldFilters = this.normalizeFieldFilters(params);
    const mergedFormIds = this.mergeFormIds(params.formId, params.formIds);
    const referenceDate = this.getReferenceDate(params);

    if (params.projetoId) {
      where.projetoId = params.projetoId;
      const baseAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [
        ...baseAnd,
        { formVersion: { form: { projetoId: params.projetoId } } },
      ];
    }

    if (params.formVersionId) {
      where.formVersionId = params.formVersionId;
    }

    if (mergedFormIds?.length) {
      const versions = await this.client.formVersion.findMany({
        where: { formId: { in: mergedFormIds } },
        select: { id: true },
      });
      const versionIds = versions.map((item) => item.id);
      if (!versionIds.length) {
        return [];
      }

      if (params.formVersionId) {
        if (!versionIds.includes(params.formVersionId)) {
          return [];
        }
      } else {
        where.formVersionId = { in: versionIds };
      }
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

    const fieldWhere = this.buildFieldFilterWhere(
      fieldFilters,
      referenceDate
    );
    const fieldAnd = fieldWhere.AND
      ? Array.isArray(fieldWhere.AND)
        ? fieldWhere.AND
        : [fieldWhere.AND]
      : [];
    if (fieldAnd.length) {
      const baseAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...baseAnd, ...fieldAnd];
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

  async projectReport(params: ProjectReportParams) {
    debugLog("projectReport params", params);
    const mergedFormIds = this.mergeFormIds(params.formId, params.formIds);

    const toStartOfDay = (value: Date) => {
      const date = new Date(value);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const toEndOfDay = (value: Date) => {
      const date = new Date(value);
      date.setHours(23, 59, 59, 999);
      return date;
    };

    const addDays = (value: Date, days: number) => {
      const date = new Date(value);
      date.setDate(date.getDate() + days);
      return date;
    };

    const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

    const hasDateFilters = Boolean(
      params.start ||
        params.end ||
        params.dayStart ||
        params.dayEnd ||
        params.monthStart ||
        params.monthEnd
    );
    const hasAnyFilters = hasDateFilters || !!params.status;

    const baseFilters: BaseFilters = {
      projetoId: params.projetoId,
      formVersionId: params.formVersionId,
      formIds: mergedFormIds,
      status: params.status,
      start: params.start,
      end: params.end,
    };

    const monthFilters: BaseFilters = {
      ...baseFilters,
      start: params.monthStart ?? params.start,
      end: params.monthEnd ?? params.end,
    };

    const dayStartParam = params.dayStart
      ? toStartOfDay(params.dayStart)
      : undefined;
    const dayEndParam = params.dayEnd ? toEndOfDay(params.dayEnd) : undefined;
    const dayStartFromMonth = params.monthStart
      ? toStartOfDay(params.monthStart)
      : undefined;
    const dayEndFromMonth = params.monthEnd
      ? toEndOfDay(params.monthEnd)
      : undefined;

    let dayStart =
      dayStartParam ?? dayStartFromMonth ?? (hasAnyFilters ? undefined : null);
    let dayEnd =
      dayEndParam ?? dayEndFromMonth ?? (hasAnyFilters ? undefined : null);

    if (!hasAnyFilters && (dayStart === null || dayEnd === null)) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      dayStart = monthStart;
      dayEnd = monthEnd;
    }

    if (dayStart === null) {
      dayStart = undefined;
    }
    if (dayEnd === null) {
      dayEnd = undefined;
    }

    const todayEnd = toEndOfDay(new Date());
    if (dayEnd && dayEnd > todayEnd) {
      dayEnd = todayEnd;
    }

    const dayFilters: BaseFilters = {
      ...baseFilters,
      start: dayStart ?? params.start,
      end: dayEnd ?? params.end,
    };

    const buildReportWhereSql = (
      responseAlias: string,
      filters: Pick<
        BaseFilters,
        "projetoId" | "formVersionId" | "formIds" | "status" | "start" | "end"
      >
    ) => {
      const dateColumn = getDateColumn(params.dateField, responseAlias);
      const whereParts: Prisma.Sql[] = [Prisma.sql`${dateColumn} IS NOT NULL`];

      if (filters.projetoId) {
        whereParts.push(
          Prisma.sql`${Prisma.raw(`${responseAlias}."projetoId"`)} = ${
            filters.projetoId
          }`
        );
      }
      const projectFormScopeSql = this.buildProjectFormScopeSql(
        responseAlias,
        filters.projetoId
      );
      if (projectFormScopeSql) {
        whereParts.push(projectFormScopeSql);
      }

      if (filters.formVersionId) {
        whereParts.push(
          Prisma.sql`${Prisma.raw(`${responseAlias}."formVersionId"`)} = ${
            filters.formVersionId
          }`
        );
      }

      const formScopeSql = this.buildFormScopeSql(responseAlias, filters.formIds);
      if (formScopeSql) {
        whereParts.push(formScopeSql);
      }

      if (filters.status) {
        whereParts.push(
          Prisma.sql`${Prisma.raw(`${responseAlias}."status"`)} = ${
            filters.status
          }::"FormResponseStatus"`
        );
      }

      if (filters.start) {
        whereParts.push(Prisma.sql`${dateColumn} >= ${filters.start}`);
      }

      if (filters.end) {
        whereParts.push(Prisma.sql`${dateColumn} <= ${filters.end}`);
      }

      return Prisma.join(whereParts, " AND ");
    };

    const baseWhereSql = buildReportWhereSql("r", baseFilters);

    const [statusRows, mes, dia, formRows, opinionFormRows, opinionTypeRows] = await Promise.all([
      this.client.$queryRaw<StatusCountRow[]>(Prisma.sql`
        SELECT r."status" AS "status", COUNT(*)::int AS "count"
        FROM "FormResponse" r
        WHERE ${baseWhereSql}
        GROUP BY r."status"
      `),
      this.timeSeries({
        ...monthFilters,
        interval: "month",
        dateField: params.dateField,
      }),
      this.timeSeries({
        ...dayFilters,
        interval: "day",
        dateField: params.dateField,
      }),
      this.client.$queryRaw<FormResponseByFormRow[]>(Prisma.sql`
        SELECT
          fv."formId" AS "formId",
          f."name" AS "formName",
          COUNT(*)::int AS "total"
        FROM "FormResponse" r
        INNER JOIN "FormVersion" fv ON fv."id" = r."formVersionId"
        INNER JOIN "Form" f ON f."id" = fv."formId"
        WHERE ${baseWhereSql}
        GROUP BY fv."formId", f."name"
        ORDER BY "total" DESC, "formName" ASC
        LIMIT ${params.limitTopForms}
      `),
      this.client.$queryRaw<TotalRow[]>(Prisma.sql`
        SELECT COUNT(*)::int AS "total"
        FROM "FormResponse" r
        WHERE ${baseWhereSql}
          AND EXISTS (
            SELECT 1
            FROM "FormResponseField" ff
            WHERE ff."responseId" = r."id"
              AND ff."fieldName" IN ('opiniao', 'tipo_opiniao')
          )
      `),
      this.client.$queryRaw<OpinionTypeRow[]>(Prisma.sql`
        SELECT
          COALESCE(NULLIF(BTRIM(ff."value"), ''), 'Nao informado') AS "tipoOpiniao",
          COUNT(DISTINCT r."id")::int AS "total"
        FROM "FormResponse" r
        INNER JOIN "FormResponseField" ff
          ON ff."responseId" = r."id"
         AND ff."fieldName" = 'tipo_opiniao'
        WHERE ${baseWhereSql}
        GROUP BY COALESCE(NULLIF(BTRIM(ff."value"), ''), 'Nao informado')
      `),
    ]);

    const statusFunnel = statusRows.map((row) => ({
      status: String(row.status) as FormResponseStatus,
      count: normalizeCount(row.count),
    }));

    const statusTotals = statusFunnel.reduce(
      (acc, row) => {
        acc.totalResponses += row.count;
        if (row.status === FormResponseStatus.COMPLETED) {
          acc.totalCompleted += row.count;
        } else if (row.status === FormResponseStatus.STARTED) {
          acc.totalStarted += row.count;
        } else if (row.status === FormResponseStatus.ABANDONED) {
          acc.totalAbandoned += row.count;
        }
        return acc;
      },
      {
        totalResponses: 0,
        totalCompleted: 0,
        totalStarted: 0,
        totalAbandoned: 0,
      }
    );

    const completionRate =
      statusTotals.totalResponses > 0
        ? Number(
            (
              (statusTotals.totalCompleted / statusTotals.totalResponses) *
              100
            ).toFixed(2)
          )
        : 0;

    const totalOpinionFormResponses = normalizeCount(
      opinionFormRows[0]?.total ?? 0
    );

    let totalComplaints = 0;
    let totalPraise = 0;
    let totalSuggestions = 0;

    for (const row of opinionTypeRows) {
      const key = normalizeText(row.tipoOpiniao);
      const count = normalizeCount(row.total);
      if (key === "reclamacao") {
        totalComplaints += count;
      } else if (key === "elogio") {
        totalPraise += count;
      } else if (key === "sugestao") {
        totalSuggestions += count;
      }
    }

    const daySeries = dia.map((row) => ({
      label: formatBucketLabel(row.bucket, "day"),
      value: normalizeCount(row.count),
    }));

    if (dayStart && dayEnd) {
      const dayMap = new Map(daySeries.map((item) => [item.label, item.value]));
      const filled: { label: string; value: number }[] = [];
      let cursor = toStartOfDay(dayStart);
      const end = toEndOfDay(dayEnd);

      while (cursor <= end) {
        const key = toDateKey(cursor);
        filled.push({ label: key, value: dayMap.get(key) ?? 0 });
        cursor = addDays(cursor, 1);
      }
      daySeries.splice(0, daySeries.length, ...filled);
    }

    return {
      cards: {
        totalOpinions: totalOpinionFormResponses,
        totalComplaints,
        totalPraise,
        totalSuggestions,
        ...statusTotals,
        totalOpinionFormResponses,
        completionRate,
      },
      lineByMonth: mes.map((row) => ({
        label: formatBucketLabel(row.bucket, "month"),
        value: normalizeCount(row.count),
      })),
      lineByDay: daySeries,
      responsesByForm: formRows.map((row) => ({
        formId: row.formId,
        label: normalizeLabel(row.formName ?? `Formulario ${row.formId}`),
        value: normalizeCount(row.total),
      })),
      statusFunnel,
    };
  }

  async formFilters(params: FormFiltersParams) {
    debugLog("formFilters params", params);

    const mergedFormIds = this.mergeFormIds(params.formId, params.formIds);

    const forms = await this.client.form.findMany({
      where: {
        ...(params.projetoId ? { projetoId: params.projetoId } : {}),
        ...(mergedFormIds?.length ? { id: { in: mergedFormIds } } : {}),
        ...(params.formVersionId
          ? { versions: { some: { id: params.formVersionId } } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        versions: {
          orderBy: { version: "desc" },
          select: {
            id: true,
            version: true,
            isActive: true,
            schema: true,
            fields: {
              orderBy: { ordem: "asc" },
              select: {
                id: true,
                name: true,
                label: true,
                type: true,
                required: true,
                options: true,
                ordem: true,
              },
            },
          },
        },
      },
    });

    const formsWithVersion = forms
      .map((form) => {
        const version =
          (params.formVersionId
            ? form.versions.find((item) => item.id === params.formVersionId)
            : undefined) ??
          form.versions.find((item) => item.isActive) ??
          form.versions[0];

        if (!version) {
          return null;
        }

        return {
          formId: form.id,
          formName: form.name,
          formDescription: form.description ?? null,
          formVersionId: version.id,
          formVersion: version.version,
          schema: version.schema as Prisma.JsonValue,
          fields: version.fields,
        };
      })
      .filter(
        (
          item
        ): item is NonNullable<typeof item> => item !== null
      );

    const buildWhereSql = (responseAlias: string) => {
      const dateColumn = getDateColumn(params.dateField, responseAlias);
      const whereParts: Prisma.Sql[] = [Prisma.sql`${dateColumn} IS NOT NULL`];

      if (params.projetoId) {
        whereParts.push(
          Prisma.sql`${Prisma.raw(`${responseAlias}."projetoId"`)} = ${
            params.projetoId
          }`
        );
      }
      const projectFormScopeSql = this.buildProjectFormScopeSql(
        responseAlias,
        params.projetoId
      );
      if (projectFormScopeSql) {
        whereParts.push(projectFormScopeSql);
      }

      if (params.formVersionId) {
        whereParts.push(
          Prisma.sql`${Prisma.raw(`${responseAlias}."formVersionId"`)} = ${
            params.formVersionId
          }`
        );
      }

      const formScopeSql = this.buildFormScopeSql(responseAlias, mergedFormIds);
      if (formScopeSql) {
        whereParts.push(formScopeSql);
      }

      if (params.status) {
        whereParts.push(
          Prisma.sql`${Prisma.raw(`${responseAlias}."status"`)} = ${
            params.status
          }::"FormResponseStatus"`
        );
      }

      if (params.start) {
        whereParts.push(Prisma.sql`${dateColumn} >= ${params.start}`);
      }

      if (params.end) {
        whereParts.push(Prisma.sql`${dateColumn} <= ${params.end}`);
      }

      return Prisma.join(whereParts, " AND ");
    };

    const responseWhereSql = buildWhereSql("r");

    const dateRangeRows = await this.client.$queryRaw<
      Array<{ minDate: Date | null; maxDate: Date | null }>
    >(Prisma.sql`
      SELECT
        MIN(${getDateColumn(params.dateField, "r")}) AS "minDate",
        MAX(${getDateColumn(params.dateField, "r")}) AS "maxDate"
      FROM "FormResponse" r
      WHERE ${responseWhereSql}
    `);

    const dateRange = dateRangeRows[0] ?? { minDate: null, maxDate: null };

    const formsData = await Promise.all(
      formsWithVersion.map(async (form) => {
        const fields = await Promise.all(
          form.fields.map(async (field) => {
            const valueRows = await this.client.$queryRaw<FieldValuesRow[]>(
              Prisma.sql`
                SELECT
                  COALESCE(
                    NULLIF(BTRIM(ff."value"), ''),
                    ff."valueNumber"::text,
                    ff."valueBool"::text,
                    CASE
                      WHEN ff."valueDate" IS NOT NULL
                        THEN to_char(
                          ff."valueDate" AT TIME ZONE 'UTC',
                          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                        )
                      ELSE NULL
                    END,
                    'Nao informado'
                  ) AS "value",
                  COUNT(DISTINCT r."id")::int AS "total"
                FROM "FormResponseField" ff
                INNER JOIN "FormResponse" r ON r."id" = ff."responseId"
                INNER JOIN "FormVersion" fv ON fv."id" = r."formVersionId"
                WHERE ff."fieldName" = ${field.name}
                  AND fv."formId" = ${form.formId}
                  AND ${responseWhereSql}
                GROUP BY 1
                ORDER BY "total" DESC, "value" ASC
                LIMIT ${params.limitValuesPerField}
              `
            );

            const normalizedType = normalizeText(field.type);
            const hasSelectableItems =
              typeof field.options === "object" &&
              field.options !== null &&
              "items" in field.options &&
              Array.isArray((field.options as { items?: unknown }).items);
            const suggestedFilter =
              normalizedType.includes("date")
                ? "date-range"
                : normalizedType.includes("number")
                ? "number-range"
                : hasSelectableItems
                ? "multi-select"
                : "contains";

            return {
              fieldId: field.id,
              name: field.name,
              label: field.label,
              type: field.type,
              required: field.required,
              ordem: field.ordem,
              optionsConfig: field.options,
              suggestedFilter,
              values: valueRows.map((row) => ({
                value: normalizeLabel(row.value),
                count: normalizeCount(row.total),
              })),
            };
          })
        );

        return {
          formId: form.formId,
          formName: form.formName,
          formDescription: form.formDescription,
          formVersionId: form.formVersionId,
          formVersion: form.formVersion,
          schema: form.schema,
          fields,
        };
      })
    );

    return {
      dateField: params.dateField,
      dateRange: {
        min: dateRange.minDate ? dateRange.minDate.toISOString() : null,
        max: dateRange.maxDate ? dateRange.maxDate.toISOString() : null,
      },
      forms: formsData,
    };
  }

  async report(params: ReportParams) {
    debugLog("report params", params);
    const toStartOfDay = (value: Date) => {
      const date = new Date(value);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const toEndOfDay = (value: Date) => {
      const date = new Date(value);
      date.setHours(23, 59, 59, 999);
      return date;
    };

    const addDays = (value: Date, days: number) => {
      const date = new Date(value);
      date.setDate(date.getDate() + days);
      return date;
    };

    const toDateKey = (value: Date) =>
      value.toISOString().slice(0, 10);

    const fieldFilters = this.normalizeFieldFilters(params);
    const hasFieldFilters = Object.values(fieldFilters).some(
      (values) => values && values.length > 0
    );
    const hasDateFilters = Boolean(
      params.start ||
        params.end ||
        params.dayStart ||
        params.dayEnd ||
        params.monthStart ||
        params.monthEnd
    );
    const hasAnyFilters = hasFieldFilters || hasDateFilters || !!params.status;

    const baseFilters: BaseFilters = {
      projetoId: params.projetoId,
      formVersionId: params.formVersionId,
      status: params.status,
      start: params.start,
      end: params.end,
      ...fieldFilters,
    };

    const monthFilters: BaseFilters = {
      ...baseFilters,
      start: params.monthStart ?? params.start,
      end: params.monthEnd ?? params.end,
    };

    const dayStartParam = params.dayStart
      ? toStartOfDay(params.dayStart)
      : undefined;
    const dayEndParam = params.dayEnd ? toEndOfDay(params.dayEnd) : undefined;
    const dayStartFromMonth = params.monthStart
      ? toStartOfDay(params.monthStart)
      : undefined;
    const dayEndFromMonth = params.monthEnd
      ? toEndOfDay(params.monthEnd)
      : undefined;

    let dayStart =
      dayStartParam ?? dayStartFromMonth ?? (hasAnyFilters ? undefined : null);
    let dayEnd =
      dayEndParam ?? dayEndFromMonth ?? (hasAnyFilters ? undefined : null);

    if (!hasAnyFilters && (dayStart === null || dayEnd === null)) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      dayStart = monthStart;
      dayEnd = monthEnd;
    }

    if (dayStart === null) {
      dayStart = undefined;
    }
    if (dayEnd === null) {
      dayEnd = undefined;
    }

    const todayEnd = toEndOfDay(new Date());
    if (dayEnd && dayEnd > todayEnd) {
      dayEnd = todayEnd;
    }

    const dayFilters: BaseFilters = {
      ...baseFilters,
      start: dayStart ?? params.start,
      end: dayEnd ?? params.end,
    };

    const topThemesCollectionLimit = Math.min(
      200,
      Math.max(params.limitTopThemes * 5, params.limitTopThemes)
    );

    const [
      statusFunnel,
      topTemasRaw,
      topBairros,
      genero,
      campanha,
      tiposRaw,
      anosNascimento,
      mes,
      dia,
    ] = await Promise.all([
      this.statusFunnel(baseFilters),
      this.distribution({
        ...baseFilters,
        fieldName: "opiniao",
        valueType: "string",
        limit: topThemesCollectionLimit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "bairro",
        valueType: "string",
        limit: params.limitTopNeighborhoods,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "genero",
        valueType: "string",
        limit: params.limitDistribution,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "campanha",
        valueType: "string",
        limit: params.limitDistribution,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "tipo_opiniao",
        valueType: "string",
        limit: params.limitDistribution,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "ano_nascimento",
        valueType: "string",
        limit: 200,
      }),
      this.timeSeries({
        ...monthFilters,
        interval: "month",
        dateField: params.dateField,
      }),
      this.timeSeries({
        ...dayFilters,
        interval: "day",
        dateField: params.dateField,
      }),
    ]);

    const topTemas = aggregateDistributionRows(
      topTemasRaw,
      canonicalizeThemeLabel
    ).slice(0, params.limitTopThemes);
    const tipos = aggregateDistributionRows(
      tiposRaw,
      canonicalizeOpinionTypeLabel
    );

    const cards = tipos.reduce(
      (acc, row) => {
        const count = normalizeCount(row.count);
        const key = normalizeText(row.value);
        acc.totalOpinions += count;
        if (key === "reclamacao") {
          acc.totalComplaints += count;
        } else if (key === "elogio") {
          acc.totalPraise += count;
        } else if (key === "sugestao") {
          acc.totalSuggestions += count;
        }
        return acc;
      },
      {
        totalOpinions: 0,
        totalComplaints: 0,
        totalPraise: 0,
        totalSuggestions: 0,
      }
    );

    const referenceDate =
      this.getReferenceDate(params);
    const referenceYear = referenceDate.getFullYear();
    const ageBuckets = new Map(AGE_BUCKETS.map((bucket) => [bucket.label, 0]));
    let unknownAgeCount = 0;

    for (const row of anosNascimento) {
      const count = normalizeCount(row.count);
      const year = Number.parseInt(String(row.value), 10);
      if (!Number.isFinite(year)) {
        unknownAgeCount += count;
        continue;
      }
      const age = referenceYear - year;
      if (!Number.isFinite(age) || age < 0 || age > MAX_AGE) {
        unknownAgeCount += count;
        continue;
      }
      const bucket = AGE_BUCKETS.find(
        (range) => age >= range.min && age <= range.max
      );
      if (!bucket) {
        unknownAgeCount += count;
        continue;
      }
      ageBuckets.set(bucket.label, (ageBuckets.get(bucket.label) ?? 0) + count);
    }

    const opinionsByAge = AGE_BUCKETS.map((bucket) => ({
      label: bucket.label,
      value: ageBuckets.get(bucket.label) ?? 0,
    }));
    if (unknownAgeCount > 0) {
      opinionsByAge.push({ label: "Não informado", value: unknownAgeCount });
    }

    const daySeries = dia.map((row) => ({
      label: formatBucketLabel(row.bucket, "day"),
      value: normalizeCount(row.count),
    }));

    if (dayStart && dayEnd) {
      const dayMap = new Map(
        daySeries.map((item) => [item.label, item.value])
      );
      const filled: { label: string; value: number }[] = [];
      let cursor = toStartOfDay(dayStart);
      const end = toEndOfDay(dayEnd);

      while (cursor <= end) {
        const key = toDateKey(cursor);
        filled.push({ label: key, value: dayMap.get(key) ?? 0 });
        cursor = addDays(cursor, 1);
      }
      daySeries.splice(0, daySeries.length, ...filled);
    }

    return {
      cards,
      lineByMonth: mes.map((row) => ({
        label: formatBucketLabel(row.bucket, "month"),
        value: normalizeCount(row.count),
      })),
      lineByDay: daySeries,
      topBairros: topBairros.map((row) => ({
        label: normalizeLabel(row.value),
        value: normalizeCount(row.count),
      })),
      opinionsByGender: genero.map((row) => ({
        label: normalizeLabel(row.value),
        value: normalizeCount(row.count),
      })),
      opinionsByAge,
      campaignAcceptance: campanha.map((row) => ({
        label: normalizeLabel(row.value),
        value: normalizeCount(row.count),
      })),
      tipoOpiniao: tipos.map((row) => ({
        label: normalizeLabel(row.value),
        value: normalizeCount(row.count),
      })),
      topTemas: topTemas.map((row, index) => ({
        id: index + 1,
        tema: normalizeLabel(row.value),
        total: normalizeCount(row.count),
      })),
      statusFunnel,
    };
  }

  async summary(params: SummaryParams) {
    const referenceDay = params.day ?? new Date();
    const dayStart = this.toLocalCalendarDateStart(referenceDay);
    const dayEnd = this.toLocalCalendarDateEnd(referenceDay);

    const rangeEnd = params.rangeEnd
      ? this.toLocalCalendarDateEnd(params.rangeEnd)
      : dayEnd;
    const rangeStart =
      params.rangeStart
        ? this.toLocalCalendarDateStart(params.rangeStart)
        : new Date(
            rangeEnd.getFullYear() - 1,
            rangeEnd.getMonth(),
            rangeEnd.getDate()
          );

    const fieldFilters = this.normalizeFieldFilters(params);
    const referenceDate = rangeEnd;
    const baseFilters: BaseFilters = {
      projetoId: params.projetoId,
      formVersionId: params.formVersionId,
      status: params.status,
      ...fieldFilters,
    };

    const fieldWhere = this.buildFieldFilterWhere(
      fieldFilters,
      referenceDate
    );
    const fieldAnd = fieldWhere.AND
      ? Array.isArray(fieldWhere.AND)
        ? fieldWhere.AND
        : [fieldWhere.AND]
      : [];

    const [totalOpinionsToday, topTemasRaw, topBairros] = await Promise.all([
      this.client.formResponse.count({
        where: {
          ...(baseFilters.projetoId
            ? { projetoId: baseFilters.projetoId }
            : {}),
          ...(baseFilters.formVersionId
            ? { formVersionId: baseFilters.formVersionId }
            : {}),
          ...(baseFilters.status ? { status: baseFilters.status } : {}),
          createdAt: { gte: dayStart, lte: dayEnd },
          ...(fieldAnd.length ? { AND: fieldAnd } : {}),
        },
      }),
      this.distribution({
        ...baseFilters,
        start: rangeStart,
        end: rangeEnd,
        fieldName: "opiniao",
        valueType: "string",
        limit: params.limitTopThemes,
      }),
      this.distribution({
        ...baseFilters,
        start: rangeStart,
        end: rangeEnd,
        fieldName: "bairro",
        valueType: "string",
        limit: params.limitTopNeighborhoods,
      }),
    ]);

    const topTemas = aggregateDistributionRows(
      topTemasRaw,
      canonicalizeThemeLabel
    ).slice(0, params.limitTopThemes);

    return {
      day: {
        start: dayStart.toISOString(),
        end: dayEnd.toISOString(),
      },
      range: {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      },
      totalOpinionsToday,
      topTemas: topTemas.map((row, index) => ({
        id: index + 1,
        tema: normalizeLabel(row.value),
        total: normalizeCount(row.count),
      })),
      topBairros: topBairros.map((row) => ({
        label: normalizeLabel(row.value),
        value: normalizeCount(row.count),
      })),
    };
  }

  async filters(params: FiltersParams) {
    const fieldFilters = this.normalizeFieldFilters(params);
    const baseFilters: BaseFilters = {
      projetoId: params.projetoId,
      formVersionId: params.formVersionId,
      status: params.status,
      start: params.start,
      end: params.end,
      ...fieldFilters,
    };

    const [
      tipoOpiniaoRaw,
      temasRaw,
      genero,
      bairros,
      campanhas,
      anosNascimento,
    ] = await Promise.all([
      this.distribution({
        ...baseFilters,
        fieldName: "tipo_opiniao",
        valueType: "string",
        limit: params.limit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "opiniao",
        valueType: "string",
        limit: params.limit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "genero",
        valueType: "string",
        limit: params.limit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "bairro",
        valueType: "string",
        limit: params.limit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "campanha",
        valueType: "string",
        limit: params.limit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "ano_nascimento",
        valueType: "string",
        limit: 200,
      }),
    ]);

    const tipoOpiniao = aggregateDistributionRows(
      tipoOpiniaoRaw,
      canonicalizeOpinionTypeLabel
    );
    const temas = aggregateDistributionRows(temasRaw, canonicalizeThemeLabel);

    const referenceDate = this.getReferenceDate(params);
    const referenceYear = referenceDate.getFullYear();
    const ageBuckets = new Map(AGE_BUCKETS.map((bucket) => [bucket.label, 0]));
    let unknownAgeCount = 0;

    for (const row of anosNascimento) {
      const count = normalizeCount(row.count);
      const year = Number.parseInt(String(row.value), 10);
      if (!Number.isFinite(year)) {
        unknownAgeCount += count;
        continue;
      }
      const age = referenceYear - year;
      if (!Number.isFinite(age) || age < 0 || age > MAX_AGE) {
        unknownAgeCount += count;
        continue;
      }
      const bucket = AGE_BUCKETS.find(
        (range) => age >= range.min && age <= range.max
      );
      if (!bucket) {
        unknownAgeCount += count;
        continue;
      }
      ageBuckets.set(bucket.label, (ageBuckets.get(bucket.label) ?? 0) + count);
    }

    const faixaEtaria = AGE_BUCKETS.map((bucket) => ({
      label: bucket.label,
      value: bucket.label,
      count: ageBuckets.get(bucket.label) ?? 0,
    }));
    if (unknownAgeCount > 0) {
      faixaEtaria.push({
        label: "Não informado",
        value: "Não informado",
        count: unknownAgeCount,
      });
    }

    const toOptions = (rows: DistributionRow[]) =>
      rows.map((row) => ({
        label: normalizeLabel(row.value),
        value: normalizeLabel(row.value),
        count: normalizeCount(row.count),
      }));

    return {
      tipoOpiniao: toOptions(tipoOpiniao),
      temas: toOptions(temas),
      genero: toOptions(genero),
      bairros: toOptions(bairros),
      campanhas: toOptions(campanhas),
      faixaEtaria,
    };
  }
}
