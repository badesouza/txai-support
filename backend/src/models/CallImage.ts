import { CallImage as PrismaCallImage } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CallImageAttributes {
  id: number;
  filename: string;
  path: string;
  callId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CallImageCreationAttributes {
  filename: string;
  path: string;
  callId: number;
}

export const CallImageModel = {
  async create(imageData: CallImageCreationAttributes): Promise<PrismaCallImage> {
    return prisma.callImage.create({
      data: imageData,
    });
  },

  async findById(id: number): Promise<PrismaCallImage | null> {
    return prisma.callImage.findUnique({
      where: { id },
    });
  },

  async findByCallId(callId: number): Promise<PrismaCallImage[]> {
    return prisma.callImage.findMany({
      where: { callId },
    });
  },

  async delete(id: number): Promise<boolean> {
    try {
      await prisma.callImage.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  },
};
  