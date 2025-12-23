
import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import AuthController from "@/modules/auth/infra/http/controllers/AuthController";

export async function routerAuth(app: FastifyInstance) {
    const authController = container.get<AuthController>(Types.AuthController);

    app.post("/login", authController.login.bind(authController));
    
}
