import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import { UserController } from "../controller/userController";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";

export async function routerUser(app:FastifyInstance) {
    const userController = container.get<UserController>(Types.UserController);
    
    app.post("/create",{ preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },userController.create.bind(userController));
    app.patch("/update/:id", { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },userController.update.bind(userController));
    app.get("/list", { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },userController.list.bind(userController));
    app.delete("/delete/:id", { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },userController.delete.bind(userController));
    app.post("/forgot-password", userController.forgotPassword.bind(userController));
    app.post("/reset-password", userController.resetPassword.bind(userController));
    app.get("/reset-password/validate", userController.validateResetToken.bind(userController));

}
