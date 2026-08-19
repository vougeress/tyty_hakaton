export default function IdeasLoading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] bg-page p-4" aria-busy="true" aria-label="Загружаем варианты">
      <div className="h-16 animate-pulse rounded-[14px] bg-white" />
      <div className="mt-4 grid gap-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-[14px] bg-white" />)}
      </div>
    </main>
  );
}
