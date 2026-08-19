"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, RefreshCw, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { PollCandidateSnapshot, PollSnapshot } from "@/lib/polls";
import { createClientRequestId } from "@/lib/client-request-id";
import { useCurrentParticipantId } from "@/lib/use-current-participant";
import { cn } from "@/lib/utils";

const statusLabel: Record<PollCandidateSnapshot["bookingStatus"], string> = {
  idle: "Нужно перепроверить",
  available: "Цена и места подтверждены",
  price_changed: "Цена изменилась",
  sold_out: "Мест больше нет",
  booking_failed: "Проверка не удалась",
  confirmed: "Бронирование подтверждено"
};

export function WinnerBookingScreen({ initialPoll, participantIds }: { initialPoll: PollSnapshot; participantIds: string[] }) {
  const [poll, setPoll] = useState(initialPoll);
  const participantId = useCurrentParticipantId(participantIds, undefined, false);
  const [pending, setPending] = useState<"recheck" | "confirm" | null>(null);
  const winner = useMemo(
    () => poll.candidates.find((candidate) => candidate.id === poll.winnerCandidateId) ?? null,
    [poll]
  );

  async function recheck() {
    if (!participantId) return;
    setPending("recheck");
    try {
      const response = await fetch(`/api/polls/${poll.id}/recheck`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participantId, mode: "auto", idempotencyKey: createClientRequestId() })
      });
      if (!response.ok) return;
      const payload = await response.json() as { poll: PollSnapshot };
      setPoll(payload.poll);
    } finally {
      setPending(null);
    }
  }

  async function confirmBooking() {
    if (!participantId || !winner?.bookingUrl) return;
    setPending("confirm");
    try {
      const response = await fetch(`/api/polls/${poll.id}/confirm-booking`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          participantId,
          idempotencyKey: createClientRequestId()
        })
      });
      if (!response.ok) return;
      const payload = await response.json() as { poll: PollSnapshot };
      setPoll(payload.poll);
    } finally {
      setPending(null);
    }
  }

  if (!winner) {
    return (
      <main className="mx-auto grid min-h-dvh w-full max-w-[430px] place-content-center bg-page px-5 text-center text-ink">
        <p className="text-sm font-semibold">Победитель ещё не выбран</p>
        <Link href={`/polls/${poll.id}`} className="mt-3 text-sm font-semibold text-primary">Открыть голосование</Link>
      </main>
    );
  }

  const canOpenBooking = winner.bookingUrl && !["sold_out", "booking_failed"].includes(winner.bookingStatus);
  const canConfirmBooking = Boolean(winner.bookingUrl) && ["available", "price_changed"].includes(winner.bookingStatus);
  const price = winner.recheckedPricePerPerson ?? winner.pricePerPerson;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]" data-preset-id="winner.rechecked" data-recheck-status={winner.bookingStatus}>
      <header className="bg-ink px-5 pb-5 pt-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-white/62">Победитель</p>
          <Link
            href="/calendar"
            aria-label="Закрыть победителя"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15"
          >
            <X aria-hidden="true" size={20} />
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-bold">{winner.title}</h1>
        <p className="mt-2 text-sm text-white/65">{poll.title}</p>
      </header>

      <section className="space-y-3 px-5 py-5">
        <article
          className={cn(
            "rounded-[8px] border border-border bg-white p-4 shadow-card",
            winner.bookingStatus === "confirmed" && "border-success/40 bg-success/8",
            ["sold_out", "booking_failed"].includes(winner.bookingStatus) && "border-coral/45 bg-coral/8",
            winner.bookingStatus === "price_changed" && "border-primary/45 bg-primary/8"
          )}
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" size={21} className={winner.bookingStatus === "confirmed" ? "text-success" : "text-primary"} />
            <div className="min-w-0">
              <h2 className="text-base font-bold">{statusLabel[winner.bookingStatus]}</h2>
              <p className="mt-1 text-sm text-ink/62">
                {price !== null ? `${price.toLocaleString("ru-RU")} ₽/чел.` : "Цена не подтверждена"}
                {winner.availableSeats !== null ? ` · мест: ${winner.availableSeats}` : ""}
              </p>
              {winner.lastCheckedAt && (
                <p className="mt-1 text-xs text-ink/50">Проверено {new Date(winner.lastCheckedAt).toLocaleString("ru-RU")}</p>
              )}
              {winner.bookingFailureReason && (
                <p className="mt-2 text-sm text-[#9b302b]">{winner.bookingFailureReason}</p>
              )}
            </div>
          </div>
        </article>

        <div className="grid gap-3">
          <button
            type="button"
            disabled={!participantId || pending !== null}
            onClick={recheck}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-white text-sm font-semibold disabled:opacity-55"
          >
            <RefreshCw aria-hidden="true" size={17} className={cn(pending === "recheck" && "animate-spin")} />
            Перепроверить цену и места
          </button>
          {canOpenBooking && (
            <a
              href={winner.bookingUrl!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-primary text-sm font-semibold text-white"
            >
              <ExternalLink aria-hidden="true" size={17} />
              Перейти на Туту
            </a>
          )}
          <button
            type="button"
            disabled={!participantId || !canConfirmBooking || pending !== null}
            onClick={confirmBooking}
            className="h-11 rounded-[8px] bg-accent text-sm font-semibold text-ink disabled:opacity-55"
          >
            Уже купили - подтвердить
          </button>
          <Link href="/calendar" className="inline-flex h-11 items-center justify-center rounded-[8px] border border-border bg-white text-sm font-semibold">
            Открыть календарь
          </Link>
        </div>
      </section>
    </main>
  );
}
