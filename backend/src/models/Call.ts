import { Call as PrismaCall, CallStatus, Priority } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CallAttributes {
  id: number;
  title: string;
  description: string;
  status: CallStatus;
  priority: Priority;
  userId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CallCreationAttributes {
  title: string;
  description: string;
  status?: CallStatus;
  priority?: Priority;
  userId: number;
}

export const CallModel = {
  async create(callData: CallCreationAttributes): Promise<PrismaCall> {
    return prisma.call.create({
      data: callData,
    });
  },

  async findById(id: number): Promise<PrismaCall | null> {
    return prisma.call.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        images: true,
      },
    });
  },

  async findAll(): Promise<PrismaCall[]> {
    return prisma.call.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findAllWithPagination({ page, limit, search }: { page: number; limit: number; search: string }) {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { title: { contains: search } },
        { description: { contains: search } },
      ],
    } : {};

    const [total, calls] = await Promise.all([
      prisma.call.count({ where }),
      prisma.call.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          images: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      calls,
      total,
    };
  },

  async update(id: number, callData: Partial<CallAttributes>): Promise<PrismaCall | null> {
    return prisma.call.update({
      where: { id },
      data: callData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        images: true,
      },
    });
  },

  async delete(id: number): Promise<boolean> {
    try {
      await prisma.call.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  },
};
  