import { NextResponse, type NextRequest } from "next/server";
import { getLocaleFromPathname } from "./app/i18n";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-site-locale", getLocaleFromPathname(request.nextUrl.pathname));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
