import * as Z from "zod";

export const userChangeSchema = Z.object({
  uid: Z.coerce
    .number({
      invalid_type_error: "ID do usuário inválido",
    })
    .int()
    .positive("ID do usuário inválido"),
  token: Z.string().min(1, "Token inválido"),
  password: Z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
