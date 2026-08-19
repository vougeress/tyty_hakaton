import { PARTICIPANT_STORAGE_KEY } from "@/lib/trips/constants";

export const PARTICIPANT_CHANGED_EVENT = "tutu-okno:participant-changed";

export function resolveCurrentParticipantId(
  participantIds: readonly string[],
  storedParticipantId: string | null,
  fallbackParticipantId?: string
) {
  if (storedParticipantId && participantIds.includes(storedParticipantId)) {
    return storedParticipantId;
  }

  if (fallbackParticipantId && participantIds.includes(fallbackParticipantId)) {
    return fallbackParticipantId;
  }

  return participantIds[0] ?? null;
}

export function saveCurrentParticipantId(participantId: string) {
  window.localStorage.setItem(PARTICIPANT_STORAGE_KEY, participantId);
  window.dispatchEvent(new CustomEvent(PARTICIPANT_CHANGED_EVENT));
}
