import { AlertTriangle } from "lucide-react";

export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] bg-page px-4 py-20 text-center text-ink shadow-shell" aria-busy="true" aria-live="polite">
      <span className="inline-flex h-14 w-14 animate-pulse items-center justify-center rounded-[16px_16px_16px_6px] bg-coral text-white">
        <AlertTriangle aria-hidden="true" size={25} />
      </span>
      <h1 className="mt-4 text-lg font-semibold">Проверяем конфликт…</h1>
      <p className="mt-1 text-sm text-ink/58">Сверяем расписание и обязательный буфер</p>
    </main>
  );
}
