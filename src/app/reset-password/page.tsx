"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { PasswordStrengthHints } from "@/components/ui/PasswordStrengthHints";
import { getFirstPasswordError } from "@/lib/passwordRules";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }
    const passwordError = getFirstPasswordError(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This reset link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-raised border border-surface-border rounded-card shadow-card p-6">
        <h1 className="text-xl font-semibold text-ink mb-1">Set a new password</h1>

        {done ? (
          <p className="text-sm text-ink mt-4">Password updated. Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-ink mb-1">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={cn(
                  "w-full bg-surface border border-surface-border rounded-card",
                  "px-3 py-2 text-sm text-ink placeholder:text-ink-faint",
                  "focus:outline-none focus:ring-2 focus:ring-accent"
                )}
              />
              <PasswordStrengthHints password={newPassword} />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink mb-1">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "w-full bg-surface border border-surface-border rounded-card",
                  "px-3 py-2 text-sm text-ink placeholder:text-ink-faint",
                  "focus:outline-none focus:ring-2 focus:ring-accent"
                )}
              />
            </div>

            {error && <p className="text-sm text-status-danger">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        <p className="text-sm text-ink-muted mt-4 text-center">
          <Link href="/login" className="text-accent font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-raised border border-surface-border rounded-card shadow-card p-6">
        <p className="text-sm text-ink-muted">Loading...</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}