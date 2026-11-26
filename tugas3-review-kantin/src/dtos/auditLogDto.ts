export interface AuditLogResponseDto {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  action: string;
  targetTable: string;
  targetId: number;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

export interface AuditLogListResponseDto {
  items: AuditLogResponseDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}