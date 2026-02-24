import { BrainCircuit } from "lucide-react";
import { signInWithGoogle } from "./actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginVisual } from "./LoginVisual";
import LogoText from "@/components/common/LogoText";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard/projects");

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: "100dvh", background: "var(--background)" }}
    >
      <style>{`
        @keyframes lp-enter {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .lp-e0 { animation: lp-enter 0.6s ease forwards 0ms;   opacity: 0; }
        .lp-e1 { animation: lp-enter 0.6s ease forwards 80ms;  opacity: 0; }
        .lp-e2 { animation: lp-enter 0.6s ease forwards 160ms; opacity: 0; }
        .lp-e3 { animation: lp-enter 0.6s ease forwards 240ms; opacity: 0; }
        .lp-e4 { animation: lp-enter 0.6s ease forwards 310ms; opacity: 0; }
        .lp-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 11px 20px;
          border-radius: 12px;
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--foreground);
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .lp-google-btn:hover {
          background: var(--accent);
          border-color: oklch(0.6724 0.1308 38.7559 / 0.38);
          box-shadow: 0 0 0 3px oklch(0.6724 0.1308 38.7559 / 0.10);
        }
        .lp-google-btn:active {
          transform: scale(0.99);
        }
      `}</style>

      {/* ── Left panel (1/3) ─────────────────────────────── */}
      <div
        className="flex flex-col justify-between overflow-y-auto w-full lg:w-1/3 shrink-0 p-10 border-r border-border"
      >
        {/* Logo */}
        <div className="lp-e0 flex items-center gap-2.5">
          <LogoText />
        </div>

        {/* Form area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Heading */}
          <div className="flex flex-col gap-y-2">
            <h1 className="text-5xl font-medium font-[font--eb-garamond]">
              Sign in to Rely
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--muted-foreground)",
                lineHeight: 1.6,
              }}
            >
              Ask questions. Get answers backed by your documents.
            </p>
          </div>

          {/* Divider */}
          <div className="lp-e2" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              continue with
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Google sign-in */}
          <form action={signInWithGoogle} className="lp-e3">
            <Button type="submit" variant="outline" size={"lg"} className="w-full p-5">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p
          className="lp-e4"
          style={{
            fontSize: 11,
            color: "var(--muted-foreground)",
            lineHeight: 1.7,
          }}
        >
          By signing in, you agree to our{" "}
          <span style={{ textDecoration: "underline", cursor: "pointer" }}>
            terms of service
          </span>
          .<br />
          No password required.
        </p>
      </div>

      {/* ── Right panel (2/3) ────────────────────────────── */}
      <div className="flex-1 min-w-0 w-full h-full lg:w-2/3">
        <LoginVisual />
      </div>
    </div>
  );
}
