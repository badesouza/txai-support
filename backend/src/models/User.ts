import { User as PrismaUser, Profile } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  phone: string;
  profile: Profile;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes {
  name: string;
  email: string;
  password: string;
  phone: string;
  profile?: Profile;
}

export const UserModel = {
  async create(userData: UserCreationAttributes): Promise<PrismaUser> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });
  },

  async findById(id: number): Promise<PrismaUser | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async findByEmail(email: string): Promise<PrismaUser | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  },
  async findAll(): Promise<Omit<PrismaUser, 'password'>[]> {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profile: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findAllWithPagination({ page, limit, search }: { page: number; limit: number; search: string }) {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ],
    } : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profile: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      users,
      total,
    };
  },

  async update(id: number, userData: Partial<UserAttributes>): Promise<PrismaUser | null> {
    const data = { ...userData };
    if (userData.password) {
      data.password = await bcrypt.hash(userData.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data,
    });
  },

  async delete(id: number): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  async validatePassword(user: PrismaUser | null, password: string): Promise<boolean> {
    try {
      if (!user || !user.password) {
        console.log('Usuário ou senha não encontrados');
        return false;
      }
      const isValid = await bcrypt.compare(password, user.password);
      console.log('Resultado da validação da senha:', isValid);
      return isValid;
    } catch (error) {
      console.error('Erro ao validar senha:', error);
      return false;
    }
  },
};
  