"use client";

import { createContext, useContext } from "react";

const FeatureContext = createContext<string[]>([]);

/** Tells client components which features are switched off for the person looking at the screen. */
export function FeatureProvider({ off, children }: { off: string[]; children: React.ReactNode }) {
  return <FeatureContext.Provider value={off}>{children}</FeatureContext.Provider>;
}

/** True while the feature is on for this person (the owner always sees everything). */
export function useFeature(key: string): boolean {
  return !useContext(FeatureContext).includes(key);
}

/** Shows its children only while the feature is on for this person. */
export function Feature({ name, children }: { name: string; children: React.ReactNode }) {
  return useFeature(name) ? <>{children}</> : null;
}
