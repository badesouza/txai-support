import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { JWT_SECRET } from '../../src/config/jwt';
import { errorHandler } from '../../src/middleware/error.middleware';
import { UserRepository } from '../../src/repositories';
import userRoutes from '../../src/routes/user.routes';

jest.mock('../../src/repositories', () => ({
  UserRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedUserRepository = UserRepository as jest.Mocked<typeof UserRepository>;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  app.use(errorHandler);
  return app;
};

describe('🔗 User routes integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/users/login should return a token and serialized user', async () => {
    const hashedPassword = await bcrypt.hash('admin123', 4);

    mockedUserRepository.findByEmail.mockResolvedValue({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@txai.com',
      password: hashedPassword,
      phone: '5511999999999',
      profile: 'ADMIN',
    } as any);

    const response = await request(buildApp())
      .post('/api/users/login')
      .send({ email: 'admin@txai.com', password: 'admin123' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          id: 'admin-1',
          email: 'admin@txai.com',
          phone: '(11) 99999-9999',
          profile: 'ADMIN',
        }),
      })
    );
  });

  it('POST /api/users/register should normalize the phone and return the serialized user', async () => {
    mockedUserRepository.findByEmail.mockResolvedValue(null);
    mockedUserRepository.create.mockResolvedValue({
      id: 'user-2',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password',
      phone: '5511987654321',
      profile: 'USER',
    } as any);

    const response = await request(buildApp()).post('/api/users/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '(11) 98765-4321',
      profile: 'USER',
    });

    expect(response.status).toBe(201);
    expect(mockedUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '5511987654321',
      })
    );
    expect(response.body).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          id: 'user-2',
          email: 'test@example.com',
          phone: '(11) 98765-4321',
        }),
      })
    );
  });

  it('GET /api/users/profile should work through auth middleware and route wiring', async () => {
    const user = {
      id: 'user-3',
      name: 'Profile User',
      email: 'profile@example.com',
      password: 'hashed-password',
      phone: '5511912345678',
      profile: 'USER',
    };
    mockedUserRepository.findById.mockResolvedValue(user as any);

    const token = jwt.sign({ id: user.id, email: user.email, profile: user.profile }, JWT_SECRET);

    const response = await request(buildApp())
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'user-3',
        email: 'profile@example.com',
        phone: '(11) 91234-5678',
        profile: 'USER',
      })
    );
    expect(mockedUserRepository.findById).toHaveBeenCalledWith('user-3');
  });
});
