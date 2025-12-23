import { z } from "zod";

export const userResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
<<<<<<< HEAD
  ProjetoId: z.number(),
  createdAt: z.date().optional(),
=======
  birthDate: z.date().optional(),
  profession: z.string().nullable(),
  gender: z.string(),
  ProjetoId: z.number(),
  createdAt: z.date(),
>>>>>>> d4d6e47ff18f2506be93843b2e984aa899877a64
  updatedAt: z.date(),
});

export const usersListResponseSchema = z.array(userResponseSchema);
