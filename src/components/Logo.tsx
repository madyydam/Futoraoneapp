import logo from "@/assets/futora-logo-v2.png";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <img
      src={logo}
      alt="FutoraOne Logo"
      className={className}
      width="150"
      height="40"
      decoding="async"
    />
  );
};
