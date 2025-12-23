import { Prisma } from "@prisma/client";
import { inject, injectable } from "inversify";
import * as Z from "zod";

import Types from "@/common/container/types";
import { InternalServerError } from "@/common/errors/InternalServerError";
import { ValidationError } from "@/common/errors/ValidationError";
import { IProjetoRepository } from "../repositories/IProjetoRepository";
import { ProjetoDoesNotExist } from "../errors/ProjetoDoesNotExist";
import { UpdateProjetoUpdateSchema } from "../http/validators/updateProjetoValidator";
import { IUserRepository } from "@/modules/user/repositories/IUserRepository";

type UpdateProjetoData = Omit<Z.infer<typeof UpdateProjetoUpdateSchema>, "id">;

interface IRequest {
  id: number;
  data: UpdateProjetoData;
}

@injectable()
export class UpdateProjetoService {
  @inject(Types.ProjetoRepository) private ProjetoRepository!: IProjetoRepository;
  @inject(Types.UserRepository) private userRepository!: IUserRepository;

  async execute({ id, data }: IRequest) {
    try {
      if (!id) {
        throw new ValidationError("ID is required", []);
      }

      const projeto = await this.ProjetoRepository.findById(id);
      if (!projeto) {
        throw new ProjetoDoesNotExist("Projeto does not exist");
      }

      const {
        slug,
        name,
        cliente,
        descricaoCurta,
        reportId,
        groupId,
        corHex,
        logoUrl,
        ativo,
        themeConfig,
        heroConfig,
        users,
      } = UpdateProjetoUpdateSchema.parse(data);

      const updateData: Prisma.ProjetoUpdateInput = {
        updatedAt: new Date(),
      };

      if (slug !== undefined) {
        updateData.slug = slug.trim().toLowerCase();
      }
      if (name !== undefined) {
        updateData.name = name.trim();
      }
      if (cliente !== undefined) {
        updateData.cliente = cliente.trim();
      }
      if (descricaoCurta !== undefined) {
        updateData.descricaoCurta = descricaoCurta.trim();
      }
      if (reportId !== undefined) {
        updateData.reportId = reportId;
      }
      if (groupId !== undefined) {
        updateData.groupId = groupId;
      }
      if (corHex !== undefined) {
        updateData.corHex = corHex;
      }
      if (logoUrl !== undefined) {
        updateData.logoUrl = logoUrl;
      }
      if (ativo !== undefined) {
        updateData.ativo = ativo;
      }
      if (themeConfig !== undefined) {
        updateData.themeConfig = themeConfig;
      }
      if (heroConfig !== undefined) {
        updateData.heroConfig = heroConfig;
      }

      if (users !== undefined) {
        const uniqueUserIds = Array.from(new Set(users.map((user) => user.id)));
       
        const existingUsers = await this.userRepository.getUsers();
        const existingIdsSet = new Set(existingUsers.map((user) => user.id));

        const invalidIds = uniqueUserIds.filter((userId) => !existingIdsSet.has(userId));
        
        if (invalidIds.length > 0) {
          throw new ValidationError("One or more user IDs are invalid", invalidIds);
        }

        
        updateData.users = {
          deleteMany: {},
          create: uniqueUserIds.map((userId) => ({
            user: { connect: { id: userId } },
          })),
        };
      }

      const response = await this.ProjetoRepository.updateProjeto(id, updateData);

      return response;
    } catch (error: any) {
      console.error("Error updating projeto:", error.message);

      if (
        error instanceof ValidationError ||
        error instanceof ProjetoDoesNotExist
      ) {
        throw error;
      }

      throw new InternalServerError(
        "An unexpected error occurred while updating the projeto."
      );
    }
  }
}
