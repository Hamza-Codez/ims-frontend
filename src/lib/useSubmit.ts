"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs a mutating handler at most once at a time.
 *
 * The guard has to be a ref, not state. The obvious version does not work:
 *
 *     const [busy, setBusy] = useState(false);
 *     async function create() {
 *       if (busy) return;        // reads the value captured when this render happened
 *       setBusy(true);           // queues a re-render; `busy` is still false right now
 *       ...
 *     }
 *
 * `setBusy(true)` does not change `busy` for the currently-executing handler, and React does not
 * re-render between two clicks in the same batch. Three fast clicks all run against `busy ===
 * false` and all three fire the request — which is exactly the "same request invoked 3 times"
 * behaviour this replaces. `disabled={busy}` has the same lag: the button is not actually
 * disabled until the re-render lands, and on a slow machine that is several frames away.
 *
 * `busyRef.current` is assigned synchronously, so the second click sees it on the same tick. The
 * `busy` state exists only to drive the label and the disabled attribute.
 */
export function useSubmit() {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      busyRef.current = false;
      // The handler usually closes a modal, and closing it can unmount this component before the
      // promise settles. Setting state then is a no-op warning at best.
      if (mounted.current) setBusy(false);
    }
  }, []);

  return { busy, run };
}
