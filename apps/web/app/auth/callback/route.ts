import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) { 
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (!code) {
      return NextResponse.redirect(`${origin}/?error=no_code`, { status: 302 }); 
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(`${origin}/?error=auth_failed`, {
        status: 302, // Redirect to home with error query
      });
    }

    return NextResponse.redirect(`${origin}${next}`, { status: 302 });
  } catch (err) {
    console.error("Callback route crashed:", err);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/?error=server_error`, {
      status: 302,
    });
  }
}
