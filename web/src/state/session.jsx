// web/src/state/session.jsx
import { useContext } from "react";
import { SessionCtx } from "./sessionContext";

export function useSession() {
  const v = useContext(SessionCtx);
  if (!v) throw new Error("useSession must be used within SessionProvider");
  return v;
}
