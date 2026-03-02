import "./register-alias";
import figlet from "figlet";

import { app } from "./app";
import prisma from "./common/infra/prisma/index";
import { realtimeGateway } from "./common/realtime/realtimeGateway";
import { env } from "./env/index";

async function startApp() {
  const chalk = (await import("chalk")).default;

  const title = chalk.cyan(
    figlet.textSync("Escuta Cidada api", { horizontalLayout: "full" })
  );
  const info = chalk.yellow(`Service running at port ${env.PORT}.`);

  await prisma.$connect();
  realtimeGateway.initialize(app.server);

  app
    .listen({
      host: "0.0.0.0",
      port: env.PORT,
    })
    .then(() => console.log(title, "\n", info));
}

startApp();
