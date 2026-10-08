// Session state for the web app: a token in localStorage, minted by
// `api.auth.login` from a LIFF ID token, resolved to a member by `api.auth.me`.

import { useAction, useMutation, useQuery } from "convex/react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  clearReloginFlag,
  getLiffIdToken,
  liffLogout,
  retryLiffLogin,
} from "./liff";

const TOKEN_KEY = "bestbefore.session";

export interface Member {
  id: Id<"members">;
  displayName: string | null;
  pictureUrl: string | null;
}

export interface HouseholdSettings {
  piggybackDays: number;
  reminderDays: number;
}

export type SessionState =
  | { kind: "loading" }
  | {
      kind: "ready";
      token: string;
      member: Member;
      settings: HouseholdSettings;
    }
  | { kind: "notMember"; retry: () => void }
  | { kind: "error"; message: string; retry: () => void };

interface SessionContextValue {
  state: SessionState;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

type Failure = { kind: "notMember" } | { kind: "error"; message: string };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string>(
    () => localStorage.getItem(TOKEN_KEY) ?? ""
  );
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);
  const me = useQuery(api.auth.me, token === "" ? "skip" : { token });
  const login = useAction(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);

  const needsLogin = token === "" || me === null;

  useEffect(() => {
    if (!needsLogin || failure || inFlight.current) {
      return;
    }
    inFlight.current = true;
    (async () => {
      try {
        if (token !== "" && me === null) {
          localStorage.removeItem(TOKEN_KEY);
          setToken("");
        }
        const idToken = await getLiffIdToken();
        if (idToken === null) {
          return; // redirecting to LINE Login
        }
        const result = await login({ idToken, userAgent: navigator.userAgent });
        switch (result.kind) {
          case "ok": {
            clearReloginFlag();
            localStorage.setItem(TOKEN_KEY, result.token);
            setToken(result.token);
            return;
          }
          case "notMember": {
            setFailure({ kind: "notMember" });
            return;
          }
          case "invalid": {
            const retrying = await retryLiffLogin();
            if (!retrying) {
              setFailure({
                kind: "error",
                message: `เข้าสู่ระบบไม่สำเร็จ: ${result.reason}`,
              });
            }
            return;
          }
          default: {
            const _exhaustive: never = result;
            return _exhaustive;
          }
        }
      } catch (error) {
        setFailure({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        inFlight.current = false;
      }
    })();
  }, [needsLogin, failure, token, me, login, attempt]);

  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((n) => n + 1);
  }, []);

  const logout = useCallback(async () => {
    if (token !== "") {
      try {
        await logoutMutation({ token });
      } catch {
        // The session may already be gone; local cleanup still happens.
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    await liffLogout();
    window.location.assign("/");
  }, [token, logoutMutation]);

  const state: SessionState = useMemo(() => {
    if (failure?.kind === "notMember") {
      return { kind: "notMember", retry };
    }
    if (failure?.kind === "error") {
      return { kind: "error", message: failure.message, retry };
    }
    if (token !== "" && me) {
      return { kind: "ready", member: me.member, settings: me.settings, token };
    }
    return { kind: "loading" };
  }, [failure, token, me, retry]);

  const value = useMemo(() => ({ logout, state }), [logout, state]);
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return ctx;
}

/** For pages that only render once the session is ready. */
export function useReadySession(): Extract<SessionState, { kind: "ready" }> {
  const { state } = useSession();
  if (state.kind !== "ready") {
    throw new Error("session is not ready");
  }
  return state;
}
