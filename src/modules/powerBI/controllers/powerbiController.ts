import { FastifyReply, FastifyRequest } from "fastify";
import { injectable } from "inversify"; 
import AppContainer from "@/common/container";
import { GetEmbedTokenService } from "../services/powerbiService";

@injectable()
export class PowerBIController {

  async embedReport( request: FastifyRequest,reply: FastifyReply ): Promise<FastifyReply> {

    const GetEmbedService = AppContainer.resolve<GetEmbedTokenService>(GetEmbedTokenService);
    const { id } = request.params as { id: number };

    try {
      const embedInfo = await GetEmbedService.execute();
      return reply
        .status(200)
        .send({
          message: "Embed token generated successfully",
          data: embedInfo,
        });
    }  catch (err: any) {
      console.error("Error communicating with Power BI API:", JSON.stringify(err, null, 2));

      return reply.status(500).send({
        message: "Failed to generate embed token",
        details: err?.message || "Unknown error",
      });
    }
  }
}
