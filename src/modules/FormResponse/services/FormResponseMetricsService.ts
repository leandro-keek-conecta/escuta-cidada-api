import { FormResponseStatus, Prisma } from "@prisma/client";
import { injectable } from "inversify";
import {
  REALTIME_CHANGE_EVENT,
  REALTIME_GLOBAL_ROOM,
  buildRealtimeRooms,
  type RealtimeScope,
} from "@/common/realtime/realtimeGateway";
import {
  DateInput,
  PROJECT_TIME_ZONE,
  getProjectCurrentDateReference,
  getProjectCurrentMonthBounds,
  getProjectDateKey,
  getProjectDayBounds,
  normalizeDateRangeBoundary,
} from "@/common/utils/projectTimeZone";
import { prisma } from "@/lib/prisma";

const shouldLog = process.env.NODE_ENV !== "production";
const debugLog = (...args: unknown[]) => {
  if (shouldLog) {
    console.log("[FormResponseMetricsService] - FormResponseMetricsService.ts:23", ...args);
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
  origem?: string[];
  origens?: string[];
  faixaEtaria?: string[];
  faixasEtarias?: string[];
  textoOpiniao?: string[];
  texto?: string[];
  busca?: string[];
  search?: string[];
  keyword?: string[];
  campanhas?: string[];
  campanha?: string[];
};

type NormalizedFieldFilters = {
  temas?: string[];
  tipos?: string[];
  generos?: string[];
  bairros?: string[];
  origens?: string[];
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
  start?: DateInput;
  end?: DateInput;
  restrictToOpinionForms?: boolean;
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
  monthStart?: DateInput;
  monthEnd?: DateInput;
  dayStart?: DateInput;
  dayEnd?: DateInput;
  limitTopThemes: number;
  limitTopNeighborhoods: number;
  limitDistribution: number;
};

type ProjectReportParams = BaseFilters & {
  dateField: MetricsDateField;
  monthStart?: DateInput;
  monthEnd?: DateInput;
  dayStart?: DateInput;
  dayEnd?: DateInput;
  limitTopForms: number;
};

type FormFiltersParams = BaseFilters & {
  dateField: MetricsDateField;
  limitValuesPerField: number;
};

type SummaryParams = BaseFilters & {
  day?: DateInput;
  rangeStart?: DateInput;
  rangeEnd?: DateInput;
  limitTopThemes: number;
  limitTopNeighborhoods: number;
};

type FiltersParams = BaseFilters & {
  limit: number;
};

type MetricsRealtimeMeta = {
  event: typeof REALTIME_CHANGE_EVENT;
  rooms: string[];
  scopes: RealtimeScope[];
  entities: Array<"form" | "formVersion" | "formField" | "formResponse">;
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
type ResponseOriginRow = {
  label: string;
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
  outro: "Outros",
  outros: "Outros",
};

const OPINION_TYPE_CANONICAL_BY_KEY: Record<string, string> = {
  reclamacao: "Reclamação",
  elogio: "Elogio",
  sugestao: "Sugestão",
};

const ACCENTED_SQL_CHARS = "áàâãäåéèêëíìîïóòôõöúùûüçñ";
const UNACCENTED_SQL_CHARS = "aaaaaaeeeeiiiiooooouuuucn";

const ORIGIN_CANONICAL_BY_KEY: Record<string, string> = {
  whatsapp: "WhatsApp",
  automation: "WhatsApp",
  web: "Web",
};

const OPINION_TYPE_FIELD_CANDIDATES = [
  "tipo_opiniao",
  "tipo_de_opiniao",
  "tipoopiniao",
  "tipodeopiniao",
  "tipo_da_opiniao",
  "classificacao_opiniao",
] as const;

const BIRTH_YEAR_FIELD_CANDIDATES = [
  "ano_nascimento",
  "ano_de_nascimento",
  "ano",
  "anonascimento",
  "anodenascimento",
  "nascimento",
] as const;

const OPINION_FORM_FIELD_CANDIDATES = [
  "opiniao",
  "texto_opiniao",
  "outra_opiniao",
  ...OPINION_TYPE_FIELD_CANDIDATES,
] as const;

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

function canonicalizeOriginLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "NÃ£o informado";
  }
  const normalized = normalizeText(raw);
  return ORIGIN_CANONICAL_BY_KEY[normalized] ?? raw;
}

