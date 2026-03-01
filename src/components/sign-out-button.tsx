"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink hover:border-accent"
    >
      Sign out
    </button>
  );
}
