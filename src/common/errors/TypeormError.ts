import { Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import AppError from './AppError';

const PrismaErrorHandler = (error: Error): AppError | Error => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new AppError(
          'Duplicated unique field value',
          StatusCodes.CONFLICT,
          error,
        );

      case 'P2003':
        return new AppError(
          'Foreign key constraint failed',
          StatusCodes.BAD_REQUEST,
          error,
        );

      case 'P2025':
        return new AppError(
          'Record to update/delete does not exist',
          StatusCodes.NOT_FOUND,
          error,
        );

      default:
        return new AppError(
          'Database error occurred',
          StatusCodes.UNPROCESSABLE_ENTITY,
          error,
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(
      'Invalid data format sent to the database',
      StatusCodes.BAD_REQUEST,
      error,
    );
  }

  // Erros não tratados permanecem como estão
  return error;
};

export default PrismaErrorHandler;
