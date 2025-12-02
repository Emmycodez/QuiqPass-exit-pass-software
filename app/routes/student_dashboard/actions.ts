import { supabase } from "supabase/supabase-client";


export async function applyForStudentPass(formData: FormData, request: Request) {
  // Get authenticated student
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log("No user")
    return { error: true, message: "You must be logged in to apply for a pass." };
    
  }

  try {
    const fd = Object.fromEntries(formData.entries());
    console.log("This is fd: ", fd);

  // Extract and parse values
  const passType = fd.passType as string
  const reason = fd.reason.toString().trim();
  const destination = fd.destination.toString().trim();
  const departureDate = fd.departureDate?.toString();
  const departureTime = fd.departureTime?.toString();
  const returnDate = fd.returnDate?.toString() || null;
  const returnTime = fd.returnTime?.toString() || null;
  const emergencyContact = fd.emergencyContact?.toString().trim(); // note: name="contactName" in your form
  const emergencyPhone = fd.emergencyPhone?.toString().trim();
  const additionalNotes = fd.additonalNotes?.toString().trim() || fd.additionalNotes?.toString().trim() || ""; // typo fix fallback
  const parentNotification = true

  // Server-side validation (never trust client)
  if (!passType || !reason || !destination || !departureDate || !departureTime || !emergencyContact || !emergencyPhone) {
    return { error: true, message: "Please fill in all required fields." };
  }

  if (passType === "long" && (!returnDate || !returnTime)) {
    return { error: true, message: "Return date and time are required for long passes." };
  }


  // Fetch student profile to get guardian info and hostel
  const { data: student, error: studentError } = await supabase
    .from("student")
    .select("id, guardian_name, guardian_phone_number, hostel_id, first_name")
    .eq("id", user.id)
    .single();

  if (studentError || !student) {
    console.error("Student not found:", studentError);
    return { error: true, message: "Student profile not found." };
  }

  const { data: newPass, error: passError } = await supabase
  .from("pass")
  .insert({
    type: passType,
    student_id: student.id,
    reason,
    destination,
    additional_notes: additionalNotes,

    departure_date: departureDate,
    departure_time: departureTime,
    return_date: returnDate,
    return_time: returnTime,

    emergency_contact_name: emergencyContact,
    emergency_contact_phone_number: emergencyPhone,

    status: "pending",

    // requested_at is DATE, so format it correctly
    requested_at: new Date().toISOString().split("T")[0],
  })
  .select().single();

  if (passError || !newPass) {
    console.error("Pass insertion error:", passError);
    return { error: true, message: "Failed to submit pass request. Please try again." };
  }

  await supabase.from("audit_log").insert({
    user_id: student.id,
    action: "requested",
  });


  // TODO: Implement sending notification to only the porter of the students hostel
  // Optional: Create system notification for staff/porter
  // You can filter porters/CSO later based on hostel
  const { data: staffMembers } = await supabase
    .from("staff")
    .select("id")
    .in("role", ["DSA", "CSO", "Assistant CSO"]);

  if (staffMembers?.length) {
    const notifications = staffMembers.map(staff => ({
      recipient_id: staff.id,
      recipient_type: "staff",
      pass_id: newPass.id,
      message: `New ${passType} pass request from ${student.id}`,
      type: "system",
      sent: false,
    }));

    await supabase.from("notification").insert(notifications);
  }

  // If parent notification requested and guardian exists, queue SMS/email later

  // TODO: Implement SMS and email notifications for parents
  if (parentNotification && student.guardian_name && student.guardian_phone_number) {
    await supabase.from("notification").insert({
      recipient_id: student.id,
      recipient_type: "student",
      pass_id: newPass.id,
      message: `WellSpring Guardian Notification: Your child ${student.first_name} has requested a ${passType} exit pass.`,
      type: "system", // or email
      metadata: {
        phone: student.guardian_phone_number,
        name: student.guardian_name,
        recipient_role: "guardian"
      },
    });
  }

  return { error: false, pass: newPass };
  } catch (error) {
    console.log("Error applying for exit pass: ", error);
    return {
      error: true,
      message: "Error applying for exit pass"

    }
  }



}
