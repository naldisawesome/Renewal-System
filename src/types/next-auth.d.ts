import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      mustChangePassword: boolean;
    };
  }
  interface User {
    id: string;
    role: Role;
    mustChangePassword: boolean;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    mustChangePassword: boolean;
    // Matches User.sessionVersion when the token was issued; a higher number in the database ends this session.
    sv?: number;
    // Set by the jwt callback's periodic DB re-check (lib/auth.ts) when the
    // account has been suspended/deleted since the token was issued.
    revoked?: boolean;
    // Timestamp (ms) of the last DB re-check, used to throttle that check.
    lastValidated?: number;
    // How this session started. Password sessions end when password sign-in is turned off.
    method?: "password" | "google";
  }
}
