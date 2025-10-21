import { redirect } from "react-router";
import type { Route } from "./+types/onboarding";
import OnboardingForm from "./_components/onboarding-form";
import { fetchOnboardingFormData } from "./actions/fetchOnboardingFormData";
import { submitOnboardingFormData } from "./actions/submitOnboardingFormData";
import toast from "react-hot-toast";
import { checkIsOnboarded } from "./actions/checkIsOnboarded";

export async function clientLoader() {
  const onboarded = await checkIsOnboarded();
  if (onboarded.isOnboarded) {
    return redirect("/student-dashboard");
  }
  const res = await fetchOnboardingFormData();
  return res;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  console.log(Object.fromEntries(formData));
  const res = await submitOnboardingFormData(formData);
  if (!res.error) {
    toast.success("Onboarding Successful!");
    return redirect("/student-dashboard");
  } else {
    toast.error(res.message || "Onboarding Failed. Please try again.");
  }

  return res;
}

const OnboardingPage = ({ loaderData }: Route.ComponentProps) => {
  const onboardingPrefillData = {
    email: loaderData.user?.email || "",
    firstName: loaderData.user?.first_name || "",
    lastName: loaderData.user?.last_name || "",
  };

  if (loaderData.status === 302) {
   return redirect("/login");
  }

  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 90%, #fff 40%, #6366f1 100%)",
        }}
      />
      <div className="relative z-10 flex justify-center items-center min-h-screen">
        <OnboardingForm data={onboardingPrefillData} />
      </div>
    </div>
  );
};

export default OnboardingPage;
