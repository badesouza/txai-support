import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

export class UserController {
    static async register(req: Request, res: Response) {
        try {
            console.log('Body recebido:', req.body);
            console.log('Content-Type:', req.headers['content-type']);

            const { confirmPassword, ...userData } = req.body;
            console.log('Dados do usuário:', userData);

            if (!userData.email || !userData.password || !userData.name || !userData.phone) {
                return res.status(400).json({ 
                    message: 'Missing required fields',
                    required: ['email', 'password', 'name', 'phone', 'profile']
                });
            }

            if (!userData.profile || !['USER', 'ADMIN'].includes(userData.profile)) {
                return res.status(400).json({ 
                    message: 'Invalid profile',
                    validProfiles: ['USER', 'ADMIN']
                });
            }

            const existingUser = await prisma.user.findUnique({
                where: { email: userData.email }
            });
            console.log('Usuário existente:', existingUser);

            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            console.log('Criando hash da senha...');
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            console.log('Hash da senha criado');

            console.log('Criando usuário com dados:', {
                ...userData,
                password: '[REDACTED]',
                profile: userData.profile as 'USER' | 'ADMIN'
            });

            const user = await prisma.user.create({
                data: {
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    phone: userData.phone,
                    profile: userData.profile as 'USER' | 'ADMIN'
                }
            });
            console.log('Usuário criado:', user);

            const token = jwt.sign(
                { id: user.id, email: user.email, profile: user.profile },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.status(201).json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    profile: user.profile
                },
                token
            });
        } catch (error) {
            console.error('Erro no registro:', error);
            if (error instanceof Error) {
                console.error('Mensagem de erro:', error.message);
                console.error('Stack trace:', error.stack);
            }
            res.status(500).json({ 
                message: 'Error creating user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            console.log('Tentativa de login para email:', email);
            
            const user = await prisma.user.findUnique({
                where: { email }
            });
            console.log('Usuário encontrado:', user ? 'Sim' : 'Não');
            
            if (!user) {
                console.log('Usuário não encontrado');
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            console.log('Usuário encontrado, verificando senha...');
            const isValidPassword = await bcrypt.compare(password, user.password);
            console.log('Senha válida?', isValidPassword);
            
            if (!isValidPassword) {
                console.log('Senha inválida');
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            console.log('Login bem sucedido, gerando token...');
            const token = jwt.sign(
                { id: user.id, email: user.email, profile: user.profile },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    profile: user.profile
                },
                token
            });
        } catch (error) {
            console.error('Erro durante o login:', error);
            res.status(500).json({ 
                message: 'Error during login',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async getProfile(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                profile: user.profile
            });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching profile' });
        }
    }

    static async updateProfile(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { password, ...updateData } = req.body;
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: updateData
            });

            res.json({
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                profile: updatedUser.profile
            });
        } catch (error) {
            res.status(500).json({ message: 'Error updating profile' });
        }
    }

    static async updatePassword(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { currentPassword, newPassword } = req.body;
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword }
            });

            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error updating password' });
        }
    }

    static async updateUserById(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            console.log('Dados recebidos para atualização:', req.body);
            const { password, ...updateData } = req.body;

            // Validar e converter o perfil se estiver presente
            if (updateData.profile) {
                const profile = updateData.profile.toUpperCase();
                if (!['USER', 'ADMIN'].includes(profile)) {
                    return res.status(400).json({ 
                        message: 'Invalid profile',
                        validProfiles: ['USER', 'ADMIN']
                    });
                }
                updateData.profile = profile;
            }

            // Se uma nova senha foi fornecida, gerar o hash
            if (password) {
                console.log('Gerando hash da nova senha...');
                const hashedPassword = await bcrypt.hash(password, 10);
                console.log('Hash da senha gerado');
                updateData.password = hashedPassword;
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: updateData
            });

            res.json({
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                profile: updatedUser.profile
            });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({ 
                message: 'Error updating user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async listAllUsers(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;
            const skip = (page - 1) * limit;

            let where: any = {
                NOT: {
                    AND: [
                        { email: 'admin@txai.com' },
                        { profile: 'ADMIN' }
                    ]
                }
            };

            if (search) {
                where = {
                    ...where,
                    OR: [
                        { name: { contains: search } },
                        { email: { contains: search } },
                        { phone: { contains: search } }
                    ]
                };
            }

            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    skip,
                    take: limit,
                    where,
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        profile: true,
                        createdAt: true,
                        updatedAt: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                prisma.user.count({ where })
            ]);

            res.json({
                users,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Error listing users:', error);
            res.status(500).json({ 
                message: 'Error listing users',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async createUser(req: Request, res: Response) {
        try {
            console.log('Body recebido:', req.body);
            console.log('Content-Type:', req.headers['content-type']);

            const userData = req.body;
            console.log('Dados do usuário:', userData);

            if (!userData.email || !userData.password || !userData.name || !userData.phone) {
                return res.status(400).json({ 
                    message: 'Missing required fields',
                    required: ['email', 'password', 'name', 'phone', 'profile']
                });
            }

            const existingUser = await prisma.user.findUnique({
                where: { email: userData.email }
            });
            console.log('Usuário existente:', existingUser);

            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            console.log('Criando hash da senha...');
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            console.log('Hash da senha criado');

            console.log('Criando usuário com dados:', {
                ...userData,
                password: '[REDACTED]',
                profile: userData.profile
            });

            const user = await prisma.user.create({
                data: {
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    phone: userData.phone,
                    profile: userData.profile
                }
            });
            console.log('Usuário criado:', user);

            res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                profile: user.profile
            });
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            if (error instanceof Error) {
                console.error('Mensagem de erro:', error.message);
                console.error('Stack trace:', error.stack);
            }
            res.status(500).json({ 
                message: 'Error creating user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async getUserById(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                profile: user.profile
            });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching user' });
        }
    }

    static async deleteUser(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            await prisma.user.delete({
                where: { id: userId }
            });

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting user' });
        }
    }
} 