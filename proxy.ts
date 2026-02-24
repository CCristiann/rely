import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public API paths that must remain accessible without a session.
// NextAuth's own OAuth callback/sign-in routes must be whitelisted or they
// will enter a redirect loop.
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/inngest"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow NextAuth internal routes unconditionally.
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const session = await auth();

  const isProtectedPage = pathname.startsWith("/dashboard");
  const isProtectedApi = pathname.startsWith("/api");

  if ((isProtectedPage || isProtectedApi) && !session?.user) {
    // For API requests, return 401 JSON rather than redirecting to the login
    // page — browsers and fetch clients handle this more gracefully.
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", req.url);
    // Preserve the originally requested path so the user lands back there
    // after signing in.
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Dashboard pages
    "/dashboard/:path*",
    // All API routes — individual handlers still perform their own auth checks
    // as a second layer of defence (defence-in-depth).
    "/api/:path*",
  ],
};
