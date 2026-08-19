const PREFIX = "tutu-okno:ideas-selection:";

export function ideasSelectionKey(gapId: string) {
  return `${PREFIX}${gapId}`;
}

export function readIdeasSelection(storage: Pick<Storage, "getItem">, gapId: string) {
  try {
    const value: unknown = JSON.parse(storage.getItem(ideasSelectionKey(gapId)) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeIdeasSelection(storage: Pick<Storage, "setItem">, gapId: string, candidateIds: Iterable<string>) {
  storage.setItem(ideasSelectionKey(gapId), JSON.stringify([...new Set(candidateIds)].sort()));
}
