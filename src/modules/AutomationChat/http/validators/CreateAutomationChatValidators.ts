import * as Z from "zod";

export const AutomationChatSchema = Z.object({
  slug: Z.string().min(1, "A rota personalizada não pode ser vazia."),
  title: Z.string().min(5, "O título não pode ser vazio."),
  description: Z.string().min(5, "A descrição não pode ser vazia."),
  url: Z.string().url("URL inválida."),
  isActive: Z.boolean().default(true),
  projetoId: Z.number()
    .int("O projeto deve ser um número inteiro.")
    .positive("O projeto deve ser válido."),
});
