"use client";

import { useEffect, useMemo, useState } from "react";

import {
  PARTICIPANT_CHANGED_EVENT,
  resolveCurrentParticipantId
} from "@/lib/current-participant";
import { PARTICIPANT_STORAGE_KEY } from "@/lib/trips/constants";

export function useCurrentParticipantId(
  participantIds: readonly string[],
  fallbackParticipantId?: string,
  fallbackToFirst = true
) {
  const participantKey = participantIds.join("\u0000");
  const stableParticipantIds = useMemo(() => participantKey.split("\u0000").filter(Boolean), [participantKey]);
  const fallback = fallbackToFirst
    ? resolveCurrentParticipantId(stableParticipantIds, null, fallbackParticipantId)
    : null;
  const [participantId, setParticipantId] = useState<string | null>(fallback);

  useEffect(() => {
    const syncParticipant = () => {
      const storedParticipantId = window.localStorage.getItem(PARTICIPANT_STORAGE_KEY);
      setParticipantId(fallbackToFirst
        ? resolveCurrentParticipantId(stableParticipantIds, storedParticipantId, fallbackParticipantId)
        : storedParticipantId && stableParticipantIds.includes(storedParticipantId)
          ? storedParticipantId
          : null);
    };

    syncParticipant();
    window.addEventListener("storage", syncParticipant);
    window.addEventListener(PARTICIPANT_CHANGED_EVENT, syncParticipant);
    return () => {
      window.removeEventListener("storage", syncParticipant);
      window.removeEventListener(PARTICIPANT_CHANGED_EVENT, syncParticipant);
    };
  }, [fallbackParticipantId, fallbackToFirst, stableParticipantIds]);

  return participantId;
}
