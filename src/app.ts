import "reflect-metadata";
import fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody"; // Adicione esta linha
import { env } from "process";
import { ZodError } from "zod";
import { routes } from "./common/infra/routes";
import container from "./common/container";
import AppError from "./common/errors/AppError";
import PrismaErrorHandler from "./common/errors/TypeormError";
export const app = fastify({ trustProxy: true });

// Configura o CORS
app.register(cors, {
  origin: true, // Permite todas as origens. Ajuste conforme necessário.
});

// Registra o plugin formbody
app.register(formbody); // Adicione esta linha

// Registra as rotas
app.register(routes, { container: container, prefix: "/keek-api" });

// Manipulador de erros
app.setErrorHandler((error, _req, reply) => {
  // Zod validation
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: "BAD_REQUEST",
        message: "Validation error.",
        details: error.format(),
      },
    });
  }

  // Map known Prisma errors into AppError
  const prismaMapped = PrismaErrorHandler(error as Error);
  if (prismaMapped instanceof AppError) {
    return reply.status(prismaMapped.status).send({
      error: {
        code: prismaMapped.code,
        message: prismaMapped.message,
        ...(prismaMapped.details ? { details: prismaMapped.details } : {}),
      },
    });
  }

  // Handle AppError or compatible shape even if instanceof fails (different module refs)
  const anyErr = error as any;
  const maybeStatus: number | undefined = anyErr?.status ?? anyErr?.statusCode;
  if (error instanceof AppError || typeof maybeStatus === "number") {
    const status = error instanceof AppError ? error.status : (maybeStatus as number);
    const code: string = (error as any).code ?? (status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST");
    const message: string = (error as any).message ?? "Error";
    return reply.status(status).send({
      error: { code, message },
    });
  }

  if (env.NODE_ENV !== "production") {
    console.error("Unhandled error:", error);
  }

  return reply.status(500).send({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error.",
    },
  });
});
