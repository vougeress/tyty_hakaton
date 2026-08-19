import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Info,
  Landmark,
  MapPin,
  Sparkles,
  Undo2,
  Utensils
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { ConflictTimelineItem, ScheduleConflict } from "@/lib/conflict-repository";

export function ConflictScreen({ conflict }: { conflict: ScheduleConflict }) {
  const isCalendarConflict = conflict.context === "calendar";
  const missingBufferMinutes = conflict.requiredBufferMinutes - conflict.actualBufferMinutes;
  const returnTime = formatTime(conflict.returnAt, conflict.timezone);
  const requiredEventTime = formatTime(conflict.nextRequiredEventAt, conflict.timezone);

  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]"
      data-preset-id={conflict.presetId}
      data-logistics-status={conflict.logisticsStatus}
    >
      <header className="flex min-h-[76px] items-center gap-3 border-b border-border bg-white px-4 py-3">
        <Link
          href={conflict.links.calendar}
          aria-label="Вернуться в календарь"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-page focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft aria-hidden="true" size={20} />
        </Link>
        <div>
          <h1 className="text-[16px] font-semibold leading-5">{isCalendarConflict ? "Конфликт в расписании" : "Конфликт в голосовании"}</h1>
          <p className="mt-1 text-[11px] text-ink/58">{conflict.checkedAtLabel}</p>
        </div>
      </header>

      <section
        className="border-b border-coral/20 bg-[#fff0ee] px-5 py-5"
        aria-labelledby="conflict-title"
        aria-describedby="conflict-reason"
      >
        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-coral/35 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#9b302b]">
          <AlertTriangle aria-hidden="true" size={15} />
          Блокирующий конфликт
        </span>
        <span className="mt-4 grid h-12 w-12 place-items-center rounded-[14px_14px_14px_5px] bg-coral text-white">
          <AlertTriangle aria-hidden="true" size={23} />
        </span>
        <h2 id="conflict-title" className="mt-3 text-[29px] font-semibold leading-[31px] tracking-[-0.02em]">
          Один вариант<br />больше не подходит
        </h2>
        <p id="conflict-reason" className="mt-2 text-[13px] leading-5 text-[#8b3934]">
          <strong>{conflict.candidate.title}.</strong> {conflict.reason.summary}
        </p>
      </section>

      <div className="space-y-4 px-4 py-4 pb-8">
        <section className="overflow-hidden rounded-[16px_16px_16px_6px] border border-border bg-white shadow-card" aria-labelledby="route-title">
          <h2 id="route-title" className="sr-only">Расчёт маршрута</h2>
          <ol>
            {conflict.relatedEvents.map((event) => (
              <TimelineRow key={event.id} event={event} />
            ))}
          </ol>
        </section>

        <section className="flex gap-2.5 rounded-[13px_13px_13px_5px] border border-[#f4ca70]/60 bg-[#fff1d8] p-3 text-[12px] leading-[17px] text-[#76500a]" aria-label="Причина блокировки">
          <Info aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          <p>
            {conflict.reason.code === "EVENTS_OVERLAP" ? (
              <>События пересекаются по времени. Освободите минимум <strong>{conflict.requiredBufferMinutes} минут</strong> между ними.</>
            ) : (
              <>Нужен интервал минимум <strong>{conflict.requiredBufferMinutes} минут</strong>. Сейчас между окончанием в {returnTime} и следующим событием в {requiredEventTime} только <strong>{conflict.actualBufferMinutes} минут</strong> — не хватает {missingBufferMinutes} минут.</>
            )}
          </p>
        </section>

        <p className="rounded-[12px] border border-primary/15 bg-primary/5 p-3 text-[11px] leading-4 text-ink/58">
          {conflict.votesNotice}
        </p>

        <div className="grid gap-2.5" aria-label="Действия с конфликтом">
          <ButtonLink href={conflict.links.alternatives} className="min-h-[48px]">
            <Sparkles aria-hidden="true" size={18} />
            {isCalendarConflict ? "Вернуться к календарю" : "Найти альтернативу"}
          </ButtonLink>
          <ButtonLink href={conflict.links.adjustTime} variant="secondary" className="min-h-[48px]">
            <Clock3 aria-hidden="true" size={18} />
            Сдвинуть время
          </ButtonLink>
          <ButtonLink href={conflict.links.poll} variant="ghost" className="min-h-[44px]">
            {isCalendarConflict ? "Открыть предыдущее событие" : "Вернуться к голосованию"}
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

function TimelineRow({ event }: { event: ConflictTimelineItem }) {
  const Icon = timelineIcons[event.kind];

  return (
    <li className="grid min-h-[58px] grid-cols-[24px_1fr_auto] items-center gap-2.5 border-b border-border px-3.5 py-2.5 last:border-b-0">
      <Icon aria-hidden="true" size={19} className={event.kind === "required-event" ? "text-coral" : "text-primary-strong"} />
      <span className="min-w-0 text-[12px] leading-4">
        <strong>{event.timeLabel}</strong> · {event.title}
      </span>
      <span className={event.kind === "required-event" ? "text-[11px] font-semibold text-[#9b302b]" : "text-[11px] text-ink/55"}>
        {event.meta}
      </span>
    </li>
  );
}

const timelineIcons = {
  departure: MapPin,
  activity: Landmark,
  return: Undo2,
  "required-event": Utensils
} satisfies Record<ConflictTimelineItem["kind"], typeof MapPin>;

function formatTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(iso));
}
