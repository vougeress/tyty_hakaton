"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlarmClock,
  AlertTriangle,
  ArrowLeft,
  CarTaxiFront,
  CheckCircle2,
  ChevronRight,
  Footprints,
  RefreshCw,
  Route,
  Sparkles
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  readAuditTransferDrafts,
  saveAuditTransferDrafts,
  type AuditIssue,
  type AuditRepositoryResult
} from "@/lib/audit-repository";
import { cn } from "@/lib/utils";

export function AuditScreen({ result }: { result: AuditRepositoryResult }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-page shadow-shell sm:my-6 sm:min-h-[760px] sm:overflow-hidden sm:rounded-[28px]">
      <AuditHeader />
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {result.status === "loading" && <AuditLoading />}
        {result.status === "empty" && <AuditEmpty checkedAt={result.checkedAt} />}
        {result.status === "error" && <AuditError message={result.message} />}
        {result.status === "ready" && <AuditReportView report={result.report} />}
      </div>
    </main>
  );
}

function AuditHeader() {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-4">
      <Link
        href="/calendar"
        aria-label="Вернуться в календарь"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ArrowLeft aria-hidden="true" size={20} />
      </Link>
      <div>
        <h1 className="text-lg font-bold leading-tight text-ink">Проверка поездки</h1>
        <p className="mt-1 text-sm text-ink/58">Ничего не меняем без вас</p>
      </div>
    </header>
  );
}

function AuditReportView({
  report
}: {
  report: Extract<AuditRepositoryResult, { status: "ready" }>["report"];
}) {
  const [transfersDrafted, setTransfersDrafted] = useState(false);

  useEffect(() => {
    const draftedIds = new Set(readAuditTransferDrafts(window.localStorage).map(({ id }) => id));
    setTransfersDrafted(report.suggestedTransfers.every(({ id }) => draftedIds.has(id)));
  }, [report.suggestedTransfers]);

  function draftTransfers() {
    saveAuditTransferDrafts(window.localStorage, report.suggestedTransfers, report.checkedAt);
    setTransfersDrafted(true);
  }

  return (
    <div
      className="space-y-4"
      data-preset-id={transfersDrafted ? "audit.transfers_drafted" : report.presetId}
    >
      <section className="rounded-[18px] bg-accent p-4" aria-label="Итог проверки">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-ink text-white">
            <Sparkles aria-hidden="true" size={23} />
          </span>
          <span className="min-w-0">
            <strong className="block text-base leading-5 text-ink">
              {report.checkedEventCount} событий и {report.checkedBookingCount} билета проверены
            </strong>
            <span className="mt-1 block text-sm text-ink/60">
              {report.conflictCount} конфликт · {report.suggestedTransfers.length} переезда можно добавить
            </span>
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3 text-xs text-ink/60">
          <span>Последняя проверка: {report.checkedAt}</span>
          <span className="rounded-full bg-surface/70 px-2 py-1 font-semibold text-ink">
            {report.issueCount} замечания
          </span>
        </div>
      </section>

      <section className="space-y-2" aria-label="Результаты проверки">
        {report.issues.map((issue) => (
          <AuditIssueRow key={issue.id} issue={issue} />
        ))}
      </section>

      <section className="rounded-[12px] border border-primary/20 bg-primary/5 p-3 text-sm leading-5 text-ink/65">
        Переезды будут сохранены как черновики. Мы не переставим события и не опубликуем изменения автоматически.
      </section>

      <Button
        type="button"
        className="w-full"
        disabled={transfersDrafted}
        onClick={draftTransfers}
      >
        {transfersDrafted ? <CheckCircle2 aria-hidden="true" size={18} /> : <Route aria-hidden="true" size={18} />}
        {transfersDrafted ? "Переезды добавлены" : `Добавить ${report.suggestedTransfers.length} переезда как черновики`}
      </Button>

      {transfersDrafted && (
        <div role="status" className="rounded-[12px] border border-success/20 bg-success/10 p-3 text-sm font-semibold text-success">
          Переезды добавлены как черновики. План не изменён.
        </div>
      )}
    </div>
  );
}

