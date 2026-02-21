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
          metrics: {
            responsesLast7Days: last7DaysByProject.get(projeto.projeto.id) ?? 0,
            responsesByMonthLast12Months: monthLabels.map((month) => ({
              month,
              total: monthlyByProject.get(projeto.projeto.id)?.get(month) ?? 0,
            })),
            responsesByTheme: themesByProject.get(projeto.projeto.id) ?? [],
          },
        })),
      },
    };
  }
}

export default LoginService;
