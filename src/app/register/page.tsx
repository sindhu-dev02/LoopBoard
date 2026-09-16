"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";
import { PasswordStrengthHints } from "@/components/ui/PasswordStrengthHints";
import { getFirstPasswordError } from "@/lib/passwordRules";

const inputClass = cn(
  "w-full bg-surface border border-surface-border rounded-card",
  "px-3 py-2 text-sm text-ink placeholder:text-ink-faint",
  "focus:outline-none focus:ring-2 focus:ring-accent"
);

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const passwordError = getFirstPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setSubmitting(true);
    try {
      await register(name, role, email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-raised border border-surface-border rounded-card shadow-card p-6">
        <h1 className="text-xl font-semibold text-ink mb-1">Create your account</h1>
        <p className="text-sm text-ink-muted mb-6">Start tracking projects with Loopboard.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1">
              Name
            </label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-ink mb-1">
              Role
            </label>
            <input
              id="role"
              required
              placeholder="e.g. Frontend Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
              Email
            </label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <PasswordStrengthHints password={password} />
          </div>

          {error && <p className="text-sm text-status-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-4 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}