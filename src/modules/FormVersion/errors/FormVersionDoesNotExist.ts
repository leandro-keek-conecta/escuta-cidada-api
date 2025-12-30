export class FormVersionDoesNotExist extends Error {
  constructor(message = "FormVersion nao existe") {
    super(message);
    this.name = "FormVersionDoesNotExist";
  }
}
