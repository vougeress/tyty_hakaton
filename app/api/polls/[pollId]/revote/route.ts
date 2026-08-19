import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createPollRepository } from "@/lib/polls";

type RouteContext = { params: Promise<{ pollId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { pollId } = await context.params;
    const body = await request.json() as { participantId?: unknown };
    const poll = await createPollRepository().createShortRevote({
      pollId,
      participantId: String(body.participantId ?? "")
    });
    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid revote request", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Revote creation failed" }, { status: 400 });
  }
}
