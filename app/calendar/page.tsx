import { CalendarScreen } from "@/components/calendar-screen";
import { mockCalendarRepository } from "@/lib/calendar-repository";

export default function CalendarPage() {
  return <CalendarScreen preset={mockCalendarRepository.getCalendarPreset()} />;
}
