"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/"
      });

      if (result?.error) {
        setError("Those credentials did not match a seeded BOW Universe account.");
        return;
      }

      router.push(result?.url ?? "/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue="commissioner@bow.local"
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none ring-0 placeholder:text-ink/35 focus:border-accent"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          defaultValue="bowuniverse"
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none ring-0 placeholder:text-ink/35 focus:border-accent"
        />
      </div>

      {error ? (
        <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
