import { z } from "zod";

export const voteValueSchema = z.enum(["yes", "no", "maybe"]);

const candidateInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(320).optional(),
  travelOptionId: z.string().trim().min(1).max(160).optional(),
  travelOption: z.record(z.string(), z.unknown()).optional(),
  pricePerPerson: z.coerce.number().nonnegative().optional(),
  source: z.string().trim().min(1).max(80).default("user_link")
});

export const createPollInputSchema = z.object({
  tripId: z.uuid(),
  title: z.string().trim().min(1).max(140),
  closesAt: z.coerce.date(),
  createdByParticipantId: z.uuid(),
  candidates: z.array(candidateInputSchema).min(1).max(8),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

export const addCandidateInputSchema = z.object({
  pollId: z.uuid(),
  participantId: z.uuid(),
  candidate: candidateInputSchema,
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

export const submitVoteInputSchema = z.object({
  pollId: z.uuid(),
  candidateId: z.uuid(),
  participantId: z.uuid(),
  value: voteValueSchema,
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

export const closePollInputSchema = z.object({
  pollId: z.uuid(),
  participantId: z.uuid(),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

export type VoteValue = z.infer<typeof voteValueSchema>;
export type CreatePollInput = z.infer<typeof createPollInputSchema>;
export type AddCandidateInput = z.infer<typeof addCandidateInputSchema>;
export type SubmitVoteInput = z.infer<typeof submitVoteInputSchema>;
export type ClosePollInput = z.infer<typeof closePollInputSchema>;

export type CandidateTally = Record<VoteValue, number>;

export type PollCandidateSnapshot = {
  id: string;
  title: string;
  description: string | null;
  travelOptionId: string | null;
  pricePerPerson: number | null;
  source: string;
  createdByParticipantId: string | null;
  tally: CandidateTally;
  responses: Array<{
    participantId: string;
    value: VoteValue;
    updatedAt: string;
  }>;
};

export type PollSnapshot = {
  id: string;
  tripId: string;
  title: string;
  status: "active" | "closed";
  closesAt: string;
  closedAt: string | null;
  winnerCandidateId: string | null;
  finalistCandidateIds: string[];
  version: number;
  updatedAt: string;
  participantCount: number;
  respondedParticipantCount: number;
  candidates: PollCandidateSnapshot[];
};
