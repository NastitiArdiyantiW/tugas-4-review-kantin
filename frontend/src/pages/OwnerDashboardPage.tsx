import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, RefreshCw, Store, MapPin } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
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
import { stallsApi } from '../lib/api.ts';
import { formatRating } from '../lib/format.ts';
import { getApiErrorMessage } from '../lib/http.ts';
import type { Stall } from '../types/api.ts';

const emptyStallForm = {
  name: '',
  category: '',
  location: '',
  description: '',
};

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const ownerId = user?.id;
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  
  const [stallModalOpen, setStallModalOpen] = useState(false);
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stallForm, setStallForm] = useState(emptyStallForm);

  const load = useCallback(async () => {
    if (!ownerId) return;
    setIsLoading(true);
    setError(null);

    try {
      const allStalls = await stallsApi.list();
      // Owner hanya melihat warung miliknya sendiri
      const owned = allStalls.filter((stall) => stall.ownerId === ownerId);
      setStalls(owned);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function openCreateStall(): void {
    setEditingStall(null);
    setStallForm(emptyStallForm);
    setModalError(null);
    setStallModalOpen(true);
  }

  function openEditStall(stall: Stall): void {
    setEditingStall(stall);
    setStallForm({
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
    if (!ownerId) return;
    
    setIsSaving(true);
    setModalError(null);
    setNotice(null);

    try {
      // Kita menghapus ownerId di sini karena backend mengambilnya langsung dari token
      // "as any" ditambahkan agar TypeScript tidak memprotes ketiadaan ownerId
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
        setNotice('Warung baru berhasil ditambahkan.');
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
        eyebrow="Pemilik Warung"
        title="Dashboard Warung"
        description="Kelola warung milikmu. Perubahan hanya berlaku untuk warung yang kamu miliki."
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
        <LoadingPanel message="Memuat data warung..." />
      ) : hasLoadError ? (
        <EmptyState
          icon={Store}
          title="Data warung belum bisa dimuat"
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
            <h2 className="m-0 text-xl font-bold">Warung Saya</h2>
            <Button onClick={openCreateStall}>
              <Plus className="size-4" aria-hidden="true" />
              Tambah Warung
            </Button>
          </div>

          {stalls.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Belum ada warung milikmu"
              message="Silakan tambah warung pertama Anda."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {stalls.map((stall) => (
                <Card key={stall.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex flex-wrap gap-2">
                        {stall.category ? <Badge tone="primary">{stall.category}</Badge> : null}
                      </div>
                      <h3 className="mb-1 text-lg font-bold">{stall.name}</h3>
                      <p className="mb-0 inline-flex items-center gap-1 text-xs text-text-muted">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {stall.location || 'Lokasi belum diisi'}
                      </p>
                    </div>
                  </div>
                  <p className="mb-3 mt-2 text-xs text-text-muted">
                    {stall.reviewCount} review &middot; rating {formatRating(stall.avgRating)}
                  </p>
                  <div className="flex justify-end gap-1 border-t border-border pt-2">
                    <Button variant="ghost" className="h-8 px-2" onClick={() => openEditStall(stall)}>
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                    {/* Berdasarkan aturan, tombol Hapus disembunyikan untuk role Owner, hanya Admin yg bisa */}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {stallModalOpen ? (
        <Modal
          title={editingStall ? 'Edit Warung' : 'Tambah Warung Baru'}
          onClose={closeStallModal}
          footer={
            <>
              <Button variant="secondary" onClick={closeStallModal} disabled={isSaving}>
                Batal
              </Button>
              <Button type="submit" form="owner-stall-form" disabled={isSaving}>
                {isSaving ? <Spinner /> : null}
                Simpan
              </Button>
            </>
          }
        >
          <form
            id="owner-stall-form"
            className="space-y-4"
            onSubmit={(event) => void handleStallSubmit(event)}
          >
            {modalError ? <Alert tone="error">{modalError}</Alert> : null}
            <Field label="Nama warung" htmlFor="stall-name">
              <input
                id="stall-name"
                className={inputClass}
                value={stallForm.name}
                onChange={(event) => setStallForm({ ...stallForm, name: event.target.value })}
                minLength={3}
                maxLength={100}
                required
              />
            </Field>
            <Field label="Kategori" htmlFor="stall-category">
              <input
                id="stall-category"
                className={inputClass}
                value={stallForm.category}
                onChange={(event) => setStallForm({ ...stallForm, category: event.target.value })}
                maxLength={50}
              />
            </Field>
            <Field label="Lokasi" htmlFor="stall-location">
              <input
                id="stall-location"
                className={inputClass}
                value={stallForm.location}
                onChange={(event) => setStallForm({ ...stallForm, location: event.target.value })}
                maxLength={100}
              />
            </Field>
            <Field label="Deskripsi" htmlFor="stall-description">
              <textarea
                id="stall-description"
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
    </div>
  );
}