// This file is deprecated. Vote API moved to /api/vote
// Keeping to avoid 404 on old clients
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been deprecated. Use /api/vote instead." },
    { status: 410 }
  );
}
