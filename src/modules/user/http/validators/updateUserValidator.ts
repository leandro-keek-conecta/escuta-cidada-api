import { ProjetoAccessLevel, Role } from "@prisma/client";
import * as Z from "zod";

export const userUpdateSchema = Z.object({
  email: Z.string().email("Formato de email inválido").optional(),
  name: Z.string().min(1, "O nome é obrigatório").optional(),
  role: Z.nativeEnum(Role).optional(),
  projetos: Z.array(
    Z.object({
      id: Z.number().int().positive("ID de projeto inválido"),
      access: Z.nativeEnum(ProjetoAccessLevel).optional(),
      hiddenTabs: Z.array(Z.string().min(1)).optional(),
    })
  ).optional(),
});
