import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateUsername, validateEmail, validatePassword } from "@/lib/validation";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

function hashPassword(password: string): string {
  // Simple hash for comparison — in production use bcrypt
  // We'll use Supabase's crypt function for actual hashing
  return password;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createServiceClient();

    if (action === "register") {
      const { username, email, password, confirm_password, anon_user_hash, accepted_terms } = body;

      // Validate terms acceptance
      if (!accepted_terms) {
        return NextResponse.json({ error: "You must accept the Terms of Service and Privacy Policy" }, { status: 400, headers: NO_STORE_HEADERS });
      }

      // Validate username
      const usernameCheck = validateUsername(username || "");
      if (!usernameCheck.valid) {
        return NextResponse.json({ error: usernameCheck.error }, { status: 400, headers: NO_STORE_HEADERS });
      }

      // Validate email
      const emailCheck = validateEmail(email || "");
      if (!emailCheck.valid) {
        return NextResponse.json({ error: emailCheck.error }, { status: 400, headers: NO_STORE_HEADERS });
      }

      // Validate password
      const passwordCheck = validatePassword(password || "");
      if (!passwordCheck.valid) {
        return NextResponse.json({ error: passwordCheck.error }, { status: 400, headers: NO_STORE_HEADERS });
      }

      // Confirm password match
      if (password !== confirm_password) {
        return NextResponse.json({ error: "Passwords do not match" }, { status: 400, headers: NO_STORE_HEADERS });
      }

      // Check if username taken
      const { data: existingUser } = await supabase
        .from("user_accounts")
        .select("id")
        .eq("username", username.trim().toLowerCase())
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409, headers: NO_STORE_HEADERS });
      }

      // Check if email taken
      const { data: existingEmail } = await supabase
        .from("user_accounts")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existingEmail) {
        return NextResponse.json({ error: "Email is already registered" }, { status: 409, headers: NO_STORE_HEADERS });
      }

      // Create account using Supabase crypt for password hashing
      const { data: newUser, error: insertError } = await supabase.rpc("create_user_account", {
        p_username: username.trim().toLowerCase(),
        p_email: email.trim().toLowerCase(),
        p_password: password,
        p_anon_hash: anon_user_hash || null,
      });

      if (insertError) {
        console.error("Registration error:", insertError);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500, headers: NO_STORE_HEADERS });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newUser,
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
        },
        message: "Account created successfully",
      }, { status: 201, headers: NO_STORE_HEADERS });

    } else if (action === "login") {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json({ error: "Username/email and password are required" }, { status: 400, headers: NO_STORE_HEADERS });
      }

      let loginEmail = email.trim().toLowerCase();

      if (!loginEmail.includes("@")) {
        const { data: userByName } = await supabase
          .from("user_accounts")
          .select("email")
          .eq("username", loginEmail)
          .maybeSingle();
        if (!userByName) {
          return NextResponse.json({ error: "Invalid username or password" }, { status: 401, headers: NO_STORE_HEADERS });
        }
        loginEmail = userByName.email;
      }

      const { data: user, error } = await supabase.rpc("verify_user_login", {
        p_email: loginEmail,
        p_password: password,
      });

      if (error || !user || user.length === 0) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: NO_STORE_HEADERS });
      }

      const userData = user[0] || user;

      if (userData.is_banned) {
        return NextResponse.json({ error: "Account has been suspended" }, { status: 403, headers: NO_STORE_HEADERS });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: userData.id,
          username: userData.username,
          email: userData.email,
        },
      }, { headers: NO_STORE_HEADERS });

    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: NO_STORE_HEADERS });
    }
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
