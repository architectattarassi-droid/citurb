import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router/routes";

/**
 * TOME@1 — Router
 * ITER1: React Router v6.4+ (createBrowserRouter) + P1..P6.
 * ITER2: guards + auth provider (TOME@5) + entitlements.
 */
export default function AppRouter() {
  return <RouterProvider router={router} />;
}
