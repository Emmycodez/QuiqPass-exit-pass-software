import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify caller is an authenticated admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const callerToken = authHeader.replace("Bearer ", "");
  const callerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify the JWT and get the caller's user id
  const { data: { user: caller }, error: jwtError } =
    await callerClient.auth.getUser(callerToken);

  if (jwtError || !caller) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Confirm the caller is an admin
  const { data: callerStaff } = await callerClient
    .from("staff")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerStaff?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  // Parse body
  const body = await req.json() as {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    gender?: string;
  };

  const { email, password, firstName, lastName, role, gender } = body;

  if (!email || !password || !firstName || !lastName || !role) {
    return new Response("Missing required fields", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Create Supabase auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return new Response(
      JSON.stringify({ error: authError?.message ?? "Failed to create auth user" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authData.user.id;

  // 2. Insert into users table
  const { error: usersError } = await supabase.from("users").insert({
    id: userId,
    email,
    user_type: "staff",
  });

  if (usersError) {
    // Roll back auth user
    await supabase.auth.admin.deleteUser(userId);
    return new Response(
      JSON.stringify({ error: usersError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Insert into staff table
  const staffRow: Record<string, string> = {
    id: userId,
    first_name: firstName,
    last_name: lastName,
    email,
    role,
  };
  if (gender) staffRow.gender = gender;

  const { error: staffError } = await supabase.from("staff").insert(staffRow);

  if (staffError) {
    await supabase.auth.admin.deleteUser(userId);
    await supabase.from("users").delete().eq("id", userId);
    return new Response(
      JSON.stringify({ error: staffError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Audit log
  await supabase.from("audit_log").insert({
    user_id: caller.id,
    action: "staff_created",
    entity_type: "staff",
    entity_id: userId,
    metadata: { role, email },
  });

  return new Response(
    JSON.stringify({ id: userId, email, role }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
