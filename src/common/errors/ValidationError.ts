export class ValidationError extends Error {
    public errors: any;
  
    constructor(message: string, errors?: any) {
      super(message); // Define a mensagem padrão de erro
      this.name = "ValidationError"; // Nome do erro
      this.errors = errors || []; // Lista de erros adicionais, se fornecida
      Error.captureStackTrace(this, this.constructor); // Captura o stack trace para depuração
    }
  
    /**
     * Método para retornar uma resposta de erro estruturada
     */
    getErrorResponse() {
      return {
        message: this.message,
        errors: this.errors,
      };
    }
  }
  