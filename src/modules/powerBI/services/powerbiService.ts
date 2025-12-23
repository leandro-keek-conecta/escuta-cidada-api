import { injectable } from "inversify";
import axios from "axios";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import qs from "qs";

@injectable()
export class GetEmbedTokenService {
  public async execute(): Promise<any> {
    try {
      const data = qs.stringify({
        client_id: process.env.POWER_BI_CLIENT_ID,
        scope: "https://analysis.windows.net/powerbi/api/.default",
        username: process.env.POWER_BI_USERNAME,
        password: process.env.POWER_BI_PASSWORD,
        grant_type: "password",
        client_secret: process.env.POWER_BI_CLIENT_SECRET,
      });

      const response = await axios.post(
        "https://login.microsoftonline.com/fd4d8ce5-d6d4-4d37-8efa-cd345ae375a8/oauth2/v2.0/token",
        data,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(
        "Erro ao obter token via ROPC:",
        error?.response?.data || error.message
      );
      throw new AppError(
        "Erro ao obter token de autenticação",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
