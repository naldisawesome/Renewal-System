"use client";

import { SessionProvider } from "next-auth/react";
import ThemeProvider from "./ThemeProvider";
import NavProgress from "./NavProgress";
import ProblemReporter from "./ProblemReporter";
import ServiceWorker from "./ServiceWorker";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <NavProgress />
        <ProblemReporter />
        <ServiceWorker />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
