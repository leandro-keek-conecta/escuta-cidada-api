import { FastifyReply, FastifyRequest } from "fastify";
import AppError from '@/common/errors/AppError';
import AppContainer from '@/common/container';
import UserLoginService from '@/modules/auth/services/UserLoginService';
import UserLoginValidator from '@/modules/auth/infra/http/validators/UserLoginValidator';
import { ZodError } from "zod";

class AuthController {
  public async login(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Valida os dados de entrada
      const data = await UserLoginValidator.parseAsync(req.body);

      // Resolve o serviço de login
      const loginService = AppContainer.resolve<UserLoginService>(UserLoginService);
      const response = await loginService.execute({ data });

      // Responde com sucesso
      return reply.status(200).send({ message: "Successfully authenticated", response });
    } catch (err) {
      // Verifica se é erro de validação (Zod)
      if (err instanceof ZodError) {
        return reply.status(400).send({ message: "Validation error", issues: err.errors });
      }
      
      // Verifica se é um erro do tipo AppError
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ message: err.message });
      }

      // Para outros erros genéricos, responde com erro 500
      return reply.status(500).send({ message: "Internal server error." });
    }
  }
}

export default AuthController;
