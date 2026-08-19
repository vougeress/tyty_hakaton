"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, LockKeyhole, Plus, Vote } from "lucide-react";
import type { PollCandidate, VotePreset, VoteValue } from "@/lib/voting/repository";
import { cn } from "@/lib/utils";

const choices: Array<{ value: VoteValue; label: string }> = [
  { value: "yes", label: "За" },
  { value: "maybe", label: "Можно" },
  { value: "veto", label: "Не могу" }
];

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function VoteCard({ candidate, value, onChange }: { candidate: PollCandidate; value?: VoteValue; onChange: (value: VoteValue) => void }) {
  const ownLabel = choices.find((choice) => choice.value === value)?.label;
  return (
    <article className={cn("rounded-[14px_14px_14px_5px] border bg-white p-3 shadow-card", candidate.conflicted ? "border-coral" : "border-border")} data-candidate-id={candidate.id}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{candidate.title}</h2>
          <p className="mt-1 text-[11px] text-ink/58">{candidate.summary}</p>
        </div>
        <strong className="shrink-0 text-[13px]">{formatPrice(candidate.pricePerPerson)}</strong>
      </div>
      {candidate.conflicted && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#a32e28]"><AlertTriangle aria-hidden="true" size={15} />Есть логистический конфликт</p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label={`Ваш ответ: ${candidate.title}`}>
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            aria-pressed={value === choice.value}
            onClick={() => onChange(choice.value)}
            className={cn(
              "min-h-10 rounded-[10px] border text-[12px] font-semibold transition",
              value === choice.value ? "border-primary bg-primary/10 text-primary-strong" : "border-border bg-white text-ink/65",
              choice.value === "veto" && value === choice.value && "border-coral bg-coral/10 text-[#a32e28]"
            )}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <p className="mt-2 min-h-4 text-[11px] text-primary-strong" aria-live="polite">{ownLabel ? `Ваш ответ: ${ownLabel}` : "Выберите ответ"}</p>
    </article>
  );
}

export function VoteScreen({ preset }: { preset: VotePreset }) {
  const [responses, setResponses] = useState<Partial<Record<string, VoteValue>>>(preset.initialResponses);
  const requiredCandidateIds = preset.candidates.filter((candidate) => !candidate.conflicted).map(({ id }) => id);
  const canFinish = requiredCandidateIds.length > 0 && requiredCandidateIds.every((id) => responses[id] !== undefined);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]" data-preset-id={preset.id}>
      <header className="flex min-h-[74px] items-center gap-2.5 border-b border-border bg-white px-4 py-3">
        <Link href="/calendar" aria-label="Назад к календарю" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-page"><ArrowLeft aria-hidden="true" size={20} /></Link>
        <div><h1 className="text-[17px] font-semibold">{preset.gapLabel}</h1><p className="mt-0.5 text-[12px] text-ink/58">{preset.deadlineLabel}</p></div>
      </header>

      <div className="flex-1 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-accent/35 px-3 text-[12px] font-semibold"><Vote aria-hidden="true" size={15} />Голосование · {preset.responseProgress}</span>
          <span className="text-[11px] text-ink/58">{preset.remainingLabel}</span>
        </div>

        <div className="mt-3 flex items-center">
          <div className="flex -space-x-[5px]">
            {preset.participants.map((participant) => (
              <span key={participant.id} title={participant.name} className={cn("grid h-8 w-8 place-items-center rounded-full border-2 border-page text-[11px] font-semibold", participant.tone === "purple" && "bg-primary text-white", participant.tone === "cyan" && "bg-cyan", participant.tone === "lime" && "bg-lime")}>{participant.initial}</span>
            ))}
          </div>
          <div className="ml-3 text-[11px] leading-4"><strong className="block">{preset.waitingParticipantName} ещё не ответил</strong><span className="inline-flex items-center gap-1 text-ink/55"><LockKeyhole aria-hidden="true" size={12} />Бюджеты участников скрыты</span></div>
        </div>

        <div className="mt-3 grid gap-2.5">
          {preset.candidates.map((candidate) => (
            <VoteCard key={candidate.id} candidate={candidate} value={responses[candidate.id]} onChange={(value) => setResponses((current) => ({ ...current, [candidate.id]: value }))} />
          ))}
          {preset.candidates.length === 0 && (
            <div className="rounded-[14px] border border-dashed border-border bg-white p-6 text-center">
              <p className="text-sm font-semibold">Выбранные варианты ещё не синхронизированы</p>
              <p className="mt-1 text-[12px] text-ink/60">Вернитесь к подбору или дождитесь проверки пользовательского варианта.</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <Link href="/calendar/gaps/demo-gap/ideas" className="inline-flex min-h-10 items-center gap-1 text-[12px] font-semibold text-primary-strong"><Plus aria-hidden="true" size={16} />Добавить вариант</Link>
          {canFinish ? (
            <Link href="/winners/innopolis" className="inline-flex min-h-11 items-center rounded-[12px_12px_12px_5px] bg-primary px-5 text-sm font-semibold text-white">Завершить</Link>
          ) : (
            <button type="button" disabled className="min-h-11 rounded-[12px] bg-primary px-5 text-sm font-semibold text-white opacity-45">Завершить</button>
          )}
        </div>
      </div>
    </main>
  );
}
