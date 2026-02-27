import { inject, injectable } from "inversify";
import { Prisma } from "@prisma/client";
import { IProjetoRepository } from "@/modules/projeto/repositories/IProjetoRepository";
import Types from "@/common/container/types";
import { InternalServerError } from "@/common/errors/InternalServerError";
import { prisma } from "@/lib/prisma";

type MonthlyResponseRow = {
  projetoId: number;
  month: Date;
  total: number;
};

type Last7DaysResponseRow = {
  projetoId: number;
  total: number;
};

type ThemeResponseRow = {
  projetoId: number;
  tema: string;
  total: number;
};

function normalizeThemeOption(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized.length ? normalized : null;
}

function toThemeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isUnknownTheme(value: string) {
  return toThemeKey(value).trim() === "nao informado";
}

function extractItemsFromOptions(options: unknown) {
  if (!options || typeof options !== "object") {
    return [];
  }

  const items = (options as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(normalizeThemeOption)
    .filter((item): item is string => item !== null);
}

function extractThemesFromSchema(schema: unknown) {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const result: string[] = [];
  const schemaRecord = schema as Record<string, unknown>;

  const schemaOpiniao = schemaRecord.opiniao;
  if (schemaOpiniao && typeof schemaOpiniao === "object") {
    const options = (schemaOpiniao as Record<string, unknown>).options;
    result.push(...extractItemsFromOptions(options));
  }

  const fields = schemaRecord.fields;
  if (Array.isArray(fields)) {
    for (const field of fields) {
      if (!field || typeof field !== "object") {
        continue;
      }
      const fieldRecord = field as Record<string, unknown>;
      if (String(fieldRecord.name ?? "").trim() !== "opiniao") {
        continue;
      }
      result.push(...extractItemsFromOptions(fieldRecord.options));
    }
  }

  return result;
}

function extractProjectThemesFromForms(
  forms: Array<{
    versions: Array<{
      isActive: boolean;
      schema: unknown;
      fields: Array<{ name: string; options: unknown }>;
    }>;
  }>
) {
  const themes = new Map<string, string>();

  for (const form of forms) {
    for (const version of form.versions.filter((item) => item.isActive)) {
      for (const theme of extractThemesFromSchema(version.schema)) {
        const key = toThemeKey(theme);
        if (!themes.has(key)) {
          themes.set(key, theme);
        }
      }

      for (const field of version.fields) {
        if (field.name !== "opiniao") {
          continue;
        }
        for (const theme of extractItemsFromOptions(field.options)) {
          const key = toThemeKey(theme);
          if (!themes.has(key)) {
            themes.set(key, theme);
          }
        }
      }
    }
  }

  return Array.from(themes.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

function mergeProjectThemes(
  formThemes: string[],
  responseThemes: Array<{ tema: string; total: number }>
) {
  const merged = new Map<string, string>();

  for (const theme of formThemes) {
    if (!theme || isUnknownTheme(theme)) {
      continue;
    }
    const key = toThemeKey(theme);
    if (!merged.has(key)) {
      merged.set(key, theme);
    }
  }

  for (const row of responseThemes) {
    const theme = String(row.tema ?? "").trim();
    if (!theme || isUnknownTheme(theme)) {
      continue;
    }
    const key = toThemeKey(theme);
    if (!merged.has(key)) {
      merged.set(key, theme);
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

function toMonthLabel(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toNumber(value: number | string | bigint) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return Number.parseInt(value, 10);
}

@injectable()
export class ListProjetosByUseridService {
  @inject(Types.ProjetoRepository) private ProjetoRepository!: IProjetoRepository;

  public async execute(userId: number) {
    try {
      const projects = await this.ProjetoRepository.getProjetosByUserId(userId);
      const now = new Date();
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1, 0, 0, 0, 0)
      );
      const last7DaysStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
      );

      const monthLabels = Array.from({ length: 12 }, (_, index) =>
        toMonthLabel(
          new Date(
            Date.UTC(
              monthStart.getUTCFullYear(),
              monthStart.getUTCMonth() + index,
              1
            )
          )
        )
      );

      const projectIds = (projects ?? []).map((project) => project.id);

      let monthlyRows: MonthlyResponseRow[] = [];
      let last7DaysRows: Last7DaysResponseRow[] = [];
      let themeRows: ThemeResponseRow[] = [];

      if (projectIds.length) {
        [monthlyRows, last7DaysRows, themeRows] = await Promise.all([
          prisma.$queryRaw<MonthlyResponseRow[]>(Prisma.sql`
            SELECT
              r."projetoId" AS "projetoId",
              date_trunc('month', COALESCE(r."submittedAt", r."createdAt")) AS "month",
              COUNT(*)::int AS "total"
            FROM "FormResponse" r
            WHERE r."projetoId" IN (${Prisma.join(projectIds)})
              AND COALESCE(r."submittedAt", r."createdAt") >= ${monthStart}
            GROUP BY r."projetoId", date_trunc('month', COALESCE(r."submittedAt", r."createdAt"))
          `),
          prisma.$queryRaw<Last7DaysResponseRow[]>(Prisma.sql`
            SELECT
              r."projetoId" AS "projetoId",
              COUNT(*)::int AS "total"
            FROM "FormResponse" r
            WHERE r."projetoId" IN (${Prisma.join(projectIds)})
              AND COALESCE(r."submittedAt", r."createdAt") >= ${last7DaysStart}
            GROUP BY r."projetoId"
          `),
          prisma.$queryRaw<ThemeResponseRow[]>(Prisma.sql`
            SELECT
              r."projetoId" AS "projetoId",
              COALESCE(NULLIF(BTRIM(f."value"), ''), 'Nao informado') AS "tema",
              COUNT(DISTINCT r."id")::int AS "total"
            FROM "FormResponseField" f
            INNER JOIN "FormResponse" r ON r."id" = f."responseId"
            WHERE r."projetoId" IN (${Prisma.join(projectIds)})
              AND f."fieldName" = 'opiniao'
            GROUP BY r."projetoId", COALESCE(NULLIF(BTRIM(f."value"), ''), 'Nao informado')
            ORDER BY r."projetoId" ASC, "total" DESC, "tema" ASC
          `),
        ]);
      }

      const monthlyByProject = new Map<number, Map<string, number>>();
      for (const row of monthlyRows) {
        const projectMonths =
          monthlyByProject.get(row.projetoId) ?? new Map<string, number>();
        projectMonths.set(toMonthLabel(new Date(row.month)), toNumber(row.total));
        monthlyByProject.set(row.projetoId, projectMonths);
      }

      const last7DaysByProject = new Map<number, number>();
      for (const row of last7DaysRows) {
        last7DaysByProject.set(row.projetoId, toNumber(row.total));
      }

      const themesByProject = new Map<
        number,
        Array<{ tema: string; total: number }>
      >();
      for (const row of themeRows) {
        const projectThemes = themesByProject.get(row.projetoId) ?? [];
        projectThemes.push({ tema: row.tema, total: toNumber(row.total) });
        themesByProject.set(row.projetoId, projectThemes);
      }

      const safeProjects = (projects ?? []).map((project) => {
        const safeUsers =
          project.users
            ?.map(({ user, assignedAt, access }) => {
              if (!user) {
                return null;
              }
              return { ...user, assignedAt, access };
            })
            .filter((item): item is Exclude<typeof item, null> => item !== null) || [];

        return {
          ...project,
          users: safeUsers,
          temasDoProjeto: mergeProjectThemes(
            extractProjectThemesFromForms(project.forms ?? []),
            themesByProject.get(project.id) ?? []
          ),
          metrics: {
            responsesLast7Days: last7DaysByProject.get(project.id) ?? 0,
            responsesByMonthLast12Months: monthLabels.map((month) => ({
              month,
              total: monthlyByProject.get(project.id)?.get(month) ?? 0,
            })),
            responsesByTheme: themesByProject.get(project.id) ?? [],
          },
        };
      });

      return safeProjects;
    } catch (error: any) {
      console.error("Error retrieving projects:", error.message);

      throw new InternalServerError(
        "An error occurred while retrieving projects."
      );
    }
  }
}
