// dispatchSafely — small wrapper around a Redux thunk dispatch that
// guarantees the unwrapped rejection is *handled* (no React error
// overlay), surfaces the error via the standard right-side Notification
// toast, and returns a promise that resolves with the action payload on
// success or `null` on failure.
//
// Use this anywhere a save / submit handler dispatches a createAsyncThunk
// — it removes the need for repeating try/catch + Notification + finally
// blocks across modules.
//
// Usage:
//   const ok = await dispatchSafely(
//     dispatch(updatePfi({ id, data: payload })),
//     { errorTitle: "Save failed" }
//   );
//   if (ok) navigate(...);
//
// The function is intentionally generic — no module-specific knowledge.

import Notification from "@components/toast/notification";

/**
 * @param actionPromise   A dispatched thunk (the value returned by
 *                        `dispatch(myThunk(...))`).
 * @param opts
 *   - silent       if true, suppress the error toast (useful when the
 *                  caller already shows its own UI for the error)
 *   - errorTitle   override the toast title (default: "Error")
 *   - onError      optional callback invoked with the error message
 *
 * @returns Promise<payload | null>
 */
export async function dispatchSafely(actionPromise, opts = {}) {
  const { silent = false, errorTitle = "Error", onError } = opts;
  try {
    const payload =
      typeof actionPromise?.unwrap === "function"
        ? await actionPromise.unwrap()
        : await actionPromise;
    return payload ?? null;
  } catch (err) {
    const message =
      (typeof err === "string" && err) ||
      err?.message ||
      err?.payload ||
      "Something went wrong";
    onError?.(message);
    if (!silent) Notification(errorTitle, message, "warning");
    return null;
  }
}

export default dispatchSafely;
