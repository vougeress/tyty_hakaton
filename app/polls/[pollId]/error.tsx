"use client";

import { AlertTriangle } from "lucide-react";

export default function PollError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[430px] place-content-center gap-4 bg-page p-6 text-center text-ink shadow-shell">
      <AlertTriangle aria-hidden="true" className="mx-auto text-coral" size={34} />
      <h1 className="text-xl font-semibold">Голосование не загрузилось</h1>
      <p className="text-sm text-ink/60">Ваши ответы не изменились. Проверьте соединение и повторите.</p>
      <button type="button" onClick={reset} className="h-11 rounded-[8px] bg-primary px-4 text-sm font-semibold text-white">Повторить</button>
    </main>
  );
}
