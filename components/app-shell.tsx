import Link from "next/link";
import { ChevronDown, SlidersHorizontal, UserRound } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { MockModeToggle } from "@/components/mock-mode-toggle";
import { ButtonLink } from "@/components/ui/button";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-page shadow-shell sm:my-6 sm:min-h-[760px] sm:overflow-hidden sm:rounded-[28px]">
      <header className="border-b border-border bg-surface px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/trips" className="min-w-0">
            <p className="text-xs font-semibold text-ink/55">Текущая поездка</p>
            <div className="mt-1 flex items-center gap-1.5 text-lg font-semibold leading-tight">
              <span className="truncate">Казань</span>
              <ChevronDown aria-hidden="true" size={18} />
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <MockModeToggle />
            <Link
              href="/trips"
              aria-label="Профиль и поездки"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white"
            >
              <UserRound aria-hidden="true" size={17} />
            </Link>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[12px] border border-border bg-muted px-3 text-sm font-semibold text-ink"
          >
            <SlidersHorizontal aria-hidden="true" size={17} />
            Все участники
          </button>
          <ButtonLink href="/audit" className="h-10 px-3">
            Проверить
          </ButtonLink>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      <BottomNav />
    </main>
  );
}
