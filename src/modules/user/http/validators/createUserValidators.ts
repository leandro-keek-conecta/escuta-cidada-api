import { ProjetoAccessLevel, Role } from "@prisma/client";
import * as Z from "zod";

export const userSchema = Z.object({
  email: Z.string().email("Formato de email inválido"),
  password: Z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  name: Z.string().min(1, "O nome é obrigatório"),
  role: Z.nativeEnum(Role),
  projetos: Z.array(
    Z.object({
      id: Z.number().int().positive("ID de projeto inválido"),
      access: Z.nativeEnum(ProjetoAccessLevel).optional(),
      hiddenTabs: Z.array(Z.string().min(1)).optional(),
    })
  ).optional(),
});
