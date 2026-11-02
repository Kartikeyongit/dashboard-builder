/**
 * Toast actions are referenced from Redux by id, so the store stays
 * serializable. Components register the handler while the action is live and
 * unregister it when the undo window closes.
 */
type ToastActionHandler = (payload?: unknown) => void;

const handlers = new Map<string, ToastActionHandler>();

export function registerToastAction(actionId: string, handler: ToastActionHandler): () => void {
  handlers.set(actionId, handler);
  return () => {
    if (handlers.get(actionId) === handler) {
      handlers.delete(actionId);
    }
  };
}

export function clearToastAction(actionId: string): void {
  handlers.delete(actionId);
}

/** Runs a registered action. Returns false when it already expired. */
export function runToastAction(actionId: string, payload?: unknown): boolean {
  const handler = handlers.get(actionId);
  if (!handler) return false;
  handler(payload);
  return true;
}
