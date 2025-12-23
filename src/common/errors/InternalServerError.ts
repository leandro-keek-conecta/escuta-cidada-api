export class InternalServerError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InternalServerError";
      Error.captureStackTrace(this, this.constructor);
    }
  
    getErrorResponse() {
      return {
        message: this.message,
      };
    }
  }
  