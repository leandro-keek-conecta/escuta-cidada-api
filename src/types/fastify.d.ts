import "fastify";
import { ProjetoAccessLevel, Role } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      id: number;
      role?: Role | string;
      projectAccess?: Record<number, ProjetoAccessLevel>;
    };
  }
}
