"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HeartHandshake, Clock, Wallet, CalendarClock, Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { releaseStipendPayment } from "@/actions/stipendPaymentActions";
import { addWorkLog, reviewWorkLog, deleteWorkLog, releaseHourlyPayment } from "@/actions/hourlyLogActions";
import { savePaymentStage, deletePaymentStage, fundPaymentStage, submitPaymentStage, reviewPaymentStage, releasePaymentStage } from "@/actions/paymentStageActions";
import {
  getProjectMetadataDirect,
  getCurrencySymbol,
  DEFAULT_CURRENCY,
  STIPEND_FREQUENCIES,
  type CompensationType,
} from "@/lib/workflowHelpers";

interface WorkspaceFundingProps {
  /** Raw project description; the compensation metadata is read from it. */
  projectDescription: string | null | undefined;
  projectId?: string;
  /** Only the owning company may add, edit or delete Fixed Price stages. */
  canManageStages?: boolean;
  /** Hired freelancers may submit a funded stage for review. */
  canSubmitStages?: boolean;
  /** Hired freelancers on the project, for per-freelancer stage funding. */
  teamOptions?: { applicationId: string; name: string }[];
  /** Viewing user, so a freelancer only sees their own work logs. */
  currentUserId?: string;
  /** The viewing freelancer own application, so they see only their stipend. */
  currentApplicationId?: string;
  projectBudget: number;
  /** Escrowed and released totals already computed by the workspace. */
  fundsEscrowed: number;
  fundsPaid: number;
  /** Hours already recorded elsewhere in the app, when such data exists. */
  trackedHours?: number | null;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border border-[#dddddd] bg-white p-4 shadow-2xs rounded-[12px]">
      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="mt-1.5 block text-lg font-extrabold text-[#181d26]">{value}</span>
      {hint && <span className="mt-1 block text-[8px] font-semibold text-slate-400">{hint}</span>}
    </Card>
  );
}

/**
 * One Funding / Payments module whose sections switch on the project's
 * compensation type. Milestone projects are handled by the workspace's own
 * existing escrow UI and never reach this component.
 */
