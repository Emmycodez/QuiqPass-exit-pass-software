import { Code, FastForward } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";


export default function Logo({
  size = "md",
}: {

  size?: "sm" | "md" | "lg";
}) {
    return (
      <Link to="/" className="flex items-center space-x-2">
        <div className="bg-blue-500 rounded-full p-2">
          <span className="font-bold text-xl text-white">
            <FastForward className={cn("w-4 h-4 md:w-6 md:h-6", size === "lg" && "w-10 h-10")} />
          </span>
        </div>
        <span className={cn(" font-bold text-xl italic", size === "lg" && "text-4xl")}>
          quiq<span className="text-blue-500 not-italic">Pass</span>
        </span>
      </Link>
    );
  } 
