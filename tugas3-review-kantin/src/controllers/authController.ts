import type { Request, Response, NextFunction } from 'express';
import { AuthService, type AuthClientInfo } from '../services/authService.ts';
import { getValidated } from '../middleware/validate.ts';
import type { z } from 'zod';
import { registerSchema, loginSchema } from '../schemas/authSchema.ts';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

export class AuthController {
  constructor(private authService = new AuthService()) {}

  private getClientInfo(req: Request): AuthClientInfo {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : Array.isArray(forwarded)
          ? forwarded[0]
          : req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return { ipAddress, userAgent };
  }

  register = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.register(getValidated<RegisterInput>(res, 'body'));
      return res.status(201).json({ status: 'success', message: 'Registrasi berhasil', data: result });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.login(
        getValidated<LoginInput>(res, 'body'),
        this.getClientInfo(req),
      );
      return res.status(200).json({ status: 'success', message: 'Login berhasil', data: result });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized', errors: [] });
      }
      await this.authService.logout(
        { id: req.user.id, role: req.user.role },
        this.getClientInfo(req),
      );
      return res.status(200).json({ status: 'success', message: 'Logout berhasil', data: null });
    } catch (error) {
      next(error);
    }
  };

  me = (req: Request, res: Response) => res.status(200).json({ status: 'success', data: { user: req.user } });
}