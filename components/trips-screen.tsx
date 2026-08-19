"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  Plus,
  UserPlus,
  Users,
  X
} from "lucide-react";

import {
  createTripAction,
  joinTripAction,
  type TripActionState
} from "@/app/trips/actions";
import { PARTICIPANT_STORAGE_KEY, TRIP_STORAGE_KEY } from "@/lib/trips/constants";
import { cn } from "@/lib/utils";

export type TripsViewModel = {
  id: string;
  title: string;
  dateLabel: string;
  inviteCode: string;
  ownerId: string;
  participants: Array<{
    id: string;
    displayName: string;
    role: "owner" | "member";
  }>;
  archivedTrips: Array<{
    id: string;
    title: string;
    dateLabel: string;
  }>;
};

const initialTripActionState: TripActionState = { status: "idle" };

function ActionMessage({ state }: { state: TripActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[8px] px-3 py-2 text-xs font-semibold",
        state.status === "error" ? "bg-coral/12 text-[#9b302b]" : "bg-success/10 text-success"
      )}
    >
      {state.message}
    </p>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function JoinForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(joinTripAction, initialTripActionState);

  useEffect(() => {
    if (state.status !== "success" || !state.tripId || !state.participantId) return;
    window.localStorage.setItem(TRIP_STORAGE_KEY, state.tripId);
    window.localStorage.setItem(PARTICIPANT_STORAGE_KEY, state.participantId);
    router.push("/calendar");
  }, [router, state]);

  return (
    <form action={action} className="grid gap-2.5">
      <label className="grid gap-1.5 text-xs font-semibold text-ink/65">
        Имя
        <input
          name="displayName"
          required
          maxLength={80}
          placeholder="Как вас называть"
          className="h-11 rounded-[8px] border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary"
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-ink/65">
        Ссылка или код
        <input
          name="inviteCode"
          required
          maxLength={32}
          placeholder="Например, KAZAN2026"
          className="h-11 rounded-[8px] border border-border bg-white px-3 text-sm uppercase text-ink outline-none focus:border-primary"
        />
      </label>
      <SubmitButton>{pending ? "Вступаем…" : compact ? "Вступить" : "Вступить в поездку"}</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

function CreateTripForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createTripAction, initialTripActionState);

  useEffect(() => {
    if (state.status !== "success" || !state.tripId || !state.participantId) return;
    window.localStorage.setItem(TRIP_STORAGE_KEY, state.tripId);
    window.localStorage.setItem(PARTICIPANT_STORAGE_KEY, state.participantId);
    router.push("/calendar");
  }, [router, state]);

  return (
    <section className="border-b border-white/15 bg-ink px-5 pb-5 text-white">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Новая поездка</h2>
        <button type="button" onClick={onClose} aria-label="Закрыть форму" className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
          <X aria-hidden="true" size={17} />
        </button>
      </div>
      <form action={action} className="grid grid-cols-2 gap-2.5">
        <input name="title" required placeholder="Название" className="col-span-2 h-11 rounded-[8px] bg-white px-3 text-sm text-ink outline-none" />
        <input name="displayName" required placeholder="Ваше имя" className="col-span-2 h-11 rounded-[8px] bg-white px-3 text-sm text-ink outline-none" />
        <label className="grid gap-1 text-[11px] text-white/70">Начало<input name="startsAt" type="date" required className="h-11 rounded-[8px] bg-white px-2 text-sm text-ink" /></label>
        <label className="grid gap-1 text-[11px] text-white/70">Окончание<input name="endsAt" type="date" required className="h-11 rounded-[8px] bg-white px-2 text-sm text-ink" /></label>
        <input type="hidden" name="timezone" value="Europe/Moscow" />
        <button type="submit" disabled={pending} className="col-span-2 mt-1 h-11 rounded-[8px] bg-accent text-sm font-semibold text-ink disabled:opacity-60">
          {pending ? "Создаём…" : "Создать"}
        </button>
        <div className="col-span-2"><ActionMessage state={state} /></div>
      </form>
    </section>
  );
}

