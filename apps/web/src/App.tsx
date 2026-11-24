import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Link, Navigate, Route, Routes } from "react-router";
import queryClient from "./Utils/QueryConfig";
import Loader from "./LazyLoading/Loader";
import {
  LazyDashboardPage,
  LazyLandingPage,
  LazyLoginPage,
  LazyRegisterPage,
  LazyTestPage,
} from "./LazyLoading/LazyLoading";
import { loadSession } from "./store/session";
import { useAppDispatch, useAppSelector } from "./store/store";

function SessionUnavailable() {
  const dispatch = useAppDispatch();
  const checking = useAppSelector((state) => state.session.requestId !== null);

  return (
    <main className="grid min-h-svh place-items-center bg-[#f5f4f8] px-6 text-[#191826]">
      <div className="w-full max-w-sm rounded-2xl border border-[#e3e1eb] bg-white p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Can’t check your session</h1>
        <p className="mt-2 text-[#56596c]">MotionDock couldn’t load your account. Try again to open your workspace.</p>
        <button
          className="mt-6 cursor-pointer rounded-lg bg-[#4b3bcc] px-4 py-2 font-semibold text-white hover:bg-[#3b2daa] disabled:cursor-wait disabled:opacity-70"
          type="button"
          disabled={checking}
          onClick={() => void dispatch(loadSession())}
        >
          {checking ? "Checking…" : "Try again"}
        </button>
        <Link className="ml-4 font-semibold text-[#4b3bcc] hover:underline" to="/login">Sign in</Link>
      </div>
    </main>
  );
}

function AppRoutes() {
  const { user, status } = useAppSelector((state) => state.session);

  if (status === "checking") {
    return (
      <main className="grid min-h-svh place-content-center gap-4 text-center" role="status">
        <Loader />
        <p>Checking your session…</p>
      </main>
    );
  }

  const dashboardRedirect = <Navigate to="/dashboard" replace />;
  const dashboard = user ? <LazyDashboardPage user={user} /> : <Navigate to="/login" replace />;

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={user ? dashboardRedirect : <LazyLandingPage />} />
        <Route path="/login" element={user ? dashboardRedirect : <LazyLoginPage />} />
        <Route path="/register" element={user ? dashboardRedirect : <LazyRegisterPage />} />
        <Route path="/dashboard" element={status === "unavailable" ? <SessionUnavailable /> : dashboard} />
        <Route path="/test" element={<LazyTestPage />} />
        <Route path="*" element={<div className="p-10 text-center font-bold text-red-500">404 | Page Not Found</div>} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" reverseOrder={false} />
      <Router>
        <AppRoutes />
      </Router>
    </QueryClientProvider>
  );
}
