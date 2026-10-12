import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "./env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Do not run code between createServerClient and getUser: it refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const redirectTo = (pathname: string, keepNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (keepNext) url.searchParams.set("next", path + request.nextUrl.search);
    const r = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) r.cookies.set(c);
    return r;
  };

  if (!user && path.startsWith("/app")) return redirectTo("/login", true);
  if (user && path === "/login") return redirectTo("/app");

  return response;
}
