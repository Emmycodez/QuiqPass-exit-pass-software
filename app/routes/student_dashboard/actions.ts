// Add this to your actions.ts or pass-utils.ts file

import { supabase } from "supabase/supabase-client";

interface PassLimitCheckResult {
  allowed: boolean;
  reason?: string;
  shortPassCount: number;
  longPassCount: number;
  hasSpecialPrivilege: boolean;
}

/**
 * Check if a student can apply for a pass this month (server-side validation)
 */
export async function checkPassLimitBeforeSubmit(
  studentId: string,
  passType: 'short' | 'long'
): Promise<PassLimitCheckResult> {
  try {
    // Get current month-year
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check if student has special privilege
    const { data: student, error: studentError } = await supabase
      .from('student')
      .select('has_special_privilege')
      .eq('id', studentId)
      .single();

    if (studentError) {
      throw new Error(`Failed to check student privileges: ${studentError.message}`);
    }

    // If student has special privilege, allow unlimited passes
    if (student?.has_special_privilege) {
      return {
        allowed: true,
        shortPassCount: 0,
        longPassCount: 0,
        hasSpecialPrivilege: true,
      };
    }

    // Get pass limit tracking for current month
    const { data: tracking, error: trackingError } = await supabase
      .from('pass_limit_tracking')
      .select('short_pass_count, long_pass_count')
      .eq('student_id', studentId)
      .eq('month_year', monthYear)
      .maybeSingle();

    if (trackingError) {
      throw new Error(`Failed to check pass limits: ${trackingError.message}`);
    }

    const shortCount = tracking?.short_pass_count || 0;
    const longCount = tracking?.long_pass_count || 0;

    // Check limits based on pass type
    if (passType === 'short' && shortCount >= 2) {
      return {
        allowed: false,
        reason: 'You have reached the maximum of 2 short passes per month.',
        shortPassCount: shortCount,
        longPassCount: longCount,
        hasSpecialPrivilege: false,
      };
    }

    if (passType === 'long' && longCount >= 1) {
      return {
        allowed: false,
        reason: 'You have reached the maximum of 1 long pass per month.',
        shortPassCount: shortCount,
        longPassCount: longCount,
        hasSpecialPrivilege: false,
      };
    }

    // Limits not reached, allow pass application
    return {
      allowed: true,
      shortPassCount: shortCount,
      longPassCount: longCount,
      hasSpecialPrivilege: false,
    };
  } catch (error) {
    console.error('Error checking pass limits:', error);
    throw error;
  }
}

/**
 * Updated applyForStudentPass function with pass limit validation
 */
export async function applyForStudentPass(formData: FormData, request: Request) {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: true,
        message: "You must be logged in to apply for a pass.",
      };
    }

    // Extract form data
    const passType = formData.get('passType') as 'short' | 'long';
    const reason = formData.get('reason') as string;
    const destination = formData.get('destination') as string;
    const departureDate = formData.get('departureDate') as string;
    const departureTime = formData.get('departureTime') as string;
    const returnDate = formData.get('returnDate') as string;
    const returnTime = formData.get('returnTime') as string;
    const emergencyContact = formData.get('emergencyContact') as string;
    const emergencyPhone = formData.get('emergencyPhone') as string;
    const additionalNotes = formData.get('additionalNotes') as string;

    // Validate required fields
    if (!passType || !reason || !destination || !departureDate || !departureTime || !emergencyContact || !emergencyPhone) {
      return {
        error: true,
        message: "Please fill in all required fields.",
      };
    }

    // Validate long pass return date/time
    if (passType === 'long' && (!returnDate || !returnTime)) {
      return {
        error: true,
        message: "Long passes require a return date and time.",
      };
    }

    // ✅ CHECK PASS LIMITS BEFORE CREATING PASS
    const limitCheck = await checkPassLimitBeforeSubmit(user.id, passType);

    if (!limitCheck.allowed) {
      return {
        error: true,
        message: limitCheck.reason || "Pass limit exceeded.",
      };
    }

    // Insert pass request
    const { data: pass, error: passError } = await supabase
      .from('pass')
      .insert({
        student_id: user.id,
        type: passType,
        reason,
        destination,
        departure_date: departureDate,
        departure_time: departureTime,
        return_date: passType === 'long' ? returnDate : null,
        return_time: passType === 'long' ? returnTime : null,
        emergency_contact_name: emergencyContact,
        emergency_contact_phone_number: emergencyPhone,
        additional_notes: additionalNotes,
        status: 'pending',
      })
      .select()
      .single();

    if (passError) {
      console.error('Error creating pass:', passError);
      return {
        error: true,
        message: passError.message || "Failed to submit pass request.",
      };
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'pass_requested',
      entity_type: 'pass',
      entity_id: pass.id,
      metadata: {
        pass_type: passType,
        destination,
      },
    });

    // NOTE: Pass count will be incremented automatically by the database trigger
    // when the pass status changes to 'cso_approved'

    return {
      error: false,
      message: "Pass request submitted successfully!",
      data: pass,
    };
  } catch (error) {
    console.error('Unexpected error in applyForStudentPass:', error);
    return {
      error: true,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}