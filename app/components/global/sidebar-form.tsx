import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { SidebarInput } from "~/components/ui/sidebar";

export function SidebarFeedbackForm() {
  return (
    <Card className="gap-2 shadow-none w-[220px] ml-4 mt-auto">
      <CardHeader className="px-4">
        <CardTitle className="text-sm uppercase ">
          Report Issues Here
        </CardTitle>
        <CardDescription>
          Please write any feedback or issues you encounter while using the DSA
          Dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <form>
          <div className="grid gap-2.5">
            <SidebarInput type="text" placeholder="issue..." />
            <Button
              className="bg-sidebar-primary text-sidebar-primary-foreground w-full shadow-none"
              size="sm"
            >
              Report
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
