export type CandidateSource = "tutu" | "demo_catalog" | "user_link";
export type CandidateCheckStatus = "unknown" | "checking" | "valid" | "warning" | "blocking" | "stale";

export type CandidateCheckSnapshot = {
  status: CandidateCheckStatus;
  reasons: Array<{ code: string; message: string }>;
  checkedAt?: string;
  inputsHash?: string;
};

export type IdeaCandidate = {
  id: string;
  gapId: string;
  title: string;
  source: CandidateSource;
  startsAt: string;
  endsAt: string;
  travelMode: "bus" | "walk" | "train" | "mixed";
  travelMinutes: number;
  usefulMinutes: number;
  pricePerPerson?: number;
  groupPrice?: number;
  capacity: number | "unknown";
  returnBufferMinutes: number;
  interest?: string;
  deeplink?: string;
  recommendationReason: string;
  check: CandidateCheckSnapshot;
};

export type IdeasPreset = {
  id: "ideas.two_selected";
  gapId: string;
  dateLabel: string;
  timeLabel: string;
  timezone: string;
  budgetPerPerson: number;
  filters: string[];
  selectedCandidateIds: string[];
  candidates: IdeaCandidate[];
};

export interface IdeasRepository {
  getPreset(gapId: string): IdeasPreset | null;
}
