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
  email: string
}

export type SessionData = {
    user: {
        name: string | null;
        image: string | null;
        // Add other properties you might need from the user object
    } | null;
} | null;


const roles = ['porter', 'CSO', 'Assistant CSO', 'Security']