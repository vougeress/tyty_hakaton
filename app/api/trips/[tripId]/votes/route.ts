import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createPollRepository } from "@/lib/polls";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ tripId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { tripId } = await context.params;
  const { searchParams } = new URL(request.url);
  const updatedSinceParam = searchParams.get("updatedSince");
  const updatedSince = updatedSinceParam ? new Date(updatedSinceParam) : undefined;

  const polls = await createPollRepository().listTripPolls(
    tripId,
    updatedSince && !Number.isNaN(updatedSince.getTime()) ? updatedSince : undefined
  );
  return NextResponse.json({ polls, checkedAt: new Date().toISOString() });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params;
    const body = await request.json();
    const poll = await createPollRepository().createPoll({ ...body, tripId });
    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid poll request", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Poll creation failed" }, { status: 400 });
  }
}
