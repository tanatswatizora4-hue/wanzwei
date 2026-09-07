import { NextResponse } from "next/server";

import { digitalAssetLinks } from "@/lib/android/assetlinks";

/** Exact path /.well-known/assetlinks.json — do not redirect. */
export function GET() {
  return NextResponse.json(digitalAssetLinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
