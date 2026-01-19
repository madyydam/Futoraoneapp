import logo from "@/assets/futora-logo-v2.png";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <img
      src={logo}
      alt="FutoraOne Logo"
      className={className}
    />
  );
};
