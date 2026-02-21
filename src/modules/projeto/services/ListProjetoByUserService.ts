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
