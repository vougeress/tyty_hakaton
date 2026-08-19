export type ManualParticipant = {
  id: string;
  displayName: string;
  initial: string;
  isCurrent: boolean;
};

export type ManualEventGap = {
  id: string;
  tripId: string;
  startsAt: string;
  endsAt: string;
  dateLabel: string;
  participantIds: string[];
  nextEventTitle: string;
  nextRequiredAt: string;
  bufferToNextEventMinutes: number;
};

export type ManualEventDraft = {
  gapId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  participantIds: string[];
  publicationMode: "direct" | "vote";
};

export type ManualBusyInterval = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  participantIds: string[];
};

export type ManualEventContext = {
  presetId: "create.gap_selected";
  timezone: string;
  utcOffset: string;
  currentParticipantId: string;
  participants: ManualParticipant[];
  busyIntervals: ManualBusyInterval[];
  gap: ManualEventGap;
  initialDraft: ManualEventDraft;
  logistics: {
    status: "unchecked" | "valid" | "warning" | "blocking";
    travelMinutes: number | null;
    returnBufferMinutes: number;
    message: string;
  };
};

export type ManualEventResult =
  | { kind: "calendar-item"; href: string; id: string; draft: ManualEventDraft }
  | { kind: "poll"; href: string; id: string; draft: ManualEventDraft };

export interface ManualEventRepository {
  getContext(gapId: string): Promise<ManualEventContext | null>;
  create(draft: ManualEventDraft): Promise<ManualEventResult>;
}

const contextFixture: ManualEventContext = {
  presetId: "create.gap_selected",
  timezone: "Europe/Moscow",
  utcOffset: "+03:00",
  currentParticipantId: "nikita",
  participants: [
    { id: "nikita", displayName: "Никита", initial: "Н", isCurrent: true },
    { id: "anna", displayName: "Аня", initial: "А", isCurrent: false },
    { id: "maria", displayName: "Маша", initial: "М", isCurrent: false },
    { id: "ilya", displayName: "Илья", initial: "И", isCurrent: false }
  ],
  busyIntervals: [],
  gap: {
    id: "demo-gap",
    tripId: "kazan-demo",
    startsAt: "2026-09-12T12:20:00+03:00",
    endsAt: "2026-09-12T18:10:00+03:00",
    dateLabel: "Сб, 12 сентября · 12:20–18:10",
    participantIds: ["nikita", "anna", "maria", "ilya"],
    nextEventTitle: "ужин",
    nextRequiredAt: "2026-09-12T19:30:00+03:00",
    bufferToNextEventMinutes: 80
  },
  initialDraft: {
    gapId: "demo-gap",
    title: "Речная прогулка по Волге",
    startsAt: "2026-09-12T15:00:00+03:00",
    endsAt: "2026-09-12T16:30:00+03:00",
    locationName: "Кремлёвская набережная",
    participantIds: ["nikita", "anna", "maria", "ilya"],
    publicationMode: "vote"
  },
  logistics: {
    status: "unchecked",
    travelMinutes: 25,
    returnBufferMinutes: 115,
    message: "Демо-проверка маршрута"
  }
};

export const manualPresetFixtures = {
  "manual.group_vote": {
    selectedParticipantIds: ["nikita", "anna", "maria", "ilya"],
    onlyMe: false,
    publicationMode: "vote" as const
  },
  "manual.group_direct": {
    selectedParticipantIds: ["nikita", "anna", "maria", "ilya"],
    onlyMe: false,
    publicationMode: "direct" as const
  },
  "manual.only_me": {
    selectedParticipantIds: ["nikita"],
    onlyMe: true,
    publicationMode: "direct" as const
  },
  "manual.no_participants": {
    selectedParticipantIds: [],
    onlyMe: false,
    publicationMode: "vote" as const
  }
};

export const mockManualEventRepository: ManualEventRepository = {
  async getContext(gapId) {
    return gapId === contextFixture.gap.id ? contextFixture : null;
  },
  async create(draft) {
    const id = `manual-${Date.now()}`;
    return draft.publicationMode === "vote"
      ? { kind: "poll", href: `/polls/demo-poll?draft=${id}`, id, draft }
      : { kind: "calendar-item", href: `/calendar?draft=${id}`, id, draft };
  }
};
