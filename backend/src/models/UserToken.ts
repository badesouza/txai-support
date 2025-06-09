import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface UserTokenAttributes {
  id: number;
  userId: number;
  token: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserTokenCreationAttributes {
  userId: number;
  token: string;
}

export const UserTokenModel = {
  async create(tokenData: UserTokenCreationAttributes) {
    return prisma.userToken.create({
      data: tokenData,
    });
  },

  async findByToken(token: string) {
    return prisma.userToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profile: true,
          },
        },
      },
    });
  },

  async deleteByUserId(userId: number): Promise<void> {
    await prisma.userToken.deleteMany({
      where: { userId },
    });
  },

  async deleteByToken(token: string): Promise<void> {
    await prisma.userToken.delete({
      where: { token },
    });
  },
}; 