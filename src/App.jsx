import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nohn_340b_saved_audits";
const STATUS_OPTIONS = {
  eligible: "Eligible",
  notEligible: "Not Eligible",
  followUp: "Needs Follow-up",
};

const workflowSteps = [
  "Audit Setup",
  "PCP Validation",
  "Medication Validation",
  "Encounter / Referral Validation",
  "Review & Save",
];

function createAuditNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AUD-${datePart}-${rand}`;
}

function loadSavedAudits() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistAudits(audits) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
}

function stepStatus(index, currentStep) {
  if (index === currentStep) return "active";
  if (index < currentStep) return "done";
  return "pending";
}

export default function AuditChecklist() {
  const [step, setStep] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedAudits, setSavedAudits] = useState(() => loadSavedAudits());
  const [expandedAudit, setExpandedAudit] = useState(null);

  const [form, setForm] = useState({
    auditNumber: createAuditNumber(),
    auditTitle: "",
    setupNotes: "",
    pcpIsNohn: "",
    medicationOnEpicList: "",
    medicationNotes: "",
    encounterSupport: "",
    encounterDate: "",
    encounterNotes: "",
  });

  useEffect(() => {
    setSavedAudits(loadSavedAudits());
  }, []);

  const finalStatus = useMemo(() => {
    if (form.pcpIsNohn === "no") return STATUS_OPTIONS.notEligible;
    if (form.medicationOnEpicList === "no" || form.encounterSupport !== "yes") return STATUS_OPTIONS.followUp;
    return STATUS_OPTIONS.eligible;
  }, [form]);

  const answers = useMemo(
    () => ({
      pcp_validation: form.pcpIsNohn,
      medication_validation: form.medicationOnEpicList,
      encounter_referral_validation: form.encounterSupport,
      encounter_date: form.encounterDate,
    }),
    [form]
  );

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(form.auditNumber && form.auditTitle.trim());
    if (step === 1) return Boolean(form.pcpIsNohn);
    if (step === 2) return Boolean(form.medicationOnEpicList);
    if (step === 3) return Boolean(form.encounterSupport);
    return true;
  }, [step, form]);

  const saveAudit = () => {
    setSaveMessage("");
    setSaveError("");

    try {
      const nowIso = new Date().toISOString();
      const nowDisplay = new Date(nowIso).toLocaleString();
      const record = {
        id: `${form.auditNumber}-${nowIso}`,
        auditNumber: form.auditNumber,
        auditTitle: form.auditTitle.trim(),
        savedAt: nowIso,
        savedAtDisplay: nowDisplay,
        answers,
        notes: {
          setupNotes: form.setupNotes,
          medicationNotes: form.medicationNotes,
          encounterNotes: form.encounterNotes,
        },
        finalStatus,
      };

      const updated = [record, ...savedAudits];
      persistAudits(updated);
      setSavedAudits(updated);
      setExpandedAudit(record.id);
      setSaveMessage("Audit saved successfully.");
    } catch (error) {
      setSaveError("Unable to save audit. Please try again.");
      console.error("Save failed", error);
    }
  };

  const deleteAudit = (id) => {
    const updated = savedAudits.filter((a) => a.id !== id);
    persistAudits(updated);
    setSavedAudits(updated);
    if (expandedAudit === id) setExpandedAudit(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">340B Internal Audit Checklist</h1>
          <p className="mt-2 text-sm text-slate-600">Do not enter PHI. This tool is for audit workflow notes only.</p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Workflow Steps</h2>
            <div className="space-y-2">
              {workflowSteps.map((name, index) => {
                const status = stepStatus(index, step);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => index <= step && setStep(index)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      status === "active"
                        ? "border-teal-700 bg-teal-50 text-teal-900"
                        : status === "done"
                          ? "border-slate-200 bg-white text-slate-800"
                          : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    <span className="font-semibold">Step {index + 1}:</span> {name}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Step 1: Audit Setup</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Audit Number
                    <input className="rounded-md border border-slate-300 px-3 py-2" value={form.auditNumber} onChange={(e) => updateField("auditNumber", e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Audit Title / Name
                    <input className="rounded-md border border-slate-300 px-3 py-2" value={form.auditTitle} onChange={(e) => updateField("auditTitle", e.target.value)} />
                  </label>
                </div>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Basic Audit Notes
                  <textarea className="min-h-24 rounded-md border border-slate-300 p-3" value={form.setupNotes} onChange={(e) => updateField("setupNotes", e.target.value)} />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Step 2: PCP Validation</h3>
                <p className="text-sm text-slate-600">Is the PCP a NOHN provider?</p>
                <div className="flex gap-3">
                  <button type="button" className={`rounded-md border px-4 py-2 ${form.pcpIsNohn === "yes" ? "border-teal-700 bg-teal-50" : "border-slate-300"}`} onClick={() => updateField("pcpIsNohn", "yes")}>Yes</button>
                  <button type="button" className={`rounded-md border px-4 py-2 ${form.pcpIsNohn === "no" ? "border-amber-700 bg-amber-50" : "border-slate-300"}`} onClick={() => updateField("pcpIsNohn", "no")}>No</button>
                </div>
                {form.pcpIsNohn === "no" && <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">Marked as not eligible, but continue documenting the audit.</p>}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Step 3: Medication Validation</h3>
                <p className="text-sm text-slate-600">Is the medication on the Epic med list?</p>
                <div className="flex gap-3">
                  <button type="button" className={`rounded-md border px-4 py-2 ${form.medicationOnEpicList === "yes" ? "border-teal-700 bg-teal-50" : "border-slate-300"}`} onClick={() => updateField("medicationOnEpicList", "yes")}>Yes</button>
                  <button type="button" className={`rounded-md border px-4 py-2 ${form.medicationOnEpicList === "no" ? "border-amber-700 bg-amber-50" : "border-slate-300"}`} onClick={() => updateField("medicationOnEpicList", "no")}>No</button>
                </div>
                {form.medicationOnEpicList === "no" && <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">Reminder: Epic med list needs to be updated or reviewed.</p>}
                <label className="grid gap-1 text-sm font-semibold text-slate-700">Medication Notes
                  <textarea className="min-h-20 rounded-md border border-slate-300 p-3" value={form.medicationNotes} onChange={(e) => updateField("medicationNotes", e.target.value)} />
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Step 4: Encounter / Referral Validation</h3>
                <p className="text-sm text-slate-600">Is there encounter or referral support documented?</p>
                <div className="flex gap-3">
                  <button type="button" className={`rounded-md border px-4 py-2 ${form.encounterSupport === "yes" ? "border-teal-700 bg-teal-50" : "border-slate-300"}`} onClick={() => updateField("encounterSupport", "yes")}>Yes</button>
                  <button type="button" className={`rounded-md border px-4 py-2 ${form.encounterSupport === "no" ? "border-amber-700 bg-amber-50" : "border-slate-300"}`} onClick={() => updateField("encounterSupport", "no")}>No</button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">Encounter Date
                    <input type="date" className="rounded-md border border-slate-300 px-3 py-2" value={form.encounterDate} onChange={(e) => updateField("encounterDate", e.target.value)} />
                  </label>
                </div>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">Documentation Notes
                  <textarea className="min-h-20 rounded-md border border-slate-300 p-3" value={form.encounterNotes} onChange={(e) => updateField("encounterNotes", e.target.value)} />
                </label>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Step 5: Review & Save</h3>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p><strong>Audit #:</strong> {form.auditNumber}</p>
                  <p><strong>Title:</strong> {form.auditTitle || "—"}</p>
                  <p><strong>PCP a NOHN provider:</strong> {form.pcpIsNohn || "—"}</p>
                  <p><strong>Medication on Epic list:</strong> {form.medicationOnEpicList || "—"}</p>
                  <p><strong>Encounter/Referral support:</strong> {form.encounterSupport || "—"}</p>
                  <p><strong>Encounter date:</strong> {form.encounterDate || "—"}</p>
                  <p className="mt-2"><strong>Final Status:</strong> {finalStatus}</p>
                </div>
                <button type="button" onClick={saveAudit} className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800">Save Audit</button>
                {saveMessage && <p className="text-sm font-semibold text-teal-700">{saveMessage}</p>}
                {saveError && <p className="text-sm font-semibold text-red-700">{saveError}</p>}
              </div>
            )}

            <div className="mt-6 flex justify-between border-t border-slate-200 pt-4">
              <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</button>
              <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={step === 4 || !canContinue}>Continue</button>
            </div>
          </section>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Saved Audits</h2>
          {savedAudits.length === 0 && <p className="text-sm text-slate-500">No saved audits yet.</p>}
          <div className="space-y-3">
            {savedAudits.map((audit) => {
              const open = expandedAudit === audit.id;
              return (
                <article key={audit.id} className="rounded-md border border-slate-200">
                  <div className="flex items-center justify-between p-3">
                    <button type="button" onClick={() => setExpandedAudit(open ? null : audit.id)} className="text-left">
                      <p className="font-semibold text-slate-900">{audit.auditNumber} — {audit.auditTitle}</p>
                      <p className="text-xs text-slate-500">Saved: {audit.savedAtDisplay}</p>
                    </button>
                    <button type="button" className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => deleteAudit(audit.id)}>Delete</button>
                  </div>
                  {open && (
                    <div className="border-t border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p><strong>Final Status:</strong> {audit.finalStatus}</p>
                      <p><strong>Answers:</strong> {JSON.stringify(audit.answers)}</p>
                      <p><strong>Setup Notes:</strong> {audit.notes.setupNotes || "—"}</p>
                      <p><strong>Medication Notes:</strong> {audit.notes.medicationNotes || "—"}</p>
                      <p><strong>Encounter Notes:</strong> {audit.notes.encounterNotes || "—"}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
