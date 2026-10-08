import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";

import { SessionProvider } from "./lib/session";
import { routeTree } from "./routeTree.gen";

import "./index.css";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("Missing VITE_CONVEX_URL in .env.local");
}

const convex = new ConvexReactClient(CONVEX_URL);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.querySelector("#root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ConvexProvider>
  </React.StrictMode>
);
