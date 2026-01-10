import { NextResponse } from "next/server";
import { wizardStep } from "@/lib/wizard";
import { readAppSettings } from "@/lib/appSettings";
import type { WizardDraft, WizardMessage } from "@/lib/schema";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages: WizardMessage[];
    draft?: WizardDraft;
  };
  if (!body?.messages) {
    return NextResponse.json({ error: "Missing messages." }, { status: 400 });
  }
  try {
    const appSettings = await readAppSettings();
    const response = await wizardStep(body.messages, body.draft, appSettings.modelRouting);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wizard error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
