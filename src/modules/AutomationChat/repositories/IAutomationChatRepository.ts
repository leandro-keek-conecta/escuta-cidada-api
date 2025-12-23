import { AutomationChat, Prisma } from "@prisma/client";

export interface IAutomationChatRepository {
  create(data: Prisma.AutomationChatCreateInput): Promise<AutomationChat>;
  getAll(projectId: number): Promise<AutomationChat[]>;
  update(
    id: string,
    data: Prisma.AutomationChatUpdateInput
  ): Promise<AutomationChat | null>;
  findById(id: string): Promise<AutomationChat | null>;
  findBySlug(slug: string): Promise<AutomationChat | null>;
  delete(id: string): Promise<void>;
}
