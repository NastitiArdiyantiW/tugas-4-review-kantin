import type { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/auditLogService.ts';
import { getValidated } from '../middleware/validate.ts';
import type { AuditLogIdParam, ListAuditLogsQuery } from '../schemas/auditLogSchema.ts';

export class AuditLogController {
  constructor(private auditLogService: AuditLogService = new AuditLogService()) {}

  getLogs = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const query = getValidated<ListAuditLogsQuery>(res, 'query');
      const data = await this.auditLogService.getLogs(query);
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  };

  getLogById = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = getValidated<AuditLogIdParam>(res, 'params');
      const data = await this.auditLogService.getLogById(id);
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  };
}