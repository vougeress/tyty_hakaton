"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Flag, Send } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  mockManualEventRepository,
  type ManualEventContext,
  type ManualEventDraft,
  type ManualEventResult
} from "@/lib/manual-event-repository";
import { cn } from "@/lib/utils";

type PublicationMode = ManualEventDraft["publicationMode"];

export function ManualEventScreen({ context }: { context: ManualEventContext }) {
  const router = useRouter();
  const [title, setTitle] = useState(context.initialDraft.title);
  const [locationName, setLocationName] = useState(context.initialDraft.locationName);
  const [startsAt, setStartsAt] = useState(context.initialDraft.startsAt.slice(0, 16));
  const [endsAt, setEndsAt] = useState(context.initialDraft.endsAt.slice(0, 16));
  const [selectedIds, setSelectedIds] = useState(context.initialDraft.participantIds);
  const [mode, setMode] = useState<PublicationMode>(context.initialDraft.publicationMode);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingLogistics, setCheckingLogistics] = useState(false);
  const [checkedSnapshot, setCheckedSnapshot] = useState(() => `${context.initialDraft.startsAt.slice(0, 16)}|${context.initialDraft.endsAt.slice(0, 16)}|${context.initialDraft.locationName}`);
  const [createdResult, setCreatedResult] = useState<ManualEventResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const groupSelectionRef = useRef(context.initialDraft.participantIds);

  const onlyMe = selectedIds.length === 1 && selectedIds[0] === context.currentParticipantId;
  const noParticipants = selectedIds.length === 0;
  const invalidTimeRange = !startsAt || !endsAt || Date.parse(startsAt) >= Date.parse(endsAt);
  const startsAtIso = `${startsAt}:00${context.utcOffset}`;
  const endsAtIso = `${endsAt}:00${context.utcOffset}`;
  const outsideGap = !invalidTimeRange && (Date.parse(startsAtIso) < Date.parse(context.gap.startsAt) || Date.parse(endsAtIso) > Date.parse(context.gap.endsAt));
  const logisticsStale = checkedSnapshot !== `${startsAt}|${endsAt}|${locationName}`;
  const effectiveMode: PublicationMode = onlyMe ? "direct" : mode;
  const presetId = noParticipants
    ? "manual.no_participants"
    : onlyMe
      ? "manual.only_me"
      : effectiveMode === "direct"
        ? "manual.group_direct"
        : "manual.group_vote";

  const participantSummary = useMemo(() => {
    if (noParticipants) return "Никто не выбран";
    if (onlyMe) return "Только я";
    if (selectedIds.length === context.participants.length) return `Все участники · ${selectedIds.length}`;
    return `Выбрано · ${selectedIds.length}`;
  }, [context.participants.length, noParticipants, onlyMe, selectedIds.length]);

  function toggleParticipant(id: string) {
    setSelectedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      if (!(next.length === 1 && next[0] === context.currentParticipantId) && next.length > 0) {
        groupSelectionRef.current = next;
      }
      return next;
    });
  }

  function toggleOnlyMe() {
    if (onlyMe) {
      const restored = groupSelectionRef.current.filter((id) => id !== context.currentParticipantId);
      setSelectedIds(restored.length ? [context.currentParticipantId, ...restored] : context.gap.participantIds);
      return;
    }
    if (selectedIds.length > 1) groupSelectionRef.current = selectedIds;
    setSelectedIds([context.currentParticipantId]);
    setMode("direct");
  }

  async function submit() {
    if (noParticipants || !title.trim() || !locationName.trim() || invalidTimeRange || outsideGap || logisticsStale || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await mockManualEventRepository.create({
        ...context.initialDraft,
        title: title.trim(),
        locationName: locationName.trim(),
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        participantIds: selectedIds,
        publicationMode: effectiveMode
      });
      setCreatedResult(result);
    } catch {
      setSubmitError("Не удалось подготовить событие. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  function recheckLogistics() {
    if (invalidTimeRange || outsideGap || !locationName.trim()) return;
    setCheckingLogistics(true);
    window.setTimeout(() => {
      setCheckedSnapshot(`${startsAt}|${endsAt}|${locationName}`);
      setCheckingLogistics(false);
    }, 450);
  }

  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-[430px] bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:overflow-hidden sm:rounded-[28px]"
      data-preset-id={presetId}
    >
      <header className="flex min-h-[82px] items-center gap-4 border-b border-border bg-white px-5 pt-[env(safe-area-inset-top)]">
        <Link href={`/calendar/gaps/${context.gap.id}/create`} aria-label="Назад к выбору способа" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-page">
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Новое событие</h1>
          <p className="mt-0.5 text-[13px] text-ink/55">Проверим до публикации</p>
        </div>
      </header>

      <div className="px-5 py-5">
        <div className="grid gap-4">
          <Field label="Название">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-invalid={!title.trim()} />
          </Field>
          <Field label="Дата и время">
            <span className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input aria-label="Начало события" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="min-w-0 rounded bg-transparent text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-primary/45" />
              <span aria-hidden="true">—</span>
              <input aria-label="Окончание события" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="min-w-0 rounded bg-transparent text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-invalid={invalidTimeRange} />
            </span>
          </Field>
          {invalidTimeRange && <p className="-mt-3 text-[11px] text-coral">Время окончания должно быть позже начала</p>}
          {outsideGap && <p className="-mt-3 text-[11px] text-coral">Событие должно помещаться в выбранное окно {context.gap.dateLabel}</p>}
          <Field label="Место">
            <input value={locationName} onChange={(event) => setLocationName(event.target.value)} className="w-full rounded bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary/45" aria-invalid={!locationName.trim()} />
          </Field>

          <div className="relative">
            <span className="mb-2 block text-[12px] font-medium text-ink/55">Участники</span>
            <div className="grid grid-cols-[1fr_126px] gap-2">
              <button
                type="button"
                aria-expanded={pickerOpen}
                aria-controls="participant-picker"
                onClick={() => setPickerOpen((open) => !open)}
                className={cn(
                  "flex min-h-[52px] items-center justify-between rounded-[14px_14px_14px_5px] border bg-white px-3 text-left text-[13px] font-medium",
                  noParticipants ? "border-coral text-coral" : "border-border"
                )}
              >
                <span>{participantSummary}</span>
                <ChevronDown aria-hidden="true" size={17} className={cn("transition-transform", pickerOpen && "rotate-180")} />
              </button>
              <label className={cn(
                "flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[14px_14px_14px_5px] border bg-white px-3 text-[13px] font-medium",
                onlyMe ? "border-primary bg-primary/10 text-primary" : "border-border"
              )}>
                <input type="checkbox" className="sr-only" checked={onlyMe} onChange={toggleOnlyMe} />
                <span className={cn("grid h-5 w-5 place-items-center rounded border", onlyMe ? "border-primary bg-primary text-white" : "border-ink/30")}>
                  {onlyMe && <Check aria-hidden="true" size={14} />}
                </span>
                <Flag aria-hidden="true" size={16} />
                Только я
              </label>
            </div>

            {pickerOpen && (
              <div id="participant-picker" className="absolute left-0 right-[134px] top-[78px] z-10 overflow-hidden rounded-[14px_14px_14px_5px] border border-border bg-white p-1.5 shadow-card">
                {context.participants.map((participant) => {
                  const selected = selectedIds.includes(participant.id);
                  return (
                    <label key={participant.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[9px] px-2 text-[13px] hover:bg-page">
                      <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleParticipant(participant.id)} />
                      <span className={cn("grid h-5 w-5 place-items-center rounded border", selected ? "border-primary bg-primary text-white" : "border-ink/25")}>
                        {selected && <Check aria-hidden="true" size={14} />}
                      </span>
                      {participant.displayName}{participant.isCurrent ? " · вы" : ""}
                    </label>
                  );
                })}
              </div>
            )}
            {noParticipants && <p className="mt-1.5 text-[11px] text-coral">Выберите хотя бы одного участника</p>}
          </div>

          <div>
            <span className="mb-2 block text-[12px] font-medium text-ink/55">Как добавить</span>
            <div className="grid grid-cols-2 rounded-[14px_14px_14px_5px] bg-[#e8e9f0] p-1">
              <ModeButton selected={effectiveMode === "direct"} onClick={() => setMode("direct")}>Сразу в план</ModeButton>
              <ModeButton selected={effectiveMode === "vote"} disabled={onlyMe} onClick={() => setMode("vote")}>Голосованием</ModeButton>
            </div>
            {onlyMe && <p className="mt-1.5 text-[11px] text-ink/50">Личное событие добавляется сразу в план без голосования.</p>}
          </div>

          {logisticsStale ? (
            <div className="flex items-center gap-2.5 rounded-[13px_13px_13px_5px] bg-accent/25 p-3 text-[12px] leading-4 text-ink">
              <p className="flex-1"><strong>Нужно перепроверить маршрут.</strong> Время или место изменились.</p>
              <button type="button" onClick={recheckLogistics} disabled={checkingLogistics || invalidTimeRange || outsideGap} className="min-h-9 rounded-[10px] bg-white px-3 font-semibold disabled:opacity-45">{checkingLogistics ? "Проверяем…" : "Проверить"}</button>
            </div>
          ) : (
            <div className="flex gap-2.5 rounded-[13px_13px_13px_5px] bg-[#e3f7ef] p-3 text-[12px] leading-4 text-[#176c59]">
              <CheckCircle2 aria-hidden="true" className="shrink-0" size={19} />
              <p><strong>Маршрут проверен.</strong> {context.logistics.travelMinutes} минут в пути, вернётесь за {formatDuration(context.logistics.returnBufferMinutes)} до {context.gap.nextEventTitle}.</p>
            </div>
          )}

          <button
            type="button"
            disabled={noParticipants || !title.trim() || !locationName.trim() || invalidTimeRange || outsideGap || logisticsStale || submitting}
            onClick={submit}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px_14px_14px_5px] bg-primary px-5 text-[15px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send aria-hidden="true" size={18} />
            {submitting ? "Сохраняем…" : onlyMe ? "Добавить в личный план" : effectiveMode === "vote" ? "Создать голосование" : "Добавить в план"}
          </button>
          {submitError && <p role="alert" className="text-[12px] text-coral">{submitError}</p>}
          {createdResult && (
            <section className="rounded-[14px] border border-success/25 bg-[#e3f7ef] p-3 text-[12px] text-[#176c59]" aria-live="polite">
              <strong className="block text-sm">{createdResult.kind === "poll" ? "Черновик голосования подготовлен" : "Черновик события подготовлен"}</strong>
              <p className="mt-1">Mock-режим сохранил введённые данные в текущем сценарии. Серверную запись подключит data adapter.</p>
              <button type="button" onClick={() => router.push(createdResult.href)} className="mt-3 min-h-10 rounded-[10px] bg-primary px-4 font-semibold text-white">Продолжить</button>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-medium text-ink/55">{label}</span>
      <span className="flex min-h-[52px] items-center rounded-[14px_14px_14px_5px] border border-border bg-white px-3.5 text-[13px]">{children}</span>
    </label>
  );
}

function ModeButton({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={selected} onClick={onClick} className={cn(
      "min-h-10 rounded-[11px_11px_11px_4px] text-[13px] font-medium text-ink/55 disabled:cursor-not-allowed disabled:opacity-40",
      selected && "bg-white text-ink shadow-sm"
    )}>{children}</button>
  );
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} ч${rest ? ` ${rest} мин` : ""}`;
}
