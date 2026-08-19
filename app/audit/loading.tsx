import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-page px-4 py-20 shadow-shell" aria-busy="true">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 animate-pulse items-center justify-center rounded-[16px] bg-primary text-white">
          <Sparkles aria-hidden="true" size={25} />
        </span>
        <strong className="mt-4 text-lg">Загружаем отчёт…</strong>
        <span className="mt-1 text-sm text-ink/58">Последняя проверка поездки</span>
      </div>
    </main>
  );
}
