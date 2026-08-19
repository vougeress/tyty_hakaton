export default function CalendarLoading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] animate-pulse bg-white" aria-label="Загрузка календаря">
      <div className="h-16 border-b border-border px-4 py-3"><div className="h-10 w-52 rounded bg-ink/8" /></div>
      <div className="h-12 border-b border-border px-3 py-2"><div className="h-8 w-full rounded bg-ink/8" /></div>
      <div className="h-[46px] border-b border-border bg-ink/5" />
      <div className="m-4 h-[440px] rounded-[8px] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_35px,var(--color-border)_36px)]" />
    </main>
  );
}
