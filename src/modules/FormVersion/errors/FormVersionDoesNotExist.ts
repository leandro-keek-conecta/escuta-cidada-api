export class FormVersionDoesNotExist extends Error {
  constructor(message = "FormVersion não existe") {
    super(message);
    this.name = "FormVersionDoesNotExist";
  }
}
