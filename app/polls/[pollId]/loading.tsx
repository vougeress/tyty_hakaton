export default function PollLoading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] bg-page p-5 text-ink shadow-shell" aria-busy="true">
      <div className="h-28 animate-pulse rounded-[12px] bg-ink/10" />
      <div className="mt-4 h-44 animate-pulse rounded-[12px] bg-white" />
      <p className="mt-4 text-center text-sm text-ink/58">Загружаем голосование…</p>
    </main>
  );
}
