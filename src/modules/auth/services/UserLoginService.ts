import { inject, injectable } from "inversify";
import jwt from "jsonwebtoken";
import * as argon2 from "argon2";
import * as Z from "zod";

import SecurityConfig from "@/config/SecurityConfig";
import AppError from "@/common/errors/AppError";
import Types from "@/common/container/types";

import LoginValidator from "@/modules/auth/infra/http/validators/UserLoginValidator";
import IUserLoginResponse from "@/modules/auth/responses/IUserLoginResponse";
import { IUserRepository } from "@/modules/user/repositories/IUserRepository";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface IRequest {
  data: Z.infer<typeof LoginValidator>;
}

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

function canonicalizeTheme(value: string) {
  return toThemeKey(value) === "outro" || toThemeKey(value) === "outros"
    ? "Outros"
    : value;
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
    .map((item) => (item ? canonicalizeTheme(item) : item))
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
    const theme = canonicalizeTheme(String(row.tema ?? "").trim());
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
class LoginService {
  @inject(Types.UserRepository) private userRepository!: IUserRepository;

  public async execute({ data }: IRequest): Promise<IUserLoginResponse> {
    const user = await this.userRepository.findByEmail(
      data.email.toLowerCase()
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.password && !(await argon2.verify(user.password, data.password))) {
      throw new AppError("Login ou senha incorretos", 401);
    }

    const accessToken = jwt.sign({ userId: user.id }, SecurityConfig.jwt.key, {
      expiresIn: SecurityConfig.jwt.exp,
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      SecurityConfig.jwt.keyRefresh,
      {
        expiresIn: SecurityConfig.jwt.refreshExp,
      }
    );

    const hiddenTabsByProject = user.hiddenScreens.reduce<
      Record<number, string[]>
    >((acc, screen) => {
      const list = acc[screen.projetoId] ?? [];
      list.push(screen.screenName);
      acc[screen.projetoId] = list;
      return acc;
    }, {});

    const allowedThemesByProject = user.allowedThemes.reduce<
      Record<number, string[]>
    >((acc, theme) => {
      const list = acc[theme.projetoId] ?? [];
      list.push(theme.themeName);
      acc[theme.projetoId] = list;
      return acc;
    }, {});

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
          Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + index, 1)
        )
      )
    );
    const projectIds = user.projetos.map((projeto) => projeto.projeto.id);

    let monthlyRows: MonthlyResponseRow[] = [];
    let last7DaysRows: Last7DaysResponseRow[] = [];
    let themeRows: ThemeResponseRow[] = [];
    let themeFormsByProjectRows: Array<{
      projetoId: number;
      versions: Array<{
        schema: unknown;
        fields: Array<{ options: unknown }>;
      }>;
    }> = [];

    if (projectIds.length) {
      [monthlyRows, last7DaysRows, themeRows, themeFormsByProjectRows] =
        await Promise.all([
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
        prisma.form.findMany({
          where: { projetoId: { in: projectIds } },
          select: {
            projetoId: true,
            versions: {
              where: { isActive: true },
              select: {
                schema: true,
                fields: {
                  where: { name: "opiniao" },
                  select: { options: true },
                },
              },
            },
          },
        }),
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
      Map<string, { tema: string; total: number }>
    >();
    for (const row of themeRows) {
      const projectThemes = themesByProject.get(row.projetoId) ?? new Map();
      const tema = canonicalizeTheme(row.tema);
      const key = toThemeKey(tema);
      const current = projectThemes.get(key);
      if (current) {
        current.total += toNumber(row.total);
      } else {
        projectThemes.set(key, { tema, total: toNumber(row.total) });
      }
      themesByProject.set(row.projetoId, projectThemes);
    }

    const projectThemesFromFormsMap = new Map<number, Map<string, string>>();
    for (const formRow of themeFormsByProjectRows) {
      const currentThemes =
        projectThemesFromFormsMap.get(formRow.projetoId) ?? new Map<string, string>();

      for (const version of formRow.versions) {
        for (const theme of extractThemesFromSchema(version.schema)) {
          const key = toThemeKey(theme);
          if (!currentThemes.has(key)) {
            currentThemes.set(key, theme);
          }
        }

        for (const field of version.fields) {
          for (const theme of extractItemsFromOptions(field.options)) {
            const key = toThemeKey(theme);
            if (!currentThemes.has(key)) {
              currentThemes.set(key, theme);
            }
          }
        }
      }

      projectThemesFromFormsMap.set(formRow.projetoId, currentThemes);
    }

    const projectThemesFromFormsByProject = new Map<number, string[]>();
    for (const [projetoId, themes] of projectThemesFromFormsMap.entries()) {
      projectThemesFromFormsByProject.set(
        projetoId,
        Array.from(themes.values()).sort((a, b) =>
          a.localeCompare(b, "pt-BR", { sensitivity: "base" })
        )
      );
    }

    return {
      accessToken,
      accessTokenExpireIn: SecurityConfig.jwt.exp,
      refreshToken,
      refreshTokenExpireIn: SecurityConfig.jwt.refreshExp,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as Role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        projetos: user.projetos.map((projeto) => ({
          id: projeto.projeto.id,
          slug: projeto.projeto.slug,
          nome: projeto.projeto.name,
          url: projeto.projeto.logoUrl ?? "",
          corHex: projeto.projeto.corHex ?? "",
          reportId: projeto.projeto.reportId ?? "",
          groupId: projeto.projeto.groupId ?? "",
          createdAt: projeto.projeto.createdAt,
          updatedAt: projeto.projeto.updatedAt,
          assignedAt: projeto.assignedAt,
          access: projeto.access,
          hiddenTabs: hiddenTabsByProject[projeto.projeto.id] ?? [],
          temasDoProjeto: mergeProjectThemes(
            projectThemesFromFormsByProject.get(projeto.projeto.id) ?? [],
            Array.from(themesByProject.get(projeto.projeto.id)?.values() ?? [])
          ),
          temasPermitidos: allowedThemesByProject[projeto.projeto.id] ?? [],
          metrics: {
            responsesLast7Days: last7DaysByProject.get(projeto.projeto.id) ?? 0,
            responsesByMonthLast12Months: monthLabels.map((month) => ({
              month,
              total: monthlyByProject.get(projeto.projeto.id)?.get(month) ?? 0,
            })),
            responsesByTheme: Array.from(
              themesByProject.get(projeto.projeto.id)?.values() ?? []
            ),
          },
        })),
      },
    };
  }
}

export default LoginService;
