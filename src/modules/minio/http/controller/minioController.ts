import { FastifyReply, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";

import Types from "@/common/container/types";
import {
  createPresignedUploadBatchSchema,
  createPresignedUploadSchema,
} from "../validators/createPresignedUploadValidator";
import { StorageService } from "../../services/storageService";

@injectable()
export class MinioController {
  constructor(
    @inject(Types.StorageService)
    private readonly storageService: StorageService
  ) {}

  async createPresignedUploadUrl(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const input = createPresignedUploadSchema.parse(request.body ?? {});
    const upload = await this.storageService.generatePresignedUploadUrl(input);

    return reply.status(StatusCodes.OK).send({
      message: "Successfully generated presigned upload URL",
      data: upload,
    });
  }

  async createPresignedUploadUrls(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const input = createPresignedUploadBatchSchema.parse(request.body ?? {});
    const uploads = await this.storageService.generatePresignedUploadUrls(
      input.files
    );

    return reply.status(StatusCodes.OK).send({
      message: "Successfully generated presigned upload URLs",
      data: uploads,
    });
  }
}
