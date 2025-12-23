import 'module-alias/register';
import { env } from './env/index';
import { app } from './app';
import figlet from 'figlet';
import prisma from './common/infra/prisma/index'; // Importação do Prisma
import 'module-alias/register'

async function startApp() {
  const chalk = (await import('chalk')).default;  // Importação dinâmica


  const title = chalk.cyan(figlet.textSync('Keek conecta api', { horizontalLayout: 'full' }));
  const info = chalk.yellow(`Service running at port ${env.PORT}.`);
  await prisma.$connect();
  app.listen({
    host: '0.0.0.0',
    port: env.PORT,
  })
  .then(() => console.log(title, '\n', info));
}

startApp();
