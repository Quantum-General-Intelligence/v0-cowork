import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/qinference";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const family = searchParams.get("family") ?? undefined;
  const min_context = searchParams.get("min_context")
    ? Number(searchParams.get("min_context"))
    : undefined;

  try {
    const data = await getCatalog({ family, min_context });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch catalog", detail: String(error) },
      { status: 502 }
    );
  }
}
