export type AuditIssueTone = "ready" | "suggestion" | "conflict";

export type AuditIssue = {
  id: string;
  tone: AuditIssueTone;
  title: string;
  description: string;
  meta: string;
  conflictId?: string;
};

export type SuggestedTransfer = {
  id: string;
  title: string;
  description: string;
  meta: string;
};

export type DraftTransferRecord = SuggestedTransfer & {
  status: "draft";
  source: "audit.issues_found";
  auditCheckedAt: string;
  draftedAt: string;
};

export const AUDIT_TRANSFER_DRAFTS_STORAGE_KEY = "tutu-okno:audit-transfer-drafts";

type DraftStorage = Pick<Storage, "getItem" | "setItem">;

export type AuditReport = {
  presetId: "audit.issues_found";
  checkedAt: string;
  checkedEventCount: number;
  checkedBookingCount: number;
  issueCount: number;
  conflictCount: number;
  suggestedTransfers: SuggestedTransfer[];
  issues: AuditIssue[];
};

export type AuditRepositoryResult =
  | { status: "loading" }
  | { status: "empty"; checkedAt?: string }
  | { status: "error"; message: string }
  | { status: "ready"; report: AuditReport };

export type AuditDemoState = "issues" | "loading" | "empty" | "error";

export interface AuditRepository {
  getLatestReport(state?: AuditDemoState): Promise<AuditRepositoryResult>;
}

export function readAuditTransferDrafts(storage: DraftStorage): DraftTransferRecord[] {
  try {
    const stored = storage.getItem(AUDIT_TRANSFER_DRAFTS_STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (record): record is DraftTransferRecord =>
        typeof record === "object" &&
        record !== null &&
        "id" in record &&
        typeof record.id === "string" &&
        "status" in record &&
        record.status === "draft" &&
        "source" in record &&
        record.source === "audit.issues_found"
    );
  } catch {
    return [];
  }
}

export function saveAuditTransferDrafts(
  storage: DraftStorage,
  transfers: SuggestedTransfer[],
  auditCheckedAt: string,
  draftedAt = new Date().toISOString()
): DraftTransferRecord[] {
  const existing = readAuditTransferDrafts(storage);
  const incoming = transfers.map((transfer) => ({
    ...transfer,
    status: "draft" as const,
    source: "audit.issues_found" as const,
    auditCheckedAt,
    draftedAt
  }));
  const incomingIds = new Set(incoming.map(({ id }) => id));
  const records = [...existing.filter(({ id }) => !incomingIds.has(id)), ...incoming];

  storage.setItem(AUDIT_TRANSFER_DRAFTS_STORAGE_KEY, JSON.stringify(records));
  return records;
}

const suggestedTransfers: SuggestedTransfer[] = [
  {
    id: "station-hotel",
    title: "Вокзал → отель",
    description: "Добавить переезд 25 минут",
    meta: "10:05"
  },
  {
    id: "kremlin-lunch",
    title: "Кремль → обед",
    description: "14 минут пешком",
    meta: "13:00"
  },
  {
    id: "hotel-station",
    title: "Отель → вокзал",
    description: "Рекомендуем выйти в 14:30",
    meta: "45 мин"
  }
];

const issues: AuditIssue[] = [
  {
    id: "tickets-ok",
    tone: "ready",
    title: "Билеты в порядке · 2 из 2",
    description: "Время отправления не изменилось",
    meta: "Готово"
  },
  ...suggestedTransfers.map((transfer) => ({
    ...transfer,
    tone: "suggestion" as const
  })),
  {
    id: "sviyazhsk-dinner",
    tone: "conflict",
    title: "Свияжск конфликтует с ужином",
    description: "Возвращение позже допустимого буфера",
    meta: "Открыть",
    conflictId: "schedule-shift"
  }
];

const report: AuditReport = {
  presetId: "audit.issues_found",
  checkedAt: "сегодня, 16:24",
  checkedEventCount: 7,
  checkedBookingCount: 2,
  issueCount: 2,
  conflictCount: 1,
  suggestedTransfers,
  issues
};

export const mockAuditRepository: AuditRepository = {
  async getLatestReport(state = "issues") {
    if (state === "loading") {
      return { status: "loading" };
    }

    if (state === "empty") {
      return { status: "empty", checkedAt: "сегодня, 16:24" };
    }

    if (state === "error") {
      return {
        status: "error",
        message: "Не удалось проверить расписание и билеты. План остался без изменений."
      };
    }

    return { status: "ready", report };
  }
};

export function parseAuditDemoState(value: string | string[] | undefined): AuditDemoState {
  const state = Array.isArray(value) ? value[0] : value;

  if (state === "loading" || state === "empty" || state === "error") {
    return state;
  }

  return "issues";
}
