import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "../../config/AuthContext.tsx";
import {
  ACCESS_TOKEN,
  LOGGED_IN_VIA,
  REFRESH_TOKEN,
} from "../../utils/constants.ts";

/**
 * Signs the user out of whichever session they hold - the Pecha token
 * session, Auth0, or both - and clears the stored tokens.
 *
 * Shared by the top navigation bar and the sidebar shell so the two never
 * drift apart on what "log out" has to clean up.
 */
export const useLogout = () => {
  const navigate = useNavigate();
  const { isLoggedIn, logout: pechaLogout } = useAuth() as {
    isLoggedIn: boolean;
    logout: () => void;
  };
  const { isAuthenticated, logout } = useAuth0();

  return (e?: MouseEvent) => {
    e?.preventDefault();
    localStorage.removeItem(LOGGED_IN_VIA);
    sessionStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    isLoggedIn && pechaLogout();
    isAuthenticated && logout();

    if (isLoggedIn && !isAuthenticated) {
      navigate("/login");
    }
  };
};
