import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { UserCreateInput } from '../types';
import bcrypt from 'bcrypt';

export class UserController {
    static async register(req: Request, res: Response) {
        try {
            console.log('Body recebido:', req.body); // Debug do body completo
            console.log('Content-Type:', req.headers['content-type']); // Debug do content-type

            const userData: UserCreateInput = req.body;
            console.log('Dados do usuário:', userData); // Debug dos dados após tipagem

            if (!userData.email || !userData.password || !userData.name || !userData.phone) {
                return res.status(400).json({ 
                    message: 'Missing required fields',
                    required: ['email', 'password', 'name', 'phone', 'profile']
                });
            }

            const existingUser = await UserModel.findByEmail(userData.email);
            console.log('Usuário existente:', existingUser); // Debug

            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            const user = await UserModel.create(userData);
            console.log('Usuário criado:', user); // Debug

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
            console.error('Erro no registro:', error); // Debug detalhado
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
            
            const user = await UserModel.findByEmail(email);
            if (!user) {
                console.log('Usuário não encontrado');
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            console.log('Usuário encontrado, verificando senha...');
            const isValidPassword = await UserModel.verifyPassword(user, password);
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
            res.status(500).json({ message: 'Error during login' });
        }
    }

    static async getProfile(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const user = await UserModel.findById(userId);
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

            const updatedUser = await UserModel.update(userId, req.body);
            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

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
            const user = await UserModel.findById(userId);
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isValidPassword = await UserModel.verifyPassword(user, currentPassword);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            const success = await UserModel.updatePassword(userId, newPassword);
            if (!success) {
                return res.status(500).json({ message: 'Error updating password' });
            }

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
            const updateData = { ...req.body };
            
            // Não precisamos fazer o hash aqui, pois o model já faz isso
            const updatedUser = await UserModel.update(userId, updateData);
            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            console.log('Usuário atualizado com sucesso:', {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                profile: updatedUser.profile
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
            const search = req.query.search as string || '';
            const offset = (page - 1) * limit;

            const { users, total } = await UserModel.findAllWithPagination({
                page,
                limit,
                search,
                offset
            });
            
            // Remove a senha dos dados retornados
            const usersWithoutPassword = users.map(user => ({
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                profile: user.profile,
                status: user.status,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }));

            res.json({
                users: usersWithoutPassword,
                total,
                page,
                limit
            });
        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            res.status(500).json({ 
                message: 'Error listing users',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async createUser(req: Request, res: Response) {
        try {
            const userData = req.body;
            const existingUser = await UserModel.findByEmail(userData.email);
            
            if (existingUser) {
                return res.status(400).json({ message: 'Email já cadastrado' });
            }

            const user = await UserModel.create(userData);
            
            res.status(201).json({
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                profile: user.profile
            });
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            res.status(500).json({ 
                message: 'Erro ao criar usuário',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    static async getUserById(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const user = await UserModel.findById(userId);
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
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({ 
                message: 'Error fetching user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async deleteUser(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            await user.destroy();
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            res.status(500).json({ 
                message: 'Error deleting user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async index(req: Request, res: Response) {
        try {
            const users = await UserModel.findAll({
                where: {
                    is_default: false
                },
                attributes: { exclude: ["password"] },
            });
            res.json(users);
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    static async show(req: Request, res: Response) {
        try {
            const user = await UserModel.findByPk(req.params.id, {
                attributes: { exclude: ["password"] },
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json(user);
        } catch (error) {
            console.error("Error fetching user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    static async store(req: Request, res: Response) {
        try {
            const { name, email, password, role } = req.body;

            const user = await UserModel.create({
                name,
                email,
                password,
                role,
                is_default: false
            });

            const { password: _, ...userWithoutPassword } = user.toJSON();
            res.status(201).json(userWithoutPassword);
        } catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const { name, email, password, role } = req.body;
            const user = await UserModel.findByPk(req.params.id);

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            if (user.is_default) {
                return res.status(403).json({ error: "Cannot update default user" });
            }

            await user.update({
                name,
                email,
                ...(password && { password }),
                role,
            });

            const { password: _, ...userWithoutPassword } = user.toJSON();
            res.json(userWithoutPassword);
        } catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    static async destroy(req: Request, res: Response) {
        try {
            const user = await UserModel.findByPk(req.params.id);

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            if (user.is_default) {
                return res.status(403).json({ error: "Cannot delete default user" });
            }

            await user.destroy();
            res.status(204).send();
        } catch (error) {
            console.error("Error deleting user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
} 