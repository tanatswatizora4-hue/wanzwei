import { NextResponse } from "next/server";

import { digitalAssetLinks } from "@/lib/android/assetlinks";

export function GET() {
  return NextResponse.json(digitalAssetLinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