function AuditIssueRow({ issue }: { issue: AuditIssue }) {
  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
          issue.tone === "ready" && "bg-success/10 text-success",
          issue.tone === "suggestion" && "bg-primary/10 text-ink",
          issue.tone === "conflict" && "bg-coral/10 text-coral"
        )}
      >
        {issue.tone === "ready" && <CheckCircle2 aria-hidden="true" size={19} />}
        {issue.tone === "suggestion" && <SuggestionIcon issueId={issue.id} />}
        {issue.tone === "conflict" && <AlertTriangle aria-hidden="true" size={19} />}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm leading-5 text-ink">{issue.title}</strong>
        <span className="mt-0.5 block text-xs leading-4 text-ink/58">{issue.description}</span>
      </span>
      {issue.tone === "ready" ? (
        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{issue.meta}</span>
      ) : issue.tone === "conflict" ? (
        <ChevronRight aria-hidden="true" size={18} />
      ) : (
        <span className="shrink-0 text-xs font-semibold text-ink/55">{issue.meta}</span>
      )}
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 rounded-[12px] border bg-surface p-3 text-left shadow-card",
    issue.tone === "conflict" ? "border-coral/70" : "border-border"
  );

  if (issue.conflictId) {
    return (
      <Link href={`/conflicts/${issue.conflictId}`} className={className} aria-label={`${issue.title}. Открыть конфликт`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function SuggestionIcon({ issueId }: { issueId: string }) {
  if (issueId === "kremlin-lunch") {
    return <Footprints aria-hidden="true" size={19} />;
  }
  if (issueId === "hotel-station") {
    return <AlarmClock aria-hidden="true" size={19} />;
  }
  return <CarTaxiFront aria-hidden="true" size={19} />;
}

function AuditLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Проверяем поездку" data-preset-id="calendar.checking">
      <section className="overflow-hidden rounded-[18px] border border-primary/20 bg-primary/10 p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-[14px] bg-primary text-white">
            <Sparkles aria-hidden="true" size={23} />
          </span>
          <div>
            <strong className="block text-base">Проверяем поездку…</strong>
            <span className="mt-1 block text-sm text-ink/58">Сверяем события, билеты и время в пути</span>
          </div>
        </div>
      </section>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-[72px] animate-pulse rounded-[12px] border border-border bg-surface" />
      ))}
      <Button className="w-full" disabled aria-busy="true">
        <RefreshCw aria-hidden="true" size={18} />
        Проверяем…
      </Button>
    </div>
  );
}

function AuditEmpty({ checkedAt }: { checkedAt?: string }) {
  return (
    <section className="flex min-h-[500px] flex-col items-center justify-center text-center" data-state="empty">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 aria-hidden="true" size={30} />
      </span>
      <h2 className="mt-4 text-xl font-bold">Замечаний нет</h2>
      <p className="mt-2 max-w-[290px] text-sm leading-5 text-ink/58">
        Билеты, события и переезды согласованы. План остался без изменений.
      </p>
      {checkedAt && <p className="mt-3 text-xs text-ink/45">Последняя проверка: {checkedAt}</p>}
      <ButtonLink href="/calendar" className="mt-5">Вернуться в календарь</ButtonLink>
    </section>
  );
}

function AuditError({ message }: { message: string }) {
  return (
    <section className="flex min-h-[500px] flex-col items-center justify-center text-center" data-state="error">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 text-coral">
        <AlertTriangle aria-hidden="true" size={30} />
      </span>
      <h2 className="mt-4 text-xl font-bold">Проверка не завершена</h2>
      <p className="mt-2 max-w-[300px] text-sm leading-5 text-ink/58">{message}</p>
      <ButtonLink href="/audit" className="mt-5">
        <RefreshCw aria-hidden="true" size={18} />
        Повторить проверку
      </ButtonLink>
    </section>
  );
}
