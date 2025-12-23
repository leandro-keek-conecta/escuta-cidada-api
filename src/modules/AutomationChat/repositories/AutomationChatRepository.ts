import { injectable } from "inversify";
import { Prisma, AutomationChat } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { IAutomationChatRepository } from "./IAutomationChatRepository";

@injectable()
export class AutomationChatRepository implements IAutomationChatRepository {
  async create(
    data: Prisma.AutomationChatCreateInput
  ): Promise<AutomationChat> {
    return prisma.automationChat.create({ data });
  }

  async findById(id: string): Promise<AutomationChat | null> {
    return prisma.automationChat.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<AutomationChat | null> {
    return prisma.automationChat.findUnique({
      where: { slug },
    });
  }

  async getAll(projectId: number): Promise<AutomationChat[]> {
    return prisma.automationChat.findMany({
      where: { projetoId: projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(
    id: string,
    data: Prisma.AutomationChatUpdateInput
  ): Promise<AutomationChat | null> {
    try {
      return await prisma.automationChat.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return null;
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await prisma.automationChat.delete({
      where: { id },
    });
  }
}
