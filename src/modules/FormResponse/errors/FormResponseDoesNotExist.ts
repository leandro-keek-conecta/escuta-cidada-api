export class FormResponseDoesNotExist extends Error {
  constructor(message = "FormResponse not found") {
    super(message);
    this.name = "FormResponseDoesNotExist";
  }
}