export function TripsScreen({ trip }: { trip: TripsViewModel }) {
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState(false);
  const currentParticipant = trip.participants.find(({ id }) => id === trip.ownerId) ?? trip.participants[0];

  async function copyInviteCode() {
    await navigator.clipboard.writeText(trip.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]">
      <header className="bg-ink px-5 pb-5 pt-6 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold">
            {currentParticipant?.displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{currentParticipant?.displayName}</h1>
            <p className="mt-0.5 text-sm text-white/65">Текущая поездка · {trip.participants.length} попутчика</p>
          </div>
          <Link href="/calendar" aria-label="Закрыть профиль" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
            <X aria-hidden="true" size={21} />
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="mt-5 inline-flex h-12 w-full items-center gap-3 rounded-[8px] bg-white/12 px-4 text-sm font-semibold"
        >
          <Plus aria-hidden="true" size={19} />
          Создать поездку
        </button>
      </header>

      {showCreate && <CreateTripForm onClose={() => setShowCreate(false)} />}

      <div className="space-y-5 px-5 py-5">
        <section>
          <h2 className="mb-3 text-base font-semibold">Текущая поездка</h2>
          <div className="rounded-[8px] border border-border bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px_8px_8px_3px] bg-[linear-gradient(135deg,#6f5df6_0_55%,#d1ff1a_55%)] text-lg font-semibold text-white">
                {trip.title.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{trip.title}</h3>
                <p className="mt-0.5 text-xs text-ink/58">{trip.dateLabel} · {trip.participants.length} участника</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <CheckCircle2 aria-hidden="true" size={15} /> План синхронизирован
                </p>
              </div>
              <Link href="/calendar" className="rounded-[8px] bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">Открыть</Link>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="font-mono text-sm font-semibold tracking-[0.08em]">{trip.inviteCode}</span>
              <button type="button" onClick={copyInviteCode} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
                {copied ? "Скопировано" : "Копировать код"}
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Вступить по ссылке или коду</h2>
            <UserPlus aria-hidden="true" size={18} className="text-primary" />
          </div>
          <div className="rounded-[8px] border border-border bg-white p-4"><JoinForm compact /></div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Архив</h2>
            <span className="text-xs font-semibold text-primary">{trip.archivedTrips.length} поездки</span>
          </div>
          <div className="divide-y divide-border rounded-[8px] border border-border bg-white px-4 shadow-card">
            {trip.archivedTrips.length > 0 ? trip.archivedTrips.map((archivedTrip) => (
              <div key={archivedTrip.id} className="flex min-h-14 items-center justify-between gap-3 py-3">
                <span className="truncate text-sm font-semibold">{archivedTrip.title}</span>
                <span className="shrink-0 text-xs text-ink/50">{archivedTrip.dateLabel}</span>
              </div>
            )) : (
              <p className="py-5 text-center text-sm text-ink/50">Архив пока пуст</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export function JoinTripScreen() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-page text-ink shadow-shell sm:my-6 sm:min-h-[760px] sm:rounded-[28px]">
      <header className="bg-ink px-5 pb-6 pt-6 text-white">
        <Link href="/trips" className="inline-flex items-center gap-2 text-sm text-white/70"><X aria-hidden="true" size={18} /> Назад</Link>
        <span className="mt-8 grid h-12 w-12 place-items-center rounded-[8px] bg-primary"><UserPlus aria-hidden="true" size={22} /></span>
        <h1 className="mt-4 text-2xl font-semibold">Вступить в поездку</h1>
        <p className="mt-2 text-sm leading-5 text-white/65">Введите имя и код, которым поделился организатор.</p>
      </header>
      <section className="m-5 rounded-[8px] border border-border bg-white p-4 shadow-card"><JoinForm /></section>
      <div className="mx-5 mt-auto mb-5 flex items-center gap-2 rounded-[8px] bg-primary/8 p-3 text-xs text-ink/65">
        <Clipboard aria-hidden="true" size={17} className="text-primary" /> Демо-код: <strong className="font-mono text-ink">KAZAN2026</strong>
      </div>
    </main>
  );
}

export function TripsEmptyState() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[430px] place-content-center gap-4 bg-page px-6 text-center text-ink">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><Users aria-hidden="true" /></span>
      <div><h1 className="text-xl font-semibold">Поездок пока нет</h1><p className="mt-1 text-sm text-ink/60">Создайте поездку или вступите по приглашению.</p></div>
      <Link href="/trips/join" className="inline-flex h-11 items-center justify-center rounded-[8px] bg-primary px-4 text-sm font-semibold text-white">Вступить по коду</Link>
    </main>
  );
}
