import { Request, Response, NextFunction } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }

      const hashedPassword = await bcryptjs.hash(password, 12);
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
        select: { id: true, name: true, email: true, createdAt: true },
      });

      logger.info({ userId: user.id }, 'User registered');
      res.status(201).json({ success: true, data: { user }, message: 'Account created successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const isValidPassword = await bcryptjs.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = (jwt.sign as any)(
        { userId: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      ) as string;

      logger.info({ userId: user.id }, 'User logged in');
      res.json({
        success: true,
        data: { token, user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true, name: true, email: true, createdAt: true,
          _count: { select: { projects: true } },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      res.json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }
}
