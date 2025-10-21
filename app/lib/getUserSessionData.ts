import { supabase } from "supabase/supabase-client";

export async function getUserSessionData() {
  // 1. Get the current Supabase session
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    return null;
  }

  // 2. Extract the user and necessary data
  const user = session.user;
  
  // You'll need to determine where the user's name and image are stored.
  // Supabase often puts them in the user_metadata object.
  const name = user.user_metadata.full_name || user.email;
  const image = user.user_metadata.avatar_url || null; // Or user.user_metadata.picture, etc.

  return {
    user: {
      id: user.id,
      name: name,
      image: image,
      email: user.email,
      // Add any other user details you need
    },
    // You can return the full session object if needed
    // session: session 
  };
}