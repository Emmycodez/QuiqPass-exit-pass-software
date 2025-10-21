import { Plus } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../ui/button";

interface DashboardHeadersProps {
  mainText: string;
  subText: string;
  buttonText?: string;
  buttonLink?: string;
}
const DashboardHeaders = ({
  mainText,
  subText,
  buttonText,
  buttonLink,
}: DashboardHeadersProps) => {
  return (
    <div className="flex items-center justify-between gap-4 p-4 w-full">
      <div className="flex-1">

        <h1 className="text-3xl font-bold text-foreground">{mainText}</h1>
        <p className="text-gray-800 text-md">{subText}.</p>
      </div>
      <div className="flex-shrink-0">
        {" "}
        {/* Prevent button from shrinking */}
        {buttonLink && buttonText && (
          <Link to={buttonLink || "#"}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {buttonText}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default DashboardHeaders;
