import { z } from "zod";

export const userResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  ProjetoId: z.number(),
  createdAt: z.date().optional(),
  updatedAt: z.date(),
});

export const usersListResponseSchema = z.array(userResponseSchema);
