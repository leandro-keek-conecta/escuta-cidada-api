import { FastifyReply, FastifyRequest } from "fastify";
import { injectable, inject } from "inversify";
import { z, ZodError } from "zod";

import { CreateUserService } from "../../services/createUserService";
import Types from "@/common/container/types";
import { userSchema } from "@/modules/user/http/validators/createUserValidators";
import { UpdateUserService } from "../../services/updateUserService";
import { UserDoesNotExist } from "../../errors/UserDoesNotExist";
import { ListUserService } from "../../services/listUserService";
import AppContainer from "@/common/container";
import DeleteUserService from "../../services/deleteUserService";
import AppError from "@/common/errors/AppError";
import { userUpdateSchema } from "@/modules/user/http/validators/updateUserValidator";
import { userChangeSchema } from "../validators/changePasswordUserValidator";
import { RestartPasswordService } from "../../services/forgotPasswordUserService";
import { ResetPasswordService } from "../../services/changePasswordUserService";

@injectable()
export class UserController {
  async create(request: FastifyRequest,reply: FastifyReply): Promise<FastifyReply> {
    const createService = AppContainer.resolve<CreateUserService>(CreateUserService);

    try {
      const user = userSchema.parse(request.body);
      const response = await createService.execute({ data: user });

      return reply.status(201).send({
        message: "Successfully created User",
        data: response,
      });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return reply
          .status(400)
          .send({ message: "Validation error", issues: err.errors });
      }

      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ message: err.message });
      }

      return reply.status(500).send({
        message: "Erro interno no servidor",
        details: err.message || "Erro desconhecido",
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updateUserService = AppContainer.resolve<UpdateUserService>(UpdateUserService);
    const { id } = request.params as { id?: string };
    const userId = Number(id);

    if (!id || Number.isNaN(userId)) {
      return reply.status(400).send({ message: "Invalid user id" });
    }

    const { id: _ignored, ...payload } = (request.body ?? {}) as z.infer<
      typeof userUpdateSchema
    > & { id?: unknown };

    try {
      await updateUserService.execute({ id: userId, data: payload });
      return reply.status(200).send({ message: "Successfully Updated User" });
    } catch (error) {
      if (error instanceof UserDoesNotExist) {
        return reply.status(404).send({ message: error.message });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    
    const listService = AppContainer.resolve<ListUserService>(ListUserService);
    try {
      const users = await listService.execute();
      return reply
        .status(200)
        .send({ message: "Successfully retrieved Users", data: users });
    } catch (error) {
      console.error("Error retrieving users:", (error as Error).message);
      return reply
        .status(500)
        .send({ message: "An error occurred while retrieving users" });
    }
  }

  public async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    
    const deleteUserService = AppContainer.resolve<DeleteUserService>(DeleteUserService);
    try {
      const { id } = request.params as { id: number };
      const user = await deleteUserService.execute(Number(id));
      return reply
        .status(200)
        .send({ message: "Successfully deleted User", data: user });
    } catch (error) {
      if (error instanceof UserDoesNotExist) {
        return reply.status(404).send({ message: error.message });
      }
      return reply
        .status(500)
        .send({ message: "An error occurred while deleting the user" });
    }
  }

  public async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const resetPasswordService = AppContainer.resolve<ResetPasswordService>(ResetPasswordService);

    try {
      const payload = userChangeSchema.parse(request.body);
      await resetPasswordService.execute(payload);
      return reply
        .status(200)
        .send({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply
          .status(400)
          .send({ message: "Dados inválidos", issues: error.errors });
      }
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      return reply
        .status(500)
        .send({ message: "Erro interno ao redefinir senha" });
    }
  }

  public async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const { email } = request.body as { email: string };
    const restartPasswordService = AppContainer.resolve<RestartPasswordService>(
      RestartPasswordService
    );

    try {
      await restartPasswordService.execute({ email });
      return reply
        .status(200)
        .send({ message: "E-mail de atualização enviado com sucesso." });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      return reply
        .status(500)
        .send({ message: "Erro interno ao enviar e-mail de atualização." });
    }
  }

  public async validateResetToken(request: FastifyRequest, reply: FastifyReply) {
    
    const { uid, token } = request.query as { uid: string; token: string };
    const resetPasswordService = AppContainer.resolve<ResetPasswordService>(ResetPasswordService);

    try {
      // Só reutiliza a lógica de verificação de token
      await resetPasswordService.validate({ uid: Number(uid), token });
      return reply.status(200).send({ valid: true });
    } catch (error) {
      return reply.status(400).send({ valid: false });
    }
  }
}
