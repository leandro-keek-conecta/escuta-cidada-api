import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import { IUserRepository } from "../repositories/IUserRepository";

@injectable()
export class DeleteUserService {
  @inject(Types.UserRepository) private userRepository!: IUserRepository;

  public async execute(id: number): Promise<void> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error("User does not exist");
      }
      await this.userRepository.delete(id);
    } catch (error: any) {
      console.error("Error deleting user:", error.message);
      throw new Error("An unexpected error occurred while deleting the user.");
    }
  }
}

export default DeleteUserService;
