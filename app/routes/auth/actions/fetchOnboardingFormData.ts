import { supabase } from "supabase/supabase-client";

export const fetchOnboardingFormData = async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        error: true,
        success: false,
        message: "No User Session was found. Please login to continue.",
        status: 302,
      };
    }

    const { data: student, error: studentError } = await supabase
      .from("student")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (studentError && studentError.code !== "PGRST116") {
      return {
        error: true,
        success: false,
        message: studentError.message,
        status: 500,
      };
    }
    const userData = student || {
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.full_name?.split(" ")[0] || "",
      last_name:
        user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
    };
    
    const { data: hostels } = await supabase
      .from("hostel")
      .select("id, name, gender")
      .order("name");

    return {
      success: true,
      error: false,
      message: "User data fetched successfully.",
      status: 200,
      user: userData,
      hostels: hostels ?? [],
    }
  } catch (error) {
    return {
      success: false,
      error: true,
      message: "An unexpected error occurred. Please try again later.",
      status: 500,
    };
  }
}