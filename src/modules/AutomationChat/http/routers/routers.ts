import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";
import { AutomationChatController } from "../controller/AutomationChatController";

export async function routerAutomationChat(app:FastifyInstance) {
    const automationChatController = container.get<AutomationChatController>(Types.AutomationChatController);
    
    app.post("/create",{ preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },automationChatController.create.bind(automationChatController));
    app.patch("/update/:id", { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },automationChatController.update.bind(automationChatController));
    app.get("/list/:projectId", { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },automationChatController.list.bind(automationChatController));
    app.delete("/delete/:id", { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },automationChatController.delete.bind(automationChatController));

}
