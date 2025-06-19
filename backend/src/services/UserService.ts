import { prisma } from "../lib/prisma";
import { CreateUserDto, UpdateUserDto } from "../dtos/user";
import bcrypt from "bcrypt";

export class UserService {
  /**
   * Retorna todos os usuários (você pode paginar, esconder senhas etc.).
   */
  public static async getAll(page = 1, limit = 10, searchTerm = '') {
    const skip = (page - 1) * limit;
  
    const where = searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } }
          ]
        }
      : {};
  
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          profile: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);
  
    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }
  

  /**
   * Busca usuário pelo ID. Lança erro se não encontrar.
   */
  public static async getById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    return user;
  }

  /**
   * Cria um novo usuário. Deve hashear a senha antes de salvar (ex.: bcrypt).
   */
  public static async create(data: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        password: hashedPassword,
        profile: data.profile ?? "USER"
      }
    });
  }

  /**
   * Atualiza usuário (não esqueça de hashear se vier senha).
   */
  public static async update(id: number, data: UpdateUserDto) {
    const updateData: any = {};
    
    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.profile !== undefined) updateData.profile = data.profile;
    
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Exclui usuário.
   */
  public static async delete(id: number): Promise<void> {
    await prisma.user.delete({
      where: { id }
    });
  }
}
