import { notFound } from "next/navigation";
import { EventScreen } from "@/components/event-screen";
import { mockCalendarRepository } from "@/lib/calendar-repository";

export default async function EventPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const event = mockCalendarRepository.getEvent(itemId);

  if (!event) notFound();

  const preset = mockCalendarRepository.getCalendarPreset();
  const participants = preset.participants.filter((participant) => event.participantIds.includes(participant.id));

  return <EventScreen event={event} participants={participants} />;
}
