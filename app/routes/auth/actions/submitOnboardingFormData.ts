import { supabase } from "supabase/supabase-client";

export const submitOnboardingFormData = async (formData: FormData) => { 

  const {
  data: { user },error: userError
} = await supabase.auth.getUser();


if (!user) {
  return { error: true, message: userError?.message || "No user found" };
}



  try {
    const onboardingData = Object.fromEntries(formData);
    // find hostel
    const {data: hostelData, error: hostelError} = await supabase
      .from('hostel')
      .select('id')
      .eq('name', onboardingData.hostel as string)
      .maybeSingle();

      if(hostelError) {
        return {
          error:true,
          message: hostelError.message
        };
      };

      if (!hostelData) {
  return { error: true, message: "Hostel not found. Please select a valid hostel." };
}

      const studentData = {
        id: user.id,
      first_name: onboardingData.firstName as string,
      last_name: onboardingData.lastName as string,
      email: onboardingData.email as string,
      phone_number: onboardingData.phoneNumber as string,
      gender: onboardingData.gender as string,
      matric_no: onboardingData.matricNo as string,
      department: onboardingData.department as string,
      room_number: onboardingData.roomNumber as string,
      guardian_name: onboardingData.guardianName as string,
      guardian_phone_number: onboardingData.guardianPhoneNumber as string,
      level: Number(onboardingData.level), 
      hostel_id: hostelData?.id,
      is_onboarded: true,
      bed_number: onboardingData.bedNumber as string
    };

    const {error: studentOnboardingError} = await supabase.from('student').upsert([studentData]);

    if(studentOnboardingError) {
      return {
        error: true,
        message: studentOnboardingError.message
      };
    };

    return {
      error: false,
      message: "Onboarding data submitted successfully"
    };

  } catch (error) {
    console.log(error);
     return {
      error: true,
      message: "An error occurred while submitting onboarding data"
  }
}}