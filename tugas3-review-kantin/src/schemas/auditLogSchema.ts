import { z } from 'zod';

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

const optionalPositiveInt = (label: string) =>
  z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : val),
    z
      .string()
      .regex(/^\d+$/, `${label} harus bilangan bulat positif`)
      .transform(Number)
      .refine((n) => Number.isInteger(n) && n >= 1, `${label} minimal 1`)
      .optional(),
  );

export const listAuditLogsQuerySchema = z
  .object({
    page: z
      .preprocess((val) => (val === undefined || val === '' ? '1' : val), z.string())
      .refine((v) => /^-?\d+$/.test(v), 'page harus bilangan bulat')
      .transform(Number)
      .refine((n) => n >= 1, 'page minimal 1'),

    pageSize: z
      .preprocess((val) => (val === undefined || val === '' ? '20' : val), z.string())
      .refine((v) => /^-?\d+$/.test(v), 'pageSize harus bilangan bulat')
      .transform(Number)
      .refine((n) => n >= 1 && n <= 100, 'pageSize harus antara 1 sampai 100'),

    action: z.string().trim().min(1, 'action tidak boleh kosong').max(50, 'action maksimal 50 karakter').optional(),
    targetTable: z.string().trim().min(1, 'targetTable tidak boleh kosong').max(50, 'targetTable maksimal 50 karakter').optional(),
    targetId: optionalPositiveInt('targetId'),
    userId: optionalPositiveInt('userId'),

    from: z
      .string()
      .refine(isValidCalendarDate, 'from harus berformat YYYY-MM-DD dan tanggal yang valid')
      .optional(),

    to: z
      .string()
      .refine(isValidCalendarDate, 'to harus berformat YYYY-MM-DD dan tanggal yang valid')
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.from > data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'Tanggal from tidak boleh lebih besar dari to',
      });
    }
  });

export const auditLogIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'id harus bilangan bulat positif')
    .transform(Number)
    .refine((n) => n >= 1, 'id minimal 1'),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type AuditLogIdParam = z.infer<typeof auditLogIdParamSchema>;