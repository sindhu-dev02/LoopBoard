"use client";

import { Check, X } from "lucide-react";
import { passwordRequirements } from "@/lib/passwordRules";
import { cn } from "@/lib/utils";

interface PasswordStrengthHintsProps {
  password: string;
  // Hides the list until the user has started typing, so an empty field
  // doesn't greet them with a wall of red X's before they've done anything.
  hideWhenEmpty?: boolean;
  className?: string;
}

export function PasswordStrengthHints({
  password,
  hideWhenEmpty = true,
  className,
}: PasswordStrengthHintsProps) {
  if (hideWhenEmpty && password.length === 0) return null;

  return (
    <ul className={cn("mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1", className)}>
      {passwordRequirements.map((req) => {
        const met = req.test(password);
        return (
          <li
            key={req.id}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              met ? "text-status-success" : "text-ink-faint"
            )}
          >
            {met ? (
              <Check className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 shrink-0" />
            )}
            {req.label}
          </li>
        );
      })}
    </ul>
  );
}