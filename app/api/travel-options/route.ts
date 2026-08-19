import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createTravelSearchService } from "@/lib/travel-search";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createTravelSearchService().search(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid travel search request", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Travel search failed" }, { status: 502 });
  }
}
