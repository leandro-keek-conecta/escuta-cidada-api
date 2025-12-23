export class ProjetoDoesNotExist extends Error {
  constructor(private msg: string) {
    super(msg);
  }
}
