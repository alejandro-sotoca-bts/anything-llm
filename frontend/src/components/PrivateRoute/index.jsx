import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { FullScreenLoader } from "../Preloader";
import validateSessionTokenForUser from "../../utils/session";
import paths from "../../utils/paths";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "../../utils/constants";
import { userFromStorage } from "../../utils/request";
import System from "../../models/system";
import UserMenu from "../UserMenu";

// Used only for Multi-user mode only as we permission specific pages based on auth role.
// When in single user mode we just bypass any authchecks.
function useIsAuthenticated() {
  const [isAuthd, setIsAuthed] = useState(null);
  const [shouldRedirectToOnboarding, setShouldRedirectToOnboarding] =
    useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const {
        MultiUserMode,
        RequiresAuth,
        OpenAiKey = false,
        AzureOpenAiKey = false,
      } = await System.keys();

      // Check for the onboarding redirect condition
      if (
        !MultiUserMode &&
        !RequiresAuth && // Not in Multi-user AND no password set.
        !OpenAiKey &&
        !AzureOpenAiKey // AND no LLM API Key set at all.
      ) {
        setShouldRedirectToOnboarding(true);
        setIsAuthed(true);
        return;
      }

      if (!MultiUserMode && !RequiresAuth) {
        setIsAuthed(true);
        return;
      }

      // Single User password mode check
      if (!MultiUserMode && RequiresAuth) {
        const localAuthToken = localStorage.getItem(AUTH_TOKEN);
        if (!localAuthToken) {
          setIsAuthed(false);
          return;
        }

        const isValid = await validateSessionTokenForUser();
        setIsAuthed(isValid);
        return;
      }

      const localUser = localStorage.getItem(AUTH_USER);
      const localAuthToken = localStorage.getItem(AUTH_TOKEN);
      if (!localUser || !localAuthToken) {
        setIsAuthed(false);
        return;
      }

      const isValid = await validateSessionTokenForUser();
      if (!isValid) {
        localStorage.removeItem(AUTH_USER);
        localStorage.removeItem(AUTH_TOKEN);
        localStorage.removeItem(AUTH_TIMESTAMP);
        setIsAuthed(false);
        return;
      }

      setIsAuthed(true);
    };
    validateSession();
  }, []);

  return { isAuthd, shouldRedirectToOnboarding };
}

export function AdminRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding } = useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding()} />;
  }

  const user = userFromStorage();
  return isAuthd && user?.role === "admin" ? (
    <UserMenu>
      <Component />
    </UserMenu>
  ) : (
    <Navigate to={paths.home()} />
  );
}

export default function PrivateRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding } = useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" />;
  }

  return isAuthd ? (
    <UserMenu>
      <Component />
    </UserMenu>
  ) : (
    <Navigate to={paths.login()} />
  );
}
