import { verify, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import AppError from "@/common/errors/AppError";
import Types from "@/common/container/types";
import Container from "@/common/container";
import { IUserRepository } from "@/modules/user/repositories/IUserRepository";
import Config from "@/config/SecurityConfig";
import { FastifyReply, FastifyRequest } from "fastify";
import { ProjetoAccessLevel, Role } from "@prisma/client";

interface IDecodedParams {
  userId?: number;
}

type ProjectIdResolver = (req: FastifyRequest) => number | Promise<number>;

const publicKey = Config.jwt.key;

const ROLE_PRIORITY: Record<Role, number> = {
  [Role.USER]: 1,
  [Role.ADMIN]: 2,
};

const PROJECT_ACCESS_PRIORITY: Record<ProjetoAccessLevel, number> = {
  [ProjetoAccessLevel.DASH_ONLY]: 1,
  [ProjetoAccessLevel.AUTOMATIONS_ONLY]: 2,
  [ProjetoAccessLevel.FULL_ACCESS]: 3,
};

const normalizeRole = (role?: string): Role | undefined => {
  if (!role) return undefined;
  const upper = role.toUpperCase();
  if (upper === Role.ADMIN) return Role.ADMIN;
  if (upper === Role.USER) return Role.USER;
  return undefined;
};

const ensureRole =
  (minimum: Role) =>
  async (req: FastifyRequest): Promise<void> => {
    const role = normalizeRole(req.auth?.role);
    if (!role || ROLE_PRIORITY[role] < ROLE_PRIORITY[minimum]) {
      throw AppError.forbidden("Permissões insuficientes para executar esta ação.");
    }
  };

const ensureProjectAccess = ({
  minimum,
  resolveProjectId,
  skipIfMissing = false,
}: {
  minimum: ProjetoAccessLevel;
  resolveProjectId: ProjectIdResolver;
  skipIfMissing?: boolean;
}) => {
  return async (req: FastifyRequest): Promise<void> => {
    const userId = req.auth?.id;
    if (!userId) {
      throw AppError.unauthorized("Usuário não autenticado.");
    }

    const role = normalizeRole(req.auth?.role);
    if (role === Role.ADMIN) {
      return; // Admin sempre possui acesso
    }

    const projectId = await resolveProjectId(req);
    const numericProjectId = Number(projectId);
    if (!Number.isFinite(numericProjectId)) {
      if (skipIfMissing && Number.isNaN(numericProjectId)) {
        return;
      }
      throw AppError.badRequest("projectId inválido.");
    }

    const userRepository = Container.get<IUserRepository>(Types.UserRepository);
    const access = await userRepository.findProjectAccess(
      userId,
      numericProjectId
    );
    if (!access) {
      throw AppError.forbidden("Usuário não possui acesso a este projeto.");
    }

    if (PROJECT_ACCESS_PRIORITY[access] < PROJECT_ACCESS_PRIORITY[minimum]) {
      throw AppError.forbidden("Nível de acesso ao projeto insuficiente.");
    }

    if (!req.auth) {
      req.auth = { id: userId };
    }
    req.auth.projectAccess = {
      ...(req.auth.projectAccess ?? {}),
      [numericProjectId]: access,
    };
  };
};

const AuthMiddleware = {
  required: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const userRepository = Container.get<IUserRepository>(Types.UserRepository);
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw AppError.unauthorized("Cabeçalho de autorização ausente");
    }

    const [type, token] = authHeader.trim().split(/\s+/);
    if (!/^Bearer$/i.test(type) || !token) {
      throw AppError.unauthorized("Método de autenticação não suportado");
    }

    if (token === Config.adminToken) {
      req.auth = { id: 0, role: Role.ADMIN };
      return;
    }

    try {
      const decoded = verify(token, publicKey) as IDecodedParams;

      if (typeof decoded.userId !== "number") {
        throw AppError.unauthorized("Token inválido — formato incorreto");
      }

      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        throw AppError.unauthorized("Usuário não encontrado ou token inválido");
      }

      req.auth = { id: decoded.userId, role: user.role };
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw AppError.unauthorized("Token expirado");
      }
      if (err instanceof JsonWebTokenError) {
        throw AppError.unauthorized("Token inválido");
      }
      throw AppError.unauthorized("Falha na verificação do token");
    }
  },
  requireRole: ensureRole,
  requireProjectAccess: ensureProjectAccess,
  isAdmin: ensureRole(Role.ADMIN),
};

export default AuthMiddleware;
