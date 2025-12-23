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
      const { users, ...projectFields } = validatedData;
      const normalizedSlug = projectFields.slug.toLowerCase();

      const projetoData: Prisma.ProjetoCreateInput = {
        slug: normalizedSlug,
        name: projectFields.name,
        logoUrl: projectFields.logoUrl ?? null,
        reportId: projectFields.reportId ?? undefined,
        groupId: projectFields.groupId ?? undefined,
        corHex: projectFields.corHex ?? undefined,
        users:
          users && users.length > 0
            ? {
                create: users.map((user) => ({
                  user: { connect: { id: user.id } },
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
