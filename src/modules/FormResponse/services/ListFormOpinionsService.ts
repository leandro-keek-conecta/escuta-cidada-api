import { FormResponseStatus, Prisma } from "@prisma/client";
import { injectable } from "inversify";

import { normalizeDateRangeBoundary } from "@/common/utils/projectTimeZone";
import { prisma } from "@/lib/prisma";
import { OpinionsQueryInput } from "../http/validators/opinionsValidator";
import { FormResponseWithForm } from "../repositories/IFormResponseRepository";

type FlattenedOpinionResponse = {
  id: number;
  usuario_id: number | string | null;
  horario: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  [key: string]: unknown;
};

type OpinionResponsesGroupedByForm = {
  formId: number;
  formName: string;
  formVersionIds: number[];
  totalResponses: number;
  latestResponseAt: string | null;
  responses: FlattenedOpinionResponse[];
};

type OpinionListResult = {
  projectId: number;
  totalResponses: number;
  returnedResponses: number;
  totalForms: number;
  limit: number;
  offset: number;
  forms: OpinionResponsesGroupedByForm[];
};

type OpinionFieldFilters = {
  temas?: string[];
  tipos?: string[];
  generos?: string[];
  bairros?: string[];
  faixaEtaria?: string[];
  textoOpiniao?: string[];
};

const MAX_AGE = 120;

const AGE_BUCKETS = [
  { label: "Ate 18", min: 0, max: 18 },
  { label: "19-25", min: 19, max: 25 },
  { label: "26-35", min: 26, max: 35 },
  { label: "36-45", min: 36, max: 45 },
  { label: "46-60", min: 46, max: 60 },
  { label: "60+", min: 61, max: Infinity },
];

const THEME_CANONICAL_BY_KEY: Record<string, string> = {
  saude: "Sa\u00fade",
  educacao: "Educa\u00e7\u00e3o",
  seguranca: "Seguran\u00e7a",
  infraestrutura: "Infraestrutura",
  mobilidade: "Mobilidade",
  "meio ambiente": "Meio ambiente",
  outro: "Outros",
  outros: "Outros",
};

const OPINION_TYPE_CANONICAL_BY_KEY: Record<string, string> = {
  reclamacao: "Reclama\u00e7\u00e3o",
  elogio: "Elogio",
  sugestao: "Sugest\u00e3o",
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

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function canonicalizeThemeLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "N\u00e3o informado";
  }
  const normalized = normalizeText(raw);
  return THEME_CANONICAL_BY_KEY[normalized] ?? raw;
}

function canonicalizeOpinionTypeLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "N\u00e3o informado";
  }
  const normalized = normalizeText(raw);
  return OPINION_TYPE_CANONICAL_BY_KEY[normalized] ?? raw;
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

