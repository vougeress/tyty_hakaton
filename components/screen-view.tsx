import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  Circle,
  ExternalLink,
  Map,
  Search,
  ShieldAlert,
  Sparkles,
  Upload
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  calendarItems,
  ideaCards,
  participantNames,
  routeCards,
  screenRoutes,
  screenSummaries,
  type ScreenId,
  utilityScreens
} from "@/lib/screens";
import { cn } from "@/lib/utils";

export function ScreenView({ screenId }: { screenId: ScreenId }) {
  const screen = screenSummaries[screenId];
  const Icon = screen.icon;

  return (
    <AppShell>
      <div className="space-y-4">
        <section className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Icon aria-hidden="true" size={16} />
              <span>{screen.eyebrow}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-ink">{screen.title}</h1>
            <p className="mt-1 text-sm leading-5 text-ink/62">{screen.description}</p>
          </div>
          <Badge>{screen.preset}</Badge>
        </section>

        {screenId === "calendar" && <CalendarScreen />}
        {screenId === "event" && <EventScreen />}
        {screenId === "create" && <CreateScreen />}
        {screenId === "manual" && <ManualScreen />}
        {screenId === "ideas" && <IdeasScreen />}
        {screenId === "vote" && <VoteScreen />}
        {screenId === "conflict" && <ConflictScreen />}
        {screenId === "winner" && <WinnerScreen />}
        {screenId === "audit" && <AuditScreen />}
        {screenId === "trips" && <TripsScreen />}
        {screenId === "memories" && <MemoriesScreen />}

        <ScreenLinks current={screenId} />
      </div>
    </AppShell>
  );
}

function CalendarScreen() {
  return (
    <>
      <Card className="bg-ink text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white/62">10-13 сентября</p>
            <h2 className="mt-1 text-xl font-bold">Казань · 4 участника</h2>
          </div>
          <div className="flex -space-x-2">
            {participantNames.map((name) => (
              <span
                key={name}
                title={name}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-accent text-xs font-bold text-ink"
              >
                {name[0]}
              </span>
            ))}
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-5 gap-2">
        {["Пн", "Вт", "Ср", "Сб", "Вс"].map((day, index) => (
          <div
            key={day}
            className={cn(
              "rounded-[8px] border border-border bg-surface p-2 text-center",
              index === 3 && "border-primary bg-primary text-white"
            )}
          >
            <p className="text-xs font-semibold opacity-70">{day}</p>
            <p className="text-lg font-bold">{10 + index}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {calendarItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={`${item.time}-${item.title}`}
              href={item.href}
              className={cn(
                "grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-[8px] border bg-surface p-3 shadow-card",
                item.tone === "gap" && "border-primary/45 bg-primary/8",
                item.tone === "conflict" && "border-coral/55 bg-coral/10",
                item.tone === "confirmed" && "border-border"
              )}
            >
              <span className="text-xs font-bold text-ink/58">{item.time}</span>
              <span>
                <span className="block text-sm font-bold text-ink">{item.title}</span>
                <span className="mt-0.5 block text-xs text-ink/58">{item.meta}</span>
              </span>
              <Icon aria-hidden="true" size={20} className={item.tone === "conflict" ? "text-coral" : "text-primary"} />
            </Link>
          );
        })}
      </div>
    </>
  );
}

function EventScreen() {
  return (
    <>
      <Card>
        <div className="aspect-[16/9] rounded-[8px] bg-[linear-gradient(135deg,#6DD8DF,#D1FF1A)]" />
        <div className="mt-4 grid gap-3 text-sm">
          <InfoRow label="Время" value="11:00-13:00, 11 сентября" />
          <InfoRow label="Место" value="Казанский Кремль" />
          <InfoRow label="Маршрут" value="18 минут пешком от отеля" />
          <InfoRow label="Участники" value="Никита, Анна, Мария, Илья" />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary">
          <Map aria-hidden="true" size={17} />
          Маршрут
        </Button>
        <Button variant="secondary">
          <ExternalLink aria-hidden="true" size={17} />
          Билет
        </Button>
      </div>
    </>
  );
}

