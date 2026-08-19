export default function ManualEventLoading() {
  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-[430px] bg-page p-5"
      aria-busy="true"
      aria-label="Загружаем форму события"
    >
      <div className="h-16 animate-pulse rounded-[14px] bg-white" />
      <div className="mt-5 grid gap-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-[74px] animate-pulse rounded-[14px] bg-white" />
        ))}
      </div>
    </main>
  );
}
