import request from 'supertest';
import app from '../../../src/app';
import { prisma } from '../../../src/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('User Controller Integration Tests', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        phone: '123456789',
        profile: 'USER'
      }
    });

    // Generate auth token using the same secret used by the app/middleware
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        phone: '987654321',
        profile: 'USER'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newUser.name);
      expect(response.body.email).toBe(newUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 400 for invalid user data', async () => {
      const invalidUser = {
        name: '',
        email: 'invalid-email',
        password: '123',
        phone: '',
        profile: 'INVALID'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUser)
        .expect(400);

      // API returns a message and required fields, not `errors`
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 without authorization', async () => {
      const newUser = {
        name: 'Unauthorized User',
        email: 'unauthorized@example.com',
        password: 'password123',
        phone: '111111111',
        profile: 'USER'
      };

      await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('should get all users with pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter users by search term', async () => {
      const response = await request(app)
        .get('/api/users?search=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.users).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Test')
          })
        ])
      );
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.name).toBe(testUser.name);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user', async () => {
      const updateData = {
        name: 'Updated User',
        phone: '999999999'
      };

      const response = await request(app)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.phone).toBe(updateData.phone);
    });

    it('should return 404 for non-existent user', async () => {
      const updateData = {
        name: 'Updated User'
      };

      await request(app)
        .put('/api/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      // Create a user to delete
      const userToDelete = await prisma.user.create({
        data: {
          name: 'User to Delete',
          email: 'delete@example.com',
          password: 'password123',
          phone: '111111111',
          profile: 'USER'
        }
      });

      await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify user is deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: userToDelete.id }
      });
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .delete('/api/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
