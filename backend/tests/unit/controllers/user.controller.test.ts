import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { UserController } from '../../../src/controllers/user.controller';
import { UserRepository } from '../../../src/repositories';

jest.mock('../../../src/repositories', () => ({
  UserRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
}));

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const mockedUserRepository = UserRepository as jest.Mocked<typeof UserRepository>;

const createMockResponse = (): MockResponse => {
  const response = {} as MockResponse;
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

describe('🧪 UserController unbound handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login successfully when the handler is invoked without class binding', async () => {
    const hashedPassword = await bcrypt.hash('admin123', 4);

    mockedUserRepository.findByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@txai.com',
      password: hashedPassword,
      phone: '5511999999999',
      profile: 'ADMIN',
    } as any);

    const request = {
      body: {
        email: 'admin@txai.com',
        password: 'admin123',
      },
    } as Request;
    const response = createMockResponse();

    const loginHandler = UserController.login;
    await loginHandler(request, response);

    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          id: 'user-1',
          email: 'admin@txai.com',
          name: 'Admin',
          phone: '(11) 99999-9999',
          profile: 'ADMIN',
        }),
      })
    );
  });

  it('should register successfully when the handler is invoked without class binding', async () => {
    mockedUserRepository.findByEmail.mockResolvedValue(null);
    mockedUserRepository.create.mockResolvedValue({
      id: 'user-2',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password',
      phone: '5511987654321',
      profile: 'USER',
    } as any);

    const request = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        phone: '(11) 98765-4321',
        profile: 'USER',
      },
    } as Request;
    const response = createMockResponse();

    const registerHandler = UserController.register;
    await registerHandler(request, response);

    expect(mockedUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        phone: '5511987654321',
        profile: 'USER',
      })
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          email: 'test@example.com',
          phone: '(11) 98765-4321',
        }),
      })
    );
  });
});
