"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useActionState, useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  Sparkles,
  Timer,
  Users,
  WifiOff,
  X
} from "lucide-react";
import type { IdeaCandidate, IdeasPreset, IdeasSearchState } from "@/lib/ideas";
import { readIdeasSelection, writeIdeasSelection } from "@/lib/ideas";
import { checkCustomIdeaAction, createIdeasPollAction, searchIdeasAction } from "@/app/calendar/gaps/[gapId]/ideas/actions";
import { PARTICIPANT_STORAGE_KEY } from "@/lib/trips/constants";
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
  if (source === "gigachat") return "предложил GigaChat";
  if (source === "demo_catalog") return "демо-каталог";
  return "вариант участника";
}

function formatCheckedAt(checkedAt: string | undefined, timezone: string) {
  if (!checkedAt) return "время проверки неизвестно";
  return `проверено ${new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone
  }).format(new Date(checkedAt))}`;
}

function CandidateCard({
  candidate,
  timezone,
  selected,
  onToggle,
  mockMode
}: {
  candidate: IdeaCandidate;
  timezone: string;
  selected: boolean;
  onToggle: () => void;
  mockMode: boolean;
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
        {blocked && mockMode ? (
          <Link href="/conflicts/schedule-shift" className="shrink-0 rounded-[10px] bg-white/70 px-3 py-2 text-[11px] font-semibold text-primary-strong">
            Почему
          </Link>
        ) : blocked ? (
          <span className="shrink-0 rounded-[10px] bg-white/70 px-3 py-2 text-[11px] font-semibold text-[#a32e28]">
            Недоступно
          </span>
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

export function IdeasScreen({ preset, initialSearch, mockMode = false }: { preset: IdeasPreset; initialSearch: IdeasSearchState; mockMode?: boolean }) {
  const router = useRouter();
  const [searchState, searchAction, searchPending] = useActionState(searchIdeasAction, initialSearch);
  const [selectedIds, setSelectedIds] = useState(() => new Set(preset.selectedCandidateIds));
  const [selectionHydrated, setSelectionHydrated] = useState(false);
  const [activeFilter, setActiveFilter] = useState(preset.filters[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [customCandidates, setCustomCandidates] = useState<IdeaCandidate[]>([]);
  const [customPending, setCustomPending] = useState(false);
  const [customError, setCustomError] = useState<string>();
  const [pollPending, setPollPending] = useState(false);
  const [pollError, setPollError] = useState<string>();

  const candidates = useMemo(() => [...searchState.candidates, ...customCandidates], [customCandidates, searchState.candidates]);
  const visibleCandidates = useMemo(() => {
    if (activeFilter === "Автобус") return candidates.filter((candidate) => candidate.travelMode === "bus");
    if (activeFilter === "Поезд") return candidates.filter((candidate) => candidate.travelMode === "train");
    if (activeFilter === "Культура") return candidates.filter((candidate) => candidate.interest === "Культура");
    if (activeFilter === "Вода") return candidates.filter((candidate) => candidate.interest === "Вода");
    return candidates;
  }, [activeFilter, candidates]);
  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedIds.has(candidate.id) && candidate.check.status !== "blocking"),
    [candidates, selectedIds]
  );

  useEffect(() => {
    const stored = readIdeasSelection(window.localStorage, preset.gapId);
    if (stored.length > 0) setSelectedIds(new Set(stored));
    setSelectionHydrated(true);
  }, [preset.gapId]);

  useEffect(() => {
    if (selectionHydrated) writeIdeasSelection(window.localStorage, preset.gapId, selectedIds);
  }, [preset.gapId, selectedIds, selectionHydrated]);

  function toggleCandidate(candidateId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

  async function addCustomCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("gapId", preset.gapId);
    setCustomPending(true);
    setCustomError(undefined);
    const result = await checkCustomIdeaAction(formData);
    setCustomPending(false);
    if (result.status === "error") {
      setCustomError(result.message);
      return;
    }
    setCustomCandidates((current) => [...current.filter(({ id }) => id !== result.candidate.id), result.candidate]);
    setShowAddForm(false);
    event.currentTarget.reset();
  }

  async function createPoll() {
    if (selectedCandidates.length === 0 || pollPending) return;
    if (mockMode) {
      router.push(`/polls/demo-poll?candidates=${encodeURIComponent(selectedCandidates.map(({ id }) => id).join(","))}`);
      return;
    }
    const participantId = window.localStorage.getItem(PARTICIPANT_STORAGE_KEY);
    if (!participantId) {
      setPollError("Сначала выберите себя в поездке");
      return;
    }

    setPollPending(true);
    setPollError(undefined);
    try {
      const formData = new FormData();
      formData.set("gapId", preset.gapId);
      formData.set("destination", searchState.destination);
      if (searchState.provider) formData.set("provider", searchState.provider);
      formData.set("participantId", participantId);
      selectedCandidates.forEach(({ id }) => formData.append("candidateId", id));
      const result = await createIdeasPollAction(formData);
      if (result.status === "error") {
        setPollError(result.message);
        return;
      }
      router.push(`/polls/${result.pollId}`);
    } catch {
      setPollError("Не удалось создать голосование. Повторите попытку.");
    } finally {
      setPollPending(false);
    }
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
        <form action={searchAction} className="mb-3 rounded-[14px] border border-border bg-white p-3 shadow-card">
          <input type="hidden" name="gapId" value={preset.gapId} />
          <div className="mb-3 rounded-[12px_12px_12px_5px] bg-primary/10 p-3">
            <div className="flex items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px_10px_10px_4px] bg-primary text-white">
                <Sparkles aria-hidden="true" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block text-sm">Не знаете, куда пойти?</strong>
                <p className="mt-0.5 text-[11px] leading-4 text-ink/65">GigaChat учтёт текущую точку из плана, время окна, дорогу и бюджет.</p>
              </div>
            </div>
            <button
              type="submit"
              name="searchKind"
              value="attractions"
              formNoValidate
              disabled={searchPending}
              className="mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-accent text-xs font-semibold text-ink disabled:opacity-60"
            >
              <Sparkles aria-hidden="true" size={15} className={searchPending ? "animate-pulse" : undefined} />
              {searchPending ? "Подбираем…" : "Подобрать рядом автоматически"}
            </button>
          </div>
          <label className="grid gap-1 text-[11px] text-ink/58">
            Или укажите направление вручную
            <span className="flex gap-2">
              <input
                name="destination"
                required
                defaultValue={searchState.destination}
                placeholder="Например, Иннополис"
                className="h-11 min-w-0 flex-1 rounded-[10px] border border-border px-3 text-sm text-ink outline-none focus:border-primary"
              />
              <button name="searchKind" value="travel" disabled={searchPending} className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-primary px-3 text-xs font-semibold text-white disabled:opacity-60">
                <RefreshCw aria-hidden="true" size={15} className={searchPending ? "animate-spin" : undefined} />
                {searchPending ? "Ищем…" : "Найти"}
              </button>
            </span>
          </label>
          {searchState.status !== "error" && searchState.mode && (
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-ink/60" aria-live="polite">
              <span className="inline-flex items-center gap-1">
                {searchState.mode === "live" ? <CheckCircle2 aria-hidden="true" size={14} className="text-success" /> : <WifiOff aria-hidden="true" size={14} />}
                {searchState.provider === "gigachat" ? "Подбор GigaChat" : searchState.mode === "live" ? "Данные Туту" : "Fallback: демо-каталог"}
              </span>
              <span>{formatCheckedAt(searchState.checkedAt, preset.timezone)}{searchState.cache === "hit" ? " · из кеша" : ""}</span>
            </div>
          )}
          {searchState.warnings.map((warning) => (
            <p key={warning} className="mt-2 rounded-lg bg-[#fff4d6] px-2.5 py-2 text-[11px] text-[#76540b]">{warning}</p>
          ))}
        </form>

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
          {searchState.status === "error" && (
            <div role="alert" className="rounded-[14px] border border-coral bg-[#fff0ee] p-4 text-center">
              <AlertTriangle aria-hidden="true" className="mx-auto text-[#a32e28]" size={24} />
              <p className="mt-2 text-sm font-semibold">Не удалось загрузить варианты</p>
              <p className="mt-1 text-[12px] text-ink/65">{searchState.message}</p>
            </div>
          )}
          {visibleCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              timezone={preset.timezone}
              selected={selectedIds.has(candidate.id)}
              onToggle={() => toggleCandidate(candidate.id)}
              mockMode={mockMode}
            />
          ))}
          {searchState.status !== "error" && visibleCandidates.length === 0 && (
            <div className="rounded-[14px] border border-dashed border-border bg-white p-6 text-center">
              <p className="text-sm font-semibold">Вариантов пока нет</p>
              <p className="mt-1 text-[12px] text-ink/65">Измените направление, выберите другой фильтр или добавьте свой вариант.</p>
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
                <input name="url" type="url" required pattern="https://.*" placeholder="https://…" className="h-11 w-full rounded-[10px] border border-border pl-9 pr-3 text-sm text-ink outline-none focus:border-primary" />
              </span>
            </label>
            {customError && <p role="alert" className="mt-2 text-[11px] text-[#a32e28]">{customError}</p>}
            <button type="submit" disabled={customPending} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-white disabled:opacity-60">
              <ExternalLink aria-hidden="true" size={16} />{customPending ? "Проверяем…" : "Добавить и проверить"}
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
          <strong className="block text-sm">{selectedCandidates.length} {selectedCandidates.length === 1 ? "вариант выбран" : "варианта выбрано"}</strong>
          <span className={cn("text-[11px]", pollError ? "text-coral" : "text-white/65")}>{pollError ?? "Совпадают с интересами группы"}</span>
        </div>
        {selectedCandidates.length > 0 ? (
          <button type="button" onClick={createPoll} disabled={pollPending} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[12px_12px_12px_5px] bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-60">
            {pollPending ? "Создаём…" : "На голосование"}
          </button>
        ) : (
          <button type="button" disabled className="h-11 shrink-0 rounded-[12px] bg-white/20 px-4 text-sm font-semibold text-white/55">
            На голосование
          </button>
        )}
      </div>
    </main>
  );
}
