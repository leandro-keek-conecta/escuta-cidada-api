import { ProjetoAccessLevel, Role } from "@prisma/client";

type ProjetoResumo = {
  id: number;
  nome: string;
  url: string | null;
  corHex: string | null;
  reportId: string | null;
  groupId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  access: ProjetoAccessLevel;
  hiddenTabs: string[];
};

interface IUserLoginResponse {
  accessToken: string;
  accessTokenExpireIn: string;
  refreshToken: string;
  refreshTokenExpireIn: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;

    projetos: ProjetoResumo[];
    projeto?: Omit<ProjetoResumo, "id" | "assignedAt"> | null;
  };
}

export default IUserLoginResponse;
