"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import { AuthShell, TALENT_PANEL } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { changeOwnPassword } from "@/actions/authActions";
import { homeForRole } from "@/lib/session";
import type { Role } from "@/lib/types";

/**
 * SEC-002 — the other half of the plaintext migration.
 *
 * A credential upgraded from legacy plaintext gets `passwordChangeRequired`
 * set, because bcrypt-hashing a password the platform once stored in the clear
 * protects it going forward but does not un-expose it. This is where the owner
 * replaces it with one that was never stored that way.
 */
export function PasswordClient({
  required,
  role,
}: {
  required: boolean;
  role: Role;
}) {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }

    setSaving(true);
    const result = await changeOwnPassword({ currentPassword, newPassword });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDone(true);
    router.refresh();
    router.push(homeForRole(role));
  };

  return (
    <AuthShell panel={TALENT_PANEL}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-semibold leading-tight text-[var(--color-text-primary)]">
            {required ? "Choose a new password" : "Change your password"}
          </h1>
          {required && (
            <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
              Your old password was held in a form we no longer consider safe. It has
              been secured, but please pick a new one so your credential has never
              been stored in the clear.
            </p>
          )}
        </div>

        {error && <Alert tone="error">{error}</Alert>}
        {done && <Alert tone="success">Your password has been changed.</Alert>}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Current password" required>
            <Input
              type={reveal ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              leftIcon={<Lock className="h-4 w-4" />}
              required
            />
          </Field>

          <Field label="New password" required help="At least 8 characters.">
            <Input
              type={reveal ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              leftIcon={<Lock className="h-4 w-4" />}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? "Hide passwords" : "Show passwords"}
                  className="text-[var(--color-text-muted)]"
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              required
            />
          </Field>

          <Field label="Confirm new password" required>
            <Input
              type={reveal ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              leftIcon={<Lock className="h-4 w-4" />}
              required
            />
          </Field>

          <Button type="submit" loading={saving} block className="mt-1">
            Change password
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
