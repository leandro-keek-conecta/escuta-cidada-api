import { FastifyReply, FastifyRequest } from "fastify";
import { injectable } from "inversify";
import AppContainer from "@/common/container"
import { StorageService } from "../../services/storageService";


@injectable()
export class MinioController {

/*   async storageConectio(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> { 
     const storageService = AppContainer.resolve<StorageService>(StorageService);
     try {
      const users = await listService.execute();
      return reply
        .status(200)
        .send({ message: "Successfully retrieved Users", data: users });
    } catch (error) {
      console.error("Error retrieving users: - minioController.ts:18", (error as Error).message);
      return reply
        .status(500)
        .send({ message: "An error occurred while retrieving users" });
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
      console.error("Error retrieving users: - minioController.ts:34", (error as Error).message);
      return reply
        .status(500)
        .send({ message: "An error occurred while retrieving users" });
    }
  } */

}