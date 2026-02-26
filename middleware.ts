import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("icepos_token")?.value;
  const pathname = request.nextUrl.pathname;

  // allow login
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // protect dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Edge-safe: only presence check
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};