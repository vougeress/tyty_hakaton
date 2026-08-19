import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarRange, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import type { ManualEventContext } from "@/lib/manual-event-repository";

export function CreateEventScreen({ context }: { context: ManualEventContext }) {
  const participantCount = context.gap.participantIds.length;

  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-[430px] bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:overflow-hidden sm:rounded-[28px]"
      data-preset-id={context.presetId}
    >
      <header className="flex min-h-[82px] items-center gap-4 border-b border-border bg-white px-5 pt-[env(safe-area-inset-top)]">
        <Link href="/calendar" aria-label="Вернуться в календарь" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-page">
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Новое в плане</h1>
          <p className="mt-0.5 text-[13px] text-ink/55">Шаг 1 из 2</p>
        </div>
      </header>

      <div className="px-5 py-4">
        <section className="flex gap-3 rounded-[16px_16px_16px_6px] border border-primary/30 bg-primary/10 p-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px_13px_13px_5px] bg-primary text-white">
            <CalendarRange aria-hidden="true" size={21} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold leading-5">{context.gap.dateLabel}</h2>
            <p className="mt-1 text-[12px] leading-4 text-ink/55">
              Свободны все {participantCount} участника · до {context.gap.nextEventTitle} {formatDuration(context.gap.bufferToNextEventMinutes)}
            </p>
          </div>
        </section>

        <h2 className="mb-5 mt-7 text-[27px] font-semibold leading-[1.05] tracking-[-0.02em]">
          Вы уже знаете,<br />что хотите?
        </h2>

        <div className="grid gap-3">
          <ChoiceCard
            href={`/calendar/gaps/${context.gap.id}/manual`}
            icon={<MapPinned aria-hidden="true" size={22} />}
            iconClassName="bg-accent"
            title="Да, добавлю вручную"
            description="Место, событие, ссылку или билет"
          />
          <ChoiceCard
            href={`/calendar/gaps/${context.gap.id}/ideas`}
            icon={<Sparkles aria-hidden="true" size={22} />}
            iconClassName="bg-cyan"
            title="Нет, подберите варианты"
            description="Учтём окно, бюджет, интересы и дорогу"
          />
        </div>

        <div className="mt-6 flex gap-2.5 text-[12px] leading-4 text-ink/55">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          <p>До публикации проверим время в пути и конфликт со следующим обязательным событием.</p>
        </div>
      </div>
    </main>
  );
}

function ChoiceCard({
  href,
  icon,
  iconClassName,
  title,
  description
}: {
  href: string;
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="grid min-h-[94px] grid-cols-[52px_1fr_20px] items-center gap-3 rounded-[16px_16px_16px_6px] border border-border bg-white p-4 shadow-card transition-transform active:scale-[0.99]"
    >
      <span className={`grid h-[52px] w-[52px] place-items-center rounded-[15px_15px_15px_5px] ${iconClassName}`}>{icon}</span>
      <span className="min-w-0">
        <strong className="block text-[15px] leading-5">{title}</strong>
        <span className="mt-1 block text-[12px] leading-4 text-ink/55">{description}</span>
      </span>
      <ArrowRight aria-hidden="true" size={20} />
    </Link>
  );
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} ч${rest ? ` ${rest} мин` : ""}`;
}
