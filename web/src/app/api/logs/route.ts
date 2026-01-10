import { NextResponse } from "next/server";
import { readLogs } from "@/lib/logs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "300");
  const text = await readLogs(Number.isFinite(limit) ? limit : 300);
  return NextResponse.json({ text });
}
