"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col items-center justify-center bg-page px-6 text-center shadow-shell">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 text-coral">
        <AlertTriangle aria-hidden="true" size={30} />
      </span>
      <h1 className="mt-4 text-xl font-bold">Не удалось открыть отчёт</h1>
      <p className="mt-2 text-sm leading-5 text-ink/58">План не изменён. Попробуйте загрузить результаты проверки ещё раз.</p>
      <Button className="mt-5" onClick={retry}>
        <RefreshCw aria-hidden="true" size={18} />
        Повторить
      </Button>
    </main>
  );
}
