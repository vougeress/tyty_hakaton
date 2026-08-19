import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createPollRepository } from "@/lib/polls";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ pollId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { pollId } = await context.params;
    const body = await request.json() as { participantId: string; idempotencyKey?: string };
    const poll = await createPollRepository().recheckWinner({
      pollId,
      participantId: body.participantId,
      idempotencyKey: body.idempotencyKey,
      mode: "auto"
    });
    return NextResponse.json({ poll });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid recheck request", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Winner recheck failed" }, { status: 400 });
  }
}
