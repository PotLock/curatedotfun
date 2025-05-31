import { useEffect, useState } from "react";
import {
  AUTHORIZATION_EVENTS,
  authorizationEvents,
} from "../lib/authorization-events";

/**
 * Hook to check if the user has authorized the application.
 * Reads authorization status from localStorage.
 * @returns Boolean indicating authorization status (null while checking)
 */
export function useAuthorizationStatus() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = () => {
      try {
        const hasAuthorized =
          localStorage.getItem("crosspost:authorized") === "true";
        setIsAuthorized(hasAuthorized);
      } catch (error) {
        console.error(
          "Error checking localStorage authorization status:",
          error,
        );
        setIsAuthorized(false); // Default to not authorized if check fails
      }
    };

    checkAuthorization();

    const unsubscribeRevoked = authorizationEvents.subscribe(
      AUTHORIZATION_EVENTS.AUTHORIZATION_REVOKED,
      () => {
        setIsAuthorized(false);
      },
    );
    const unsubscribeAuthorized = authorizationEvents.subscribe(
      AUTHORIZATION_EVENTS.AUTHORIZED,
      checkAuthorization,
    );

    return () => {
      [unsubscribeRevoked, unsubscribeAuthorized].forEach((fn) => fn());
    };
  }, []);

  return isAuthorized;
}
