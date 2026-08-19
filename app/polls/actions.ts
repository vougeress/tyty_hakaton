"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { createPollRepository, type PollSnapshot, type VoteValue } from "@/lib/polls";

export type PollActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  poll?: PollSnapshot;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function submitVoteAction(
  _previousState: PollActionState,
  formData: FormData
): Promise<PollActionState> {
  try {
    const poll = await createPollRepository().submitVote({
      pollId: text(formData, "pollId"),
      candidateId: text(formData, "candidateId"),
      participantId: text(formData, "participantId"),
      value: text(formData, "value") as VoteValue,
      idempotencyKey: text(formData, "idempotencyKey") || undefined
    });
    revalidatePath(`/polls/${poll.id}`);
    return { status: "success", message: "Ответ сохранён", poll };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ZodError ? "Проверьте ответ" : "Не удалось сохранить ответ"
    };
  }
}

export async function addCandidateAction(
  _previousState: PollActionState,
  formData: FormData
): Promise<PollActionState> {
  try {
    const poll = await createPollRepository().addCandidate({
      pollId: text(formData, "pollId"),
      participantId: text(formData, "participantId"),
      candidate: {
        title: text(formData, "title"),
        description: text(formData, "description") || undefined,
        pricePerPerson: text(formData, "pricePerPerson") ? Number(text(formData, "pricePerPerson")) : undefined,
        source: "user_link"
      },
      idempotencyKey: text(formData, "idempotencyKey") || undefined
    });
    revalidatePath(`/polls/${poll.id}`);
    return { status: "success", message: "Вариант добавлен", poll };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ZodError ? "Проверьте вариант" : "Не удалось добавить вариант"
    };
  }
}

export async function closePollAction(
  _previousState: PollActionState,
  formData: FormData
): Promise<PollActionState> {
  try {
    const poll = await createPollRepository().closePoll({
      pollId: text(formData, "pollId"),
      participantId: text(formData, "participantId"),
      idempotencyKey: text(formData, "idempotencyKey") || undefined
    });
    revalidatePath(`/polls/${poll.id}`);
    return { status: "success", message: "Голосование закрыто", poll };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ZodError ? "Проверьте запрос" : "Не удалось закрыть голосование"
    };
  }
}

export async function recheckWinnerAction(
  _previousState: PollActionState,
  formData: FormData
): Promise<PollActionState> {
  try {
    const poll = await createPollRepository().recheckWinner({
      pollId: text(formData, "pollId"),
      participantId: text(formData, "participantId"),
      mode: "auto",
      idempotencyKey: text(formData, "idempotencyKey") || undefined
    });
    revalidatePath(`/winners/${poll.winnerCandidateId}`);
    revalidatePath("/calendar");
    return { status: "success", message: "Цена и наличие перепроверены", poll };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ZodError ? "Проверьте запрос" : "Не удалось перепроверить победителя"
    };
  }
}

export async function confirmWinnerBookingAction(
  _previousState: PollActionState,
  formData: FormData
): Promise<PollActionState> {
  try {
    const poll = await createPollRepository().confirmWinnerBooking({
      pollId: text(formData, "pollId"),
      participantId: text(formData, "participantId"),
      idempotencyKey: text(formData, "idempotencyKey") || undefined
    });
    revalidatePath(`/winners/${poll.winnerCandidateId}`);
    revalidatePath("/calendar");
    return { status: "success", message: "Бронирование подтверждено", poll };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ZodError ? "Проверьте запрос" : "Не удалось подтвердить бронирование"
    };
  }
}
