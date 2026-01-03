
export class FormFieldDoesNotExist extends Error {
  constructor(message = "Form nao existe") {
    super(message);
    this.name = "FormFieldDoesNotExist";
  }
}
