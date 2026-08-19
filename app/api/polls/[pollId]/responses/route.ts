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
    const body = await request.json();
    const poll = await createPollRepository().submitVote({ ...body, pollId });
    return NextResponse.json({ poll });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid vote request", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Vote update failed" }, { status: 400 });
  }
}
