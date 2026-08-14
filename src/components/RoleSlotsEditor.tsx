"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, Users2 } from "lucide-react";
import type { RoleInput } from "@/actions/roleActions";

interface RoleSlotsEditorProps {
  roles: RoleInput[];
  onChange: (roles: RoleInput[]) => void;
  disabled?: boolean;
}

/**
 * Editor for a project's role slots. Shared by the create wizard and the edit
 * form so the two can never drift.
 *
 * Leaving the list empty is a valid, supported choice — the listing then behaves
 * as a single-hire posting exactly as before roles existed.
 */
export function RoleSlotsEditor({ roles, onChange, disabled }: RoleSlotsEditorProps) {
  const update = (idx: number, patch: Partial<RoleInput>) =>
    onChange(roles.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const add = () =>
    onChange([...roles, { name: "", description: "", slots: 1, allowApprentice: false }]);

  const remove = (idx: number) => onChange(roles.filter((_, i) => i !== idx));

  const totalSlots = roles.reduce((sum, r) => sum + (Number(r.slots) || 0), 0);

  return (
    <div className="space-y-3 p-4 rounded-lg border border-hairline bg-surface-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Users2 className="h-4 w-4 text-muted" />
            Team Roles &amp; Slots
          </span>
          <span className="text-[11px] text-muted block mt-0.5">
            Define the positions you are hiring for. Freelancers apply to a specific role, and you
            assemble the team across them.
          </span>
        </div>
        {roles.length > 0 && (
          <span className="text-[11px] font-semibold text-ink bg-white border border-hairline px-2 py-1 rounded-full shrink-0">
            {roles.length} role{roles.length === 1 ? "" : "s"} · {totalSlots} slot
            {totalSlots === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {roles.length === 0 ? (
        <div className="py-4 text-center space-y-2">
          <p className="text-[11px] text-muted">
            No roles defined — this listing will hire a single freelancer, as normal.
          </p>
          <Button size="xs" variant="outline" onClick={add} disabled={disabled} className="cursor-pointer gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add a Role
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {roles.map((role, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border border-hairline rounded-lg space-y-2.5"
              >
                <div className="flex gap-2">
                  <input
                    value={role.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    placeholder="Role name, e.g. Frontend Developer"
                    disabled={disabled}
                    className="flex-1 h-9 px-3 rounded-md border border-hairline bg-white text-xs text-ink focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="text-[11px] text-muted uppercase tracking-wider">Slots</label>
                    <input
                      type="number"
                      min={1}
                      value={role.slots}
                      onChange={(e) => update(idx, { slots: Math.max(1, Number(e.target.value)) })}
                      disabled={disabled}
                      className="w-16 h-9 px-2 rounded-md border border-hairline bg-white text-xs text-ink text-center focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={disabled}
                    title="Remove role"
                    className="p-2 text-muted hover:text-danger rounded-full hover:bg-danger-surface cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <input
                  value={role.description || ""}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  placeholder="What this person will actually do (optional)"
                  disabled={disabled}
                  className="w-full h-9 px-3 rounded-md border border-hairline bg-white text-xs text-ink focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                />

                <label className="flex items-center gap-2 text-[11px] text-body cursor-pointer">
                  <input
                    type="checkbox"
                    checked={role.allowApprentice}
                    onChange={(e) => update(idx, { allowApprentice: e.target.checked })}
                    disabled={disabled}
                    className="accent-ink cursor-pointer"
                  />
                  Allow an apprentice to shadow this role
                  <span className="text-border-strong">
                    — a junior can assist and step in if the primary cannot finish
                  </span>
                </label>
              </div>
            ))}
          </div>

          <Button size="xs" variant="outline" onClick={add} disabled={disabled} className="cursor-pointer gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add Another Role
          </Button>

          {roles.some((r) => !r.name.trim()) && (
            <p className="text-[11px] text-warning">Every role needs a name before you can publish.</p>
          )}
        </>
      )}
    </div>
  );
}
