import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt';
import { UserRepository } from '../repositories';
import { Profile } from '../types/models';

export class UserController {
    static async register(req: Request, res: Response) {
        try {
            const { confirmPassword, ...userData } = req.body;

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

            const existingUser = await UserRepository.findByEmail(userData.email);

            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Normalizar telefone: remover formatação e adicionar 55 se necessário
            const normalizedPhone = UserController.normalizePhoneNumber(userData.phone);

            const user = await UserRepository.create({
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                phone: normalizedPhone,
                profile: userData.profile as Profile
            });

            const signOptions: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN };
            const token = jwt.sign(
                { id: user.id, email: user.email, profile: user.profile },
                JWT_SECRET,
                signOptions
            );

            res.status(201).json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: UserController.formatPhoneForDisplay(user.phone),
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
            
            const user = await UserRepository.findByEmail(email);
            
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const signOptions: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN };
            const token = jwt.sign(
                { id: user.id, email: user.email, profile: user.profile },
                JWT_SECRET,
                signOptions
            );

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: UserController.formatPhoneForDisplay(user.phone),
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

            const user = await UserRepository.findById(String(userId));
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                phone: UserController.formatPhoneForDisplay(user.phone),
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
            
            // Se está atualizando o telefone, normalizar
            if (updateData.phone) {
                updateData.phone = UserController.normalizePhoneNumber(updateData.phone);
            }
            
            const updatedUser = await UserRepository.update(String(userId), updateData);

            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: UserController.formatPhoneForDisplay(updatedUser.phone),
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
            const user = await UserRepository.findById(String(userId));
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await UserRepository.update(String(userId), { password: hashedPassword });

            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error updating password' });
        }
    }

    static async updateUserById(req: Request, res: Response) {
        try {
            const userId = req.params.id;
            if (!userId) {
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
                updateData.profile = profile as Profile;
            }

            // Se uma nova senha foi fornecida, gerar o hash
            if (password) {
                console.log('Gerando hash da nova senha...');
                const hashedPassword = await bcrypt.hash(password, 10);
                console.log('Hash da senha gerado');
                updateData.password = hashedPassword;
            }

            const updatedUser = await UserRepository.update(userId, updateData);

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
        } catch (error: any) {
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

            const result = await UserRepository.findMany({
                page,
                limit,
                orderBy: 'createdAt',
                orderDirection: 'desc'
            });

            // Filter out admin@txai.com and apply search
            let filteredUsers = result.data.filter(user => 
                !(user.email === 'admin@txai.com' && user.profile === 'ADMIN')
            );

            // Apply search filter
            if (search) {
                const searchLower = search.toLowerCase();
                filteredUsers = filteredUsers.filter(user =>
                    user.name.toLowerCase().includes(searchLower) ||
                    user.email.toLowerCase().includes(searchLower) ||
                    user.phone.includes(search)
                );
            }

            // Format phones for display
            const formattedUsers = filteredUsers.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: UserController.formatPhoneForDisplay(user.phone),
                profile: user.profile,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }));

            res.json({
                users: formattedUsers,
                pagination: {
                    total: result.total,
                    page,
                    limit,
                    totalPages: result.totalPages
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

            const existingUser = await UserRepository.findByEmail(userData.email);
            console.log('Usuário existente:', existingUser);

            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            console.log('Criando hash da senha...');
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            console.log('Hash da senha criado');

            // Normalizar telefone
            const normalizedPhone = UserController.normalizePhoneNumber(userData.phone);

            console.log('Criando usuário com dados:', {
                ...userData,
                password: '[REDACTED]',
                phone: normalizedPhone,
                profile: userData.profile
            });

            const user = await UserRepository.create({
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                phone: normalizedPhone,
                profile: userData.profile as Profile
            });
            console.log('Usuário criado:', user);

            res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: UserController.formatPhoneForDisplay(user.phone),
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
            const userId = req.params.id;
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const user = await UserRepository.findById(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: UserController.formatPhoneForDisplay(user.phone),
                profile: user.profile
            });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching user' });
        }
    }

    static async deleteUser(req: Request, res: Response) {
        try {
            const userId = req.params.id;
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const deleted = await UserRepository.delete(userId);

            if (!deleted) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({ message: 'User deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ message: 'Error deleting user' });
        }
    }

    /**
     * Normaliza número de telefone para o formato do banco: 55 + apenas dígitos
     */
    private static normalizePhoneNumber(phone: string): string {
        console.log('🔧 normalizePhoneNumber - Input:', phone);
        
        // Remove todos os caracteres não numéricos
        const digitsOnly = phone.replace(/\D/g, '');
        console.log('🔧 normalizePhoneNumber - digitsOnly:', digitsOnly);
        
        // Se começar com 55, mantém como está
        if (digitsOnly.startsWith('55')) {
            console.log('🔧 normalizePhoneNumber - Já tem 55, retornando:', digitsOnly);
            return digitsOnly;
        }
        
        // Se tem 11 dígitos (DDD + 9 dígitos), remover o 9 e adicionar 55
        if (digitsOnly.length === 11) {
            const without9 = digitsOnly.slice(0, 2) + digitsOnly.slice(3);
            const result = '55' + without9;
            console.log('🔧 normalizePhoneNumber - 11 dígitos, retornando:', result);
            return result;
        }
        
        // Se não começar com 55, adiciona 55 no início
        const result = '55' + digitsOnly;
        console.log('🔧 normalizePhoneNumber - Adicionando 55, retornando:', result);
        return result;
    }

    /**
     * Formata número de telefone para exibição: (99) 99999-9999
     */
    private static formatPhoneForDisplay(phone: string): string {
        // Remove todos os caracteres não numéricos
        const digitsOnly = phone.replace(/\D/g, '');
        
        // Se tem 12 dígitos (55 + 10 dígitos), formata como (99) 99999-9999
        if (digitsOnly.length === 12 && digitsOnly.startsWith('55')) {
            return `(${digitsOnly.slice(2, 4)}) 9${digitsOnly.slice(4, 9)}-${digitsOnly.slice(9)}`;
        }
        
        // Se tem 11 dígitos (55 + 9 dígitos), formata como (99) 99999-9999
        if (digitsOnly.length === 11 && digitsOnly.startsWith('55')) {
            return `(${digitsOnly.slice(2, 4)}) ${digitsOnly.slice(4, 9)}-${digitsOnly.slice(9)}`;
        }
        
        // Se tem 10 dígitos (55 + 8 dígitos), formata como (99) 9999-9999
        if (digitsOnly.length === 10 && digitsOnly.startsWith('55')) {
            return `(${digitsOnly.slice(2, 4)}) ${digitsOnly.slice(4, 8)}-${digitsOnly.slice(8)}`;
        }
        
        // Se não conseguir formatar, retorna o original
        return phone;
    }
}
