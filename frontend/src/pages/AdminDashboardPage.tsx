import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  Trash2,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  LoadingPanel,
  Modal,
  PageHeader,
  Spinner,
  inputClass,
  textareaClass,
} from '../components/ui.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  auditApi,
  stallsApi,
  usersApi,
  type AuditLogItem,
  type AuditLogPagination,
  type AuditLogQuery,
} from '../lib/api.ts';
import { formatRating } from '../lib/format.ts';
import { getApiErrorMessage } from '../lib/http.ts';
import type { Stall, User } from '../types/api.ts';

const emptyStallForm = {
  ownerId: '',
  name: '',
  category: '',
  location: '',
  description: '',
};

const emptyAuditFilters = {
  action: '',
  targetTable: '',
  targetId: '',
  userId: '',
  from: '',
  to: '',
};

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stalls' | 'audit'>('audit');

  // --- State Warung ---
  const [users, setUsers] = useState<User[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stallModalOpen, setStallModalOpen] = useState(false);
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [stallForm, setStallForm] = useState(emptyStallForm);
  const [deletingStall, setDeletingStall] = useState<Stall | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- State Audit Log ---
  const [auditFilters, setAuditFilters] = useState(emptyAuditFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyAuditFilters);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(10);
  const [auditItems, setAuditItems] = useState<AuditLogItem[]>([]);
  const [auditPagination, setAuditPagination] = useState<AuditLogPagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // --- State Modal Detail Audit Log ---
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<AuditLogItem | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [stallData, userData] = await Promise.all([
        stallsApi.list(),
        usersApi.list().catch(() => [] as User[]),
      ]);

      setStalls(stallData);
      setUsers(userData);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);

    try {
      const params: AuditLogQuery = {
        page: auditPage,
        pageSize: auditPageSize,
      };
      if (appliedFilters.action.trim()) params.action = appliedFilters.action.trim();
      if (appliedFilters.targetTable.trim()) params.targetTable = appliedFilters.targetTable.trim();
      if (appliedFilters.targetId.trim()) params.targetId = Number(appliedFilters.targetId.trim());
      if (appliedFilters.userId.trim()) params.userId = Number(appliedFilters.userId.trim());
      if (appliedFilters.from.trim()) params.from = appliedFilters.from.trim();
      if (appliedFilters.to.trim()) params.to = appliedFilters.to.trim();

      const res = await auditApi.list(params);
      setAuditItems(res.items);
      setAuditPagination(res.pagination);
    } catch (err) {
      setAuditError(getApiErrorMessage(err));
    } finally {
      setAuditLoading(false);
    }
  }, [appliedFilters, auditPage, auditPageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (activeTab === 'audit') {
      void loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  function handleApplyAuditFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAuditPage(1);
    setAppliedFilters({ ...auditFilters });
  }

  function handleResetAuditFilters(): void {
    setAuditFilters(emptyAuditFilters);
    setAppliedFilters(emptyAuditFilters);
    setAuditPage(1);
  }

  async function handleOpenAuditDetail(id: number): Promise<void> {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedAudit(null);

    try {
      const detail = await auditApi.getById(id);
      setSelectedAudit(detail);
    } catch (err) {
      setDetailError(getApiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  const ownerOptions = users.filter((item) => item.role === 'owner' || item.role === 'admin');

  function openCreateStall(): void {
    setEditingStall(null);
    setStallForm({
      ...emptyStallForm,
      ownerId: ownerOptions[0] ? String(ownerOptions[0].id) : '',
    });
    setModalError(null);
    setStallModalOpen(true);
  }

  function openEditStall(stall: Stall): void {
    setEditingStall(stall);
    setStallForm({
      ownerId: String(stall.ownerId),
      name: stall.name,
      category: stall.category ?? '',
      location: stall.location ?? '',
      description: stall.description ?? '',
    });
    setModalError(null);
    setStallModalOpen(true);
  }

  async function handleStallSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setModalError(null);
    setNotice(null);

    try {
      const payload = {
        name: stallForm.name.trim(),
        category: stallForm.category.trim() || null,
        location: stallForm.location.trim() || null,
        description: stallForm.description.trim() || null,
      } as any;

      if (editingStall) {
        await stallsApi.update(editingStall.id, payload);
        setNotice('Warung berhasil diperbarui.');
      } else {
        await stallsApi.create(payload);
        setNotice('Warung berhasil dibuat.');
      }

      setStallModalOpen(false);
      setEditingStall(null);
      await load();
    } catch (submitError) {
      setModalError(getApiErrorMessage(submitError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteStall(): Promise<void> {
    if (!deletingStall) return;
    setIsDeleting(true);
    setModalError(null);

    try {
      await stallsApi.remove(deletingStall.id);
      setDeletingStall(null);
      setNotice('Warung berhasil dihapus.');
      await load();
    } catch (deleteError) {
      setModalError(getApiErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  function closeStallModal(): void {
    setStallModalOpen(false);
    setEditingStall(null);
    setModalError(null);
  }

  const hasLoadError = !isLoading && error !== null && stalls.length === 0;

  if (!user) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Panel Admin"
        description="Kelola data warung dan pantau catatan audit log sistem."
      />

      {/* Tab Navigasi */}
      <div className="mb-6 flex gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === 'audit' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('audit')}
        >
          <ShieldCheck className="size-4" aria-hidden="true" />
          Audit Log
        </Button>
        <Button
          variant={activeTab === 'stalls' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('stalls')}
        >
          <Store className="size-4" aria-hidden="true" />
          Manajemen Warung
        </Button>
      </div>

      {activeTab === 'audit' ? (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-xl font-bold">Audit Log Sistem</h2>
            <Button variant="secondary" onClick={() => void loadAuditLogs()} disabled={auditLoading}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Muat Ulang
            </Button>
          </div>

          {/* Form Filter Audit Log */}
          <Card className="mb-4 p-4">
            <form onSubmit={handleApplyAuditFilters} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Action" htmlFor="audit-filter-action">
                <input
                  id="audit-filter-action"
                  className={inputClass}
                  placeholder="Contoh: LOGIN, LOGOUT, CREATE_MENU"
                  value={auditFilters.action}
                  onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
                />
              </Field>
              <Field label="Target Table" htmlFor="audit-filter-table">
                <input
                  id="audit-filter-table"
                  className={inputClass}
                  placeholder="Contoh: USERS, MENU_ITEMS"
                  value={auditFilters.targetTable}
                  onChange={(e) => setAuditFilters({ ...auditFilters, targetTable: e.target.value })}
                />
              </Field>
              <Field label="Target ID" htmlFor="audit-filter-targetId">
                <input
                  id="audit-filter-targetId"
                  type="number"
                  min={1}
                  className={inputClass}
                  placeholder="Contoh: 1"
                  value={auditFilters.targetId}
                  onChange={(e) => setAuditFilters({ ...auditFilters, targetId: e.target.value })}
                />
              </Field>
              <Field label="User ID" htmlFor="audit-filter-userId">
                <input
                  id="audit-filter-userId"
                  type="number"
                  min={1}
                  className={inputClass}
                  placeholder="Contoh: 1"
                  value={auditFilters.userId}
                  onChange={(e) => setAuditFilters({ ...auditFilters, userId: e.target.value })}
                />
              </Field>
              <Field label="Dari Tanggal (from)" htmlFor="audit-filter-from">
                <input
                  id="audit-filter-from"
                  type="date"
                  className={inputClass}
                  value={auditFilters.from}
                  onChange={(e) => setAuditFilters({ ...auditFilters, from: e.target.value })}
                />
              </Field>
              <Field label="Sampai Tanggal (to)" htmlFor="audit-filter-to">
                <input
                  id="audit-filter-to"
                  type="date"
                  className={inputClass}
                  value={auditFilters.to}
                  onChange={(e) => setAuditFilters({ ...auditFilters, to: e.target.value })}
                />
              </Field>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={auditLoading}>
                  Terapkan Filter
                </Button>
                <Button type="button" variant="secondary" onClick={handleResetAuditFilters} disabled={auditLoading}>
                  Reset
                </Button>
              </div>
            </form>
          </Card>

          {auditError ? (
            <div className="mb-4">
              <Alert tone="error">{auditError}</Alert>
            </div>
          ) : null}

          {auditLoading ? (
            <LoadingPanel message="Memuat catatan audit log..." />
          ) : auditItems.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Tidak ada catatan audit"
              message="Belum ada log yang sesuai dengan filter saat ini."
            />
          ) : (
            <>
              <Card className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-text-muted">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditItems.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-3 font-mono text-xs">#{item.id}</td>
                        <td className="px-4 py-3 text-xs text-text-muted">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.userName || `User #${item.userId}`}</div>
                          <div className="text-xs text-text-muted">
                            {item.userEmail || '-'} (ID: {item.userId})
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="primary">{item.action}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.targetTable} #{item.targetId}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="secondary"
                            className="h-8 px-2.5 text-xs"
                            onClick={() => void handleOpenAuditDetail(item.id)}
                          >
                            <Eye className="size-3.5" aria-hidden="true" />
                            Detail
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Pagination */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-text-muted">
                  Halaman <strong>{auditPagination.page}</strong> dari{' '}
                  <strong>{Math.max(auditPagination.totalPages, 1)}</strong> (Total{' '}
                  <strong>{auditPagination.total}</strong> catatan)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={auditPage <= 1 || auditLoading}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={auditPage >= auditPagination.totalPages || auditLoading}
                    onClick={() => setAuditPage((p) => p + 1)}
                  >
                    Berikutnya
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : (
        <>
          {error && !hasLoadError ? (
            <div className="mb-4">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}
          {notice ? (
            <div className="mb-4">
              <Alert tone="success">{notice}</Alert>
            </div>
          ) : null}

          {isLoading ? (
            <LoadingPanel message="Memuat data..." />
          ) : hasLoadError ? (
            <EmptyState
              icon={Store}
              title="Data admin belum bisa dimuat"
              message={error ?? 'Periksa koneksimu lalu coba lagi.'}
              action={
                <Button variant="secondary" onClick={() => void load()}>
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Coba Lagi
                </Button>
              }
            />
          ) : (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-xl font-bold">Manajemen Warung</h2>
                <Button onClick={openCreateStall}>
                  <Plus className="size-4" aria-hidden="true" />
                  Tambah Warung
                </Button>
              </div>

              {stalls.length === 0 ? (
                <EmptyState
                  icon={Store}
                  title="Belum ada warung"
                  message="Tambahkan warung pertama Anda ke dalam sistem."
                />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {stalls.map((stall) => (
                    <Card key={stall.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="mb-1 text-lg font-bold">{stall.name}</h3>
                          <p className="mb-0 text-xs text-text-muted">
                            Pemilik ID: {stall.ownerId} &middot; {stall.location || 'lokasi belum diisi'}
                          </p>
                        </div>
                        <Badge tone="primary">{stall.category || 'Tanpa kategori'}</Badge>
                      </div>
                      <p className="mb-3 mt-2 text-xs text-text-muted">
                        {stall.reviewCount} review &middot; rating {formatRating(stall.avgRating)}
                      </p>
                      <div className="flex justify-end gap-1 border-t border-border pt-2">
                        <Button
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => openEditStall(stall)}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-8 px-2 text-danger hover:bg-danger-bg"
                          onClick={() => {
                            setDeletingStall(stall);
                            setModalError(null);
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Hapus
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Modal Detail Audit Log (memanggil GET /api/audit-logs/:id) */}
      {detailModalOpen ? (
        <Modal
          title={selectedAudit ? `Detail Audit Log #${selectedAudit.id}` : 'Detail Audit Log'}
          onClose={() => setDetailModalOpen(false)}
          footer={
            <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
              Tutup
            </Button>
          }
        >
          {detailLoading ? (
            <LoadingPanel message="Mengambil detail audit log..." />
          ) : detailError ? (
            <Alert tone="error">{detailError}</Alert>
          ) : selectedAudit ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-text-muted">Action</div>
                  <div className="font-semibold">{selectedAudit.action}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Target</div>
                  <div className="font-semibold">
                    {selectedAudit.targetTable} #{selectedAudit.targetId}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">User</div>
                  <div className="font-semibold">{selectedAudit.userName || '-'}</div>
                  <div className="text-xs text-text-muted">
                    {selectedAudit.userEmail || '-'} (ID: {selectedAudit.userId})
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Waktu</div>
                  <div className="font-semibold">
                    {selectedAudit.createdAt
                      ? new Date(selectedAudit.createdAt).toLocaleString('id-ID')
                      : '-'}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="mb-1 text-xs font-semibold text-text-muted">IP Address</div>
                <div className="font-mono text-xs">
                  {String(selectedAudit.metadata?.ip_address ?? '-')}
                </div>
                <div className="mb-1 mt-2 text-xs font-semibold text-text-muted">User Agent</div>
                <div className="break-all font-mono text-xs">
                  {String(selectedAudit.metadata?.user_agent ?? '-')}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-text-muted">Metadata Lengkap (JSON)</div>
                <pre className="max-h-60 overflow-auto rounded-lg bg-black/5 p-3 font-mono text-xs">
                  {JSON.stringify(selectedAudit.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {stallModalOpen ? (
        <Modal
          title={editingStall ? 'Edit Warung' : 'Tambah Warung'}
          onClose={closeStallModal}
          footer={
            <>
              <Button variant="secondary" onClick={closeStallModal} disabled={isSaving}>
                Batal
              </Button>
              <Button type="submit" form="admin-stall-form" disabled={isSaving}>
                {isSaving ? <Spinner /> : null}
                Simpan
              </Button>
            </>
          }
        >
          <form
            id="admin-stall-form"
            className="space-y-4"
            onSubmit={(event) => void handleStallSubmit(event)}
          >
            {modalError ? <Alert tone="error">{modalError}</Alert> : null}
            <Field label="ID Pemilik warung" htmlFor="stall-owner">
              {ownerOptions.length > 0 ? (
                <select
                  id="stall-owner"
                  className={inputClass}
                  value={stallForm.ownerId}
                  onChange={(event) => setStallForm({ ...stallForm, ownerId: event.target.value })}
                  required
                >
                  <option value="" disabled>
                    Pilih pemilik
                  </option>
                  {ownerOptions.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} ({owner.email})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="stall-owner"
                  type="number"
                  placeholder="Masukkan ID Pemilik (misal: 2)"
                  className={inputClass}
                  value={stallForm.ownerId}
                  onChange={(event) => setStallForm({ ...stallForm, ownerId: event.target.value })}
                  required
                />
              )}
            </Field>
            <Field label="Nama warung" htmlFor="admin-stall-name">
              <input
                id="admin-stall-name"
                className={inputClass}
                value={stallForm.name}
                onChange={(event) => setStallForm({ ...stallForm, name: event.target.value })}
                minLength={3}
                maxLength={100}
                required
              />
            </Field>
            <Field label="Kategori" htmlFor="admin-stall-category">
              <input
                id="admin-stall-category"
                className={inputClass}
                value={stallForm.category}
                onChange={(event) => setStallForm({ ...stallForm, category: event.target.value })}
                maxLength={50}
              />
            </Field>
            <Field label="Lokasi" htmlFor="admin-stall-location">
              <input
                id="admin-stall-location"
                className={inputClass}
                value={stallForm.location}
                onChange={(event) => setStallForm({ ...stallForm, location: event.target.value })}
                maxLength={100}
              />
            </Field>
            <Field label="Deskripsi" htmlFor="admin-stall-description">
              <textarea
                id="admin-stall-description"
                className={textareaClass}
                value={stallForm.description}
                onChange={(event) =>
                  setStallForm({ ...stallForm, description: event.target.value })
                }
                maxLength={1000}
              />
            </Field>
          </form>
        </Modal>
      ) : null}

      {deletingStall ? (
        <ConfirmDialog
          title="Hapus warung?"
          message={`"${deletingStall.name}" beserta data terkait akan dihapus permanen.`}
          error={modalError}
          isBusy={isDeleting}
          onClose={() => {
            setDeletingStall(null);
            setModalError(null);
          }}
          onConfirm={() => void handleDeleteStall()}
        />
      ) : null}
    </div>
  );
}