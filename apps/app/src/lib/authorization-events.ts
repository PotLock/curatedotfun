type EventCallback = () => void;

class AuthorizationEventBus {
  private listeners: Record<string, EventCallback[]> = {};

  /**
   * Subscribe to an event
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback,
      );
    };
  }

  /**
   * Emit an event
   * @param event Event name
   */
  emit(event: string): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach((callback) => callback());
    }
  }
}

export const authorizationEvents = new AuthorizationEventBus();

export const AUTHORIZATION_EVENTS = {
  AUTHORIZATION_REVOKED: "authorization:revoked",
  AUTHORIZED: "authorization:authorized",
};

/**
 * Signal that authorization has been revoked
 * This should be called when the user explicitly revokes access or an action fails due to lack of authorization.
 */
export function signalAuthorizationRevoked(): void {
  // Emit event
  authorizationEvents.emit(AUTHORIZATION_EVENTS.AUTHORIZATION_REVOKED);

  // Remove persisted authorization state
  localStorage.removeItem("crosspost:authorized");
}
