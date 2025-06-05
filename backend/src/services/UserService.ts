import { User } from "../models/User";
import { CreateUserDto, UpdateUserDto } from "../dtos/user";
import bcrypt from "bcrypt";

export class UserService {
  /**
   * Retorna todos os usuários (você pode paginar, esconder senhas etc.).
   */
  public static async getAll(): Promise<User[]> {
    return User.findAll({
      attributes: ["id", "email", "name", "phone", "status", "profile", "createdAt"],
      order: [["name", "ASC"]],
    });
  }

  /**
   * Busca usuário pelo ID. Lança erro se não encontrar.
   */
  public static async getById(id: number): Promise<User> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    return user;
  }

  /**
   * Cria um novo usuário. Deve hashear a senha antes de salvar (ex.: bcrypt).
   */
  public static async create(data: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return User.create({
      email: data.email,
      name: data.name,
      phone: data.phone,
      password: hashedPassword,
      status: data.status ?? true,
      profile: data.profile ?? "requester",
    });
  }

  /**
   * Atualiza usuário (não esqueça de hashear se vier senha).
   */
  public static async update(id: number, data: UpdateUserDto): Promise<User> {
    const user = await this.getById(id);
    if (data.password) {
      const hashed = await bcrypt.hash(data.password, 10);
      data.password = hashed;
    }
    await user.update(data);
    return user;
  }

  /**
   * Exclui usuário.
   */
  public static async delete(id: number): Promise<void> {
    const user = await this.getById(id);
    await user.destroy();
  }
}