function CreateScreen() {
  return (
    <>
      <Card className="bg-lime/30">
        <p className="text-sm font-semibold">Свободное окно</p>
        <p className="mt-1 text-2xl font-bold">12:20-18:10</p>
        <p className="mt-1 text-sm text-ink/62">4 участника · буфер до ужина 80 минут</p>
      </Card>
      <div className="grid gap-3">
        <ButtonLink href={screenRoutes.manual}>
          <CalendarPlus aria-hidden="true" size={18} />
          Добавить вручную
        </ButtonLink>
        <ButtonLink href={screenRoutes.ideas} variant="secondary">
          <Search aria-hidden="true" size={18} />
          Подобрать варианты
        </ButtonLink>
      </div>
    </>
  );
}

function ManualScreen() {
  return (
    <>
      <Card>
        <div className="grid gap-3">
          <Field label="Название" value="Прогулка по Баумана" />
          <Field label="Время" value="13:00-15:10" />
          <Field label="Место" value="Улица Баумана" />
        </div>
      </Card>
      <Card>
        <p className="text-sm font-bold">Участники</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {participantNames.map((name) => (
            <label key={name} className="flex items-center gap-2 rounded-[8px] border border-border bg-muted p-2 text-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary text-white">
                <Check aria-hidden="true" size={14} />
              </span>
              {name}
            </label>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-[8px] border border-border p-3 text-sm font-semibold">
          <Circle aria-hidden="true" size={18} />
          Только я
        </label>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href={screenRoutes.calendar} variant="secondary">
          Сразу в план
        </ButtonLink>
        <ButtonLink href={screenRoutes.vote}>Голосованием</ButtonLink>
      </div>
    </>
  );
}

function IdeasScreen() {
  return (
    <>
      <Card className="flex items-center justify-between">
        <span>
          <span className="block text-sm font-bold">Выбрано 2 варианта</span>
          <span className="text-xs text-ink/58">ideas.two_selected</span>
        </span>
        <ButtonLink href={screenRoutes.vote} className="h-10 px-3">
          Голосовать
        </ButtonLink>
      </Card>
      <div className="space-y-3">
        {ideaCards.map((idea, index) => (
          <Card
            key={idea.title}
            className={cn(
              index < 2 && "border-primary/50",
              idea.tone === "bad" && "border-coral/50 bg-coral/10"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">{idea.title}</h2>
                <p className="mt-1 text-sm text-ink/62">{idea.details}</p>
              </div>
              <Badge
                className={cn(
                  idea.tone === "ok" && "border-success/25 bg-success/10 text-success",
                  idea.tone === "warn" && "border-primary/25 bg-primary/10 text-primary",
                  idea.tone === "bad" && "border-coral/35 bg-coral/10 text-ink"
                )}
              >
                {idea.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function VoteScreen() {
  return (
    <div className="space-y-3">
      {ideaCards.slice(0, 2).map((idea) => (
        <Card key={idea.title}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{idea.title}</h2>
            <Badge>3 из 4</Badge>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["За", "Можно", "Не могу"].map((vote, index) => (
              <button
                key={vote}
                type="button"
                className={cn(
                  "h-10 rounded-[8px] border border-border bg-muted text-xs font-bold",
                  index === 0 && "bg-primary text-white"
                )}
              >
                {vote}
              </button>
            ))}
          </div>
        </Card>
      ))}
      <ButtonLink href={screenRoutes.winner} className="w-full">
        Завершить выбор
      </ButtonLink>
    </div>
  );
}

function ConflictScreen() {
  return (
    <>
      <Card className="border-coral/55 bg-coral/10">
        <div className="flex gap-3">
          <ShieldAlert aria-hidden="true" className="mt-0.5 text-coral" size={22} />
          <div>
            <h2 className="font-bold">Не хватает буфера</h2>
            <p className="mt-1 text-sm leading-5 text-ink/70">
              Обратный автобус приходит в 18:02, до ужина нужно быть к 18:10. Требуемый буфер 30 минут.
            </p>
          </div>
        </div>
      </Card>
      <div className="grid gap-3">
        <ButtonLink href={screenRoutes.ideas}>Подобрать заново</ButtonLink>
        <ButtonLink href={screenRoutes.manual} variant="secondary">
          Исправить вручную
        </ButtonLink>
      </div>
    </>
  );
}

function WinnerScreen() {
  return (
    <>
      <Card className="border-success/30 bg-success/10">
        <div className="flex items-start gap-3">
          <Check aria-hidden="true" className="text-success" size={22} />
          <div>
            <h2 className="font-bold">Иннополис выбран</h2>
            <p className="mt-1 text-sm text-ink/66">Цена и места перепроверены 2 минуты назад.</p>
          </div>
        </div>
      </Card>
      <div className="grid gap-3">
        <Button>
          <ExternalLink aria-hidden="true" size={18} />
          Перейти на Туту
        </Button>
        <ButtonLink href={screenRoutes.calendar} variant="secondary">
          Уже купили - добавить в план
        </ButtonLink>
      </div>
    </>
  );
}

function AuditScreen() {
  return (
    <>
      <Card>
        <div className="flex items-center gap-3">
          <AlertTriangle aria-hidden="true" className="text-coral" size={22} />
          <div>
            <p className="text-sm font-bold">2 замечания</p>
            <p className="text-xs text-ink/58">План не будет изменён без подтверждения</p>
          </div>
        </div>
      </Card>
      <div className="space-y-3">
        {["Добавить переезд до вокзала", "Перепроверить буфер после ужина"].map((item) => (
          <Card key={item} className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{item}</span>
            <Badge>Черновик</Badge>
          </Card>
        ))}
      </div>
    </>
  );
}

function TripsScreen() {
  return (
    <>
      <Card>
        <Field label="Вступить по ссылке или коду" value="KZN-1218" />
        <Button className="mt-3 w-full">Вступить</Button>
      </Card>
      <Card>
        <h2 className="font-bold">Казань</h2>
        <p className="mt-1 text-sm text-ink/62">10-13 сентября · 4 участника · active</p>
        <div className="mt-3 flex gap-2">
          <Badge>owner</Badge>
          <Badge>invite KZN-1218</Badge>
        </div>
      </Card>
    </>
  );
}

function MemoriesScreen() {
  return (
    <>
      <Card className="bg-[linear-gradient(135deg,#0D0B68,#6F5DF6)] text-white">
        <Sparkles aria-hidden="true" size={24} />
        <h2 className="mt-3 text-xl font-bold">Медиачерновик готов</h2>
        <p className="mt-1 text-sm text-white/70">18 фото сопоставлены с событиями поездки.</p>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square rounded-[8px] bg-[linear-gradient(135deg,#6DD8DF,#B9EF54,#FF776D)]"
          />
        ))}
      </div>
      <Button variant="secondary" className="w-full">
        <Upload aria-hidden="true" size={18} />
        Загрузить фото
      </Button>
    </>
  );
}

function ScreenLinks({ current }: { current: ScreenId }) {
  const links = [
    ...routeCards,
    ...utilityScreens.map((item) => ({ title: item.label, href: item.href, icon: item.icon }))
  ];

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink/45">PR-01 route check</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={`${item.href}-${item.title}`}
              href={item.href}
              className="flex min-h-11 items-center justify-between rounded-[8px] border border-border bg-muted px-3 text-sm font-semibold"
              aria-current={screenRoutes[current] === item.href ? "page" : undefined}
            >
              <span className="flex items-center gap-2">
                <Icon aria-hidden="true" size={16} />
                {item.title}
              </span>
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          );
        })}
      </div>
      <Link href="/calendar" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
        <ArrowLeft aria-hidden="true" size={15} />
        В календарь
      </Link>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-ink/52">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold text-ink/62">{label}</span>
      <input
        readOnly
        value={value}
        className="h-11 rounded-[8px] border border-border bg-muted px-3 font-semibold text-ink outline-none"
      />
    </label>
  );
}
