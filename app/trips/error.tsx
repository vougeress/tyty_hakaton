"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function TripsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[430px] place-content-center gap-4 bg-page px-6 text-center text-ink">
      <AlertTriangle aria-hidden="true" size={36} className="mx-auto text-coral" />
      <div><h1 className="text-xl font-semibold">Не удалось загрузить поездки</h1><p className="mt-1 text-sm text-ink/60">Проверьте подключение к базе данных и попробуйте снова.</p></div>
      <button type="button" onClick={reset} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-sm font-semibold text-white"><RotateCcw aria-hidden="true" size={17} /> Повторить</button>
    </main>
  );
}
