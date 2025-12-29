export class FormDoesNotExist extends Error {
  constructor(message = "Form nao existe") {
    super(message);
    this.name = "FormDoesNotExist";
  }
}
