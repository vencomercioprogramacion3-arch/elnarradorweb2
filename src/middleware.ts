import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Forward the pathname as a request header so Server Components can read it
    // (the root layout uses it to hide the public chrome on /admin).
    // Auth is checked by the admin layout and server actions (src/lib/auth/session.ts).
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-invoke-path", request.nextUrl.pathname);

    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
