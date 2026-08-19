"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  CalendarPlus,
  CheckCircle2,
  LockKeyhole,
  PartyPopper,
  RefreshCw,
  Search,
  TicketCheck
} from "lucide-react";
import type { WinnerCandidate } from "@/lib/winner-repository";
import {
  readManualCalendarItems,
  upsertManualCalendarItem
} from "@/lib/manual-calendar-storage";
import type { ManualCalendarItem } from "@/lib/manual-calendar-storage";
import { cn } from "@/lib/utils";

type WinnerScreenProps = {
  winner: WinnerCandidate;
  recheckedWinner: WinnerCandidate | null;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

function StatusStrip({ winner }: { winner: WinnerCandidate }) {
  if (winner.recheckStatus === "valid") {
    return (
      <div className="flex gap-2.5 rounded-[13px_13px_13px_5px] bg-[#e3f7ef] p-3 text-[12px] leading-[17px] text-[#116c57]">
        <RefreshCw aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        <span><strong>Проверено {winner.checkedAtLabel}.</strong> Цена не изменилась, доступно {winner.capacity} мест.</span>
      </div>
    );
  }

  if (winner.recheckStatus === "price_changed") {
    return (
      <div className="flex gap-2.5 rounded-[13px_13px_13px_5px] bg-[#fff1d8] p-3 text-[12px] leading-[17px] text-[#845300]">
        <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        <span><strong>Цена изменилась.</strong> Было {formatPrice(winner.previousPricePerPerson ?? winner.pricePerPerson)}, теперь {formatPrice(winner.pricePerPerson)} на человека. Места перепроверены.</span>
      </div>
    );
  }

  if (winner.recheckStatus === "capacity_unknown") {
    return (
      <div className="flex gap-2.5 rounded-[13px_13px_13px_5px] bg-[#fff1d8] p-3 text-[12px] leading-[17px] text-[#845300]">
        <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        <span><strong>Количество мест неизвестно.</strong> Цена актуальна, но наличие нужно подтвердить на Туту перед оформлением.</span>
      </div>
    );
  }

  if (winner.recheckStatus === "stale") {
    return (
      <div className="flex gap-2.5 rounded-[13px_13px_13px_5px] bg-[#fff1d8] p-3 text-[12px] leading-[17px] text-[#845300]">
        <RefreshCw aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        <span><strong>Проверка устарела.</strong> Данные получены {winner.checkedAtLabel}; обновите цену и места перед переходом.</span>
      </div>
    );
  }

  if (winner.recheckStatus === "insufficient_capacity") {
    return (
      <div className="flex gap-2.5 rounded-[13px_13px_13px_5px] border border-coral/50 bg-[#fff0ee] p-3 text-[12px] leading-[17px] text-[#9b302b]">
        <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        <span><strong>Мест недостаточно.</strong> Доступно {winner.capacity}, а едут {winner.participantCount}. Оформление и добавление в план заблокированы.</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 rounded-[13px_13px_13px_5px] border border-coral/50 bg-[#fff0ee] p-3 text-[12px] leading-[17px] text-[#9b302b]">
      <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
      <span><strong>Вариант больше недоступен.</strong> Свободных мест нет — оформление и добавление в план заблокированы.</span>
    </div>
  );
}

export function WinnerScreen({ winner: initialWinner, recheckedWinner }: WinnerScreenProps) {
  const [winner, setWinner] = useState(initialWinner);
  const [isChecking, setIsChecking] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const recheckFailed = winner.recheckStatus === "insufficient_capacity" || winner.recheckStatus === "sold_out";
  const canOpenTutu = Boolean(winner.deeplink) && winner.recheckStatus !== "stale" && !recheckFailed;
  const canPin = winner.recheckStatus !== "stale" && !recheckFailed;

  useEffect(() => {
    setIsPinned(readManualCalendarItems().some((item) => item.candidateId === winner.id));
  }, [winner.id]);

  function recheck() {
    if (!recheckedWinner || isChecking) return;
    setIsChecking(true);
    window.setTimeout(() => {
      setWinner(recheckedWinner);
      setIsChecking(false);
    }, 520);
  }

  function pinManually() {
    if (!canPin || isPinned) return;
    const storedItem: ManualCalendarItem = {
      id: `winner-${winner.id}`,
      candidateId: winner.id,
      tripId: "kazan-demo",
      title: winner.title,
      shortTitle: winner.title,
      startsAt: winner.calendarStartsAt,
      endsAt: winner.calendarEndsAt,
      type: "booking",
      status: "confirmed",
      participantIds: ["nikita", "anna", "maria", "ilya"],
      source: "tutu",
      secondaryLabel: winner.departure.time,
      href: `/winners/${winner.id}`,
      bookingConfirmed: true,
      addedManuallyAt: new Date().toISOString()
    };
    upsertManualCalendarItem(storedItem);
    setIsPinned(true);
  }

  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]"
      data-preset-id={winner.presetId}
      data-recheck-status={winner.recheckStatus}
    >
      <header className="flex min-h-[76px] items-center gap-3 border-b border-border bg-white px-4 py-3">
        <Link href={`/polls/${winner.pollId}`} aria-label="Вернуться к голосованию" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-page">
          <ArrowLeft aria-hidden="true" size={20} />
        </Link>
        <div>
          <h1 className="text-[16px] font-semibold leading-5">Голосование завершено</h1>
          <p className="mt-1 text-[11px] text-ink/58">
            {winner.recheckStatus === "valid" ? "Цена и места перепроверены" : "Проверьте актуальные условия"}
          </p>
        </div>
      </header>

      <section className="bg-accent px-4 py-5">
        <span className="grid h-12 w-12 place-items-center rounded-[13px_13px_13px_5px] bg-ink text-white">
          <PartyPopper aria-hidden="true" size={23} />
        </span>
        <h2 className="mt-3 text-[29px] font-semibold leading-[31px] tracking-[-0.02em]">Едем<br />в {winner.title}</h2>
        <p className="mt-2 text-[12px] text-[#53420b]">{winner.votesLabel} · {winner.fitLabel}</p>
      </section>

      <div className="space-y-3 px-4 py-4 pb-8">
        <div role="status" aria-live="polite" aria-atomic="true">
          <StatusStrip winner={winner} />
        </div>

        <section className="rounded-[17px_17px_17px_6px] bg-ink p-4 text-white shadow-card" aria-label="Маршрут победившего варианта">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3ffc4] px-2.5 py-1 font-semibold text-[#53420b]">
              <BusFront aria-hidden="true" size={14} />
              {winner.transportLabel}
            </span>
            <span className="text-white/65">{winner.dateLabel}</span>
          </div>

          <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div>
              <strong className="block text-[21px] leading-6">{winner.departure.time}</strong>
              <span className="text-[11px] text-white/65">{winner.departure.place}</span>
            </div>
            <div className="relative h-0.5 bg-accent">
              <span className="absolute -right-1 -top-[3px] h-2 w-2 rounded-full bg-accent" />
            </div>
            <div className="text-right">
              <strong className="block text-[21px] leading-6">{winner.arrival.time}</strong>
              <span className="text-[11px] text-white/65">{winner.arrival.place}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Fact label="На человека" value={formatPrice(winner.pricePerPerson)} changed={winner.recheckStatus === "price_changed"} />
            <Fact label="Доступно" value={winner.capacity === "unknown" ? "неизвестно" : winner.capacity === 0 ? "нет мест" : `${winner.capacity} мест`} />
            <Fact label="Запас" value={`${winner.returnBufferMinutes} мин`} />
          </div>
        </section>

        {winner.recheckStatus === "stale" && !recheckedWinner ? (
          <div className="rounded-[13px_13px_13px_5px] border border-border bg-white p-3 text-[12px] leading-[17px] text-ink/60">
            Автоматическая перепроверка этого реального варианта ещё не подключена. Оформление и подтверждение брони заблокированы, пока цена и места не проверены сервером.
          </div>
        ) : winner.recheckStatus === "stale" ? (
          <button
            type="button"
            onClick={recheck}
            disabled={isChecking || !recheckedWinner}
            aria-busy={isChecking}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px_13px_13px_5px] bg-primary px-4 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw aria-hidden="true" size={18} className={cn(isChecking && "animate-spin")} />
            {isChecking ? "Перепроверяем…" : "Перепроверить цену и места"}
          </button>
        ) : canOpenTutu ? (
          <a
            href={winner.deeplink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px_13px_13px_5px] bg-primary px-4 text-[13px] font-semibold text-white"
          >
            <TicketCheck aria-hidden="true" size={18} />
            {winner.recheckStatus === "capacity_unknown" ? "Проверить места на Туту" : "Перейти к оформлению в Туту"}
          </a>
        ) : (
          <div className="grid gap-2">
            <Link href="/calendar/gaps/demo-gap/ideas" className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px_13px_13px_5px] bg-primary px-4 text-[13px] font-semibold text-white">
              <Search aria-hidden="true" size={18} />
              Найти альтернативу
            </Link>
            <Link href={`/polls/${winner.pollId}?mode=short-revote`} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px_13px_13px_5px] border border-border bg-white px-4 text-[13px] font-semibold">
              Короткое переголосование
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={pinManually}
          disabled={!canPin || isPinned}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px_13px_13px_5px] border border-border bg-white px-4 text-[13px] font-semibold disabled:opacity-55"
        >
          {isPinned ? <CheckCircle2 aria-hidden="true" size={18} /> : <CalendarPlus aria-hidden="true" size={18} />}
          {isPinned ? "Покупка отмечена вручную" : "Уже купили — закрепить вручную"}
        </button>

        {isPinned && (
          <div role="status" className="rounded-[13px_13px_13px_5px] bg-[#e3f7ef] p-3 text-[12px] leading-[17px] text-[#116c57]">
            Бронь подтверждена вашим ручным действием и сохранена для календаря. Один переход в Туту сам по себе этого не делает. <Link href="/calendar" className="font-semibold underline">Открыть календарь</Link>
          </div>
        )}

        <div className="flex gap-2.5 px-1 pt-1 text-[11px] leading-[16px] text-ink/55">
          <LockKeyhole aria-hidden="true" size={17} className="shrink-0" />
          <p>Билеты каждого участника видны только ему. В общем событии остаются время и фактический статус брони.</p>
        </div>
      </div>
    </main>
  );
}

function Fact({ label, value, changed = false }: { label: string; value: string; changed?: boolean }) {
  return (
    <div className={cn("min-h-[60px] rounded-[10px_10px_10px_4px] bg-white/10 p-2", changed && "ring-1 ring-[#f4ca70]")}>
      <span className="block text-[10px] leading-3 text-white/65">{label}</span>
      <strong className="mt-1 block text-[12px] leading-4">{value}</strong>
    </div>
  );
}
