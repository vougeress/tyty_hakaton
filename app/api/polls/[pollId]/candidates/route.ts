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
    const poll = await createPollRepository().addCandidate({ ...body, pollId });
    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid candidate request", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Candidate creation failed" }, { status: 400 });
  }
}
