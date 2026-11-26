import bcrypt from 'bcryptjs';
import { AppError } from '../errors/AppError.ts';
import { UserRepository } from '../repositories/userRepository.ts';
import { AuditLogRepository } from '../repositories/auditLogRepository.ts';
import { signAccessToken } from '../middleware/authenticate.ts';
import type { UserRole } from '../schemas/authSchema.ts';

export interface AuthClientInfo {
  ipAddress: string;
  userAgent: string;
}

export class AuthService {
  constructor(
    private users = new UserRepository(),
    private auditLogs = new AuditLogRepository(),
  ) {}

  private async writeAuthAuditBestEffort(params: {
    userId: number;
    action: 'LOGIN' | 'LOGOUT';
    role: string;
    result: 'success' | 'failed';
    clientInfo: AuthClientInfo;
  }) {
    try {
      await this.auditLogs.create({
        userId: params.userId,
        action: params.action,
        targetTable: 'USERS',
        targetId: params.userId,
        metadata: JSON.stringify({
          role: params.role,
          ip_address: params.clientInfo.ipAddress,
          user_agent: params.clientInfo.userAgent,
          result: params.result,
        }),
      });
    } catch (error) {
      // Best-effort: kegagalan menulis audit tidak boleh menggagalkan login/logout
      console.error(`[AUDIT_LOG] Gagal mencatat ${params.action}:`, error);
    }
  }

  async register(input: { name: string; email: string; password: string }) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new AppError(409, 'Email sudah terdaftar');
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const passwordHash = await bcrypt.hash(input.password, rounds);
    // Role saat registrasi selalu customer. Client tidak dapat memilih role.
    const row = await this.users.create({ name: input.name, email: input.email, passwordHash, role: 'customer' });
    return { user: this.publicUser(row), token: signAccessToken({ id: row.id, name: row.name, email: row.email, role: row.role as UserRole }) };
  }

  async login(input: { email: string; password: string }, clientInfo: AuthClientInfo) {
    const user = await this.users.findByEmail(input.email);
    // Pesan yang sama untuk email yang tidak terdaftar dan password salah.
    const matches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

    if (!user || !matches) {
      if (user) {
        await this.writeAuthAuditBestEffort({
          userId: user.id,
          action: 'LOGIN',
          role: user.role,
          result: 'failed',
          clientInfo,
        });
      }
      throw new AppError(401, 'Email atau password salah');
    }

    await this.writeAuthAuditBestEffort({
      userId: user.id,
      action: 'LOGIN',
      role: user.role,
      result: 'success',
      clientInfo,
    });

    return {
      user: this.publicUser(user),
      token: signAccessToken({ id: user.id, name: user.name, email: user.email, role: user.role as UserRole }),
    };
  }

  async logout(user: { id: number; role: string }, clientInfo: AuthClientInfo) {
    await this.writeAuthAuditBestEffort({
      userId: user.id,
      action: 'LOGOUT',
      role: user.role,
      result: 'success',
      clientInfo,
    });
  }

  private publicUser(user: { id: number; name: string; email: string; role: string; createdAt: Date | null }) {
    return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
  }
}