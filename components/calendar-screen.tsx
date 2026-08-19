"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Images,
  Plus,
  Route,
  Sparkles
} from "lucide-react";
import type {
  CalendarGap,
  CalendarItem,
  CalendarPreset
} from "@/lib/calendar-repository";
import { readManualCalendarItems } from "@/lib/manual-calendar-storage";
import { cn } from "@/lib/utils";

const GRID_START_HOUR = 9;
const GRID_END_HOUR = 22;
const PX_PER_HOUR = 36;

type PositionedEntry =
  | { kind: "item"; entry: CalendarItem; column: number; top: number; height: number }
  | { kind: "gap"; entry: CalendarGap; column: number; top: number; height: number };

function dateParts(iso: string, timezone: string) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => values.find((part) => part.type === type)?.value ?? "";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}`;
  const [hour, minute] = time.split(":").map(Number);
  return { day, minutes: hour * 60 + minute, time };
}

function positionEntry(
  entry: CalendarItem | CalendarGap,
  days: CalendarPreset["days"],
  kind: PositionedEntry["kind"],
  timezone: string
): PositionedEntry | null {
  const start = dateParts(entry.startsAt, timezone);
  const end = dateParts(entry.endsAt, timezone);
  const column = days.findIndex(({ isoDate }) => isoDate === start.day);
  if (column < 0) return null;

  const gridStart = GRID_START_HOUR * 60;
  const gridEnd = GRID_END_HOUR * 60;
  const visibleStart = Math.max(start.minutes, gridStart);
  const visibleEnd = Math.min(end.minutes, gridEnd);
  const top = ((visibleStart - gridStart) / 60) * PX_PER_HOUR;
  const height = Math.max(32, ((visibleEnd - visibleStart) / 60) * PX_PER_HOUR);

  return { kind, entry, column, top, height } as PositionedEntry;
}

function entryClasses(entry: CalendarItem) {
  if (entry.status === "conflicted") {
    return "border-[1.5px] border-coral bg-[#fff0ee] text-[#9b302b]";
  }
  if (entry.type === "booking") {
    return "border-x-0 border-b-0 border-t-4 border-accent bg-ink text-white";
  }
  if (entry.type === "draft") {
    return "border border-dashed border-primary/70 bg-primary/10 text-primary-strong";
  }
  if (entry.type === "poll") {
    return "border-[1.5px] border-dashed border-[#e4a928] bg-[#fff9cf] text-[#6b4500]";
  }
  if (entry.status === "confirmed" && entry.type === "event") {
    return "border border-transparent bg-primary text-white";
  }
  if (entry.type === "transfer") {
    return "border border-cyan bg-cyan/30 text-ink";
  }
  return "border border-cyan bg-cyan/30 text-ink";
}

function getEntryAriaLabel(entry: CalendarItem, timezone: string) {
  const start = dateParts(entry.startsAt, timezone).time;
  const status = entry.status === "conflicted" ? ", конфликт" : "";
  return `${entry.title}, ${start}${status}`;
}

export function CalendarScreen({ preset }: { preset: CalendarPreset }) {
  const [participantFilter, setParticipantFilter] = useState("all");
  const [isChecking, setIsChecking] = useState(false);
  const [scanVisible, setScanVisible] = useState(false);
  const [manualItems, setManualItems] = useState<CalendarItem[]>([]);
  const currentParticipant = preset.participants[0];
  const participantFilters = [
    { id: "all", label: "Все" },
    ...preset.participants.map((participant) => ({
      id: participant.id,
      label: participant.id === currentParticipant?.id ? "Я" : participant.shortName
    }))
  ];

  useEffect(() => {
    setManualItems(readManualCalendarItems());
  }, []);

  const positionedEntries = useMemo(() => {
    const manualItemIds = new Set(manualItems.map(({ id }) => id));
    const mergedItems = [
      ...preset.items.filter(({ id }) => !manualItemIds.has(id)),
      ...manualItems
    ];
    const itemEntries = mergedItems
      .filter((item) => participantFilter === "all" || item.participantIds.includes(participantFilter))
      .map((item) => positionEntry(item, preset.days, "item", preset.trip.timezone))
      .filter((item): item is PositionedEntry => item !== null);
    const gapEntries = preset.gaps
      .filter((gap) => participantFilter === "all" || gap.participantIds.includes(participantFilter))
      .map((gap) => positionEntry(gap, preset.days, "gap", preset.trip.timezone))
      .filter((item): item is PositionedEntry => item !== null);

    return [...itemEntries, ...gapEntries].sort((a, b) => a.entry.startsAt.localeCompare(b.entry.startsAt));
  }, [manualItems, participantFilter, preset]);

  function runCheck() {
    if (isChecking) return;
    setIsChecking(true);
    setScanVisible(true);
    window.setTimeout(() => {
      setIsChecking(false);
      setScanVisible(false);
    }, 700);
  }

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-surface text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]"
      data-preset-id={preset.id}
    >
      <header className="flex min-h-16 items-center justify-between gap-3 bg-surface px-4 py-3">
        <Link href="/trips" className="flex min-w-0 items-center gap-3" aria-label="Открыть поездки">
          <span className="text-[25px] font-bold tracking-[-0.12em] text-ink" aria-label="Tutu">
            tu<span className="inline-block -skew-x-6 text-primary">tu</span>
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-[15px] font-semibold leading-5">
              {preset.trip.title}
              <ChevronDown aria-hidden="true" size={16} />
            </span>
            <span className="block truncate text-[11px] text-ink/60">
              {preset.trip.dateLabel} · {preset.participants.length} участника
            </span>
          </span>
        </Link>
        <Link
          href="/trips"
          aria-label={`Профиль ${currentParticipant?.displayName ?? "участника"}`}
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-primary text-[13px] font-semibold text-white"
        >
          {currentParticipant?.initial ?? "?"}
        </Link>
      </header>

      <div className="flex min-h-[51px] items-center justify-between gap-2 border-y border-border px-3 py-2.5">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Фильтр участников">
          {participantFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={participantFilter === filter.id}
              onClick={() => setParticipantFilter(filter.id)}
              className={cn(
                "min-h-[30px] shrink-0 rounded-full border border-border bg-white px-3 text-[11px] font-semibold transition",
                participantFilter === filter.id && "border-primary bg-primary/10 text-primary-strong"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={runCheck}
          disabled={isChecking}
          aria-busy={isChecking}
          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-[10px_10px_10px_4px] bg-accent px-3 text-[11px] font-semibold disabled:opacity-70"
        >
          <Sparkles aria-hidden="true" size={16} className={cn(isChecking && "animate-spin")} />
          {isChecking ? "Проверяем…" : "Проверить"}
        </button>
      </div>

      <div className="grid h-[46px] shrink-0 grid-cols-[30px_repeat(7,minmax(0,1fr))] border-b border-border">
        <span />
        {preset.days.map((day) => (
          <div
            key={day.isoDate}
            className="grid place-content-center place-items-center gap-0.5 border-l border-border text-[11px] text-ink/58"
          >
            <span>{day.label}</span>
            <strong
              className={cn(
                "grid h-[26px] w-[26px] place-items-center rounded-full text-xs font-semibold text-ink",
                day.isCurrent && "bg-primary text-white"
              )}
            >
              {day.date}
            </strong>
          </div>
        ))}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto pb-[76px]">
        <div
          className="relative h-[472px] min-h-[472px] bg-surface before:pointer-events-none before:absolute before:inset-y-0 before:left-[30px] before:right-0 before:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_35px,var(--color-border)_36px),repeating-linear-gradient(to_right,transparent_0,transparent_calc((100%/7)-1px),var(--color-border)_calc(100%/7))]"
          aria-label="События недели с 7 по 13 сентября"
        >
          {positionedEntries.length === 0 && (
            <div className="absolute inset-x-12 top-24 z-[3] rounded-[8px] border border-dashed border-primary/35 bg-white/95 p-4 text-center shadow-card">
              <p className="text-sm font-semibold">План пока пуст</p>
              <p className="mt-1 text-xs text-ink/58">Добавьте первое событие поездки.</p>
              <Link href="/calendar/gaps/demo-gap/manual" className="mt-3 inline-flex h-9 items-center rounded-[8px] bg-primary px-3 text-xs font-semibold text-white">Добавить событие</Link>
            </div>
          )}
          {[9, 12, 15, 18, 21].map((hour) => (
            <span
              key={hour}
              className="absolute left-1 -translate-y-[7px] text-[11px] text-ink/58"
              style={{ top: `${(hour - GRID_START_HOUR) * PX_PER_HOUR + 8}px` }}
            >
              {String(hour).padStart(2, "0")}
            </span>
          ))}

          {positionedEntries.map(({ kind, entry, column, top, height }) => {
            const style = {
              left: `calc(30px + ((100% - 30px) / 7 * ${column}) + 2px)`,
              top: `${top}px`,
              width: "calc(((100% - 30px) / 7) - 4px)",
              height: `${height}px`
            };

            if (kind === "gap") {
              return (
                <Link
                  key={`gap-${entry.id}`}
                  href={entry.href}
                  style={style}
                  className="absolute z-[2] overflow-hidden rounded-[7px_7px_7px_3px] border border-primary/60 bg-primary/10 p-[5px_4px] text-left text-[11px] font-semibold leading-[1.17] text-primary-strong shadow-[inset_3px_0_0_var(--color-primary)]"
                  aria-label="Свободное окно, суббота с 12:20 до 18:10"
                >
                  Окно
                  <small className="mt-0.5 block text-[11px] font-normal opacity-80">5 ч 50</small>
                </Link>
              );
            }

            return (
              <Link
                key={entry.id}
                href={entry.href}
                style={style}
                className={cn(
                  "absolute z-[2] overflow-hidden rounded-[7px_7px_7px_3px] p-[5px_4px] text-left text-[11px] font-semibold leading-[1.17]",
                  entryClasses(entry)
                )}
                aria-label={getEntryAriaLabel(entry, preset.trip.timezone)}
              >
                {entry.status === "conflicted" && <AlertTriangle aria-hidden="true" size={12} className="mb-0.5" />}
                {entry.type === "transfer" && <Route aria-hidden="true" size={12} className="mb-0.5" />}
                {entry.shortTitle}
                {entry.secondaryLabel && (
                  <small className="mt-0.5 block text-[11px] font-normal opacity-80">{entry.secondaryLabel}</small>
                )}
              </Link>
            );
          })}

          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 left-[30px] right-0 z-[7] overflow-hidden opacity-0",
              scanVisible && "animate-[calendar-scan_700ms_ease-in-out_1] opacity-100"
            )}
          >
            <div className="h-20 border-b-2 border-accent bg-gradient-to-b from-transparent to-accent/25" />
          </div>
        </div>
      </div>

      <nav className="absolute bottom-0 left-1/2 z-10 grid h-[76px] w-full max-w-[430px] -translate-x-1/2 grid-cols-3 items-end border-t border-border bg-white/95 px-6 pb-2.5 pt-1.5 backdrop-blur" aria-label="Основная навигация">
        <Link href="/calendar/gaps/demo-gap/create" className="grid min-h-[52px] place-items-center content-center gap-1 text-[11px] text-ink/58">
          <Plus aria-hidden="true" size={20} />
          Добавить
        </Link>
        <Link href="/calendar" className="-mt-[18px] grid min-h-[66px] place-items-center content-start gap-1 text-[11px] font-semibold text-primary">
          <span className="grid h-[54px] w-[54px] -rotate-3 place-items-center rounded-[18px_18px_18px_7px] bg-primary text-white shadow-card">
            <CalendarDays aria-hidden="true" size={25} className="rotate-3" />
          </span>
          Календарь
        </Link>
        <Link href="/memories" className="grid min-h-[52px] place-items-center content-center gap-1 text-[11px] text-ink/58">
          <Images aria-hidden="true" size={20} />
          Воспоминания
        </Link>
      </nav>
    </main>
  );
}
