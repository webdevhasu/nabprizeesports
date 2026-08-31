import { useEffect, useRef, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../firebase/config";

/**
 * Returns getNow() = server-corrected Date.now().
 * Uses Firebase RTDB .info/serverTimeOffset to catch device clock cheating.
 * Falls back to Date.now() if RTDB unavailable.
 */
export function useServerTime() {
  const offsetRef = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const node = ref(rtdb, ".info/serverTimeOffset");
      const unsub = onValue(
        node,
        (snap) => {
          offsetRef.current = snap.val() || 0;
          setReady(true);
        },
        () => { setReady(true); }
      );
      return unsub;
    } catch {
      setReady(true);
    }
  }, []);

  const getNow = () => Date.now() + offsetRef.current;
  return { getNow, ready };
}