function getAccentlessVariant(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDecomposedUnicodeVariant(value: string) {
  return value.normalize("NFD").replace(/\s+/g, " ").trim();
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
    const canonicalizeValues = (
      values: string[] | undefined,
      canonicalizer?: (value: unknown) => string
    ) => {
      if (!values?.length || !canonicalizer) {
        return values;
      }

      return values.map((value) => canonicalizer(value));
    };

    return {
      temas: canonicalizeValues(
        this.mergeFilterValues(params.temas, params.tema),
        canonicalizeThemeLabel
      ),
      tipos: canonicalizeValues(
        this.mergeFilterValues(
          params.tipoOpiniao,
          params.tipos,
          params.tipo
        ),
        canonicalizeOpinionTypeLabel
      ),
      generos: this.mergeFilterValues(params.genero, params.generos),
      bairros: this.mergeFilterValues(params.bairro, params.bairros),
      origens: canonicalizeValues(
        this.mergeFilterValues(params.origem, params.origens),
        canonicalizeOriginLabel
      ),
      faixaEtaria: this.mergeFilterValues(
        params.faixaEtaria,
        params.faixasEtarias
      ),
      textoOpiniao: this.mergeFilterValues(
        params.textoOpiniao,
        params.texto,
        params.busca,
        params.search,
        params.keyword
      ),
      campanhas: this.mergeFilterValues(params.campanhas, params.campanha),
    };
  }

  private buildWhatsAppOriginSql(responseAlias: string): Prisma.Sql {
    const sourceColumn = Prisma.raw(`${responseAlias}."source"`);
    const channelColumn = Prisma.raw(`${responseAlias}."channel"`);

    return Prisma.sql`(
      LOWER(BTRIM(COALESCE(${sourceColumn}, ''))) = 'whatsapp'
      OR LOWER(BTRIM(COALESCE(${channelColumn}, ''))) = 'automation'
    )`;
  }

  private buildOriginFilterSql(responseAlias: string, origins?: string[]) {
    if (!origins?.length) {
      return null;
    }

    const conditions: Prisma.Sql[] = [];
    const normalizedOrigins = new Set(origins.map((value) => normalizeText(value)));
    const whatsappOriginSql = this.buildWhatsAppOriginSql(responseAlias);

    if (normalizedOrigins.has("whatsapp")) {
      conditions.push(whatsappOriginSql);
    }
    if (normalizedOrigins.has("web")) {
      conditions.push(Prisma.sql`NOT ${whatsappOriginSql}`);
    }

    if (!conditions.length) {
      return null;
    }

    return Prisma.join(conditions, " OR ");
  }

  private buildOriginWhere(
    origins?: string[]
  ): Prisma.FormResponseWhereInput | null {
    if (!origins?.length) {
      return null;
    }

    const conditions: Prisma.FormResponseWhereInput[] = [];
    const normalizedOrigins = new Set(origins.map((value) => normalizeText(value)));
    const whatsappOriginWhere: Prisma.FormResponseWhereInput = {
      OR: [
        { source: { equals: "whatsapp", mode: "insensitive" as const } },
        { channel: { equals: "automation", mode: "insensitive" as const } },
      ],
    };
    const webOriginWhere: Prisma.FormResponseWhereInput = {
      AND: [
        {
          OR: [
            { source: null },
            { NOT: { source: { equals: "whatsapp", mode: "insensitive" as const } } },
          ],
        },
        {
          OR: [
            { channel: null },
            { NOT: { channel: { equals: "automation", mode: "insensitive" as const } } },
          ],
        },
      ],
    };

    if (normalizedOrigins.has("whatsapp")) {
      conditions.push(whatsappOriginWhere);
    }
    if (normalizedOrigins.has("web")) {
      conditions.push(webOriginWhere);
    }

    if (!conditions.length) {
      return null;
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  private buildOpinionScopeSql(responseAlias: string) {
    const responseId = Prisma.raw(`${responseAlias}."id"`);

    return Prisma.sql`EXISTS (
      SELECT 1
      FROM "FormResponseField" ff_opinion
      WHERE ff_opinion."responseId" = ${responseId}
        AND ff_opinion."fieldName" IN (${Prisma.join(
          Array.from(OPINION_FORM_FIELD_CANDIDATES)
        )})
    )`;
  }

  private buildOpinionScopeWhere(): Prisma.FormResponseWhereInput {
    return {
      fields: {
        some: {
          fieldName: { in: Array.from(OPINION_FORM_FIELD_CANDIDATES) },
        },
      },
    };
  }

  private getReferenceDate(params: {
    end?: DateInput;
    dayEnd?: DateInput;
    monthEnd?: DateInput;
  }) {
    if (params.end) {
      return normalizeDateRangeBoundary(params.end, "end")!;
    }
    if (params.dayEnd) {
      return this.toProjectCalendarDateEnd(params.dayEnd);
    }
    if (params.monthEnd) {
      return this.toProjectCalendarDateEnd(params.monthEnd);
    }
    return this.getProjectCurrentDateReference();
  }

  private normalizeBaseFilters<T extends BaseFilters>(params: T) {
    return {
      ...params,
      start: normalizeDateRangeBoundary(params.start, "start"),
      end: normalizeDateRangeBoundary(params.end, "end"),
    };
  }

  private toProjectCalendarDateStart(value: DateInput) {
    return getProjectDayBounds(value).start;
  }

  private toProjectCalendarDateEnd(value: DateInput) {
    return getProjectDayBounds(value).end;
  }

  private getProjectCurrentDateReference() {
    return getProjectCurrentDateReference();
  }

  private getProjectCurrentMonthBounds() {
    return getProjectCurrentMonthBounds();
  }

  private getProjectDateKey(value: Date) {
    return getProjectDateKey(value);
  }

  private buildMetricsRealtimeMeta(
    ...scopes: Array<RealtimeScope | undefined>
  ): MetricsRealtimeMeta {
    const normalizedScopes = scopes.flatMap((scope) => {
      if (!scope) {
        return [];
      }

      const normalized: RealtimeScope = {};

      if (typeof scope.projetoId === "number") {
        normalized.projetoId = scope.projetoId;
      }

      if (typeof scope.formId === "number") {
        normalized.formId = scope.formId;
      }

      if (typeof scope.formVersionId === "number") {
        normalized.formVersionId = scope.formVersionId;
      }

      return Object.keys(normalized).length ? [normalized] : [];
    });

    const rooms = new Set<string>([REALTIME_GLOBAL_ROOM]);

    for (const scope of normalizedScopes) {
      for (const room of buildRealtimeRooms(scope)) {
        rooms.add(room);
      }
    }

    return {
      event: REALTIME_CHANGE_EVENT,
      rooms: [...rooms],
      scopes: normalizedScopes,
      entities: ["form", "formVersion", "formField", "formResponse"],
    };
  }

  private getBucketSql(
    interval: MetricsInterval,
    dateColumn: Prisma.Sql | ReturnType<typeof Prisma.raw>
  ) {
    return Prisma.sql`
      date_trunc(
        ${interval},
        timezone(${PROJECT_TIME_ZONE}, ${dateColumn} AT TIME ZONE 'UTC')
      ) AT TIME ZONE ${PROJECT_TIME_ZONE}
    `;
  }

  private isUnknownLabel(value: string) {
    return normalizeText(value) === "nao informado";
  }

  private getFieldNameCandidates(fieldName: string) {
    if (fieldName === "tipo_opiniao") {
      return Array.from(OPINION_TYPE_FIELD_CANDIDATES);
    }

    if (fieldName === "ano_nascimento") {
      return Array.from(BIRTH_YEAR_FIELD_CANDIDATES);
    }

    return [fieldName];
  }

  private isOpinionTypeField(fieldName: string) {
    return this.getFieldNameCandidates("tipo_opiniao").includes(fieldName);
  }

  private getFieldNameWhereCondition(fieldName: string) {
    const candidates = this.getFieldNameCandidates(fieldName);
    return candidates.length === 1 ? candidates[0] : { in: candidates };
  }

  private mergeDistributionRows(...groups: DistributionRow[][]) {
    const grouped = new Map<string, { value: unknown; count: number }>();

    for (const rows of groups) {
      for (const row of rows) {
        const key =
          row.value instanceof Date
            ? row.value.toISOString()
            : JSON.stringify(row.value);
        const current = grouped.get(key);
        const count = normalizeCount(row.count);

        if (current) {
          current.count += count;
          continue;
        }

        grouped.set(key, { value: row.value, count });
      }
    }

    return Array.from(grouped.values()).map((row) => ({
      value: row.value,
      count: row.count,
    }));
  }

  private async distributionByFieldAliases(
    params: Omit<DistributionParams, "fieldName"> & { fieldNames: string[] }
  ) {
    const candidates = Array.from(new Set(params.fieldNames));
    const rows = await Promise.all(
      candidates.map((fieldName) =>
        this.distribution({
          ...params,
          fieldName,
        })
      )
    );

    return this.mergeDistributionRows(...rows);
  }

  private buildOriginLabelSql(responseAlias: string): Prisma.Sql {
    const whatsappOriginSql = this.buildWhatsAppOriginSql(responseAlias);

    return Prisma.sql`
      CASE
        WHEN ${whatsappOriginSql} THEN 'WhatsApp'
        ELSE 'Web'
      END
    `;
  }

  private async distributionByOrigin(
    params: BaseFilters & { limit: number }
  ) {
    const normalizedParams = this.normalizeBaseFilters(params);
    const fieldFilters = this.normalizeFieldFilters(normalizedParams);
    const mergedFormIds = this.mergeFormIds(
      normalizedParams.formId,
      normalizedParams.formIds
    );
    const referenceDate = this.getReferenceDate(normalizedParams);
    const whereParts: Prisma.Sql[] = [];

    if (normalizedParams.projetoId) {
      whereParts.push(Prisma.sql`r."projetoId" = ${normalizedParams.projetoId}`);
    }
    const projectFormScopeSql = this.buildProjectFormScopeSql(
      "r",
      normalizedParams.projetoId
    );
    if (projectFormScopeSql) {
      whereParts.push(projectFormScopeSql);
    }

    if (normalizedParams.formVersionId) {
      whereParts.push(
        Prisma.sql`r."formVersionId" = ${normalizedParams.formVersionId}`
      );
    }
    const formScopeSql = this.buildFormScopeSql("r", mergedFormIds);
    if (formScopeSql) {
      whereParts.push(formScopeSql);
    }

    if (normalizedParams.status) {
      whereParts.push(
        Prisma.sql`r."status" = ${normalizedParams.status}::"FormResponseStatus"`
      );
    }

    if (normalizedParams.start) {
      whereParts.push(Prisma.sql`r."createdAt" >= ${normalizedParams.start}`);
    }

    if (normalizedParams.end) {
      whereParts.push(Prisma.sql`r."createdAt" <= ${normalizedParams.end}`);
    }

    const originSql = this.buildOriginFilterSql("r", fieldFilters.origens);
    if (originSql) {
      whereParts.push(originSql);
    }

    whereParts.push(
      ...this.buildFieldFilterSql("r", fieldFilters, referenceDate)
    );

    const whereSql = whereParts.length
      ? Prisma.join(whereParts, " AND ")
      : Prisma.sql`TRUE`;
    const originLabelSql = this.buildOriginLabelSql("r");
    const rows = await this.client.$queryRaw<DistributionRow[]>(Prisma.sql`
      SELECT ${originLabelSql} AS value,
             COUNT(*)::int AS count
      FROM "FormResponse" r
      WHERE ${whereSql}
      GROUP BY 1
      ORDER BY count DESC, value ASC
      LIMIT ${normalizedParams.limit}
    `);

    return rows.map((row) => ({
      value: row.value,
      count: normalizeCount(row.count),
    }));
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

  private getCanonicalValueVariants(fieldName: string, value: string) {
    const variants = new Set<string>([value]);

    if (fieldName === "opiniao") {
      const canonical = canonicalizeThemeLabel(value);
      variants.add(getDecomposedUnicodeVariant(canonical));
      variants.add(canonical);
      variants.add(getAccentlessVariant(canonical));

      if (normalizeText(canonical) === "outros") {
        variants.add("Outro");
        variants.add("Outros");
      }
    }

    if (this.isOpinionTypeField(fieldName)) {
      const canonical = canonicalizeOpinionTypeLabel(value);
      variants.add(canonical);
      variants.add(getAccentlessVariant(canonical));
      variants.add(getDecomposedUnicodeVariant(canonical));
    }

    return Array.from(variants).filter((item) => item.trim().length > 0);
  }

  private buildValueFilterSql(
    fieldAlias: string,
    values: string[],
    fieldName: string
  ) {
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
      const exactVariants = Array.from(
        new Set(
          knownValues
            .flatMap((value) => this.getCanonicalValueVariants(fieldName, value))
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        )
      );
      const normalizedValues = Array.from(
        new Set(
          exactVariants
            .map((value) => normalizeText(value))
            .filter((value) => value.length > 0)
        )
      );
      const exactMatchSql = exactVariants.length
        ? Prisma.sql`LOWER(BTRIM(COALESCE(${column}, ''))) IN (${Prisma.join(
            exactVariants.map((value) => value.toLowerCase())
          )})`
        : null;
      const normalizedMatchSql = normalizedValues.length
        ? Prisma.sql`${this.buildNormalizedValueSql(column)} IN (${Prisma.join(
            normalizedValues
          )})`
        : null;

      if (exactMatchSql && normalizedMatchSql) {
        conditions.push(Prisma.sql`(${exactMatchSql} OR ${normalizedMatchSql})`);
      } else if (exactMatchSql) {
        conditions.push(exactMatchSql);
      } else if (normalizedMatchSql) {
        conditions.push(normalizedMatchSql);
      }
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
    fieldName: string | string[],
    predicate: Prisma.Sql
  ) {
    const responseId = Prisma.raw(`${responseAlias}."id"`);
    const fieldNames = Array.isArray(fieldName) ? fieldName : [fieldName];
    const fieldNamePredicate =
      fieldNames.length === 1
        ? Prisma.sql`ff."fieldName" = ${fieldNames[0]}`
        : Prisma.sql`ff."fieldName" IN (${Prisma.join(fieldNames)})`;

    return Prisma.sql`EXISTS (
      SELECT 1
      FROM "FormResponseField" ff
      WHERE ff."responseId" = ${responseId}
        AND ${fieldNamePredicate}
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
      const predicate = this.buildValueFilterSql("ff", filters.temas, "opiniao");
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(responseAlias, "opiniao", predicate)
        );
      }
    }

    if (filters.tipos?.length) {
      const predicate = this.buildValueFilterSql(
        "ff",
        filters.tipos,
        "tipo_opiniao"
      );
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(
            responseAlias,
            this.getFieldNameCandidates("tipo_opiniao"),
            predicate
          )
        );
      }
    }

    if (filters.generos?.length) {
      const predicate = this.buildValueFilterSql("ff", filters.generos, "genero");
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(responseAlias, "genero", predicate)
        );
      }
    }

    if (filters.bairros?.length) {
      const predicate = this.buildValueFilterSql("ff", filters.bairros, "bairro");
      if (predicate) {
        clauses.push(
          this.buildFieldExistsSql(responseAlias, "bairro", predicate)
        );
      }
    }

    if (filters.campanhas?.length) {
      const predicate = this.buildValueFilterSql(
        "ff",
        filters.campanhas,
        "campanha"
      );
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
          this.buildFieldExistsSql(
            responseAlias,
            ["texto_opiniao", "outra_opiniao"],
            predicate
          )
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
            this.getFieldNameCandidates("ano_nascimento"),
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
          for (const candidate of this.getCanonicalValueVariants(fieldName, value)) {
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
            fieldName: this.getFieldNameWhereCondition(fieldName),
            OR: or,
          },
        },
      });
    };

    const addTextFilter = (fieldName: string | string[], terms?: string[]) => {
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
            fieldName: Array.isArray(fieldName) ? { in: fieldName } : fieldName,
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
    addTextFilter(["texto_opiniao", "outra_opiniao"], filters.textoOpiniao);

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
              fieldName: this.getFieldNameWhereCondition("ano_nascimento"),
              OR: or,
            },
          },
        });
      }
    }

    return and.length ? { AND: and } : {};
  }

  async timeSeries(params: TimeSeriesParams) {
    const normalizedParams = this.normalizeBaseFilters(params);
    const interval = Prisma.sql`${normalizedParams.interval}`;
    const responseAlias = "r";
    const dateColumn = getDateColumn(normalizedParams.dateField, responseAlias);
    const bucketColumn = this.getBucketSql(normalizedParams.interval, dateColumn);
    const fieldFilters = this.normalizeFieldFilters(normalizedParams);
    const mergedFormIds = this.mergeFormIds(
      normalizedParams.formId,
      normalizedParams.formIds
    );
    const referenceDate = this.getReferenceDate(normalizedParams);

    const whereParts: Prisma.Sql[] = [Prisma.sql`${dateColumn} IS NOT NULL`];
    if (normalizedParams.projetoId) {
      whereParts.push(
        Prisma.sql`${Prisma.raw(`${responseAlias}."projetoId"`)} = ${
          normalizedParams.projetoId
        }`
      );
    }
    const projectFormScopeSql = this.buildProjectFormScopeSql(
      responseAlias,
      normalizedParams.projetoId
    );
    if (projectFormScopeSql) {
      whereParts.push(projectFormScopeSql);
    }
    if (normalizedParams.formVersionId) {
      whereParts.push(
        Prisma.sql`${Prisma.raw(`${responseAlias}."formVersionId"`)} = ${
          normalizedParams.formVersionId
        }`
      );
    }
    const formScopeSql = this.buildFormScopeSql(responseAlias, mergedFormIds);
    if (formScopeSql) {
      whereParts.push(formScopeSql);
    }
    if (normalizedParams.status) {
      whereParts.push(
        Prisma.sql`${Prisma.raw(`${responseAlias}."status"`)} = ${
          normalizedParams.status
        }::"FormResponseStatus"`
      );
    }
    if (normalizedParams.start) {
      whereParts.push(Prisma.sql`${dateColumn} >= ${normalizedParams.start}`);
    }
    if (normalizedParams.end) {
      whereParts.push(Prisma.sql`${dateColumn} <= ${normalizedParams.end}`);
    }
    const originSql = this.buildOriginFilterSql(
      responseAlias,
      fieldFilters.origens
    );
    if (originSql) {
      whereParts.push(originSql);
    }
    if (normalizedParams.restrictToOpinionForms) {
      whereParts.push(this.buildOpinionScopeSql(responseAlias));
    }

    whereParts.push(
      ...this.buildFieldFilterSql(responseAlias, fieldFilters, referenceDate)
    );

    const whereSql = Prisma.join(whereParts, " AND ");
    const rows = await this.client.$queryRaw<SeriesRow[]>(Prisma.sql`
      SELECT ${bucketColumn} AS bucket,
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
    const normalizedParams = this.normalizeBaseFilters(params);
    const valueColumn = (() => {
      switch (normalizedParams.valueType) {
        case "number":
          return Prisma.raw('f."valueNumber"');
        case "boolean":
          return Prisma.raw('f."valueBool"');
        case "date":
          return Prisma.sql`
            date_trunc(
              'day',
              timezone(${PROJECT_TIME_ZONE}, f."valueDate" AT TIME ZONE 'UTC')
            ) AT TIME ZONE ${PROJECT_TIME_ZONE}
          `;
        case "string":
        default:
          return Prisma.raw('f."value"');
      }
    })();

    const fieldFilters = this.normalizeFieldFilters(normalizedParams);
    const mergedFormIds = this.mergeFormIds(
      normalizedParams.formId,
      normalizedParams.formIds
    );
    const referenceDate = this.getReferenceDate(normalizedParams);
    const whereParts: Prisma.Sql[] = [Prisma.sql`${valueColumn} IS NOT NULL`];

    if (normalizedParams.fieldId) {
      whereParts.push(Prisma.sql`f."fieldId" = ${normalizedParams.fieldId}`);
    }

    if (normalizedParams.fieldName) {
      whereParts.push(Prisma.sql`f."fieldName" = ${normalizedParams.fieldName}`);
    }

    if (normalizedParams.projetoId) {
      whereParts.push(Prisma.sql`r."projetoId" = ${normalizedParams.projetoId}`);
    }
    const projectFormScopeSql = this.buildProjectFormScopeSql(
      "r",
      normalizedParams.projetoId
    );
    if (projectFormScopeSql) {
      whereParts.push(projectFormScopeSql);
    }

    if (normalizedParams.formVersionId) {
      whereParts.push(
        Prisma.sql`r."formVersionId" = ${normalizedParams.formVersionId}`
      );
    }
    const formScopeSql = this.buildFormScopeSql("r", mergedFormIds);
    if (formScopeSql) {
      whereParts.push(formScopeSql);
    }

    if (normalizedParams.status) {
      whereParts.push(
        Prisma.sql`r."status" = ${normalizedParams.status}::"FormResponseStatus"`
      );
    }

    if (normalizedParams.start) {
      whereParts.push(Prisma.sql`r."createdAt" >= ${normalizedParams.start}`);
    }

    if (normalizedParams.end) {
      whereParts.push(Prisma.sql`r."createdAt" <= ${normalizedParams.end}`);
    }
    const originSql = this.buildOriginFilterSql("r", fieldFilters.origens);
    if (originSql) {
      whereParts.push(originSql);
    }
    if (normalizedParams.restrictToOpinionForms) {
      whereParts.push(this.buildOpinionScopeSql("r"));
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
      LIMIT ${normalizedParams.limit}
    `);

    return rows.map((row) => ({
      value: row.value instanceof Date ? row.value.toISOString() : row.value,
      count: normalizeCount(row.count),
    }));
  }

  async numberStats(params: NumberStatsParams) {
    const normalizedParams = this.normalizeBaseFilters(params);
    const whereParts: Prisma.Sql[] = [
      Prisma.sql`f."valueNumber" IS NOT NULL`,
      Prisma.sql`f."fieldId" = ${normalizedParams.fieldId}`,
    ];

    const fieldFilters = this.normalizeFieldFilters(normalizedParams);
    const mergedFormIds = this.mergeFormIds(
      normalizedParams.formId,
      normalizedParams.formIds
    );
    const referenceDate = this.getReferenceDate(normalizedParams);

    if (normalizedParams.projetoId) {
      whereParts.push(Prisma.sql`r."projetoId" = ${normalizedParams.projetoId}`);
    }
    const projectFormScopeSql = this.buildProjectFormScopeSql(
      "r",
      normalizedParams.projetoId
    );
    if (projectFormScopeSql) {
      whereParts.push(projectFormScopeSql);
    }

    if (normalizedParams.formVersionId) {
      whereParts.push(
        Prisma.sql`r."formVersionId" = ${normalizedParams.formVersionId}`
      );
    }
    const formScopeSql = this.buildFormScopeSql("r", mergedFormIds);
    if (formScopeSql) {
      whereParts.push(formScopeSql);
    }

    if (normalizedParams.status) {
      whereParts.push(
        Prisma.sql`r."status" = ${normalizedParams.status}::"FormResponseStatus"`
      );
    }

    if (normalizedParams.start) {
      whereParts.push(Prisma.sql`r."createdAt" >= ${normalizedParams.start}`);
    }

    if (normalizedParams.end) {
      whereParts.push(Prisma.sql`r."createdAt" <= ${normalizedParams.end}`);
    }
    const originSql = this.buildOriginFilterSql("r", fieldFilters.origens);
    if (originSql) {
      whereParts.push(originSql);
    }
    if (normalizedParams.restrictToOpinionForms) {
      whereParts.push(this.buildOpinionScopeSql("r"));
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
    const normalizedParams = this.normalizeBaseFilters(params);
    const where: Prisma.FormResponseWhereInput = {};
    const fieldFilters = this.normalizeFieldFilters(normalizedParams);
    const mergedFormIds = this.mergeFormIds(
      normalizedParams.formId,
      normalizedParams.formIds
    );
    const referenceDate = this.getReferenceDate(normalizedParams);

    if (normalizedParams.projetoId) {
      where.projetoId = normalizedParams.projetoId;
      const baseAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [
        ...baseAnd,
        { formVersion: { form: { projetoId: normalizedParams.projetoId } } },
      ];
    }

    if (normalizedParams.formVersionId) {
      where.formVersionId = normalizedParams.formVersionId;
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

      if (normalizedParams.formVersionId) {
        if (!versionIds.includes(normalizedParams.formVersionId)) {
          return [];
        }
      } else {
        where.formVersionId = { in: versionIds };
      }
    }

    if (normalizedParams.start || normalizedParams.end) {
      where.createdAt = {};
      if (normalizedParams.start) {
        where.createdAt.gte = normalizedParams.start;
      }
      if (normalizedParams.end) {
        where.createdAt.lte = normalizedParams.end;
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
    const originWhere = this.buildOriginWhere(fieldFilters.origens);
    if (fieldAnd.length) {
      const baseAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...baseAnd, ...fieldAnd];
    }
    if (originWhere) {
      const baseAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...baseAnd, originWhere];
    }
    if (normalizedParams.restrictToOpinionForms) {
      const baseAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...baseAnd, this.buildOpinionScopeWhere()];
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
    const normalizedParams = this.normalizeBaseFilters(params);
    debugLog("projectReport params", normalizedParams);
    const mergedFormIds = this.mergeFormIds(
      normalizedParams.formId,
      normalizedParams.formIds
    );
    const fieldFilters = this.normalizeFieldFilters(normalizedParams);

    const addDays = (value: Date, days: number) => {
      const date = new Date(value);
      date.setDate(date.getDate() + days);
      return date;
    };

    const hasDateFilters = Boolean(
      normalizedParams.start ||
        normalizedParams.end ||
        normalizedParams.dayStart ||
        normalizedParams.dayEnd ||
        normalizedParams.monthStart ||
        normalizedParams.monthEnd
    );
    const hasAnyFilters = hasDateFilters || !!normalizedParams.status;

    const baseFilters: BaseFilters = {
      projetoId: normalizedParams.projetoId,
      formVersionId: normalizedParams.formVersionId,
      formIds: mergedFormIds,
      status: normalizedParams.status,
      start: normalizedParams.start,
      end: normalizedParams.end,
      origens: fieldFilters.origens,
    };

    const monthStart = normalizedParams.monthStart
      ? this.toProjectCalendarDateStart(normalizedParams.monthStart)
      : undefined;
    const monthEnd = normalizedParams.monthEnd
      ? this.toProjectCalendarDateEnd(normalizedParams.monthEnd)
      : undefined;

    const monthFilters: BaseFilters = {
      ...baseFilters,
      start: monthStart ?? normalizedParams.start,
      end: monthEnd ?? normalizedParams.end,
    };

    const dayStartParam = normalizedParams.dayStart
      ? this.toProjectCalendarDateStart(normalizedParams.dayStart)
      : undefined;
    const dayEndParam = normalizedParams.dayEnd
      ? this.toProjectCalendarDateEnd(normalizedParams.dayEnd)
      : undefined;
    const dayStartFromMonth = monthStart;
    const dayEndFromMonth = monthEnd;

    let dayStart =
      dayStartParam ?? dayStartFromMonth ?? (hasAnyFilters ? undefined : null);
    let dayEnd =
      dayEndParam ?? dayEndFromMonth ?? (hasAnyFilters ? undefined : null);

    if (!hasAnyFilters && (dayStart === null || dayEnd === null)) {
      const currentMonth = this.getProjectCurrentMonthBounds();
      dayStart = currentMonth.start;
      dayEnd = currentMonth.end;
    }

    if (dayStart === null) {
      dayStart = undefined;
    }
    if (dayEnd === null) {
      dayEnd = undefined;
    }

    const todayEnd = this.toProjectCalendarDateEnd(
      this.getProjectCurrentDateReference()
    );
    if (dayEnd && dayEnd > todayEnd) {
      dayEnd = todayEnd;
    }

    const dayFilters: BaseFilters = {
      ...baseFilters,
      start: dayStart ?? normalizedParams.start,
      end: dayEnd ?? normalizedParams.end,
    };

    const buildReportWhereSql = (
      responseAlias: string,
      filters: Pick<
        BaseFilters,
        | "projetoId"
        | "formVersionId"
        | "formIds"
        | "status"
        | "start"
        | "end"
        | "origens"
      >
    ) => {
      const dateColumn = getDateColumn(normalizedParams.dateField, responseAlias);
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
      const originSql = this.buildOriginFilterSql(responseAlias, filters.origens);
      if (originSql) {
        whereParts.push(originSql);
      }

      return Prisma.join(whereParts, " AND ");
    };

    const baseWhereSql = buildReportWhereSql("r", baseFilters);

    const [statusRows, mes, dia, originRows, opinionFormRows, opinionTypeRows] = await Promise.all([
      this.client.$queryRaw<StatusCountRow[]>(Prisma.sql`
        SELECT r."status" AS "status", COUNT(*)::int AS "count"
        FROM "FormResponse" r
        WHERE ${baseWhereSql}
        GROUP BY r."status"
      `),
      this.timeSeries({
        ...monthFilters,
        interval: "month",
        dateField: normalizedParams.dateField,
      }),
      this.timeSeries({
        ...dayFilters,
        interval: "day",
        dateField: normalizedParams.dateField,
      }),
      this.client.$queryRaw<ResponseOriginRow[]>(Prisma.sql`
        SELECT
          CASE
            WHEN LOWER(BTRIM(COALESCE(r."source", ''))) = 'whatsapp'
              OR LOWER(BTRIM(COALESCE(r."channel", ''))) = 'automation'
            THEN 'WhatsApp'
            ELSE 'Web'
          END AS "label",
          COUNT(*)::int AS "total"
        FROM "FormResponse" r
        WHERE ${baseWhereSql}
        GROUP BY 1
        ORDER BY "total" DESC, "label" ASC
      `),
      this.client.$queryRaw<TotalRow[]>(Prisma.sql`
        SELECT COUNT(*)::int AS "total"
        FROM "FormResponse" r
        WHERE ${baseWhereSql}
          AND EXISTS (
            SELECT 1
            FROM "FormResponseField" ff
            WHERE ff."responseId" = r."id"
              AND ff."fieldName" IN (${Prisma.join([
                "opiniao",
                ...this.getFieldNameCandidates("tipo_opiniao"),
              ])})
          )
      `),
      this.client.$queryRaw<OpinionTypeRow[]>(Prisma.sql`
        SELECT
          COALESCE(NULLIF(BTRIM(ff."value"), ''), 'Nao informado') AS "tipoOpiniao",
          COUNT(DISTINCT r."id")::int AS "total"
        FROM "FormResponse" r
        INNER JOIN "FormResponseField" ff
          ON ff."responseId" = r."id"
         AND ff."fieldName" IN (${Prisma.join(
           this.getFieldNameCandidates("tipo_opiniao")
         )})
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
      let cursor = dayStart;
      const end = dayEnd;

      while (cursor <= end) {
        const key = this.getProjectDateKey(cursor);
        filled.push({ label: key, value: dayMap.get(key) ?? 0 });
        cursor = addDays(cursor, 1);
      }
      daySeries.splice(0, daySeries.length, ...filled);
    }

    const originCounts = new Map<string, number>([
      ["Web", 0],
      ["WhatsApp", 0],
    ]);

    for (const row of originRows) {
      originCounts.set(String(row.label), normalizeCount(row.total));
    }

    return {
      meta: {
        timeZone: PROJECT_TIME_ZONE,
        realtime: this.buildMetricsRealtimeMeta(
          {
            projetoId: normalizedParams.projetoId,
            formVersionId: normalizedParams.formVersionId,
            formId: normalizedParams.formId,
          },
          ...(mergedFormIds?.map((formId) => ({ formId })) ?? [])
        ),
      },
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
      responsesByOrigin: Array.from(originCounts.entries()).map(([label, value]) => ({
        label,
        value,
      })),
      statusFunnel,
    };
  }

  async formFilters(params: FormFiltersParams) {
    const normalizedParams = this.normalizeBaseFilters(params);
    debugLog("formFilters params", normalizedParams);

    const mergedFormIds = this.mergeFormIds(
      normalizedParams.formId,
      normalizedParams.formIds
    );

    const forms = await this.client.form.findMany({
      where: {
        ...(normalizedParams.projetoId
          ? { projetoId: normalizedParams.projetoId }
          : {}),
        ...(mergedFormIds?.length ? { id: { in: mergedFormIds } } : {}),
        ...(normalizedParams.formVersionId
          ? { versions: { some: { id: normalizedParams.formVersionId } } }
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
          (normalizedParams.formVersionId
            ? form.versions.find(
                (item) => item.id === normalizedParams.formVersionId
              )
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
      const dateColumn = getDateColumn(normalizedParams.dateField, responseAlias);
      const whereParts: Prisma.Sql[] = [Prisma.sql`${dateColumn} IS NOT NULL`];

      if (normalizedParams.projetoId) {
        whereParts.push(
          Prisma.sql`${Prisma.raw(`${responseAlias}."projetoId"`)} = ${
            normalizedParams.projetoId
          }`
        );
      }
      const projectFormScopeSql = this.buildProjectFormScopeSql(
        responseAlias,
        normalizedParams.projetoId
      );
      if (projectFormScopeSql) {
        whereParts.push(projectFormScopeSql);
      }

      if (normalizedParams.formVersionId) {
        whereParts.push(
          Prisma.sql`${Prisma.raw(`${responseAlias}."formVersionId"`)} = ${
            normalizedParams.formVersionId
          }`
        );
      }

      const formScopeSql = this.buildFormScopeSql(responseAlias, mergedFormIds);
      if (formScopeSql) {
        whereParts.push(formScopeSql);
      }

      if (normalizedParams.status) {
        whereParts.push(
          Prisma.sql`${Prisma.raw(`${responseAlias}."status"`)} = ${
            normalizedParams.status
          }::"FormResponseStatus"`
        );
      }

      if (normalizedParams.start) {
        whereParts.push(Prisma.sql`${dateColumn} >= ${normalizedParams.start}`);
      }

      if (normalizedParams.end) {
        whereParts.push(Prisma.sql`${dateColumn} <= ${normalizedParams.end}`);
      }

      return Prisma.join(whereParts, " AND ");
    };

    const responseWhereSql = buildWhereSql("r");

    const dateRangeRows = await this.client.$queryRaw<
      Array<{ minDate: Date | null; maxDate: Date | null }>
    >(Prisma.sql`
      SELECT
        MIN(${getDateColumn(normalizedParams.dateField, "r")}) AS "minDate",
        MAX(${getDateColumn(normalizedParams.dateField, "r")}) AS "maxDate"
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
                LIMIT ${normalizedParams.limitValuesPerField}
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
      dateField: normalizedParams.dateField,
      dateRange: {
        min: dateRange.minDate ? dateRange.minDate.toISOString() : null,
        max: dateRange.maxDate ? dateRange.maxDate.toISOString() : null,
      },
      forms: formsData,
    };
  }

  async report(params: ReportParams) {
    const normalizedParams = this.normalizeBaseFilters(params);
    debugLog("report params", normalizedParams);

    const addDays = (value: Date, days: number) => {
      const date = new Date(value);
      date.setDate(date.getDate() + days);
      return date;
    };

    const fieldFilters = this.normalizeFieldFilters(normalizedParams);
    const hasFieldFilters = Object.values(fieldFilters).some(
      (values) => values && values.length > 0
    );
    const hasDateFilters = Boolean(
      normalizedParams.start ||
        normalizedParams.end ||
        normalizedParams.dayStart ||
        normalizedParams.dayEnd ||
        normalizedParams.monthStart ||
        normalizedParams.monthEnd
    );
    const hasAnyFilters =
      hasFieldFilters || hasDateFilters || !!normalizedParams.status;

    const baseFilters: BaseFilters = {
      projetoId: normalizedParams.projetoId,
      formVersionId: normalizedParams.formVersionId,
      status: normalizedParams.status,
      start: normalizedParams.start,
      end: normalizedParams.end,
      restrictToOpinionForms: true,
      ...fieldFilters,
    };

    const monthStart = normalizedParams.monthStart
      ? this.toProjectCalendarDateStart(normalizedParams.monthStart)
      : undefined;
    const monthEnd = normalizedParams.monthEnd
      ? this.toProjectCalendarDateEnd(normalizedParams.monthEnd)
      : undefined;

    const monthFilters: BaseFilters = {
      ...baseFilters,
      start: monthStart ?? normalizedParams.start,
      end: monthEnd ?? normalizedParams.end,
    };

    const dayStartParam = normalizedParams.dayStart
      ? this.toProjectCalendarDateStart(normalizedParams.dayStart)
      : undefined;
    const dayEndParam = normalizedParams.dayEnd
      ? this.toProjectCalendarDateEnd(normalizedParams.dayEnd)
      : undefined;
    const dayStartFromMonth = monthStart;
    const dayEndFromMonth = monthEnd;

    let dayStart =
      dayStartParam ?? dayStartFromMonth ?? (hasAnyFilters ? undefined : null);
    let dayEnd =
      dayEndParam ?? dayEndFromMonth ?? (hasAnyFilters ? undefined : null);

    if (!hasAnyFilters && (dayStart === null || dayEnd === null)) {
      const currentMonth = this.getProjectCurrentMonthBounds();
      dayStart = currentMonth.start;
      dayEnd = currentMonth.end;
    }

    if (dayStart === null) {
      dayStart = undefined;
    }
    if (dayEnd === null) {
      dayEnd = undefined;
    }

    const todayEnd = this.toProjectCalendarDateEnd(
      this.getProjectCurrentDateReference()
    );
    if (dayEnd && dayEnd > todayEnd) {
      dayEnd = todayEnd;
    }

    const dayFilters: BaseFilters = {
      ...baseFilters,
      start: dayStart ?? normalizedParams.start,
      end: dayEnd ?? normalizedParams.end,
    };

    const topThemesCollectionLimit = Math.min(
      200,
      Math.max(
        normalizedParams.limitTopThemes * 5,
        normalizedParams.limitTopThemes
      )
    );
    const referenceDate = this.getReferenceDate(normalizedParams);
    const fieldWhere = this.buildFieldFilterWhere(fieldFilters, referenceDate);
    const fieldAnd = fieldWhere.AND
      ? Array.isArray(fieldWhere.AND)
        ? fieldWhere.AND
        : [fieldWhere.AND]
      : [];
    const originWhere = this.buildOriginWhere(fieldFilters.origens);
    const opinionScopeWhere = this.buildOpinionScopeWhere();
    const opinionScopeAnd = [
      opinionScopeWhere,
      ...(originWhere ? [originWhere] : []),
    ];
    const currentDay = this.getProjectCurrentDateReference();
    const currentDayStart = this.toProjectCalendarDateStart(currentDay);
    const currentDayEnd = this.toProjectCalendarDateEnd(currentDay);

    const [
      totalOpinionsToday,
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
      this.client.formResponse.count({
        where: {
          ...(baseFilters.projetoId
            ? { projetoId: baseFilters.projetoId }
            : {}),
          ...(baseFilters.formVersionId
            ? { formVersionId: baseFilters.formVersionId }
            : {}),
          ...(baseFilters.status ? { status: baseFilters.status } : {}),
          [normalizedParams.dateField]: {
            gte: currentDayStart,
            lte: currentDayEnd,
          },
          AND: [...opinionScopeAnd, ...fieldAnd],
        },
      }),
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
        limit: normalizedParams.limitTopNeighborhoods,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "genero",
        valueType: "string",
        limit: normalizedParams.limitDistribution,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "campanha",
        valueType: "string",
        limit: normalizedParams.limitDistribution,
      }),
      this.distributionByFieldAliases({
        ...baseFilters,
        fieldNames: this.getFieldNameCandidates("tipo_opiniao"),
        valueType: "string",
        limit: normalizedParams.limitDistribution,
      }),
      this.distributionByFieldAliases({
        ...baseFilters,
        fieldNames: this.getFieldNameCandidates("ano_nascimento"),
        valueType: "string",
        limit: 200,
      }),
      this.timeSeries({
        ...monthFilters,
        interval: "month",
        dateField: normalizedParams.dateField,
      }),
      this.timeSeries({
        ...dayFilters,
        interval: "day",
        dateField: normalizedParams.dateField,
      }),
    ]);

    const topTemas = aggregateDistributionRows(
      topTemasRaw,
      canonicalizeThemeLabel
    ).slice(0, normalizedParams.limitTopThemes);
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
      let cursor = dayStart;
      const end = dayEnd;

      while (cursor <= end) {
        const key = this.getProjectDateKey(cursor);
        filled.push({ label: key, value: dayMap.get(key) ?? 0 });
        cursor = addDays(cursor, 1);
      }
      daySeries.splice(0, daySeries.length, ...filled);
    }

    return {
      meta: {
        timeZone: PROJECT_TIME_ZONE,
        realtime: this.buildMetricsRealtimeMeta({
          projetoId: normalizedParams.projetoId,
          formVersionId: normalizedParams.formVersionId,
        }),
      },
      cards,
      opinions_today: totalOpinionsToday,
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
    const referenceDay = params.day ?? this.getProjectCurrentDateReference();
    const dayStart = this.toProjectCalendarDateStart(referenceDay);
    const dayEnd = this.toProjectCalendarDateEnd(referenceDay);
    const rangeReferenceStart = params.rangeEnd
      ? this.toProjectCalendarDateStart(params.rangeEnd)
      : dayStart;

    const rangeEnd = params.rangeEnd
      ? this.toProjectCalendarDateEnd(params.rangeEnd)
      : dayEnd;
    const rangeStart =
      params.rangeStart
        ? this.toProjectCalendarDateStart(params.rangeStart)
        : this.toProjectCalendarDateStart(
            new Date(
              Date.UTC(
                rangeReferenceStart.getUTCFullYear() - 1,
                rangeReferenceStart.getUTCMonth(),
                rangeReferenceStart.getUTCDate()
              )
            )
          );

    const fieldFilters = this.normalizeFieldFilters(params);
    const referenceDate = rangeEnd;
    const baseFilters: BaseFilters = {
      projetoId: params.projetoId,
      formVersionId: params.formVersionId,
      status: params.status,
      ...fieldFilters,
      restrictToOpinionForms: true,
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
    const originWhere = this.buildOriginWhere(fieldFilters.origens);
    const opinionScopeWhere = this.buildOpinionScopeWhere();
    const opinionScopeAnd = [
      opinionScopeWhere,
      ...(originWhere ? [originWhere] : []),
    ];

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
          AND: [...opinionScopeAnd, ...fieldAnd],
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
    const normalizedParams = this.normalizeBaseFilters(params);
    const fieldFilters = this.normalizeFieldFilters(normalizedParams);
    const baseFilters: BaseFilters = {
      projetoId: normalizedParams.projetoId,
      formVersionId: normalizedParams.formVersionId,
      status: normalizedParams.status,
      start: normalizedParams.start,
      end: normalizedParams.end,
      ...fieldFilters,
    };

    const [
      tipoOpiniaoRaw,
      temasRaw,
      genero,
      bairros,
      origens,
      campanhas,
      anosNascimento,
    ] = await Promise.all([
      this.distributionByFieldAliases({
        ...baseFilters,
        fieldNames: this.getFieldNameCandidates("tipo_opiniao"),
        valueType: "string",
        limit: normalizedParams.limit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "opiniao",
        valueType: "string",
        limit: normalizedParams.limit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "genero",
        valueType: "string",
        limit: normalizedParams.limit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "bairro",
        valueType: "string",
        limit: normalizedParams.limit,
      }),
      this.distributionByOrigin({
        ...baseFilters,
        limit: normalizedParams.limit,
      }),
      this.distribution({
        ...baseFilters,
        fieldName: "campanha",
        valueType: "string",
        limit: normalizedParams.limit,
      }),
      this.distributionByFieldAliases({
        ...baseFilters,
        fieldNames: this.getFieldNameCandidates("ano_nascimento"),
        valueType: "string",
        limit: 200,
      }),
    ]);

    const tipoOpiniao = aggregateDistributionRows(
      tipoOpiniaoRaw,
      canonicalizeOpinionTypeLabel
    );
    const temas = aggregateDistributionRows(temasRaw, canonicalizeThemeLabel);

    const referenceDate = this.getReferenceDate(normalizedParams);
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
      origens: toOptions(origens),
      campanhas: toOptions(campanhas),
      faixaEtaria,
    };
  }
}
