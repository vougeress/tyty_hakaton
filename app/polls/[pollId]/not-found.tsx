import Link from "next/link";

export default function PollNotFound() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[430px] place-content-center gap-4 bg-page p-6 text-center text-ink shadow-shell">
      <h1 className="text-xl font-semibold">Голосование не найдено</h1>
      <p className="text-sm text-ink/60">Возможно, оно было удалено или относится к другой поездке.</p>
      <Link href="/calendar" className="inline-flex h-11 items-center justify-center rounded-[8px] bg-primary px-4 text-sm font-semibold text-white">Вернуться в календарь</Link>
    </main>
  );
}
