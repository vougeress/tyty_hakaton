import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Compass,
  Flag,
  Hotel,
  Lightbulb,
  Link2,
  MapPinned,
  Plus,
  Search,
  Sparkles,
  Ticket,
  Train,
  Users,
  Vote
} from "lucide-react";

export type ScreenId =
  | "calendar"
  | "event"
  | "create"
  | "manual"
  | "ideas"
  | "vote"
  | "conflict"
  | "winner"
  | "audit"
  | "trips"
  | "memories";

export const navItems = [
  { id: "add", label: "Добавить", href: "/calendar/gaps/demo-gap/create", icon: Plus },
  { id: "calendar", label: "Календарь", href: "/calendar", icon: CalendarDays },
  { id: "memories", label: "Воспоминания", href: "/memories", icon: Camera }
];

export const screenRoutes: Record<ScreenId, string> = {
  calendar: "/calendar",
  event: "/calendar/items/kremlin",
  create: "/calendar/gaps/demo-gap/create",
  manual: "/calendar/gaps/demo-gap/manual",
  ideas: "/calendar/gaps/demo-gap/ideas",
  vote: "/polls/demo-poll",
  conflict: "/conflicts/schedule-shift",
  winner: "/winners/innopolis",
  audit: "/audit",
  trips: "/trips",
  memories: "/memories"
};

export const screenSummaries: Record<ScreenId, {
  title: string;
  eyebrow: string;
  preset: string;
  icon: typeof CalendarDays;
  description: string;
}> = {
  calendar: {
    title: "Неделя",
    eyebrow: "calendar.default",
    preset: "P0",
    icon: CalendarDays,
    description: "План поездки, свободное окно, конфликтное голосование и общий запуск проверки."
  },
  event: {
    title: "Казанский Кремль",
    eyebrow: "event.confirmed",
    preset: "P0",
    icon: Ticket,
    description: "Компактная карточка события: время, место, маршрут, участники, билеты и фото."
  },
  create: {
    title: "Новое в плане",
    eyebrow: "create.gap_selected",
    preset: "P0",
    icon: Plus,
    description: "Выбор между ручным добавлением и подбором вариантов для свободного окна."
  },
  manual: {
    title: "Новое событие",
    eyebrow: "manual.group_vote",
    preset: "P0",
    icon: Flag,
    description: "Форма события с участниками, режимом публикации и пресетом Только я."
  },
  ideas: {
    title: "Подбор вариантов",
    eyebrow: "ideas.two_selected",
    preset: "P0",
    icon: Lightbulb,
    description: "Карточки выполнимых вариантов с ценой, дорогой, буфером и статусом проверки."
  },
  vote: {
    title: "Голосование",
    eyebrow: "vote.active",
    preset: "P0",
    icon: Vote,
    description: "Ответы Да, Нет и Возможно по каждому варианту без раскрытия приватных ограничений."
  },
  conflict: {
    title: "Конфликт",
    eyebrow: "conflict.schedule_changed",
    preset: "P0",
    icon: AlertTriangle,
    description: "Объяснение логистической проблемы с конкретными временами и действиями."
  },
  winner: {
    title: "Победитель",
    eyebrow: "winner.rechecked",
    preset: "P0",
    icon: CheckCircle2,
    description: "Повторная проверка цены, мест и логистики перед deeplink на Туту."
  },
  audit: {
    title: "Проверка поездки",
    eyebrow: "audit.issues_found",
    preset: "P0 demo / P1 pilot",
    icon: Search,
    description: "Отчёт по замечаниям и черновикам переездов без автоматической перестройки плана."
  },
  trips: {
    title: "Профиль и поездки",
    eyebrow: "trips.default",
    preset: "P0",
    icon: Users,
    description: "Создание поездки, вход по ссылке или коду и выбор текущего участника."
  },
  memories: {
    title: "Воспоминания",
    eyebrow: "memories.draft_ready",
    preset: "P2",
    icon: Sparkles,
    description: "Future-сценарий: фото, распределение по событиям и медиачерновик."
  }
};

export const calendarItems = [
  {
    time: "11:00-13:00",
    title: "Казанский Кремль",
    meta: "4 участника · билеты прикреплены",
    icon: MapPinned,
    tone: "confirmed",
    href: screenRoutes.event
  },
  {
    time: "12:20-18:10",
    title: "Свободное окно",
    meta: "5 ч 50 мин · буфер до ужина 80 мин",
    icon: Clock3,
    tone: "gap",
    href: screenRoutes.create
  },
  {
    time: "17:05",
    title: "Голосование под риском",
    meta: "Расписание изменилось · нужна реакция",
    icon: AlertTriangle,
    tone: "conflict",
    href: screenRoutes.conflict
  },
  {
    time: "21:10",
    title: "Поезд в Москву",
    meta: "Туту · 4 билета",
    icon: Train,
    tone: "confirmed",
    href: screenRoutes.event
  }
];

export const routeCards = [
  { title: "Ручное добавление", href: screenRoutes.manual, icon: Flag },
  { title: "Подобрать варианты", href: screenRoutes.ideas, icon: Compass },
  { title: "Голосование", href: screenRoutes.vote, icon: Vote },
  { title: "Проверка поездки", href: screenRoutes.audit, icon: Search }
];

export const ideaCards = [
  {
    title: "Иннополис",
    details: "42 мин туда · 2 ч 40 мин на месте · от 950 ₽",
    status: "Проверено",
    tone: "ok"
  },
  {
    title: "Свияжск",
    details: "1 ч 15 мин туда · буфер 55 мин · capacity unknown",
    status: "Нужна проверка",
    tone: "warn"
  },
  {
    title: "Остров-град и прогулка",
    details: "Много пересадок · буфер меньше 30 мин",
    status: "Не подходит",
    tone: "bad"
  }
];

export const participantNames = ["Никита", "Анна", "Мария", "Илья"];

export const utilityScreens = [
  { label: "Поездки", href: screenRoutes.trips, icon: Users },
  { label: "Событие", href: screenRoutes.event, icon: Ticket },
  { label: "Конфликт", href: screenRoutes.conflict, icon: AlertTriangle },
  { label: "Победитель", href: screenRoutes.winner, icon: CheckCircle2 },
  { label: "Отель", href: screenRoutes.event, icon: Hotel },
  { label: "Ссылка", href: screenRoutes.trips, icon: Link2 }
];
