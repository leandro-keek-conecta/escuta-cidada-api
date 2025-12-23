import { inject, injectable } from "inversify";
import { Prisma } from "@prisma/client";
import Types from "@/common/container/types";
import * as Z from "zod";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IProjetoRepository } from "../repositories/IProjetoRepository";
import { projetoSchema } from "../http/validators/createProjetoValidator";

interface IRequest {
  data: Z.infer<typeof projetoSchema>;
}

@injectable()
export class CreateProjetoService {
  @inject(Types.ProjetoRepository) private ProjetoRepository!: IProjetoRepository;

  public async execute({ data }: IRequest) {
    try {
      const validatedData = projetoSchema.parse(data);
      const {
        users,
        slug,
        name,
        logoUrl,
        reportId,
        groupId,
        corHex,
        cliente,
        descricaoCurta,
        ativo,
        themeConfig,
        heroConfig,
      } = validatedData;
      const normalizedSlug = slug.trim().toLowerCase();

      const uniqueUserIds = users
        ? Array.from(new Set(users.map((user) => user.id)))
        : [];

      const projetoData: Prisma.ProjetoCreateInput = {
        slug: normalizedSlug,
        name: name.trim(),
        logoUrl: logoUrl ?? null,
        reportId: reportId ?? undefined,
        groupId: groupId ?? undefined,
        corHex: corHex ?? undefined,
        cliente: cliente?.trim(),
        descricaoCurta: descricaoCurta?.trim(),
        ativo: ativo ?? true,
        themeConfig: themeConfig ?? undefined,
        heroConfig: heroConfig ?? undefined,
        users:
          uniqueUserIds.length > 0
            ? {
                create: uniqueUserIds.map((userId) => ({
                  user: { connect: { id: userId } },
                })),
              }
            : undefined,
      };
      

      const newProjeto = await this.ProjetoRepository.create(projetoData);

      return newProjeto;
    } catch (err: any) {
      throw new AppError(
        "Erro ao criar projeto: " + err.message,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
