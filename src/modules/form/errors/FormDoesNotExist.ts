export class FormDoesNotExist extends Error {
  constructor(message = "Form não existe") {
    super(message);
    this.name = "FormDoesNotExist";
  }
}
