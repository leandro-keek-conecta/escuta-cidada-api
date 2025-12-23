export class NotAuthorizedError extends Error {
  constructor(message = 'Usuário não autorizado') {
    super(message);
    this.name = 'NotAuthorizedError';
    Error.captureStackTrace(this, this.constructor);
  }

  getErrorResponse() {
    return {
      message: this.message,
    };
  }

  getStatusCode(): number {
    return 401;
  }
}
