import { AuditLogRepository, type CreateAuditLogInput } from '../repositories/auditLogRepository.ts';
import type { AuditLogListResponseDto, AuditLogResponseDto } from '../dtos/auditLogDto.ts';
import type { ListAuditLogsQuery } from '../schemas/auditLogSchema.ts';
import { AppError } from '../errors/AppError.ts';

export class AuditLogService {
  constructor(private auditLogRepository: AuditLogRepository = new AuditLogRepository()) {}

  private parseMetadata(raw: unknown): Record<string, unknown> | null {
    if (typeof raw === 'string' && raw.trim() !== '') {
      try {
        return JSON.parse(raw);
      } catch {
        return { raw };
      }
    }
    if (raw && typeof raw === 'object') {
      return raw as Record<string, unknown>;
    }
    return null;
  }

  private toDto(row: any): AuditLogResponseDto {
    return {
      id: row.id,
      userId: row.userId,
      userName: row.userName ?? null,
      userEmail: row.userEmail ?? null,
      action: row.action,
      targetTable: row.targetTable,
      targetId: row.targetId,
      metadata: this.parseMetadata(row.metadata),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt ?? null),
    };
  }

  async getLogs(query: ListAuditLogsQuery): Promise<AuditLogListResponseDto> {
    const { items, total } = await this.auditLogRepository.findPaginated(query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);

    return {
      items: items.map((row) => this.toDto(row)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      },
    };
  }

  async getLogById(id: number): Promise<AuditLogResponseDto> {
    const row = await this.auditLogRepository.findById(id);
    if (!row) throw new AppError(404, 'Audit log tidak ditemukan');
    return this.toDto(row);
  }

  async createLog(input: CreateAuditLogInput): Promise<AuditLogResponseDto> {
    const row = await this.auditLogRepository.create(input);
    if (!row) throw new AppError(500, 'Gagal membuat audit log');
    return this.toDto(row);
  }
}