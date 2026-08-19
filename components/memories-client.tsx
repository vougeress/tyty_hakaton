"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";

type PhotoItem = {
  id: string;
  originalFilename: string;
  contentType: string;
  size: number;
  takenAt: string | null;
  dateSource: string;
  calendarDay: string | null;
  eventTitle: string | null;
  originalUrl: string;
};

type PhotosResponse = {
  photos: PhotoItem[];
};

export function MemoriesClient({ tripId }: { tripId: string }) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const albumUrl = useMemo(() => `/api/trips/${tripId}/photos/album.pdf`, [tripId]);

  async function loadPhotos() {
    setIsLoading(true);
    const response = await fetch(`/api/trips/${tripId}/photos`, { cache: "no-store" });
    const data = await response.json() as PhotosResponse;
    setPhotos(data.photos);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadPhotos().catch(() => {
      setMessage("Не получилось загрузить галерею");
      setIsLoading(false);
    });
  }, [tripId]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const files = fileInputRef.current?.files;

    if (!files?.length) {
      setMessage("Выбери хотя бы один файл");
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("photos", file));

      const response = await fetch(`/api/trips/${tripId}/photos`, {
        method: "POST",
        body: form
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Ошибка загрузки" })) as { error?: string };
        setMessage(data.error ?? "Ошибка загрузки");
        return;
      }

      await loadPhotos();
      setMessage("Фото добавлены");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setMessage("Не получилось добавить фото");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <form className="grid gap-3" onSubmit={handleUpload}>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-ink/62">Фотографии</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="block w-full rounded-[8px] border border-border bg-muted px-3 py-2 text-sm font-semibold text-ink file:mr-3 file:rounded-[8px] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="submit" disabled={isUploading}>
              {isUploading ? <Loader2 aria-hidden="true" size={18} className="animate-spin" /> : <Upload aria-hidden="true" size={18} />}
              Добавить
            </Button>
            <a
              href={albumUrl}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-border bg-surface px-4 text-sm font-semibold text-ink transition hover:border-primary/35"
            >
              <Download aria-hidden="true" size={18} />
              PDF
            </a>
          </div>
          {message && <p className="text-sm font-semibold text-ink/70">{message}</p>}
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">Галерея</h2>
          <Badge>{photos.length} фото</Badge>
        </div>
        {isLoading ? (
          <div className="mt-4 flex h-24 items-center justify-center text-ink/52">
            <Loader2 aria-hidden="true" size={22} className="animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <p className="mt-3 text-sm text-ink/58">Пока пусто</p>
        ) : (
          <div className="mt-3 max-h-[min(420px,calc(100dvh-330px))] min-h-[132px] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.originalUrl}
                  title={photo.originalFilename}
                  className="group relative aspect-square overflow-hidden rounded-[8px] border border-border bg-muted"
                >
                  <img
                    src={photo.originalUrl}
                    alt={photo.originalFilename}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 to-transparent p-2 pt-8">
                    <span className="block truncate text-[11px] font-semibold leading-4 text-white">
                      {photo.eventTitle ?? photo.calendarDay ?? "без даты"}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-white/70">{formatSize(photo.size)}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} КБ`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}
