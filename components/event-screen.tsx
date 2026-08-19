import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  MapPin,
  Navigation,
  Route,
  TicketCheck,
  X
} from "lucide-react";
import type { CalendarParticipant, EventDetails } from "@/lib/calendar-repository";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function shortTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

export function EventScreen({ event, participants, calendarBackground }: { event: EventDetails; participants: CalendarParticipant[]; calendarBackground?: ReactNode }) {
  const routeUnchecked = event.source === "manual" && event.status !== "confirmed";
  const statusLabel = event.status === "confirmed"
    ? "Запланировано"
    : event.status === "draft"
      ? "Черновик"
      : routeUnchecked ? "В плане · маршрут не проверен" : "В плане";

  return (
    <main
      className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]"
      data-preset-id={event.presetId}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-white">
        {calendarBackground ?? (
          <>
            <div className="h-16 border-b border-border" />
            <div className="h-[46px] border-b border-border" />
            <div className="h-[472px] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_35px,var(--color-border)_36px)]" />
          </>
        )}
      </div>
      <Link href="/calendar" aria-label="Закрыть карточку события" className="absolute inset-0 z-10 bg-[#17213b]/25" />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        className="absolute inset-x-0 bottom-0 z-20 max-h-[calc(100dvh-24px)] overflow-y-auto rounded-t-[26px] bg-white px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_34px_rgb(23_33_59/20%)]"
      >
        <div className="mx-auto mb-3 h-1 w-[38px] rounded-full bg-[#c9ceda]" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={cn(
              "inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold",
              routeUnchecked ? "bg-[#fff3cf] text-[#775913]" : "bg-[#e3f7ef] text-success"
            )}>
              {routeUnchecked ? <Clock3 aria-hidden="true" size={14} /> : <CheckCircle2 aria-hidden="true" size={14} />}
              {statusLabel}
            </span>
            <h1 id="event-title" className="mt-2 text-xl font-semibold leading-6">{event.title}</h1>
            <p className="mt-1 text-[11px] text-ink/58">{event.dateLabel}</p>
          </div>
          <Link href="/calendar" aria-label="Закрыть" className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-page">
            <X aria-hidden="true" size={19} />
          </Link>
        </div>

        <div className="my-[13px] grid gap-2.5 text-[13px] leading-5">
          <div className="grid grid-cols-[20px_1fr] gap-2">
            <Clock3 aria-hidden="true" size={18} />
            <span>{shortTime(event.startsAt, event.timezone)}–{shortTime(event.endsAt, event.timezone)}</span>
          </div>
          <div className="grid grid-cols-[20px_1fr] gap-2">
            <MapPin aria-hidden="true" size={18} />
            <span>{event.mapLabel} · <a href={event.mapUrl} target="_blank" rel="noreferrer" className="text-primary">Открыть на карте</a></span>
          </div>
          <div className="grid grid-cols-[20px_1fr] gap-2">
            <Route aria-hidden="true" size={18} />
            <span>{event.routeLabel}</span>
          </div>
        </div>

        <p className="mb-3 text-[11px] text-ink/50">
          Источник: {event.source === "tutu" ? "Туту" : "добавлено вручную"}
        </p>

        <h2 className="text-[13px] font-semibold">Участники</h2>
        <div className="mt-2.5 flex items-center">
          <div className="flex -space-x-[5px]">
            {participants.map((participant) => (
              <span
                key={participant.id}
                title={participant.displayName}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[11px] font-semibold",
                  participant.tone === "purple" && "bg-primary text-white",
                  participant.tone === "cyan" && "bg-cyan text-ink",
                  participant.tone === "lime" && "bg-lime text-ink"
                )}
              >
                {participant.initial}
              </span>
            ))}
          </div>
          <div className="ml-3 text-[11px] leading-4 text-ink/60">
            <strong className="block font-semibold text-ink">Все {participants.length} участника</strong>
            {routeUnchecked ? "Маршрут ещё не проверен" : "Маршрут подходит всем"}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex min-h-12 items-center gap-2 rounded-[12px_12px_12px_5px] bg-page px-3 text-[12px]">
            <TicketCheck aria-hidden="true" size={18} />
            <span>Билеты<br />{event.ticketCount} файла</span>
          </div>
          <div className="flex min-h-12 items-center gap-2 rounded-[12px_12px_12px_5px] bg-page px-3 text-[12px]">
            <ImageIcon aria-hidden="true" size={18} />
            <span>Фотографии<br />{event.photoCount} снимков</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={event.mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[12px_12px_12px_5px] border border-border text-[13px] font-semibold">
            <Navigation aria-hidden="true" size={17} />
            Маршрут
          </a>
          <button type="button" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[12px_12px_12px_5px] bg-primary text-[13px] font-semibold text-white">
            <TicketCheck aria-hidden="true" size={17} />
            Открыть билет
          </button>
        </div>
      </section>
    </main>
  );
}
