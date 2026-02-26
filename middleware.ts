import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("icepos_token")?.value;
  const pathname = request.nextUrl.pathname;

  // allow login page always
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // protect dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      console.log("[MIDDLEWARE] No token found → redirect to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // ❌ JWT_SECRET not set in production env — this is the #1 cause of the bug
      console.error("[MIDDLEWARE] JWT_SECRET is not set! Check environment variables in your deployment.");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      jwt.verify(token, secret);
      return NextResponse.next();
    } catch (err) {
      console.log("[MIDDLEWARE] Token verification failed:", err);
      // Clear bad cookie and redirect
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("icepos_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};