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
    const isForm = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ?? false;
    const body = isForm
      ? Object.fromEntries(await request.formData())
      : await request.json();
    const poll = await createPollRepository().closePoll({ ...body, pollId });
    if (isForm) {
      return NextResponse.redirect(new URL(poll.winnerCandidateId ? "/calendar" : `/polls/${poll.id}`, request.url), { status: 303 });
    }
    return NextResponse.json({ poll });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid close request", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Poll close failed" }, { status: 400 });
  }
}
