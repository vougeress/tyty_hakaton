"use client";

import { AlertTriangle, Clock3, Plus, RotateCw, Trophy, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { PollSnapshot, VoteValue } from "@/lib/polls";
import { useCurrentParticipantId } from "@/lib/use-current-participant";
import { cn } from "@/lib/utils";

const choices: Array<{ value: VoteValue; label: string }> = [
  { value: "yes", label: "За" },
  { value: "maybe", label: "Можно" },
  { value: "veto", label: "Не могу" }
];

function choiceTone(value: VoteValue, selected: boolean) {
  if (!selected) return "border-border bg-muted text-ink";
  if (value === "yes") return "border-success bg-success/10 text-success";
  if (value === "veto") return "border-coral bg-coral/10 text-[#9b302b]";
  return "border-primary bg-primary/10 text-primary";
}

export function VoteScreen({ initialPoll, participantIds, ownerId }: { initialPoll: PollSnapshot; participantIds: string[]; ownerId: string }) {
  const router = useRouter();
  const [poll, setPoll] = useState(initialPoll);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const participantId = useCurrentParticipantId(participantIds, undefined, false);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refreshPoll = async () => {
      try {
        const response = await fetch(`/api/trips/${poll.tripId}/votes?updatedSince=${encodeURIComponent(poll.updatedAt)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) throw new Error("refresh_failed");
        const payload = await response.json() as { polls?: PollSnapshot[] };
        const updated = payload.polls?.find(({ id }) => id === poll.id);
        if (updated) {
          setPoll((current) => updated.version > current.version ? updated : current);
          setErrorMessage(null);
        }
      } catch {
        if (controller.signal.aborted) return;
        setErrorMessage("Не удалось обновить результаты. Показываем последние данные.");
      }
    };
    const interval = window.setInterval(() => void refreshPoll(), 2000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [poll.id, poll.tripId, poll.updatedAt]);

  const myResponses = useMemo(() => {
    const map = new Map<string, VoteValue>();
    if (!participantId) return map;
    for (const candidate of poll.candidates) {
      const response = candidate.responses.find((item) => item.participantId === participantId);
      if (response) map.set(candidate.id, response.value);
    }
    return map;
  }, [participantId, poll.candidates]);
  const winner = poll.candidates.find((candidate) => candidate.id === poll.winnerCandidateId);
  const displayNow = now ?? new Date(initialPoll.updatedAt).getTime();
  const remainingSeconds = Math.max(0, Math.ceil((new Date(poll.closesAt).getTime() - displayNow) / 1000));
  const countdownLabel = formatCountdown(remainingSeconds);
  const acceptsResponses = poll.status === "active" && remainingSeconds > 0;
  const canManagePoll = participantId === ownerId;
  const canClosePoll = canManagePoll && poll.status === "active";

  async function submitVote(candidateId: string, value: VoteValue) {
    if (!participantId || !acceptsResponses) return;
    const idempotencyKey = crypto.randomUUID();
    setPendingKey(`${candidateId}:${value}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`/api/polls/${poll.id}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateId, participantId, value, idempotencyKey })
      });
      if (!response.ok) throw new Error("vote_failed");
      const payload = await response.json() as { poll: PollSnapshot };
      setPoll(payload.poll);
      setSuccessMessage("Ответ сохранён — его можно изменить до завершения голосования.");
    } catch {
      setErrorMessage("Не удалось сохранить ответ. Попробуйте ещё раз.");
    } finally {
      setPendingKey(null);
    }
  }

  async function closePoll() {
    if (!participantId || poll.status === "closed") return;
    setPendingKey("close");
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/polls/${poll.id}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participantId, idempotencyKey: crypto.randomUUID() })
      });
      if (!response.ok) throw new Error("close_failed");
      const payload = await response.json() as { poll: PollSnapshot };
      setPoll(payload.poll);
    } catch {
      setErrorMessage("Не удалось подвести итог. Попробуйте ещё раз.");
    } finally {
      setPendingKey(null);
    }
  }

  async function addCustomCandidate(formData: FormData) {
    if (!participantId || !acceptsResponses) return;
    setPendingKey("custom");
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/polls/${poll.id}/candidates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          participantId,
          idempotencyKey: crypto.randomUUID(),
          candidate: {
            title: String(formData.get("title") ?? ""),
            description: String(formData.get("description") ?? ""),
            pricePerPerson: String(formData.get("pricePerPerson") ?? "") || undefined,
            source: "user_link"
          }
        })
      });
      if (!response.ok) throw new Error("candidate_failed");
      const payload = await response.json() as { poll: PollSnapshot };
      setPoll(payload.poll);
      setShowCustomForm(false);
      setSuccessMessage("Вариант добавлен в голосование.");
    } catch {
      setErrorMessage("Не удалось добавить вариант. Проверьте поля и повторите.");
    } finally {
      setPendingKey(null);
    }
  }

  async function startShortRevote() {
    if (!participantId || !canManagePoll || poll.finalistCandidateIds.length === 0) return;
    setPendingKey("revote");
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/polls/${poll.id}/revote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participantId })
      });
      if (!response.ok) throw new Error("revote_failed");
      const payload = await response.json() as { poll: PollSnapshot };
      router.push(`/polls/${payload.poll.id}`);
    } catch {
      setErrorMessage("Не удалось запустить короткое переголосование.");
      setPendingKey(null);
    }
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]" data-preset-id="vote.active">
      <header className="bg-ink px-5 pb-5 pt-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-white/62">Голосование</p>
          <Link
            href="/calendar"
            aria-label="Закрыть голосование"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15"
          >
            <X aria-hidden="true" size={20} />
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-bold">{poll.title}</h1>
        <div className="mt-3 flex items-center justify-between text-xs text-white/65">
          <span>{poll.respondedParticipantCount} из {poll.participantCount} ответили</span>
          <span className="inline-flex items-center gap-1" aria-label={poll.status === "closed" ? "Голосование завершено" : `До завершения ${countdownLabel}`}>
            <Clock3 aria-hidden="true" size={14} /> {poll.status === "closed" ? "Завершено" : countdownLabel}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Ответили участники"
          aria-valuemin={0}
          aria-valuemax={poll.participantCount}
          aria-valuenow={poll.respondedParticipantCount}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"
        >
          <span
            className="block h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${poll.participantCount === 0 ? 0 : (poll.respondedParticipantCount / poll.participantCount) * 100}%` }}
          />
        </div>
      </header>

      <section className="space-y-3 px-5 py-5">
        {!participantId && (
          <p role="alert" className="flex gap-2 rounded-[8px] border border-coral/35 bg-coral/10 p-3 text-xs font-semibold text-[#9b302b]">
            <AlertTriangle aria-hidden="true" size={17} /> Выберите участника этой поездки, чтобы голосовать.
          </p>
        )}
        {errorMessage && <p role="alert" className="rounded-[8px] border border-coral/35 bg-coral/10 p-3 text-xs font-semibold text-[#9b302b]">{errorMessage}</p>}
        {successMessage && <p role="status" className="rounded-[8px] bg-success/10 p-3 text-xs font-semibold text-success">{successMessage}</p>}
        {poll.status === "active" && remainingSeconds === 0 && (
          <p role="status" className="rounded-[8px] border border-primary/25 bg-primary/10 p-3 text-xs font-semibold text-primary">Время вышло. Подведите итог голосования.</p>
        )}
        {poll.status === "closed" && (
          <div className="rounded-[8px] border border-border bg-white p-4 shadow-card">
            {poll.winnerCandidateId ? (
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                  <Trophy aria-hidden="true" size={17} /> Победитель: {winner?.title ?? "выбран"}
                </p>
                <Link href={`/winners/${poll.winnerCandidateId}`} className="inline-flex h-10 items-center justify-center rounded-[8px] bg-primary px-4 text-sm font-semibold text-white">
                  Открыть победителя
                </Link>
                <Link href={`/winners/${poll.winnerCandidateId}`} className="ml-2 inline-flex h-10 items-center justify-center rounded-[8px] border border-border bg-white px-4 text-sm font-semibold text-ink">
                  Оформление
                </Link>
              </div>
            ) : poll.finalistCandidateIds.length > 0 ? (
              <div className="grid gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  <RotateCw aria-hidden="true" size={17} /> Ничья — нужен финальный выбор
                </p>
                <button type="button" onClick={startShortRevote} disabled={!canManagePoll || pendingKey !== null} className="h-10 rounded-[8px] bg-primary px-4 text-sm font-semibold text-white disabled:opacity-55">
                  {pendingKey === "revote" ? "Запускаем…" : "Переголосовать 5 минут"}
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#9b302b]">
                  <XCircle aria-hidden="true" size={17} /> Все варианты получили вето
                </p>
                <p className="text-xs text-ink/58">Нужно найти новые варианты — голоса на них автоматически не переносятся.</p>
                <Link href="/calendar" className="inline-flex h-10 items-center justify-center rounded-[8px] border border-border bg-white px-4 text-sm font-semibold text-primary">
                  Вернуться к плану
                </Link>
              </div>
            )}
          </div>
        )}

        {poll.candidates.map((candidate) => {
          const selected = myResponses.get(candidate.id);
          const blocked = candidate.tally.veto > 0;
          const isWinner = poll.winnerCandidateId === candidate.id;
          const isFinalist = poll.finalistCandidateIds.includes(candidate.id);

          return (
            <article
              key={candidate.id}
              className={cn(
                "rounded-[8px] border border-border bg-white p-4 shadow-card",
                isWinner && "border-success/45 bg-success/8",
                isFinalist && "border-primary/45 bg-primary/8",
                blocked && "border-coral/45"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold">{candidate.title}</h2>
                  {candidate.description && <p className="mt-1 text-sm text-ink/62">{candidate.description}</p>}
                  {candidate.pricePerPerson !== null && (
                    <p className="mt-1 text-xs font-semibold text-ink/58">{candidate.pricePerPerson.toLocaleString("ru-RU")} ₽/чел.</p>
                  )}
                </div>
                {blocked && <XCircle aria-hidden="true" size={19} className="shrink-0 text-coral" />}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {choices.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    disabled={!participantId || !acceptsResponses || pendingKey !== null}
                    onClick={() => submitVote(candidate.id, choice.value)}
                    aria-pressed={selected === choice.value}
                    className={cn(
                      "h-10 rounded-[8px] border text-xs font-bold disabled:opacity-55",
                      choiceTone(choice.value, selected === choice.value)
                    )}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-ink/58">
                <span>За {candidate.tally.yes}</span>
                <span>Можно {candidate.tally.maybe}</span>
                <span>Не могут {candidate.tally.veto}</span>
              </div>
            </article>
          );
        })}

        {showCustomForm && (
          <form action={addCustomCandidate} className="grid gap-2 rounded-[8px] border border-border bg-white p-4 shadow-card">
            <input name="title" required maxLength={120} placeholder="Свой вариант" className="h-11 rounded-[8px] border border-border px-3 text-sm outline-none focus:border-primary" />
            <input name="description" maxLength={320} placeholder="Короткое описание" className="h-11 rounded-[8px] border border-border px-3 text-sm outline-none focus:border-primary" />
            <input name="pricePerPerson" inputMode="numeric" placeholder="Цена на человека" className="h-11 rounded-[8px] border border-border px-3 text-sm outline-none focus:border-primary" />
            <button type="submit" disabled={!acceptsResponses || pendingKey !== null} className="h-11 rounded-[8px] bg-primary text-sm font-semibold text-white disabled:opacity-55">
              Добавить
            </button>
          </form>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!acceptsResponses}
            onClick={() => setShowCustomForm((value) => !value)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-white text-sm font-semibold disabled:opacity-55"
          >
            <Plus aria-hidden="true" size={17} /> Добавить свой
          </button>
          <button
            type="button"
            disabled={!canClosePoll || pendingKey !== null}
            onClick={closePoll}
            className="h-11 rounded-[8px] bg-primary text-sm font-semibold text-white disabled:opacity-55"
          >
            {poll.status === "closed" ? "Завершено" : pendingKey === "close" ? "Подводим итог…" : remainingSeconds === 0 ? "Подвести итог" : "Завершить раньше"}
          </button>
        </div>
        {poll.status === "active" && participantId && participantId !== ownerId && (
          <p className="text-center text-[11px] text-ink/55">Подвести итог может организатор поездки.</p>
        )}
      </section>
    </main>
  );
}

function formatCountdown(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;
  if (days > 0) return `${days} д ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
