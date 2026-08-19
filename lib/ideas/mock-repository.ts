import type { IdeaCandidate, IdeasRepository } from "@/lib/ideas/contracts";

const candidates: IdeaCandidate[] = [
  {
    id: "innopolis_bus",
    gapId: "demo-gap",
    title: "Иннополис на автобусе",
    source: "tutu",
    startsAt: "2026-09-12T14:05:00+03:00",
    endsAt: "2026-09-12T17:32:00+03:00",
    travelMode: "bus",
    travelMinutes: 52,
    usefulMinutes: 120,
    pricePerPerson: 790,
    capacity: 4,
    returnBufferMinutes: 58,
    interest: "Технологии",
    deeplink: "https://www.tutu.ru/",
    recommendationReason: "Короткая дорога и подтверждённые места для всей группы",
    check: {
      status: "valid",
      reasons: [{ code: "buffer_ok", message: "Запас 58 минут до следующего обязательного события" }],
      checkedAt: "2026-09-12T12:01:00+03:00",
      inputsHash: "demo-innopolis-v1"
    }
  },
  {
    id: "chak_chak_museum",
    gapId: "demo-gap",
    title: "Музей чак-чака",
    source: "demo_catalog",
    startsAt: "2026-09-12T14:30:00+03:00",
    endsAt: "2026-09-12T16:00:00+03:00",
    travelMode: "walk",
    travelMinutes: 18,
    usefulMinutes: 90,
    pricePerPerson: 800,
    capacity: "unknown",
    returnBufferMinutes: 132,
    interest: "Еда",
    recommendationReason: "Подходит интересам группы и оставляет большой запас времени",
    check: {
      status: "warning",
      reasons: [{ code: "capacity_unknown", message: "Демо-каталог не подтверждает количество мест" }],
      checkedAt: "2026-09-12T12:01:00+03:00",
      inputsHash: "demo-museum-v1"
    }
  },
  {
    id: "sviyazhsk",
    gapId: "demo-gap",
    title: "Свияжск",
    source: "demo_catalog",
    startsAt: "2026-09-12T13:10:00+03:00",
    endsAt: "2026-09-12T19:10:00+03:00",
    travelMode: "mixed",
    travelMinutes: 95,
    usefulMinutes: 140,
    pricePerPerson: 2300,
    capacity: "unknown",
    returnBufferMinutes: 20,
    interest: "Культура",
    recommendationReason: "Интересен группе, но не проходит обязательную логистическую проверку",
    check: {
      status: "blocking",
      reasons: [{ code: "return_buffer_too_short", message: "Возвращение в 19:10 конфликтует с ужином в 19:30 и обязательным буфером 45 минут" }],
      checkedAt: "2026-09-12T12:01:00+03:00",
      inputsHash: "demo-sviyazhsk-v1"
    }
  }
];

export const mockIdeasRepository: IdeasRepository = {
  getPreset(gapId) {
    if (gapId !== "demo-gap") return null;

    return {
      id: "ideas.two_selected",
      tripId: "kazan-demo",
      gapId,
      dateLabel: "Сб, 12 сентября",
      timeLabel: "12:20–18:10",
      timezone: "Europe/Moscow",
      budgetPerPerson: 2500,
      filters: ["Без такси", "Культура", "Вода"],
      selectedCandidateIds: ["innopolis_bus", "chak_chak_museum"],
      candidates
    };
  }
};
