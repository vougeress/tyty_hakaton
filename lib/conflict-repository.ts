export type ConflictTimelineItemKind = "departure" | "activity" | "return" | "required-event";

export type ConflictTimelineItem = {
  id: string;
  kind: ConflictTimelineItemKind;
  timeLabel: string;
  title: string;
  meta: string;
};

export type ScheduleConflict = {
  id: string;
  context?: "poll" | "calendar";
  presetId: "conflict.schedule_changed";
  logisticsStatus: "blocking";
  checkedAtLabel: string;
  timezone: string;
  candidate: {
    id: string;
    title: string;
  };
  reason: {
    code: "RETURN_BUFFER_TOO_SMALL" | "EVENTS_OVERLAP";
    summary: string;
  };
  returnAt: string;
  nextRequiredEventAt: string;
  actualBufferMinutes: number;
  requiredBufferMinutes: number;
  relatedEvents: ConflictTimelineItem[];
  votesNotice: string;
  links: {
    calendar: string;
    poll: string;
    alternatives: string;
    adjustTime: string;
  };
};

export interface ConflictRepository {
  getConflict(conflictId: string): Promise<ScheduleConflict | null>;
}

const scheduleChangedFixture: ScheduleConflict = {
  id: "schedule-shift",
  presetId: "conflict.schedule_changed",
  logisticsStatus: "blocking",
  checkedAtLabel: "Проверено только что",
  timezone: "Europe/Moscow",
  candidate: {
    id: "sviyazhsk",
    title: "Свияжск"
  },
  reason: {
    code: "RETURN_BUFFER_TOO_SMALL",
    summary: "Расписание изменилось: возвращение в 19:10, ужин на Баумана начинается в 19:30."
  },
  returnAt: "2026-09-12T19:10:00+03:00",
  nextRequiredEventAt: "2026-09-12T19:30:00+03:00",
  actualBufferMinutes: 20,
  requiredBufferMinutes: 45,
  relatedEvents: [
    { id: "leave-kazan", kind: "departure", timeLabel: "13:10", title: "выезд из Казани", meta: "0 мин" },
    { id: "sviyazhsk-visit", kind: "activity", timeLabel: "15:00–17:20", title: "Свияжск", meta: "2 ч 20" },
    { id: "return-kazan", kind: "return", timeLabel: "19:10", title: "возврат в Казань", meta: "+40 мин" },
    { id: "dinner", kind: "required-event", timeLabel: "19:30", title: "ужин на Баумана", meta: "не успеть" }
  ],
  votesNotice: "Ответы участников сохранены. Мы не удаляем голоса и не переносим их на другой вариант автоматически.",
  links: {
    calendar: "/calendar",
    poll: "/polls/demo-poll",
    alternatives: "/calendar/gaps/demo-gap/ideas",
    adjustTime: "/calendar/gaps/demo-gap/manual?conflictId=schedule-shift&candidateId=sviyazhsk"
  }
};

const fixtures = new Map([[scheduleChangedFixture.id, scheduleChangedFixture]]);

export const conflictFixtureIds = [...fixtures.keys()];

export const mockConflictRepository: ConflictRepository = {
  async getConflict(conflictId) {
    return fixtures.get(conflictId) ?? null;
  }
};
