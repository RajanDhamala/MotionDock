import { isAxiosError } from "axios";
import { Clapperboard, Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import api from "../Utils/AxiosWrapper";
import { loadSession } from "../store/session";
import { useAppDispatch } from "../store/store";
import "./auth.css";

type AuthMode = "login" | "register";

const submitLabels = {
  login: { ready: "Sign in", pending: "Signing in…" },
  register: { ready: "Create account", pending: "Creating account…" },
};

function errorMessage(error: unknown, action: AuthMode) {
  if (isAxiosError(error)) {
    if (action === "login" && error.response?.status === 401) {
      return "The email or password is incorrect.";
    }

    if (action === "register" && error.response?.status === 409) {
      return "An account already exists for this email. Sign in to continue.";
    }

    if (!error.response || error.response.status === 502 || error.response.status === 503) {
      return "Couldn’t reach MotionDock. Please try again.";
    }
  }

  const messages = {
    login: "Couldn’t sign you in. Please try again.",
    register: "Couldn’t create your account. Please try again.",
  };
  return messages[action];
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();
  const request = useRef<AbortController | null>(null);
  const registeredEmail = typeof state?.registeredEmail === "string" ? state.registeredEmail : "";
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const registering = mode === "register";
  const title = registering ? "Create your account" : "Sign in";

  useEffect(() => {
    document.title = `${title} | MotionDock`;
    return () => {
      document.title = "MotionDock";
      request.current?.abort();
    };
  }, [title]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;

    setError("");
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "").trim();
    const password = String(fields.get("password") ?? "");
    const fullname = String(fields.get("fullname") ?? "").trim();

    if (registering && !fullname) {
      setError("Enter your full name.");
      return;
    }

    if (registering && new TextEncoder().encode(password).length > 72) {
      setError("Your password must be 72 bytes or fewer. Some characters use more than one byte.");
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setPending(true);

    try {
      const credentials = { email, password };
      const payload = registering ? { ...credentials, fullname } : credentials;
      const response = await api.post(`/users/${mode}`, payload, { signal: controller.signal });
      if (controller.signal.aborted) return;

      const expectedStatus = registering ? 201 : 200;
      const contentType = response.headers["content-type"];
      if (response.status !== expectedStatus || typeof contentType !== "string" || !contentType.startsWith("application/json")) {
        setError(errorMessage(undefined, mode));
        return;
      }

      if (registering) {
        navigate("/login", { replace: true, state: { registeredEmail: email } });
        return;
      }

      const session = await dispatch(loadSession());
      if (!controller.signal.aborted && (!loadSession.fulfilled.match(session) || !session.payload)) {
        setError("Couldn’t verify your session. Please try signing in again.");
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(errorMessage(error, mode));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-cover">
        <Link className="auth-brand" to="/">
          <span className="auth-brand-icon"><Clapperboard size={21} aria-hidden="true" /></span>
          MotionDock
        </Link>
      </header>

      <section className="auth-main" aria-labelledby="auth-title">
        <p className="auth-switch">
          {registering ? "Already have an account?" : "New to MotionDock?"}{" "}
          <Link to={registering ? "/login" : "/register"}>
            {registering ? "Sign in" : "Create an account"}
          </Link>
        </p>

        <div className="auth-content">
          <h1 id="auth-title">{title}</h1>
          {!registering && registeredEmail && (
            <p className="auth-notice" role="status">Account created. Sign in to continue.</p>
          )}

          <form className="auth-form" onSubmit={submit} aria-busy={pending}>
            {registering && (
              <div className="auth-field">
                <label htmlFor="auth-name">Full name</label>
                <input id="auth-name" name="fullname" autoComplete="name" maxLength={50} required />
              </div>
            )}
            <div className="auth-field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete={registering ? "email" : "username"}
                autoCapitalize="none"
                spellCheck={false}
                defaultValue={registeredEmail}
                maxLength={50}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-password">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={registering ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="auth-password"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={pending}>
              {submitLabels[mode][pending ? "pending" : "ready"]}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