export function WorkspaceFunding({
  projectDescription,
  projectId,
  canManageStages = false,
  canSubmitStages = false,
  teamOptions = [],
  currentUserId,
  currentApplicationId,
  projectBudget,
  fundsEscrowed,
  fundsPaid,
  trackedHours,
}: WorkspaceFundingProps) {
  // Stage editing state. Seeded from metadata and kept in sync after each save.
  const seededStages = React.useMemo(
    () => getProjectMetadataDirect(projectDescription || "").paymentStages ?? [],
    [projectDescription]
  );
  const [stageList, setStageList] = React.useState<any[]>(seededStages);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [form, setForm] = React.useState({ title: "", description: "", amount: "", applicationId: "" });
  const [selectedApp, setSelectedApp] = React.useState("ALL");
  const [showStageForm, setShowStageForm] = React.useState(false);
  const [stageError, setStageError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [fundingStage, setFundingStage] = React.useState<any | null>(null);
  const [fundAmount, setFundAmount] = React.useState("");
  const [submittingStage, setSubmittingStage] = React.useState<any | null>(null);
  const [submitNote, setSubmitNote] = React.useState("");
  const seededLogs = React.useMemo(() => getProjectMetadataDirect(projectDescription || "").hourlyLogs ?? [], [projectDescription]);
  const [logList, setLogList] = React.useState<any[]>(seededLogs);
  const [showLogForm, setShowLogForm] = React.useState(false);
  const [logForm, setLogForm] = React.useState({ date: "", hours: "", description: "" });
  const [logError, setLogError] = React.useState<string | null>(null);
  const [savingLog, setSavingLog] = React.useState(false);
  const seededPayments = React.useMemo(() => getProjectMetadataDirect(projectDescription || "").hourlyPayments ?? [], [projectDescription]);
  const [paymentList, setPaymentList] = React.useState<any[]>(seededPayments);
  const [payAmount, setPayAmount] = React.useState("");
  const seededStipends = React.useMemo(() => getProjectMetadataDirect(projectDescription || "").stipendPayments ?? [], [projectDescription]);
  const [stipendList, setStipendList] = React.useState<any[]>(seededStipends);

  const runStipendAction = async (fn: () => Promise<any>) => {
    setLogError(null);
    const res = await fn();
    if (res?.success) setStipendList(res.payments || []);
    else setLogError(res?.error || "Payment failed.");
  };

  const runPayAction = async (fn: () => Promise<any>) => {
    setLogError(null);
    const res = await fn();
    if (res?.success) { setPaymentList(res.payments || []); setPayAmount(""); }
    else setLogError(res?.error || "Payment failed.");
  };

  const runLogAction = async (fn: () => Promise<any>) => {
    setLogError(null);
    const res = await fn();
    if (res?.success) setLogList(res.logs || []);
    else setLogError(res?.error || "Action failed.");
  };

  const submitWorkLog = async () => {
    if (!projectId) return;
    setSavingLog(true);
    await runLogAction(async () => {
      const res = await addWorkLog(projectId, { date: logForm.date, hours: Number(logForm.hours), description: logForm.description });
      if (res.success) { setShowLogForm(false); setLogForm({ date: "", hours: "", description: "" }); }
      return res;
    });
    setSavingLog(false);
  };

  React.useEffect(() => setStageList(seededStages), [seededStages]);
  React.useEffect(() => setLogList(seededLogs), [seededLogs]);
  React.useEffect(() => setPaymentList(seededPayments), [seededPayments]);
  React.useEffect(() => setStipendList(seededStipends), [seededStipends]);

  const openStageForm = (stage?: any) => {
    setShowStageForm(true);
    setEditing(stage ?? null);
    setForm({
      title: stage?.title ?? "",
      description: stage?.description ?? "",
      amount: stage ? String(stage.amount ?? "") : "",
      applicationId: stage?.applicationId ?? "",
    });
    setStageError(null);
  };

  const submitStage = async () => {
    if (!projectId) return;
    setSaving(true);
    setStageError(null);
    const res = await savePaymentStage(projectId, {
      id: editing?.id,
      title: form.title,
      description: form.description,
      amount: Number(form.amount),
      applicationId: form.applicationId || undefined,
    });
    if (res.success) {
      setStageList(res.stages || []);
      setShowStageForm(false);
      setEditing(null);
      setForm({ title: "", description: "", amount: "", applicationId: "" });
    } else {
      setStageError(res.error || "Could not save the stage.");
    }
    setSaving(false);
  };

  // One handler for every lifecycle transition; the server owns the rules.
  const runStageAction = async (fn: () => Promise<any>) => {
    setStageError(null);
    const res = await fn();
    if (res?.success) setStageList(res.stages || []);
    else setStageError(res?.error || "Action failed.");
  };

  const removeStage = async (stageId: string) => {
    if (!projectId) return;
    setStageError(null);
    const res = await deletePaymentStage(projectId, stageId);
    if (res.success) setStageList(res.stages || []);
    else setStageError(res.error || "Could not delete the stage.");
  };
  const meta = getProjectMetadataDirect(projectDescription || "");
  const type: CompensationType = meta.compensationType || "FIXED";
  const symbol = getCurrencySymbol(meta.currency || DEFAULT_CURRENCY);
  const money = (n: number) => `${symbol}${(n || 0).toLocaleString()}`;

  // ── Unpaid / Volunteer: no monetary module at all ────────────────────────
  if (type === "UNPAID") {
    return (
      <div className="space-y-4">
        <Card className="flex flex-col items-center gap-2 border border-[#dddddd] bg-white p-10 text-center shadow-2xs rounded-[12px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f6]">
            <HeartHandshake className="h-6 w-6 text-[#181d26]" />
          </span>
          <h2 className="text-base font-black text-[#181d26]">Volunteer / Unpaid Project</h2>
          <p className="text-xs font-semibold text-slate-500">No monetary compensation</p>
        </Card>
        {meta.certificateIncluded && (
          <Card className="border border-[#dddddd] bg-white p-4 text-center shadow-2xs rounded-[12px]">
            <p className="text-xs font-semibold text-[#181d26]">
              A certificate of completion is included for this project.
            </p>
          </Card>
        )}
      </div>
    );
  }

  const header = (title: string, sub: string, Icon: typeof Wallet) => (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#181d26]">
        <Icon className="h-4 w-4 text-white" />
      </span>
      <div>
        <h2 className="text-base font-black text-[#181d26]">{title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{sub}</p>
      </div>
    </div>
  );

  // ── Hourly ───────────────────────────────────────────────────────────────
  if (type === "HOURLY") {
    const rate = meta.paymentRate ?? 0;
    const estHours = meta.estimatedHours ?? 0;

    // A freelancer only ever sees their own logs; the company filters by chip.
    const ownedLogs = canSubmitStages && currentUserId ? logList.filter((l: any) => l.freelancerUserId === currentUserId) : logList;
    const visibleLogs = selectedApp === "ALL" ? ownedLogs : ownedLogs.filter((l: any) => l.applicationId === selectedApp);
    const hoursOf = (rows: any[], st?: string) => rows.reduce((t: number, l: any) => t + (st ? (l.status === st ? l.hours || 0 : 0) : (l.status !== "REJECTED" ? l.hours || 0 : 0)), 0);

    // Every hourly figure is derived from the stored work logs — never entered.
    const paidFor = (app?: string) => paymentList.filter((p: any) => !app || p.applicationId === app).reduce((t: number, p: any) => t + (p.amount || 0), 0);
    const submittedHours = hoursOf(visibleLogs);
    const approvedHours = hoursOf(visibleLogs, "APPROVED");
    const pendingHours = hoursOf(visibleLogs, "PENDING");
    const rejectedHours = hoursOf(visibleLogs, "REJECTED");
    // The project carries a single estimate, so remaining hours are project-level only.
    const remainingEstHours = Math.max(estHours - hoursOf(ownedLogs), 0);

    return (
      <div className="space-y-6">
        {header("Funding / Payments", "Hourly engagement", Clock)}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Hourly Rate" value={`${money(rate)}/hr`} />
          <Stat label="Estimated Hours" value={estHours ? `${estHours} h` : "Not set"} />
          <Stat label="Estimated Total" value={money(rate * estHours)} hint="Rate × estimated hours" />
          <Stat label="Tracked Hours" value={`${submittedHours} h`} hint="Logged, excluding rejected" />
          <Stat label="Approved Hours" value={`${approvedHours} h`} />
          <Stat label="Pending Review" value={`${pendingHours} h`} />
          <Stat label="Rejected Hours" value={`${rejectedHours} h`} />
          <Stat label="Approved Amount" value={money(approvedHours * rate)} hint="Approved hours × rate" />
          <Stat label="Paid / Released" value={money(selectedApp === "ALL" ? paidFor() : paidFor(selectedApp))} />
          <Stat label="Remaining Payable" value={money(Math.max(approvedHours * rate - (selectedApp === "ALL" ? paidFor() : paidFor(selectedApp)), 0))} />
          <Stat
            label="Remaining Est. Hours"
            value={selectedApp === "ALL" ? `${remainingEstHours} h` : "Project-level only"}
            hint={selectedApp === "ALL" ? undefined : "The project carries a single estimate"}
          />
        </div>

        <div className="space-y-3">
          {canManageStages && teamOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {[{ applicationId: "ALL", name: "All freelancers" }, ...teamOptions].map((t) => (
                <button key={t.applicationId} type="button" onClick={() => setSelectedApp(t.applicationId)} className={selectedApp === t.applicationId ? "cursor-pointer rounded-full border border-[#181d26] bg-[#181d26] px-3.5 py-1.5 text-[11px] font-semibold text-white" : "cursor-pointer rounded-full border border-[#dddddd] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#41454d] hover:text-[#181d26]"}>
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {canManageStages && projectId && selectedApp !== "ALL" && (
            <Card className="space-y-3 border border-[#dddddd] bg-white p-4 rounded-[12px]">
              <p className="text-xs font-bold text-[#181d26]">
                Release payment — remaining payable {money(Math.max(approvedHours * rate - paidFor(selectedApp), 0))}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input type="number" placeholder="Amount to release" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-48 rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none" />
                <Button type="button" onClick={() => runPayAction(() => releaseHourlyPayment(projectId, selectedApp, Number(payAmount)))} className="h-8 cursor-pointer bg-[#181d26] text-[11px] text-white hover:bg-[#333840]">Release Payment</Button>
              </div>
            </Card>
          )}

          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#181d26]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#181d26]">Work Logs</h3>
            {canSubmitStages && projectId && (
              <Button type="button" onClick={() => setShowLogForm(true)} className="ml-auto h-8 cursor-pointer gap-1.5 rounded-[8px] bg-[#181d26] px-3 text-[11px] font-bold text-white hover:bg-[#333840]">
                <Plus className="h-3.5 w-3.5" /> Add Work Log
              </Button>
            )}
          </div>

          {logError && (
            <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{logError}</p>
          )}

          {showLogForm && canSubmitStages && (
            <Card className="space-y-3 border border-[#dddddd] bg-white p-4 rounded-[12px]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none" />
                <input type="number" step="0.25" placeholder="Hours worked" value={logForm.hours} onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })} className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none" />
                <input placeholder="What did you work on?" value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowLogForm(false); setLogError(null); }} className="h-8 cursor-pointer text-[11px]">Cancel</Button>
                <Button type="button" disabled={savingLog} onClick={submitWorkLog} className="h-8 cursor-pointer bg-[#181d26] text-[11px] text-white hover:bg-[#333840]">{savingLog ? "Saving..." : "Add Work Log"}</Button>
              </div>
            </Card>
          )}

          {visibleLogs.length === 0 ? (
            <Card className="border border-dashed border-[#dddddd] bg-white p-6 text-center text-xs font-semibold text-slate-400 rounded-[12px]">
              No work logged yet.
            </Card>
          ) : (
            <Card className="overflow-x-auto border border-[#dddddd] bg-white p-0 shadow-2xs rounded-[12px]">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dddddd] text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Freelancer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Work</th>
                    <th className="px-4 py-3 text-right">Hours</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    {(canManageStages || canSubmitStages) && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dddddd]">
                  {visibleLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3 font-bold text-[#181d26]">{log.freelancerName}</td>
                      <td className="px-4 py-3 text-slate-600">{log.date}</td>
                      <td className="px-4 py-3 text-slate-600">{log.description}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#181d26]">{log.hours} h</td>
                      <td className="px-4 py-3 text-right text-slate-600">{money((log.hours || 0) * rate)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="neutral" className="text-[9px] capitalize">{(log.status || "PENDING").toLowerCase()}</Badge>
                      </td>
                      {(canManageStages || canSubmitStages) && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {canManageStages && projectId && log.status === "PENDING" && (
                              <>
                                <button type="button" onClick={() => runLogAction(() => reviewWorkLog(projectId, log.id, true))} className="cursor-pointer rounded-[6px] bg-[#181d26] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#333840]">Approve</button>
                                <button type="button" onClick={() => runLogAction(() => reviewWorkLog(projectId, log.id, false))} className="cursor-pointer rounded-[6px] border border-[#dddddd] px-2.5 py-1 text-[10px] font-bold text-[#41454d] hover:bg-[#f8fafc]">Reject</button>
                              </>
                            )}
                            {canSubmitStages && projectId && log.status === "PENDING" && (
                              <button type="button" onClick={() => runLogAction(() => deleteWorkLog(projectId, log.id))} title="Remove log" className="cursor-pointer rounded-[6px] border border-[#dddddd] p-1.5 text-rose-600 hover:bg-rose-50">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    );
  }


  // ── Stipend ──────────────────────────────────────────────────────────────
  if (type === "STIPEND") {
    const amount = meta.paymentRate ?? projectBudget;
    const freq = meta.stipendFrequency || "MONTHLY";
    const freqEntry = STIPEND_FREQUENCIES.find((f) => f.value === freq);

    // A freelancer only ever sees their own application; the company filters.
    const viewApp = canSubmitStages ? currentApplicationId || "" : selectedApp;
    const payFor = (app?: string) =>
      stipendList.filter((p: any) => !app || p.applicationId === app);
    const paidAmount = (app?: string) => payFor(app).reduce((t: number, p: any) => t + (p.amount || 0), 0);
    const periodsPaidFor = (app?: string) => payFor(app).length;
    // The next unpaid period; a one-time stipend has exactly one.
    const nextPeriod = (app?: string) => periodsPaidFor(app) + 1;
    const totalPeriods = freq === "ONE_TIME" ? 1 : null;
    const scopedApp = viewApp && viewApp !== "ALL" ? viewApp : undefined;
    const remainingPayable =
      totalPeriods === 1 ? Math.max(amount - paidAmount(scopedApp), 0) : amount;

    return (
      <div className="space-y-6">
        {header("Funding / Payments", "Stipend engagement", CalendarClock)}

        {canManageStages && teamOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[{ applicationId: "ALL", name: "All freelancers" }, ...teamOptions].map((t) => (
              <button
                key={t.applicationId}
                type="button"
                onClick={() => setSelectedApp(t.applicationId)}
                className={
                  selectedApp === t.applicationId
                    ? "cursor-pointer rounded-full border border-[#181d26] bg-[#181d26] px-3.5 py-1.5 text-[11px] font-semibold text-white"
                    : "cursor-pointer rounded-full border border-[#dddddd] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#41454d] hover:text-[#181d26]"
                }
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Stipend Amount" value={`${money(amount)}${freqEntry?.suffix ?? ""}`} />
          <Stat label="Frequency" value={freqEntry?.label ?? "Monthly"} />
          <Stat
            label="Current Period"
            value={
              scopedApp
                ? freq === "ONE_TIME"
                  ? periodsPaidFor(scopedApp) > 0
                    ? "Paid"
                    : "Single payout"
                  : `Period ${nextPeriod(scopedApp)}`
                : "Per freelancer"
            }
          />
          <Stat
            label="Paid / Released"
            value={money(scopedApp ? paidAmount(scopedApp) : paidAmount())}
          />
          <Stat
            label="Remaining Payable"
            value={scopedApp ? money(remainingPayable) : `${money(amount)} per freelancer`}
            hint={totalPeriods === 1 ? undefined : "Recurs each period"}
          />
          <Stat
            label="Current Period Status"
            value={
              scopedApp
                ? periodsPaidFor(scopedApp) > 0 && totalPeriods === 1
                  ? "Paid"
                  : "Awaiting payment"
                : `${stipendList.length} payouts recorded`
            }
          />
        </div>

        {logError && (
          <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{logError}</p>
        )}

        {canManageStages && projectId && scopedApp && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border border-[#dddddd] bg-white p-4 shadow-2xs rounded-[12px]">
            <p className="text-xs font-bold text-[#181d26]">
              Release {money(amount)} for period {nextPeriod(scopedApp)}
            </p>
            <Button
              type="button"
              onClick={() =>
                runStipendAction(() => releaseStipendPayment(projectId, scopedApp, nextPeriod(scopedApp)))
              }
              className="h-8 cursor-pointer bg-[#181d26] text-[11px] text-white hover:bg-[#333840]"
            >
              Release Stipend
            </Button>
          </Card>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#181d26]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#181d26]">
              {canManageStages && !scopedApp ? "Freelancer Balances" : "Payment History"}
            </h3>
          </div>

          {canManageStages && !scopedApp ? (
            <Card className="overflow-x-auto border border-[#dddddd] bg-white p-0 shadow-2xs rounded-[12px]">
              <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dddddd] text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Freelancer</th>
                    <th className="px-4 py-3 text-center">Periods Paid</th>
                    <th className="px-4 py-3 text-right">Stipend</th>
                    <th className="px-4 py-3 text-right">Paid / Released</th>
                    <th className="px-4 py-3 text-right">Remaining Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dddddd]">
                  {teamOptions.map((t) => (
                    <tr key={t.applicationId} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3 font-bold text-[#181d26]">{t.name}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{periodsPaidFor(t.applicationId)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{money(amount)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{money(paidAmount(t.applicationId))}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {totalPeriods === 1
                          ? money(Math.max(amount - paidAmount(t.applicationId), 0))
                          : money(amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : payFor(scopedApp).length === 0 ? (
            <Card className="border border-dashed border-[#dddddd] bg-white p-6 text-center text-xs font-semibold text-slate-400 rounded-[12px]">
              No stipend payments recorded yet.
            </Card>
          ) : (
            <Card className="overflow-x-auto border border-[#dddddd] bg-white p-0 shadow-2xs rounded-[12px]">
              <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dddddd] text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Freelancer</th>
                    <th className="px-4 py-3 text-center">Period</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dddddd]">
                  {payFor(scopedApp).map((p: any) => (
                    <tr key={p.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3 font-bold text-[#181d26]">{p.freelancerName}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{p.periodIndex}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#181d26]">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    );
  }


  // ── Fixed price (also the fallback for legacy projects) ──────────────────
  const stages = Array.isArray(stageList) ? stageList : [];
  // Fixed Price totals come from the stage records, never the milestone counter.
  const scoped = selectedApp === "ALL" ? stages : stages.filter((s: any) => s.applicationId === selectedApp);
  const sumBy = (rows: any[], k: string) => rows.reduce((t: number, r: any) => t + (r[k] || 0), 0);
  const viewAssigned = sumBy(scoped, "amount");
  const viewFunded = sumBy(scoped, "funded");
  const viewReleased = sumBy(scoped, "released");
  const totalFunded = stages.reduce((t: number, s: any) => t + (s.funded || 0), 0);
  const totalReleased = stages.reduce((t: number, s: any) => t + (s.released || 0), 0);
  const remainingToFund = Math.max(projectBudget - totalFunded, 0);
  const remainingToRelease = Math.max(totalFunded - totalReleased, 0);

  return (
    <div className="space-y-6">
      {header("Funding / Payments", type === "MILESTONE" ? "Milestone engagement — per-freelancer funding" : "Fixed price engagement", Wallet)}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total Budget" value={money(projectBudget)} />
        <Stat label="Total Funded" value={money(totalFunded)} />
        <Stat label="Total Released" value={money(totalReleased)} />
        <Stat label="Remaining to Fund" value={money(remainingToFund)} />
        <Stat label="Remaining to Release" value={money(remainingToRelease)} />
      </div>

      <div className="space-y-3">
        {teamOptions.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[{ applicationId: "ALL", name: "All freelancers" }, ...teamOptions].map((t) => (
                <button key={t.applicationId} type="button" onClick={() => setSelectedApp(t.applicationId)} className={selectedApp === t.applicationId ? "cursor-pointer rounded-full border border-[#181d26] bg-[#181d26] px-3.5 py-1.5 text-[11px] font-semibold text-white" : "cursor-pointer rounded-full border border-[#dddddd] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#41454d] hover:text-[#181d26]"}>
                  {t.name}
                </button>
              ))}
            </div>
            {selectedApp === "ALL" && (
              <Card className="overflow-x-auto border border-[#dddddd] bg-white p-0 shadow-2xs rounded-[12px]">
                <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#dddddd] text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Freelancer</th>
                      <th className="px-4 py-3 text-right">Allocated</th>
                      <th className="px-4 py-3 text-right">Funded</th>
                      <th className="px-4 py-3 text-right">Released</th>
                      <th className="px-4 py-3 text-right">Remaining Allocation</th>
                      <th className="px-4 py-3 text-right">Remaining to Release</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dddddd]">
                    {teamOptions.map((t) => {
                      const own = stages.filter((s: any) => s.applicationId === t.applicationId);
                      const alloc = sumBy(own, "amount");
                      const fnd = sumBy(own, "funded");
                      const rel = sumBy(own, "released");
                      return (
                        <tr key={t.applicationId} className="hover:bg-[#f8fafc]">
                          <td className="px-4 py-3 font-bold text-[#181d26]">{t.name}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#181d26]">{money(alloc)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{money(fnd)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{money(rel)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{money(Math.max(alloc - fnd, 0))}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{money(Math.max(fnd - rel, 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}

            {selectedApp !== "ALL" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label="Total Assigned" value={money(viewAssigned)} />
                <Stat label="Total Funded" value={money(viewFunded)} />
                <Stat label="Total Released" value={money(viewReleased)} />
                <Stat label="Remaining to Fund" value={money(Math.max(viewAssigned - viewFunded, 0))} />
                <Stat label="Remaining to Release" value={money(Math.max(viewFunded - viewReleased, 0))} />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#181d26]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[#181d26]">{type === "MILESTONE" ? "Milestone Funding" : "Payment Stages"}</h3>
          <span className="text-[10px] font-semibold text-slate-400">Optional — separate from milestones</span>
          {canManageStages && projectId && (
            <Button
              type="button"
              onClick={() => openStageForm()}
              className="ml-auto h-8 cursor-pointer gap-1.5 rounded-[8px] bg-[#181d26] px-3 text-[11px] font-bold text-white hover:bg-[#333840]"
            >
              <Plus className="h-3.5 w-3.5" /> Add Payment Stage
            </Button>
          )}
        </div>

        {stageError && (
          <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
            {stageError}
          </p>
        )}

        {fundingStage && (
          <Card className="space-y-3 border border-[#dddddd] bg-white p-4 rounded-[12px]">
            <p className="text-xs font-bold text-[#181d26]">
              Fund “{fundingStage.title}” — remaining {money((fundingStage.amount || 0) - (fundingStage.funded || 0))}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                placeholder="Amount to fund"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="w-48 rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none"
              />
              <Button type="button" onClick={async () => { if (!projectId) return; await runStageAction(() => fundPaymentStage(projectId, fundingStage.id, Number(fundAmount))); setFundingStage(null); setFundAmount(""); }} className="h-8 cursor-pointer bg-[#181d26] text-[11px] text-white hover:bg-[#333840]">Confirm Funding</Button>
              <Button type="button" variant="outline" onClick={() => { setFundingStage(null); setFundAmount(""); }} className="h-8 cursor-pointer text-[11px]">Cancel</Button>
            </div>
          </Card>
        )}

        {submittingStage && (
          <Card className="space-y-3 border border-[#dddddd] bg-white p-4 rounded-[12px]">
            <p className="text-xs font-bold text-[#181d26]">Submit “{submittingStage.title}” for review</p>
            <textarea
              rows={3}
              placeholder="Submission note (optional)"
              value={submitNote}
              onChange={(e) => setSubmitNote(e.target.value)}
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setSubmittingStage(null); setSubmitNote(""); }} className="h-8 cursor-pointer text-[11px]">Cancel</Button>
              <Button type="button" onClick={async () => { if (!projectId) return; await runStageAction(() => submitPaymentStage(projectId, submittingStage.id, submitNote)); setSubmittingStage(null); setSubmitNote(""); }} className="h-8 cursor-pointer bg-[#181d26] text-[11px] text-white hover:bg-[#333840]">Submit</Button>
            </div>
          </Card>
        )}

        {canManageStages && showStageForm && (
          <Card className="space-y-3 border border-[#dddddd] bg-white p-4 rounded-[12px]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                placeholder="Stage name (e.g. UI Design)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none"
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none"
              />
              <select disabled={!!editing && Math.max(editing.funded || 0, editing.released || 0) > 0} value={form.applicationId} onChange={(e) => setForm({ ...form, applicationId: e.target.value })} className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none">
                <option value="">Unassigned</option>
                {teamOptions.map((t) => (<option key={t.applicationId} value={t.applicationId}>{t.name}</option>))}
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowStageForm(false); setEditing(null); setForm({ title: "", description: "", amount: "", applicationId: "" }); setStageError(null); }} className="h-8 cursor-pointer text-[11px]">Cancel</Button>
              <Button type="button" disabled={saving} onClick={submitStage} className="h-8 cursor-pointer bg-[#181d26] text-[11px] text-white hover:bg-[#333840]">{saving ? "Saving..." : editing ? "Update Stage" : "Add Stage"}</Button>
            </div>
          </Card>
        )}

        {stages.length === 0 ? (
          <Card className="border border-dashed border-[#dddddd] bg-white p-6 text-center text-xs font-semibold text-slate-400 rounded-[12px]">
            No payment stages defined. The fixed budget is funded and released as a single amount.
          </Card>
        ) : (
          <Card className="overflow-x-auto border border-[#dddddd] bg-white p-0 shadow-2xs rounded-[12px]">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#dddddd] text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Funded</th>
                  <th className="px-4 py-3 text-right">Released</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  {(canManageStages || canSubmitStages) && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dddddd]">
                {scoped.map((stage: any, idx: number) => {
                  const funded = stage.funded ?? 0;
                  const released = stage.released ?? 0;
                  return (
                    <tr key={stage.id || idx} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3">
                        <span className="block font-bold text-[#181d26]">{stage.title}</span>
                        {stage.freelancerName && <span className="mt-0.5 block text-[10px] font-semibold text-[#1b61c9]">{stage.freelancerName}</span>}
                        {stage.description && <span className="mt-0.5 block text-[10px] text-slate-500">{stage.description}</span>}
                        {stage.submissionNote && (stage.status === "SUBMITTED" || stage.status === "APPROVED" || stage.status === "RELEASED") && (
                          <span className="mt-1.5 block rounded-[8px] border border-[#dddddd] bg-[#f8fafc] px-2 py-1.5 text-[10px] text-[#41454d]">
                            <b className="block text-[9px] uppercase tracking-wider text-slate-400">Submission Note</b>
                            “{stage.submissionNote}”
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="neutral" className="text-[9px] capitalize">
                          {(stage.status || "PENDING").toLowerCase().replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#181d26]">{money(stage.amount || 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{money(funded)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{money(released)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {money(Math.max((stage.amount || 0) - released, 0))}
                      </td>
                      {(canManageStages || canSubmitStages) && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {canManageStages && projectId && funded < (stage.amount || 0) && stage.status !== "RELEASED" && (
                              <button type="button" onClick={() => { setFundingStage(stage); setFundAmount(""); }} className="cursor-pointer rounded-[6px] bg-[#181d26] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#333840]">{funded > 0 ? "Fund More" : "Fund"}</button>
                            )}
                            {canSubmitStages && projectId && stage.status === "FUNDED" && (
                              <button type="button" onClick={() => { setSubmittingStage(stage); setSubmitNote(stage.submissionNote || ""); }} className="cursor-pointer rounded-[6px] bg-[#181d26] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#333840]">Submit for Review</button>
                            )}
                            {canManageStages && projectId && stage.status === "SUBMITTED" && (
                              <>
                                <button type="button" onClick={() => runStageAction(() => reviewPaymentStage(projectId, stage.id, true))} className="cursor-pointer rounded-[6px] bg-[#181d26] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#333840]">Approve</button>
                                <button type="button" onClick={() => runStageAction(() => reviewPaymentStage(projectId, stage.id, false))} className="cursor-pointer rounded-[6px] border border-[#dddddd] px-2.5 py-1 text-[10px] font-bold text-[#41454d] hover:bg-[#f8fafc]">Request Changes</button>
                              </>
                            )}
                            {canManageStages && projectId && stage.status === "APPROVED" && (
                              <button type="button" onClick={() => runStageAction(() => releasePaymentStage(projectId, stage.id))} className="cursor-pointer rounded-[6px] bg-[#181d26] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#333840]">Release Payment</button>
                            )}
                            {canManageStages && (
                            <>
                            <button type="button" onClick={() => openStageForm(stage)} title="Edit stage" className="cursor-pointer rounded-[6px] border border-[#dddddd] p-1.5 text-[#181d26] hover:bg-[#f8fafc]">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button type="button" onClick={() => removeStage(stage.id)} title="Delete stage" className="cursor-pointer rounded-[6px] border border-[#dddddd] p-1.5 text-rose-600 hover:bg-rose-50">
                              <Trash2 className="h-3 w-3" />
                            </button>
                            </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
