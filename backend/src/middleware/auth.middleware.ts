import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                name: string;
                email: string;
                profile: string;
            };
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        console.log('Auth header:', authHeader);

        if (!authHeader) {
            console.log('No token provided');
            return res.status(401).json({ error: 'No token provided' });
        }

        const parts = authHeader.split(' ');
        console.log('Token parts:', parts);

        if (parts.length !== 2) {
            console.log('Token error: invalid format');
            return res.status(401).json({ error: 'Token error' });
        }

        const [scheme, token] = parts;

        if (!/^Bearer$/i.test(scheme)) {
            console.log('Token error: malformatted');
            return res.status(401).json({ error: 'Token malformatted' });
        }

        console.log('Verifying token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
            id: number;
            name: string;
            email: string;
            profile: string;
        };
        console.log('Token decoded:', decoded);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user) {
            console.log('User not found:', decoded.id);
            return res.status(401).json({ error: 'User not found' });
        }

        console.log('User found:', user);
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            profile: user.profile
        };

        return next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.profile !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}; 