/** UIUX.md §8 — fire toasts on mutations and KEEP THE VERB. Read-only views never toast.
 *  Errors surface the business reason from the API. */
import { toast } from "react-toastify";
import { ApiError } from "@/lib/api";

export function toastDone(verb: string) {
  toast.success(verb);
}

/** Map the API error envelope to the interface's voice. Falls back to the server message. */
export function toastApiError(err: unknown, fallback = "Something went wrong.") {
  if (err instanceof ApiError) {
    const byCode: Record<string, string> = {
      OVERSELL: "Can't fulfill — insufficient stock.",
      NEGATIVE_BALANCE: "That adjustment would take stock below zero.",
      RETURN_EXCEEDS_SHIPPED: "Can't return more than was shipped.",
      ILLEGAL_TRANSITION: "That isn't a legal step for this order.",
      QTY_EXCEEDS_ORDERED: "That exceeds the quantity ordered.",
      EMAIL_TAKEN: "That email already has an account.",
      LAST_ADMIN: "That would leave no active admin.",
    };
    const code = err.code;
    toast.warning((code && byCode[code]) || err.message || fallback);
    return;
  }
  toast.warning(fallback);
}
