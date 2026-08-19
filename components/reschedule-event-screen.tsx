"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { rescheduleEventAction } from "@/app/calendar/items/[itemId]/reschedule/actions";
import { PARTICIPANT_STORAGE_KEY } from "@/lib/trips/constants";

type RescheduleContext = {
  conflictId: string;
  eventId: string;
  title: string;
  locationName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  currentParticipantId: string;
  participantNames: string[];
  backHref: string;
};

export function RescheduleEventScreen({ context }: { context: RescheduleContext }) {
  const router = useRouter();
  const [actorParticipantId, setActorParticipantId] = useState(context.currentParticipantId);
  const [title, setTitle] = useState(context.title);
  const [locationName, setLocationName] = useState(context.locationName);
  const [startsAtLocal, setStartsAtLocal] = useState(() => toDatetimeLocal(context.startsAt, context.timezone));
  const [endsAtLocal, setEndsAtLocal] = useState(() => toDatetimeLocal(context.endsAt, context.timezone));
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const stored = window.localStorage.getItem(PARTICIPANT_STORAGE_KEY);
    if (stored) setActorParticipantId(stored);
  }, []);

  const invalid = !title.trim() || !locationName.trim() || !startsAtLocal || !endsAtLocal || startsAtLocal >= endsAtLocal;

  function submit() {
    if (invalid || pending) return;
    setMessage(null);
    setSaved(false);
    startTransition(async () => {
      const result = await rescheduleEventAction({
        conflictId: context.conflictId,
        eventId: context.eventId,
        actorParticipantId,
        title,
        locationName,
        startsAtLocal,
        endsAtLocal
      });
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      setSaved(true);
      setMessage("Существующее событие обновлено. Расписание и конфликт пересчитаны.");
      router.refresh();
    });
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:overflow-hidden sm:rounded-[28px]">
      <header className="flex min-h-[82px] items-center gap-4 border-b border-border bg-white px-5 pt-[env(safe-area-inset-top)]">
        <Link href={context.backHref} aria-label="Вернуться к конфликту" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-page">
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Сдвинуть событие</h1>
          <p className="mt-0.5 text-[13px] text-ink/55">Обновим существующую запись</p>
        </div>
      </header>

      <div className="grid gap-4 px-5 py-5">
        <p className="rounded-[13px_13px_13px_5px] border border-primary/20 bg-primary/5 p-3 text-[12px] leading-4">
          Перед сохранением сервер повторно проверит поездку, участников, пересечения, дорогу до соседних событий и обязательный буфер.
        </p>
        <Field label="Название">
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full bg-transparent outline-none" />
        </Field>
        <Field label="Начало">
          <input aria-label="Новое начало события" type="datetime-local" value={startsAtLocal} onChange={(event) => setStartsAtLocal(event.target.value)} className="w-full bg-transparent outline-none" />
        </Field>
        <Field label="Окончание">
          <input aria-label="Новое окончание события" type="datetime-local" value={endsAtLocal} onChange={(event) => setEndsAtLocal(event.target.value)} className="w-full bg-transparent outline-none" />
        </Field>
        <Field label="Место">
          <input value={locationName} onChange={(event) => setLocationName(event.target.value)} className="w-full bg-transparent outline-none" />
        </Field>

        <section className="rounded-[14px_14px_14px_5px] border border-border bg-white p-3" aria-label="Участники события">
          <p className="text-[11px] text-ink/50">Участники сохраняются</p>
          <p className="mt-1 text-[13px] font-medium">{context.participantNames.join(", ") || "Нет участников"}</p>
        </section>

        <button type="button" onClick={submit} disabled={invalid || pending} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px_14px_14px_5px] bg-primary px-5 text-[15px] font-semibold text-white disabled:opacity-40">
          <CalendarClock aria-hidden="true" size={19} />
          {pending ? "Проверяем и сохраняем…" : "Сохранить перенос"}
        </button>

        {message && (
          <section role={saved ? "status" : "alert"} className={saved ? "rounded-[13px] bg-[#e3f7ef] p-3 text-[12px] text-[#176c59]" : "rounded-[13px] bg-coral/10 p-3 text-[12px] text-coral"}>
            {saved && <CheckCircle2 aria-hidden="true" className="mr-2 inline" size={17} />}
            {message}
            {saved && (
              <button type="button" onClick={() => router.push(`/calendar/items/${context.eventId}`)} className="mt-3 block min-h-10 rounded-[10px] bg-primary px-4 font-semibold text-white">
                Открыть событие
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-[12px] font-medium text-ink/55">{label}</span><span className="flex min-h-[52px] items-center rounded-[14px_14px_14px_5px] border border-border bg-white px-3.5 text-[13px]">{children}</span></label>;
}

function toDatetimeLocal(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}
