// Add this to your actions.ts or pass-utils.ts file

import { supabase } from "supabase/supabase-client";
import type { PassRequest } from "types";
import toast from "react-hot-toast";

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

export const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to format time
export const formatTime = (timeString: string | null) => {
    if (!timeString) return "N/A";
    return timeString.slice(0, 5); // Convert "HH:MM:SS" to "HH:MM"
  };



// 2. Add this utility function to generate and download the pass (add after your handleViewDetails function):
export const generatePassDocument = (pass: PassRequest, studentName: string) => {
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    toast.error('Please allow pop-ups to download your pass');
    return;
  }

  const statusColor = pass.status === 'approved' ? '#10b981' : '#3b82f6';
  
  // Get the absolute URL for the logo
  const logoUrl = `${window.location.origin}/wellspring-logo.jpg`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Exit Pass - ${pass.id.slice(0, 8)}</title>
      <style>
        @media print {
          @page { 
            margin: 0.3in;
            size: A4;
          }
          .no-print { display: none; }
          body { padding: 0; }
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 20px;
          background: #f9fafb;
          color: black
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          color: white;
          padding: 20px;
          position: relative;
        }
        
        .logo-container {
          position: absolute;
          top: 15px;
          left: 15px;
        }
        
        .logo {
          height: 45px;
          width: auto;
          background: white;
          padding: 5px;
          border-radius: 6px;
        }
        
        .header-content {
          text-align: center;
          padding-top: 5px;
          color: black;
        }
        
        .header h1 {
          font-size: 22px;
          margin-bottom: 4px;
        }
        
        .header p {
          font-size: 12px;
          opacity: 0.9;
        }
        
        .status-badge {
          display: inline-block;
          background: ${statusColor};
          color: black;
          padding: 5px 12px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 6px;
        }
        
        .content {
          padding: 10px;
        }
        
        .section {
          margin-bottom: 15px;
        }
        
        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e3a8a;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        
        .info-item {
          padding: 8px;
          background: #f9fafb;
          border-radius: 4px;
        }
        
        .info-label {
          font-size: 10px;
          color: #6b7280;
          margin-bottom: 2px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .info-value {
          font-size: 12px;
          color: #111827;
          font-weight: 500;
        }
        
        .full-width {
          grid-column: 1 / -1;
        }
        
        .footer {
          padding: 12px 20px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          font-size: 10px;
          color: #6b7280;
          text-align: center;
        }
        
        .qr-section {
          text-align: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 4px;
          margin-top: 10px;
        }
        
        .pass-id {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #1e3a8a;
          font-weight: 600;
        }
        
        .buttons {
          text-align: center;
          margin-top: 15px;
          padding: 15px;
        }
        
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 25px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          margin: 0 8px;
        }
        
        button:hover {
          background: #2563eb;
        }
        
        .approval-section {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 4px;
          padding: 10px;
          margin-top: 8px;
        }
        
        .approval-title {
          color: #15803d;
          font-weight: 600;
          margin-bottom: 4px;
          font-size: 11px;
        }
        
        .approval-details {
          font-size: 10px;
          color: #166534;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-container">
            <img src="${logoUrl}" alt="Wellspring Logo" class="logo" onerror="this.style.display='none'" />
          </div>
          
          <div class="header-content">
            <h1>🎓 Exit Pass Authorization</h1>
            <p>Official Student Exit Permission Document</p>
            <div class="status-badge">${pass.status.toUpperCase()}</div>
          </div>
        </div>
        
        <div class="content">
          <!-- Student Information -->
          <div class="section">
            <div class="section-title">📋 Student Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Student Name</div>
                <div class="info-value">${studentName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Pass ID</div>
                <div class="info-value pass-id">${pass.id.slice(0, 12).toUpperCase()}</div>
              </div>
            </div>
          </div>
          
          <!-- Pass Details & Schedule Combined -->
          <div class="section">
            <div class="section-title">🎫 Pass Details & Schedule</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Pass Type</div>
                <div class="info-value">${pass.type === 'long' ? 'Long Pass' : 'Short Pass'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Destination</div>
                <div class="info-value">${pass.destination || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Departure</div>
                <div class="info-value">
                  ${new Date(`${pass.departure_date}T${pass.departure_time}`).toLocaleString('en-NG', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              ${pass.type === 'long' && pass.return_date ? `
              <div class="info-item">
                <div class="info-label">Return</div>
                <div class="info-value">
                  ${new Date(`${pass.return_date}T${pass.return_time || '00:00'}`).toLocaleString('en-NG', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              ` : ''}
              <div class="info-item full-width">
                <div class="info-label">Reason for Exit</div>
                <div class="info-value">${pass.reason || 'N/A'}</div>
              </div>
              ${pass.additional_notes ? `
              <div class="info-item full-width">
                <div class="info-label">Additional Notes</div>
                <div class="info-value">${pass.additional_notes}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Approval Information -->
          ${pass.cso_approved_at || pass.dsa_approved_at ? `
          <div class="section">
            <div class="section-title">✅ Approvals</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
              ${pass.dsa_approved_at ? `
              <div class="approval-section">
                <div class="approval-title">DSA Approved</div>
                <div class="approval-details">
                  ${new Date(pass.dsa_approved_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              ` : ''}
              ${pass.cso_approved_at ? `
              <div class="approval-section">
                <div class="approval-title">CSO Approved</div>
                <div class="approval-details">
                  ${new Date(pass.cso_approved_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          <!-- Verification -->
          <div class="qr-section">
            <div class="info-label" style="margin-bottom: 4px;">Verification Code</div>
            <div class="pass-id" style="font-size: 14px;">${pass.id.toUpperCase()}</div>
            <div style="margin-top: 4px; font-size: 9px; color: #6b7280;">
              Present to security when exiting campus
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Important:</strong> Valid only for dates/times above. Check out when leaving, check in upon return.</p>
          <p style="margin-top: 4px;">Generated: ${new Date().toLocaleDateString('en-NG')}</p>
        </div>
      </div>
      
      <div class="buttons no-print">
        <button onclick="window.print()">🖨️ Print Pass</button>
        <button onclick="window.close()">Close</button>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};