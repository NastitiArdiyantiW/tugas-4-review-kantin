import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLogController.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { authorize } from '../middleware/authorize.ts';
import { validate } from '../middleware/validate.ts';
import { listAuditLogsQuerySchema, auditLogIdParamSchema } from '../schemas/auditLogSchema.ts';

const auditLogRouter = Router();
const auditLogController = new AuditLogController();

// Seluruh endpoint audit log hanya untuk role admin
auditLogRouter.use(authenticate, authorize('admin'));

auditLogRouter.get('/', validate('query', listAuditLogsQuerySchema), auditLogController.getLogs);
auditLogRouter.get('/:id', validate('params', auditLogIdParamSchema), auditLogController.getLogById);

export { auditLogRouter };