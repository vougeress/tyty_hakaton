export default function TripsLoading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] animate-pulse bg-page px-5 py-6" aria-label="Загрузка поездки">
      <div className="h-40 rounded-[8px] bg-ink/10" />
      <div className="mt-6 h-5 w-36 rounded bg-ink/10" />
      <div className="mt-3 h-36 rounded-[8px] bg-white" />
      <div className="mt-6 grid grid-cols-2 gap-2"><div className="h-12 rounded-[8px] bg-white" /><div className="h-12 rounded-[8px] bg-white" /></div>
    </main>
  );
}
