import { AlertTriangle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center bg-page px-6 text-center text-ink shadow-shell">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 text-coral">
        <AlertTriangle aria-hidden="true" size={30} />
      </span>
      <h1 className="mt-4 text-xl font-bold">Конфликт не найден</h1>
      <p className="mt-2 max-w-[300px] text-sm leading-5 text-ink/58">Возможно, расписание уже обновили или замечание больше не актуально.</p>
      <ButtonLink href="/audit" className="mt-5">Вернуться к проверке поездки</ButtonLink>
    </main>
  );
}
