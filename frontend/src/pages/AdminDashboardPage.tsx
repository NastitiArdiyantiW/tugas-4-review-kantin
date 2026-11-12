import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, RefreshCw, Store, Trash2 } from 'lucide-react';
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
import { stallsApi, usersApi } from '../lib/api.ts';
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

export function AdminDashboardPage() {
  const { user } = useAuth();
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

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Mengambil data warung dan pengguna (untuk pilihan dropdown owner)
      // Jika usersApi gagal, kita berikan array kosong agar stalls tetap tampil
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
      // Kita menghapus ownerId dari payload karena backend menolaknya (Unrecognized key)
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
        description="Kelola seluruh data warung dari satu tempat."
      />

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