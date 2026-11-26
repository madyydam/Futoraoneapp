import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <img
      src={logo}
      alt="One Logo"
      className={cn("object-contain mix-blend-multiply dark:mix-blend-screen contrast-110", className)}
      decoding="async"
    />
  );
};
