import { useCallback, useRef } from 'react';
import { useAppDispatch } from '../hooks';
import { addToast, removeToast } from '../store/toastSlice';
import { clearToastAction, registerToastAction } from '../utils/toastActions';

export interface DeferredDeleteArgs {
  /** Capitalized noun shown in messages, e.g. "Dashboard". */
  entity: string;
  /** Optimistically hides the row while the undo window is open. */
  remove: () => void;
  /** Puts the row back when the user clicks Undo. */
  restore: () => void;
  /** Performs the real API delete when the window closes. */
  commit: () => Promise<{ ok: boolean; error?: string }>;
  /** Undo window in milliseconds. */
  undoMs?: number;
}

/**
 * Deletes are committed after a short undo window. The row disappears
 * immediately, the toast offers Undo, and the API call only happens if the
 * window elapses. The handler lives in a module registry so Undo still works
 * after navigating to another page.
 */
export function useDeferredDelete() {
  const dispatch = useAppDispatch();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  return useCallback(
    (args: DeferredDeleteArgs) => {
      const undoMs = args.undoMs ?? 7000;
      const actionId = `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      args.remove();
      const toast = dispatch(
        addToast({
          message: `${args.entity} deleted`,
          type: 'success',
          durationMs: undoMs,
          action: { label: 'Undo', actionId },
        }),
      ).payload;

      const finish = async () => {
        timers.current.delete(actionId);
        clearToastAction(actionId);
        const result = await args.commit();
        if (!result.ok) {
          args.restore();
          dispatch(
            addToast({
              message: result.error ?? `Could not delete the ${args.entity.toLowerCase()}.`,
              type: 'error',
            }),
          );
        }
      };

      timers.current.set(actionId, setTimeout(finish, undoMs));

      registerToastAction(actionId, () => {
        const timer = timers.current.get(actionId);
        if (timer) clearTimeout(timer);
        timers.current.delete(actionId);
        clearToastAction(actionId);
        dispatch(removeToast(toast.id));
        args.restore();
        dispatch(addToast({ message: `${args.entity} restored`, type: 'info' }));
      });
    },
    [dispatch],
  );
}
