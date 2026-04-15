import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { guestToken } = body as { guestToken?: string };

    if (!guestToken) {
      return NextResponse.json(
        { success: false, message: "Missing guest token." },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Missing auth token." },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace("Bearer ", "");

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: existingProfile, error: profileReadError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      return NextResponse.json(
        { success: false, message: "Could not check profile." },
        { status: 500 }
      );
    }

    if (!existingProfile) {
      const { error: profileInsertError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
      });

      if (profileInsertError) {
        return NextResponse.json(
          { success: false, message: "Could not create profile." },
          { status: 500 }
        );
      }
    }

    const { data: guestSubmissions, error: guestReadError } = await supabase
      .from("submissions")
      .select("id, drop_date")
      .eq("guest_token", guestToken)
      .is("user_id", null);

    if (guestReadError) {
      return NextResponse.json(
        { success: false, message: "Could not find guest submissions." },
        { status: 500 }
      );
    }

    for (const submission of guestSubmissions ?? []) {
      const { data: existingUserSubmission, error: userSubReadError } = await supabase
        .from("submissions")
        .select("id")
        .eq("drop_date", submission.drop_date)
        .eq("user_id", user.id)
        .maybeSingle();

      if (userSubReadError) {
        return NextResponse.json(
          { success: false, message: "Could not check user submissions." },
          { status: 500 }
        );
      }

      if (!existingUserSubmission) {
        const { error: updateError } = await supabase
          .from("submissions")
          .update({ user_id: user.id })
          .eq("id", submission.id);

        if (updateError) {
          return NextResponse.json(
            { success: false, message: "Could not attach guest submission." },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Guest submissions synced successfully.",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
