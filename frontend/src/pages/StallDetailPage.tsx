import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Store } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingPanel,
  RatingStars,
} from '../components/ui.tsx';
import { stallsApi } from '../lib/api.ts';
import { formatRating } from '../lib/format.ts';
import { getApiErrorMessage } from '../lib/http.ts';
import type { Stall } from '../types/api.ts';

export function StallDetailPage() {
  const { id } = useParams();
  const stallId = Number(id);

  const [stall, setStall] = useState<Stall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(stallId) || stallId <= 0) {
      setError('Warung yang kamu cari tidak ditemukan.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Hanya memanggil API get stall, membuang menuApi dan reviewsApi 
      // yang tidak menjadi bagian dari ruang lingkup Tugas 4
      const stallData = await stallsApi.get(stallId);
      setStall(stallData);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [stallId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  if (isLoading) {
    return <LoadingPanel message="Memuat detail warung..." />;
  }

  if (!stall) {
    return (
      <EmptyState
        icon={Store}
        title="Warung tidak dapat dibuka"
        message={error ?? 'Data warung tidak ditemukan.'}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Coba Lagi
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali ke daftar warung
      </Link>

      <Card className="mb-6 overflow-hidden">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {stall.category ? <Badge tone="primary">{stall.category}</Badge> : null}
              <Badge>{stall.reviewCount} review</Badge>
            </div>
            <h1 className="mb-1 text-3xl font-extrabold">{stall.name}</h1>
            <p className="mb-4 text-sm text-text-muted">
              Dikelola oleh {stall.ownerName || `Pemilik ID: ${stall.ownerId}`}
            </p>
            <p className="mb-4 max-w-2xl text-sm leading-relaxed text-text-muted">
              {stall.description || 'Pemilik warung belum menambahkan deskripsi.'}
            </p>
            <p className="m-0 inline-flex items-center gap-1.5 text-sm text-text-muted">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              {stall.location || 'Lokasi belum diisi'}
            </p>
          </div>

          <div className="flex min-w-40 flex-col items-center rounded-control bg-surface-muted px-5 py-4">
            <span className="font-heading text-4xl font-extrabold text-primary-dark">
              {formatRating(stall.avgRating)}
            </span>
            <RatingStars rating={stall.avgRating} className="my-1" />
            <span className="text-xs font-semibold text-text-muted">
              dari {stall.reviewCount} review
            </span>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mt-8 text-center text-sm text-text-muted">
        <p>Fitur menu dan ulasan sedang dalam pengembangan.</p>
      </div>
    </div>
  );
}