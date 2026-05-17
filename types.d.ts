export interface TextInputProps {
  id: string;
  name: string;
  type: string;
  required: boolean;
  disabled: boolean;
  placeholder: string;
}
export interface PasswordInputProps {
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}


export interface OnboardingFormProps{
  firstName: string;
  lastName: string;
  email: string;
  hostels?: { id: string; name: string; gender: string }[];
}

export type SessionData = {
    user: {
        name: string | null;
        image: string | null;
        // Add other properties you might need from the user object
    } | null;
} | null;


export const roles = ['porter', 'CSO', 'Assistant CSO', 'Security']
export type PassType = "short" | "long"

export interface FormData {
  passType: PassType
  reason: string
  destination: string
  departureDate: string
  departureTime: string
  returnDate: string
  returnTime: string
  emergencyContact: string
  emergencyPhone: string
  additionalNotes: string
  parentNotification: boolean
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  gender: 'male' | 'female';
  matric_no?: string;
  department?: string;
  guardian_name?: string;
  guardian_phone_number?: string;
  level?: number;
  role?: roles
  photo_url?: string;
  hostel_id?: string;
  is_onboarded?: boolean;
  room_number?: string;
  created_at: string;
  updated_at: string;
}

export type PassRequest = {
    additional_notes: string;
    created_at: string;
    departure_date: string;
    departure_time: string;
    destination: string;
    emergency_contact_name: string;
    emergency_contact_phone_number: string;
    id: string;
    reason:string;
    requested_at: string;
    return_date: string;
    return_time: string;
    status: string;
    student_id: string;
    type: string;
    updated_at: string;
    dsa_approved_by: string;
    dsa_approved_at: string;
    cso_approved_at: string;
    cso_approved_by: string;
    rejected_by: string;
    rejected_at: string;
    rejection_reason: string;
    rejected_by_role: string;
    denial_reason: string;
    checked_out_at: string;
    checked_in_at: string;
}