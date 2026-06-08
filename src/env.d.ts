import type { AuthUser } from "./lib/get-user";

declare global { 
  namespace App {
    interface Locals {
      user?: AuthUser | null;
      token?: string;
    }
  }
}

export {};
