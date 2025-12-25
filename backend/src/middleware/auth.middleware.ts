import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt';
import { UserRepository } from '../repositories';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
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

        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const parts = authHeader.split(' ');

        if (parts.length !== 2) {
            return res.status(401).json({ error: 'Token error' });
        }

        const [scheme, token] = parts;

        if (!/^Bearer$/i.test(scheme)) {
            return res.status(401).json({ error: 'Token malformatted' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const userId = decoded.id ?? decoded.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        const user = await UserRepository.findById(String(userId));

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            profile: user.profile
        };

        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.profile !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};
