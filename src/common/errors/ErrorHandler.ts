import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import AppError from './AppError';
import PrismaErrorHandler from './TypeormError'; // ou PrismaErrorHandler.ts
import { env } from 'process';

export function errorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  // 👉 Validação com Zod
  if (error instanceof ZodError) {
    if (env.NODE_ENV !== 'production') {
      console.error('Zod validation error:', error);
    }

    reply.status(400).send({
      status: 'error',
      message: 'Validation error.',
      issues: error.format(),
    });
    return;
  }

  // Converte erros do Prisma (se aplicável)
  const transformedError = PrismaErrorHandler(error);

  // Erros conhecidos (AppError e derivados)
  if (transformedError instanceof AppError) {
    if (env.NODE_ENV !== 'production') {
      console.error('Handled AppError:', transformedError);
    }

    reply.status(transformedError.statusCode).send({
      status: 'error',
      message: transformedError.message,
    });
    return;
  }

  // Log genérico se não for produção
  if (env.NODE_ENV !== 'production') {
    console.error('Unhandled error:', error);
  }

  // Fallback para erros desconhecidos
  reply.status(500).send({
    status: 'error',
    message: 'Internal server error.',
  });
}
