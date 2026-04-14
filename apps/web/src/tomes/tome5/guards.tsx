import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Capability } from "./rbac";
import { useAuth } from "./AuthProvider";

export function RequireAuth() {
  const auth = useAuth();
  const loc = useLocation();
  if (auth.loading) return <div>Loading…</div>;
  if (!auth.isAuthed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}

export function RequireCaps({ caps }: { caps: Capability[] }) {
  const auth = useAuth();
  const loc = useLocation();
  if (auth.loading) return <div>Loading…</div>;
  if (!auth.isAuthed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!auth.hasCaps(caps)) return <Navigate to="/forbidden" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}

export function RequireFeature({ feature }: { feature: string }) {
  const auth = useAuth();
  const loc = useLocation();
  if (auth.loading) return <div>Loading…</div>;
  if (!auth.hasFeature(feature)) return <Navigate to="/upgrade" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}
