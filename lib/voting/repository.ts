export type VoteValue = "yes" | "maybe" | "veto";

export type PollCandidate = {
  id: string;
  title: string;
  pricePerPerson: number;
  summary: string;
  conflicted?: boolean;
  tally: { yes: number; maybe: number; veto: number };
};

export type VotePreset = {
  id: "vote.active";
  pollId: string;
  status: "active";
  gapLabel: string;
  deadlineLabel: string;
  remainingLabel: string;
  responseProgress: string;
  participants: Array<{ id: string; name: string; initial: string; tone: "purple" | "cyan" | "lime" }>;
  waitingParticipantName: string;
  candidates: PollCandidate[];
  initialResponses: Partial<Record<string, VoteValue>>;
};

export interface VotingRepository {
  getPreset(pollId: string): VotePreset | null;
}

export const mockVotingRepository: VotingRepository = {
  getPreset(pollId) {
    if (pollId !== "demo-poll") return null;
    return {
      id: "vote.active",
      pollId,
      status: "active",
      gapLabel: "Свободное окно в субботу",
      deadlineLabel: "12:20–18:10 · ответить до 14:15",
      remainingLabel: "Осталось 24 мин",
      responseProgress: "3/4",
      participants: [
        { id: "nikita", name: "Никита", initial: "Н", tone: "purple" },
        { id: "anna", name: "Анна", initial: "А", tone: "purple" },
        { id: "maria", name: "Мария", initial: "М", tone: "cyan" },
        { id: "ilya", name: "Илья", initial: "И", tone: "lime" }
      ],
      waitingParticipantName: "Илья",
      candidates: [
        { id: "innopolis_bus", title: "Иннополис", pricePerPerson: 790, summary: "3 за · 4 места · запас 58 мин", tally: { yes: 3, maybe: 0, veto: 0 } },
        { id: "chak_chak_museum", title: "Музей чак-чака", pricePerPerson: 800, summary: "2 за · 1 можно · запас 2 ч 12 мин", tally: { yes: 2, maybe: 1, veto: 0 } },
        { id: "sviyazhsk", title: "Свияжск", pricePerPerson: 2300, summary: "1 за · 2 не могут · конфликт 40 мин", conflicted: true, tally: { yes: 1, maybe: 0, veto: 2 } }
      ],
      initialResponses: { sviyazhsk: "veto" }
    };
  }
};
