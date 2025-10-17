import { UserService } from '../../../src/services/UserService';

// Mock Prisma
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    }
  }
}));

describe('UserService', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = require('../../../src/lib/prisma').prisma;
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        phone: '11999999999',
        profile: 'USER' as const
      };

      const expectedUser = {
        id: 1,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.create.mockResolvedValue(expectedUser);

      const result = await UserService.create(userData);

      // A senha deve ser hasheada antes de salvar
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          profile: userData.profile,
          password: expect.stringMatching(/^\$2[aby]\$/)
        })
      });
      expect(result).toEqual(expectedUser);
    });

    it('should handle creation errors', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        phone: '11999999999',
        profile: 'USER' as const
      };

      mockPrisma.user.create.mockRejectedValue(new Error('Email already exists'));

      await expect(UserService.create(userData)).rejects.toThrow('Email already exists');
    });
  });

  describe('getAll', () => {
    it('should get all users with pagination', async () => {
      const users = [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          phone: '11999999999',
          profile: 'USER',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await UserService.getAll(1, 10);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' },
        select: expect.objectContaining({ id: true, email: true, name: true, phone: true, profile: true, createdAt: true })
      });
      expect(result).toEqual({
        users,
        total: 1,
        totalPages: 1,
        currentPage: 1
      });
    });

    it('should search users by term', async () => {
      const users = [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          phone: '11999999999',
          profile: 'USER',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await UserService.getAll(1, 10, 'test');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test' } },
            { email: { contains: 'test' } },
            { phone: { contains: 'test' } }
          ]
        },
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' },
        select: expect.any(Object)
      });
      expect(result).toEqual({
        users,
        total: 1,
        totalPages: 1,
        currentPage: 1
      });
    });
  });

  describe('getById', () => {
    it('should get user by id', async () => {
      const user = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        phone: '11999999999',
        profile: 'USER',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await UserService.getById(1);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      });
      expect(result).toEqual(user);
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(UserService.getById(999)).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateData = {
        name: 'Updated User',
        email: 'updated@example.com'
      };

      const updatedUser = {
        id: 1,
        ...updateData,
        phone: '11999999999',
        profile: 'USER',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await UserService.update(1, updateData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData
      });
      expect(result).toEqual(updatedUser);
    });

    it('should handle update errors', async () => {
      const updateData = {
        name: 'Updated User'
      };

      mockPrisma.user.update.mockRejectedValue(new Error('User not found'));

      await expect(UserService.update(999, updateData)).rejects.toThrow('User not found');
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const deletedUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        phone: '11999999999',
        profile: 'USER',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.delete.mockResolvedValue(deletedUser);

      await UserService.delete(1);

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });

    it('should handle delete errors', async () => {
      mockPrisma.user.delete.mockRejectedValue(new Error('User not found'));

      await expect(UserService.delete(999)).rejects.toThrow('User not found');
    });
  });
});