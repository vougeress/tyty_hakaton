"use client";

export default function ManualEventError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[430px] place-content-center bg-page p-6 text-center text-ink">
      <h1 className="text-lg font-semibold">Не удалось открыть создание события</h1>
      <p className="mt-2 text-sm text-ink/65">Проверьте подключение к базе и повторите.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 min-h-11 rounded-[12px] bg-primary px-5 text-sm font-semibold text-white"
      >
        Повторить
      </button>
    </main>
  );
}
