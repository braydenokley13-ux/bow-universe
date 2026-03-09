import { NextResponse } from "next/server";

import { getAllGlossaryTerms } from "@/server/data";

export async function GET() {
  const terms = await getAllGlossaryTerms();
  return NextResponse.json(terms);
}
