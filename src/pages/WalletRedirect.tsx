import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CartoonLoader } from "@/components/CartoonLoader";

/**
 * Legacy redirect kept only for backwards route compatibility.
 * All wallet operations are 100% self-contained in-app at /wallet.
 */
const WalletRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/wallet", { replace: true });
  }, [navigate]);

  return <CartoonLoader />;
};

export default WalletRedirect;
