import { routerAuth } from "@/modules/auth/infra/http/routes/AuthRoutes";
import { routerAutomationChat } from "@/modules/AutomationChat/http/routers/routers";
import { routerPowerBI } from "@/modules/powerBI/routes/routers";
import { routerProjeto } from "@/modules/projeto/http/router/router";
import { routerForm } from "@/modules/form/http/router/router";
import { routerFormVersion } from "@/modules/FormVersion/http/router/router";
import { routerPublicForm } from "@/modules/form/http/router/publicRouter";
import { routerFormField } from "@/modules/formField/http/router/router";
import { routerUser } from "@/modules/user/http/router/routers";
import { FastifyInstance } from "fastify";

export async function routes(app: FastifyInstance) {
  app.register(routerUser, { prefix: "/user" });
  app.register(routerAuth, { prefix: "/auth" });
  app.register(routerProjeto, { prefix: "/projeto" });
  app.register(routerPowerBI, { prefix: "/powerbi" });
  app.register(routerAutomationChat, { prefix: "/automationchat" });
  app.register(routerForm, { prefix: "/form" });
  app.register(routerFormVersion, { prefix: "/form-version" });
  app.register(routerPublicForm);
  app.register(routerFormField, { prefix: "/form-field" });

  app.get("/ping", async (request, reply) => {
    reply.send("pong");
  });
}
