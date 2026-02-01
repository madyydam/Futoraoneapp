import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <img
      src={logo}
      alt="FutoraOne Logo"
      className={cn("object-contain mix-blend-screen contrast-125", className)}
      decoding="async"
    />
  );
};