@injectable()
export class ListFormOpinionsService {
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
        if (!trimmed || seen.has(trimmed)) {
          continue;
        }
        seen.add(trimmed);
        merged.push(trimmed);
      }
    }

    return merged.length ? merged : undefined;
  }

  private normalizeFieldFilters(params: OpinionsQueryInput): OpinionFieldFilters {
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
        this.mergeFilterValues(params.tema, params.temas),
        canonicalizeThemeLabel
      ),
      tipos: canonicalizeValues(
        this.mergeFilterValues(params.tipo, params.tipos, params.tipoOpiniao),
        canonicalizeOpinionTypeLabel
      ),
      generos: this.mergeFilterValues(params.genero, params.generos),
      bairros: this.mergeFilterValues(params.bairro, params.bairros),
      faixaEtaria: this.mergeFilterValues(
        params.faixaEtaria,
        params.faixasEtarias
      ),
      textoOpiniao: this.mergeFilterValues(
        params.texto,
        params.textoOpiniao,
        params.busca,
        params.search,
        params.keyword
      ),
    };
  }

  private getFieldNameWhereCondition(fieldName: string) {
    if (fieldName === "tipo_opiniao") {
      return { in: Array.from(OPINION_TYPE_FIELD_CANDIDATES) };
    }

    if (fieldName === "ano_nascimento") {
      return { in: Array.from(BIRTH_YEAR_FIELD_CANDIDATES) };
    }

    return fieldName;
  }

  private getCanonicalValueVariants(fieldName: string, value: string) {
    const variants = new Set<string>([value]);

    if (fieldName === "opiniao") {
      const canonical = canonicalizeThemeLabel(value);
      variants.add(canonical);
      variants.add(getAccentlessVariant(canonical));
      variants.add(getDecomposedUnicodeVariant(canonical));

      if (normalizeText(canonical) === "outros") {
        variants.add("Outro");
        variants.add("Outros");
      }
    }

    if (fieldName === "tipo_opiniao") {
      const canonical = canonicalizeOpinionTypeLabel(value);
      variants.add(canonical);
      variants.add(getAccentlessVariant(canonical));
      variants.add(getDecomposedUnicodeVariant(canonical));
    }

    return Array.from(variants).filter((item) => item.trim().length > 0);
  }

  private addValueFilter(
    and: Prisma.FormResponseWhereInput[],
    fieldName: string,
    values?: string[]
  ) {
    if (!values?.length) {
      return;
    }

    const or: Prisma.FormResponseFieldWhereInput[] = [];
    for (const value of values) {
      for (const candidate of this.getCanonicalValueVariants(fieldName, value)) {
        or.push({
          value: { equals: candidate, mode: "insensitive" as const },
        });
      }
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
  }

  private addTextFilter(
    and: Prisma.FormResponseWhereInput[],
    fieldNames: string[],
    terms?: string[]
  ) {
    if (!terms?.length) {
      return;
    }

    const fieldConditions = fieldNames.map((fieldName) => ({
      fieldName,
      OR: terms.map((term) => ({
        value: { contains: term, mode: "insensitive" as const },
      })),
    }));

    if (!fieldConditions.length) {
      return;
    }

    and.push({
      fields: {
        some: {
          OR: fieldConditions,
        },
      },
    });
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

    return AGE_BUCKETS.find(
      (bucket) => normalizeText(bucket.label) === normalized
    ) ?? null;
  }

  private addAgeFilter(
    and: Prisma.FormResponseWhereInput[],
    labels: string[] | undefined,
    referenceDate: Date
  ) {
    if (!labels?.length) {
      return;
    }

    const referenceYear = referenceDate.getUTCFullYear();
    const years = new Set<string>();

    for (const label of labels) {
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

    if (!years.size) {
      return;
    }

    and.push({
      fields: {
        some: {
          fieldName: this.getFieldNameWhereCondition("ano_nascimento"),
          OR: [{ value: { in: Array.from(years) } }],
        },
      },
    });
  }

  private normalizeValue(field: {
    value: string | null;
    valueJson: Prisma.JsonValue | null;
    valueNumber: number | null;
    valueBool: boolean | null;
    valueDate: Date | null;
  }) {
    return (
      field.value ??
      field.valueJson ??
      field.valueNumber ??
      field.valueBool ??
      (field.valueDate ? field.valueDate.toISOString() : null)
    );
  }

  private flattenResponse(response: FormResponseWithForm): FlattenedOpinionResponse {
    const flattened: FlattenedOpinionResponse = {
      id: response.id,
      usuario_id: response.userId ?? null,
      horario: null,
      startedAt: response.startedAt ? response.startedAt.toISOString() : null,
      submittedAt: response.submittedAt
        ? response.submittedAt.toISOString()
        : null,
      completedAt: response.completedAt
        ? response.completedAt.toISOString()
        : null,
      createdAt: response.createdAt ? response.createdAt.toISOString() : null,
    };

    for (const field of response.fields) {
      flattened[field.fieldName] = this.normalizeValue(field);
    }

    if (
      flattened.horario === null &&
      typeof flattened.horario_opiniao === "string"
    ) {
      flattened.horario = flattened.horario_opiniao;
    }

    if (flattened.horario === null) {
      flattened.horario =
        flattened.submittedAt ?? flattened.createdAt ?? flattened.startedAt ?? null;
    }

    return flattened;
  }

  private groupResponsesByForm(
    projectId: number,
    responses: FormResponseWithForm[],
    limit: number,
    offset: number,
    totalResponses: number
  ): OpinionListResult {
    const groupedByForm = new Map<number, OpinionResponsesGroupedByForm>();

    for (const response of responses) {
      const currentFormId = response.formVersion.form.id;
      const existingGroup = groupedByForm.get(currentFormId);
      const responseDate =
        response.submittedAt ??
        response.completedAt ??
        response.startedAt ??
        response.createdAt;
      const flattenedResponse = this.flattenResponse(response);

      if (existingGroup) {
        existingGroup.responses.push(flattenedResponse);
        existingGroup.totalResponses += 1;
        if (!existingGroup.formVersionIds.includes(response.formVersionId)) {
          existingGroup.formVersionIds.push(response.formVersionId);
        }
        if (
          responseDate &&
          (!existingGroup.latestResponseAt ||
            new Date(responseDate).getTime() >
              new Date(existingGroup.latestResponseAt).getTime())
        ) {
          existingGroup.latestResponseAt = responseDate.toISOString();
        }
        continue;
      }

      groupedByForm.set(currentFormId, {
        formId: currentFormId,
        formName: response.formVersion.form.name,
        formVersionIds: [response.formVersionId],
        totalResponses: 1,
        latestResponseAt: responseDate ? responseDate.toISOString() : null,
        responses: [flattenedResponse],
      });
    }

    const forms = Array.from(groupedByForm.values()).sort(
      (left, right) => right.totalResponses - left.totalResponses
    );

    return {
      projectId,
      totalResponses,
      returnedResponses: responses.length,
      totalForms: forms.length,
      limit,
      offset,
      forms,
    };
  }

  async execute(params: OpinionsQueryInput) {
    const start = normalizeDateRangeBoundary(params.start, "start");
    const end = normalizeDateRangeBoundary(params.end, "end");
    const filters = this.normalizeFieldFilters(params);
    const referenceDate = end ?? new Date();
    const and: Prisma.FormResponseWhereInput[] = [
      {
        fields: {
          some: {
            fieldName: { in: Array.from(OPINION_FORM_FIELD_CANDIDATES) },
          },
        },
      },
    ];

    if (start || end) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (start) {
        createdAt.gte = start;
      }
      if (end) {
        createdAt.lte = end;
      }
      and.push({ createdAt });
    }

    if (params.status) {
      and.push({ status: params.status as FormResponseStatus });
    }

    this.addValueFilter(and, "opiniao", filters.temas);
    this.addValueFilter(and, "tipo_opiniao", filters.tipos);
    this.addValueFilter(and, "genero", filters.generos);
    this.addValueFilter(and, "bairro", filters.bairros);
    this.addTextFilter(and, ["texto_opiniao", "outra_opiniao"], filters.textoOpiniao);
    this.addAgeFilter(and, filters.faixaEtaria, referenceDate);

    const where: Prisma.FormResponseWhereInput = {
      projetoId: params.projetoId,
      ...(and.length ? { AND: and } : {}),
    };

    const [items, total] = await Promise.all([
      this.client.formResponse.findMany({
        where,
        orderBy: [
          { formVersion: { form: { name: "asc" } } },
          { createdAt: "desc" },
        ],
        skip: params.offset,
        take: params.limit,
        include: {
          fields: true,
          formVersion: {
            include: {
              form: true,
            },
          },
        },
      }),
      this.client.formResponse.count({ where }),
    ]);

    return this.groupResponsesByForm(
      params.projetoId,
      items as FormResponseWithForm[],
      params.limit,
      params.offset,
      total
    );
  }
}
