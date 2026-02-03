import { FastifyReply, FastifyRequest } from "fastify";
import { injectable, inject } from "inversify"; 
import { projetoSchema } from "@/modules/projeto/http/validators/createProjetoValidator";
import AppContainer from "@/common/container";
import { ListProjetosService } from "@/modules/projeto/services/ListProjetoService";
import { UpdateProjetoService } from "@/modules/projeto/services/UpdateProjetoService";
import { UpdateProjetoUpdateSchema } from "@/modules/projeto/http/validators/updateProjetoValidator";
import { DeleteProjetoService } from "@/modules/projeto/services/DeleteProjetoService";
import { ProjetoDoesNotExist } from "@/modules/projeto/errors/ProjetoDoesNotExist";
import { CreateProjetoService } from "@/modules/projeto/services/CreateProjetoService";
@injectable()
export class ProjetoController {
  
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const createProjeto = AppContainer.resolve<CreateProjetoService>(CreateProjetoService);

    try {
      const Projeto = projetoSchema.parse(request.body);
      const response = await createProjeto.execute({ data: Projeto });

      return reply
        .status(201)
        .send({ message: "Successfully created Projeto", data: response });
    } catch (err: any) {
      console.error(
        "Erro no controlador ao criar projeto:",
        JSON.stringify(err, null, 2)
      );

      return reply.status(500).send({
        message: "An error occurred while creating the Projeto",
        details: err.message || "Detalhes não disponíveis",
      });
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const listProjetosService = AppContainer.resolve<ListProjetosService>(ListProjetosService);

    try {
      const projetos = await listProjetosService.execute();

      return reply.status(200).send({
        message: "Successfully listed projetos",
        data: projetos,
      });
    } catch (err: any) {
      console.error(
        "Erro no controlador ao listar projetos:",
        JSON.stringify(err, null, 2)
      );
      return reply.status(500).send({
        message: "An error occurred while listing the projetos",
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const updateProjetoService = AppContainer.resolve<UpdateProjetoService>(UpdateProjetoService);
    const dataReq = UpdateProjetoUpdateSchema.parse(request.body);
    const { id } = request.params as { id?: string };
    const userId = Number(id);

    if (!id || Number.isNaN(userId)) {
      return reply.status(400).send({ message: "Invalid user id" });
    }


    try {
      await updateProjetoService.execute({ id: userId, data: dataReq });
      return reply
        .status(200)
        .send({ message: "Successfully Updated Projeto" });
    } catch (error) {
      if (error instanceof ProjetoDoesNotExist) {
        return reply.status(404).send({ message: error.message });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const deleteService = AppContainer.resolve<DeleteProjetoService>(DeleteProjetoService);

    try {
      const { id } = request.params as { id: number };
      await deleteService.execute(Number(id));
      return reply.status(200).send({ message: "Successfully deleted User" });
    } catch (error: any) {
      if (error instanceof ProjetoDoesNotExist) {
        return reply.status(404).send({ message: error.message });
      }
      return reply
        .status(500)
        .send({ message: "An error occurred while deleting the user" });
    }
  }
}
