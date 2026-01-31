
export class FormFieldDoesNotExist extends Error {
  constructor(message = "Form não existe") {
    super(message);
    this.name = "FormFieldDoesNotExist";
  }
}
