import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt';
import { UserRepository } from '../repositories';
import { Profile } from '../types/models';
import { normalizePhone, formatPhoneForDisplay } from '../utils/phone';
import { createLogger } from '../utils/logger';

const logger = createLogger('UserController');

export class UserController {
    private static serializeUser(user: { id: string; email: string; name: string; phone: string; profile: Profile }) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: formatPhoneForDisplay(user.phone),
            profile: user.profile
        };
    }

    private static normalizePhoneOrReject(phone: string, res: Response): string | null {
        try {
            return normalizePhone(phone);
        } catch (phoneError) {
            logger.warn('Rejected invalid phone number', {
                phone,
                reason: phoneError instanceof Error ? phoneError.message : 'unknown',
            });
            res.status(400).json({
                message: phoneError instanceof Error ? phoneError.message : 'Formato de telefone inválido',
                field: 'phone'
            });
            return null;
        }
    }

    static async register(req: Request, res: Response) {
        try {
            const { confirmPassword: _confirmPassword, ...userData } = req.body;

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
                logger.warn('Registration rejected due to existing email', { email: userData.email });
                return res.status(400).json({ message: 'Email already registered' });
            }

            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const normalizedPhone = this.normalizePhoneOrReject(userData.phone, res);
            if (!normalizedPhone) {
                return;
            }

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
                user: this.serializeUser(user),
                token
            });
        } catch (error) {
            logger.error('Unexpected error during registration', {
                email: req.body?.email,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
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
                logger.warn('Login failed because user was not found', { email });
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                logger.warn('Login failed because password validation failed', {
                    email,
                    userId: user.id,
                });
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const signOptions: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN };
            const token = jwt.sign(
                { id: user.id, email: user.email, profile: user.profile },
                JWT_SECRET,
                signOptions
            );

            res.json({
                user: this.serializeUser(user),
                token
            });
        } catch (error) {
            logger.error('Unexpected error during login', {
                email: req.body?.email,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
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
                logger.warn('Profile lookup attempted without authenticated user');
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const user = await UserRepository.findById(String(userId));
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(this.serializeUser(user));
        } catch (error) {
            res.status(500).json({ message: 'Error fetching profile' });
        }
    }

    static async updateProfile(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                logger.warn('Profile update attempted without authenticated user');
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { password: _password, ...updateData } = req.body;
            
            // Validate and normalize phone if updating
            if (updateData.phone) {
                const normalizedPhone = this.normalizePhoneOrReject(updateData.phone, res);
                if (!normalizedPhone) {
                    return;
                }
                updateData.phone = normalizedPhone;
            }
            
            const updatedUser = await UserRepository.update(String(userId), updateData);

            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(this.serializeUser(updatedUser));
        } catch (error) {
            res.status(500).json({ message: 'Error updating profile' });
        }
    }

    static async updatePassword(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                logger.warn('Password update attempted without authenticated user');
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { currentPassword, newPassword } = req.body;
            const user = await UserRepository.findById(String(userId));
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                logger.warn('Password update rejected due to invalid current password', {
                    userId: String(userId),
                });
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await UserRepository.update(String(userId), { password: hashedPassword });

            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            logger.error('Unexpected error updating password', {
                userId: req.user?.id ? String(req.user.id) : undefined,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({ message: 'Error updating password' });
        }
    }

    static async updateUserById(req: Request, res: Response) {
        try {
            const userId = req.params.id;
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }
            const { password: _password, ...updateData } = req.body;

            // Validate and normalize phone if present
            if (updateData.phone) {
                const normalizedPhone = this.normalizePhoneOrReject(updateData.phone, res);
                if (!normalizedPhone) {
                    return;
                }
                updateData.phone = normalizedPhone;
            }

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
            if (_password) {
                const hashedPassword = await bcrypt.hash(_password, 10);
                updateData.password = hashedPassword;
            }

            const updatedUser = await UserRepository.update(userId, updateData);

            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(this.serializeUser(updatedUser));
        } catch (error: any) {
            logger.error('Unexpected error updating user by id', {
                userId: req.params.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
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
                ...this.serializeUser(user),
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
            logger.error('Unexpected error listing users', {
                page: req.query.page,
                limit: req.query.limit,
                search: req.query.search,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({ 
                message: 'Error listing users',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async createUser(req: Request, res: Response) {
        try {
            const userData = req.body;
            logger.debug('Admin user creation requested', {
                email: userData?.email,
                profile: userData?.profile,
                contentType: req.headers['content-type'],
            });

            if (!userData.email || !userData.password || !userData.name || !userData.phone) {
                return res.status(400).json({ 
                    message: 'Missing required fields',
                    required: ['email', 'password', 'name', 'phone', 'profile']
                });
            }

            const existingUser = await UserRepository.findByEmail(userData.email);

            if (existingUser) {
                logger.warn('Admin user creation rejected due to existing email', { email: userData.email });
                return res.status(400).json({ message: 'Email already registered' });
            }

            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Validate and normalize phone (E.164 format for WhatsApp)
            const normalizedPhone = this.normalizePhoneOrReject(userData.phone, res);
            if (!normalizedPhone) {
                return;
            }

            const user = await UserRepository.create({
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                phone: normalizedPhone,
                profile: userData.profile as Profile
            });
            logger.info('Admin user created successfully', {
                userId: user.id,
                email: user.email,
                profile: user.profile,
            });

            res.status(201).json({
                ...this.serializeUser(user)
            });
        } catch (error) {
            logger.error('Unexpected error creating user', {
                email: req.body?.email,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
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

            res.json(this.serializeUser(user));
        } catch (error) {
            logger.error('Unexpected error fetching user by id', {
                userId: req.params.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
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
            logger.error('Unexpected error deleting user', {
                userId: req.params.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({ message: 'Error deleting user' });
        }
    }
}
