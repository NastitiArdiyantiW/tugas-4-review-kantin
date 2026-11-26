import { and, count, desc, eq, gte, lt, type SQL } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { auditLogs, users } from '../db/schema.ts';
import type { ListAuditLogsQuery } from '../schemas/auditLogSchema.ts';

export interface CreateAuditLogInput {
  userId: number;
  action: string;
  targetTable: string;
  targetId: number;
  metadata?: string | null;
}

function parseLocalDateStart(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function parseLocalDateNextDay(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d + 1, 0, 0, 0, 0);
}

export class AuditLogRepository {
  async findPaginated(query: ListAuditLogsQuery) {
    const db = await getDb();
    const conditions: SQL[] = [];

    if (query.action) conditions.push(eq(auditLogs.action, query.action));
    if (query.targetTable) conditions.push(eq(auditLogs.targetTable, query.targetTable));
    if (query.targetId !== undefined) conditions.push(eq(auditLogs.targetId, query.targetId));
    if (query.userId !== undefined) conditions.push(eq(auditLogs.userId, query.userId));
    if (query.from) conditions.push(gte(auditLogs.createdAt, parseLocalDateStart(query.from)));
    if (query.to) conditions.push(lt(auditLogs.createdAt, parseLocalDateNextDay(query.to)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.pageSize;

    const totalRows = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(totalRows[0]?.total ?? 0);

    const items = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
        action: auditLogs.action,
        targetTable: auditLogs.targetTable,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .offset(offset)
      .fetch(query.pageSize);

    return { items, total };
  }

  async findById(id: number) {
    const db = await getDb();
    const rows = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
        action: auditLogs.action,
        targetTable: auditLogs.targetTable,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.id, id));

    return rows[0] ?? null;
  }

  async create(input: CreateAuditLogInput) {
    const db = await getDb();
    const rows = await db
      .insert(auditLogs)
      .output()
      .values({
        userId: input.userId,
        action: input.action,
        targetTable: input.targetTable,
        targetId: input.targetId,
        metadata: input.metadata ?? null,
      });
    return rows[0];
  }
}