"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Footprints,
  Heart,
  Link2,
  Plus,
  Timer,
  Users,
  X
} from "lucide-react";
import type { IdeaCandidate, IdeasPreset } from "@/lib/ideas";
import { cn } from "@/lib/utils";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

function formatTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone
  }).format(new Date(iso));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

function checkLabel(status: IdeaCandidate["check"]["status"]) {
  if (status === "valid") return "Проверено";
  if (status === "blocking") return "Не подходит";
  if (status === "stale") return "Устарело";
  return "Нужна проверка";
}

function checkTone(status: IdeaCandidate["check"]["status"]) {
  if (status === "valid") return "success";
  if (status === "blocking") return "blocking";
  if (status === "warning" || status === "stale") return "warning";
  return "neutral";
}

function sourceLabel(source: IdeaCandidate["source"]) {
  if (source === "tutu") return "через Туту";
  if (source === "demo_catalog") return "демо-каталог";
  return "вариант участника";
}

function CandidateCard({
  candidate,
  timezone,
  selected,
  onToggle
}: {
  candidate: IdeaCandidate;
  timezone: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const blocked = candidate.check.status === "blocking";
  const selectable = candidate.check.status === "valid" || candidate.check.status === "warning";
  const tone = checkTone(candidate.check.status);
  const TravelIcon = candidate.travelMode === "walk" ? Footprints : BusFront;
  const checkReason = candidate.check.reasons[0]?.message ?? "Проверка ещё не завершена";

  return (
    <article
      className={cn(
        "rounded-[14px_14px_14px_5px] border bg-white p-3 shadow-card transition",
        selected && "border-primary ring-2 ring-primary/15",
        blocked && "border-coral bg-[#fff0ee]",
        !selected && !blocked && "border-border"
      )}
      data-candidate-id={candidate.id}
      data-check-status={candidate.check.status}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-5">{candidate.title}</h2>
          <p className="mt-0.5 text-[11px] text-ink/58">
            {formatTime(candidate.startsAt, timezone)}–{formatTime(candidate.endsAt, timezone)} · {sourceLabel(candidate.source)}
          </p>
        </div>
        <strong className="shrink-0 text-[13px] font-semibold">{candidate.pricePerPerson === undefined ? "Цена уточняется" : formatPrice(candidate.pricePerPerson)}</strong>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-ink/58">
        <span className="inline-flex items-center gap-1"><TravelIcon aria-hidden="true" size={15} />{formatDuration(candidate.travelMinutes)} в дороге</span>
        <span className="inline-flex items-center gap-1"><Timer aria-hidden="true" size={15} />{formatDuration(candidate.usefulMinutes)} на месте</span>
        <span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" size={15} />Запас {formatDuration(candidate.returnBufferMinutes)}</span>
        <span className="inline-flex items-center gap-1">
          <Users aria-hidden="true" size={15} />
          {candidate.capacity === "unknown" ? "Места не подтверждены" : `${candidate.capacity} места`}
        </span>
        {candidate.interest && <span className="inline-flex items-center gap-1"><Heart aria-hidden="true" size={15} />{candidate.interest}</span>}
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className={cn("min-w-0 text-[11px] leading-4", tone === "blocking" && "text-[#a32e28]", tone === "warning" && "text-[#76540b]", tone === "success" && "text-success", tone === "neutral" && "text-ink/70")}>
          <span className="inline-flex items-center gap-1 font-semibold">
            {tone === "success" ? <CheckCircle2 aria-hidden="true" size={15} /> : <AlertTriangle aria-hidden="true" size={15} />}
            {checkLabel(candidate.check.status)}
          </span>
          <p className="mt-0.5 text-ink/65">{checkReason}</p>
          <p className="mt-0.5 text-ink/60">{candidate.recommendationReason}</p>
        </div>
        {blocked ? (
          <Link href="/conflicts/schedule-shift" className="shrink-0 rounded-[10px] bg-white/70 px-3 py-2 text-[11px] font-semibold text-primary-strong">
            Почему
          </Link>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            disabled={!selectable}
            aria-pressed={selected}
            className={cn(
              "shrink-0 rounded-[10px] px-3 py-2 text-[11px] font-semibold disabled:cursor-wait disabled:opacity-55",
              selected ? "bg-primary text-white" : "border border-border bg-white text-ink"
            )}
          >
            {!selectable ? "Проверяем…" : selected ? "Добавлено" : "Добавить"}
          </button>
        )}
      </div>
    </article>
  );
}

export function IdeasScreen({ preset }: { preset: IdeasPreset }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(preset.selectedCandidateIds));
  const [activeFilter, setActiveFilter] = useState(preset.filters[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [customCandidates, setCustomCandidates] = useState<IdeaCandidate[]>([]);

  const candidates = useMemo(() => [...preset.candidates, ...customCandidates], [customCandidates, preset.candidates]);
  const visibleCandidates = useMemo(() => {
    if (activeFilter === "Культура") return candidates.filter((candidate) => candidate.interest === "Культура");
    if (activeFilter === "Вода") return candidates.filter((candidate) => candidate.interest === "Вода");
    return candidates;
  }, [activeFilter, candidates]);

  function toggleCandidate(candidateId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

  function addCustomCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const url = String(formData.get("url") ?? "").trim();
    const id = `custom-${Date.now()}`;
    const candidate: IdeaCandidate = {
      id,
      gapId: preset.gapId,
      title,
      source: "user_link",
      startsAt: "2026-09-12T14:00:00+03:00",
      endsAt: "2026-09-12T16:00:00+03:00",
      travelMode: "mixed",
      travelMinutes: 0,
      usefulMinutes: 0,
      capacity: "unknown",
      returnBufferMinutes: 0,
      deeplink: url || undefined,
      recommendationReason: "Вариант участника будет оценён по тем же правилам, что и системные предложения",
      check: {
        status: "checking",
        reasons: [{
          code: url ? "user_link_pending" : "manual_candidate_pending",
          message: url ? "Проверим ссылку и логистику перед голосованием" : "Ручной вариант пройдёт ту же проверку перед голосованием"
        }]
      }
    };
    setCustomCandidates((current) => [...current, candidate]);
    setShowAddForm(false);
    event.currentTarget.reset();
    window.setTimeout(() => {
      setCustomCandidates((current) => current.map((item) => item.id === id ? {
        ...item,
        check: {
          status: "warning",
          reasons: [{ code: "capacity_unknown", message: "Маршрут принят, но места и логистику нужно подтвердить перед голосованием" }],
          checkedAt: new Date().toISOString()
        }
      } : item));
    }, 650);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]" data-preset-id={preset.id}>
      <header className="flex min-h-[74px] items-center gap-2.5 border-b border-border bg-white px-4 py-3">
        <Link href={`/calendar/gaps/${preset.gapId}/create`} aria-label="Назад" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-page">
          <ArrowLeft aria-hidden="true" size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold">Чем заполнить окно?</h1>
          <p className="mt-0.5 text-[12px] text-ink/58">{preset.dateLabel} · {preset.timeLabel} · до {formatPrice(preset.budgetPerPerson)}/чел.</p>
        </div>
      </header>

      <div className="flex-1 px-3 pb-28 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Фильтры подбора">
          {preset.filters.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "min-h-[34px] shrink-0 rounded-full border px-3 text-[12px] font-semibold",
                activeFilter === filter ? "border-primary bg-primary/10 text-primary-strong" : "border-border bg-white"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2.5">
          {visibleCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              timezone={preset.timezone}
              selected={selectedIds.has(candidate.id)}
              onToggle={() => toggleCandidate(candidate.id)}
            />
          ))}
          {visibleCandidates.length === 0 && (
            <div className="rounded-[14px] border border-dashed border-border bg-white p-6 text-center">
              <p className="text-sm font-semibold">Подходящих вариантов по фильтру пока нет</p>
              <p className="mt-1 text-[12px] text-ink/65">Выберите другой фильтр или добавьте свой вариант.</p>
            </div>
          )}
        </div>

        {showAddForm ? (
          <form onSubmit={addCustomCandidate} className="mt-3 rounded-[14px_14px_14px_5px] border border-primary/35 bg-white p-3 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Свой вариант</h2>
              <button type="button" onClick={() => setShowAddForm(false)} aria-label="Закрыть форму" className="grid h-9 w-9 place-items-center rounded-full hover:bg-page"><X aria-hidden="true" size={18} /></button>
            </div>
            <label className="mt-3 grid gap-1 text-[11px] text-ink/58">
              Название
              <input name="title" required placeholder="Например, прогулка по Волге" className="h-11 rounded-[10px] border border-border px-3 text-sm text-ink outline-none focus:border-primary" />
            </label>
            <label className="mt-2 grid gap-1 text-[11px] text-ink/58">
              Ссылка, необязательно
              <span className="relative">
                <Link2 aria-hidden="true" size={16} className="absolute left-3 top-3.5" />
                <input name="url" type="url" placeholder="https://…" className="h-11 w-full rounded-[10px] border border-border pl-9 pr-3 text-sm text-ink outline-none focus:border-primary" />
              </span>
            </label>
            <button type="submit" className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-white">
              <ExternalLink aria-hidden="true" size={16} />Добавить и проверить
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setShowAddForm(true)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-primary/45 bg-white text-sm font-semibold text-primary-strong">
            <Plus aria-hidden="true" size={18} />Добавить свой вариант
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex min-h-[88px] w-full max-w-[430px] items-center justify-between gap-3 bg-ink px-4 py-3 text-white sm:bottom-6 sm:rounded-b-[28px]">
        <div className="min-w-0" aria-live="polite">
          <strong className="block text-sm">{selectedIds.size} {selectedIds.size === 1 ? "вариант выбран" : "варианта выбрано"}</strong>
          <span className="text-[11px] text-white/65">Совпадают с интересами группы</span>
        </div>
        {selectedIds.size > 0 ? (
          <Link href={`/polls/demo-poll?candidates=${encodeURIComponent(Array.from(selectedIds).join(","))}`} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[12px_12px_12px_5px] bg-accent px-4 text-sm font-semibold text-ink">
            На голосование
          </Link>
        ) : (
          <button type="button" disabled className="h-11 shrink-0 rounded-[12px] bg-white/20 px-4 text-sm font-semibold text-white/55">
            На голосование
          </button>
        )}
      </div>
    </main>
  );
}
