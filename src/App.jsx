import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nohn_340b_saved_audits_v2";
const SITES = [
  "NOHN Family Health Center",
  "NOHN Community Clinic",
  "NOHN Behavioral Health",
  "NOHN Dental Clinic",
  "NOHN Pediatrics",
];

const navItems = ["Dashboard", "New Audit", "Audit Workflow", "Saved Audits", "Reports", "Settings"];
const workflowSteps = ["PCP Validation", "Epic Med List", "Referral Review", "Encounter Check", "Summary"];

const statusStyles = {
  Completed: "bg-emerald-100 text-emerald-800",
  Eligible: "bg-teal-100 text-teal-800",
  "Needs Follow-up": "bg-orange-100 text-orange-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Not Started": "bg-slate-100 text-slate-700",
};

function createAuditNumber() {
  return `AUD-${String(Math.floor(10000 + Math.random() * 89999))}`;
}

function loadSavedAudits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const persistAudits = (audits) => localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));

const StatusBadge = ({ status }) => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles["Not Started"]}`}>{status}</span>;

function AppShell({ children, view, setView, search, setSearch }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-slate-200 bg-white p-4">
          <div className="mb-8 text-2xl font-bold text-blue-900">NOHN</div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button key={item} type="button" onClick={() => setView(item)} className={`w-full rounded-xl px-3 py-2 text-left ${view === item ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"}`}>
                {item}
              </button>
            ))}
          </nav>
          <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">Internal Use Only. No PHI is stored or accessed in this application.</p>
        </aside>
        <div>
          <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
            <h1 className="text-lg font-semibold">NOHN 340B Audit Tool</h1>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audits / locations / keywords" className="min-w-[220px] flex-1 rounded-xl border border-slate-300 px-3 py-2" />
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">🛡️ No PHI Stored</div>
            <div className="text-sm text-slate-500">Audit Manager</div>
          </header>
          <main className="p-4 md:p-6">{children}</main>
          <footer className="px-6 pb-6 text-sm text-slate-600">This internal checklist stores audit workflow data only. No PHI Stored.</footer>
        </div>
      </div>
    </div>
  );
}

function SummaryText({ form, overallStatus }) {
  return `Audit ${form.auditNumber} (${form.auditTitle || "Untitled"}) is ${overallStatus}. PCP Validation: ${form.pcpIsNohn || "N/A"}. Epic Med List: ${form.epicMedList || "N/A"}. Referral Review: ${form.referralValid || "N/A"}. Encounter Check: ${form.encounterValid || "N/A"}. Follow-up: ${form.epicFollowUp || "None"}.`;
}

export default function App() {
  const [view, setView] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [savedAudits, setSavedAudits] = useState(() => loadSavedAudits());
  const [expandedRows, setExpandedRows] = useState({});
  const [step, setStep] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const [form, setForm] = useState({
    auditNumber: createAuditNumber(),
    auditTitle: "",
    site: SITES[0],
    pcpIsNohn: "",
    epicMedList: "",
    epicFollowUp: "",
    referralValid: "",
    referralSource: "",
    referralType: "",
    referralDate: "",
    encounterValid: "",
    encounterDate: "",
  });

  useEffect(() => setSavedAudits(loadSavedAudits()), []);
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const overallStatus = useMemo(() => {
    if ([form.pcpIsNohn, form.epicMedList, form.referralValid, form.encounterValid].every(Boolean)) {
      if ([form.pcpIsNohn, form.epicMedList, form.referralValid, form.encounterValid].every((v) => v === "Yes")) return "Eligible";
      return "Needs Follow-up";
    }
    return "In Progress";
  }, [form]);

  const filteredAudits = useMemo(() => savedAudits.filter((a) => `${a.auditNumber} ${a.auditTitle}`.toLowerCase().includes(search.toLowerCase())), [savedAudits, search]);
  const kpis = useMemo(() => ({
    total: savedAudits.length,
    eligible: savedAudits.filter((a) => a.status === "Eligible").length,
    follow: savedAudits.filter((a) => a.status === "Needs Follow-up").length,
    completionRate: savedAudits.length ? Math.round((savedAudits.filter((a) => a.status !== "In Progress").length / savedAudits.length) * 100) : 0,
  }), [savedAudits]);

  const saveAudit = () => {
    const now = new Date().toISOString();
    const record = { ...form, id: `${form.auditNumber}-${now}`, createdAt: now, updatedAt: now, status: overallStatus, summary: SummaryText({ form, overallStatus }) };
    const updated = [record, ...savedAudits];
    setSavedAudits(updated);
    persistAudits(updated);
    setSaveMessage("Audit saved successfully.");
    setView("Saved Audits");
  };

  const deleteAudit = (id) => {
    if (!window.confirm("Delete this saved audit?")) return;
    const updated = savedAudits.filter((a) => a.id !== id);
    setSavedAudits(updated);
    persistAudits(updated);
  };

  return (
    <AppShell view={view} setView={setView} search={search} setSearch={setSearch}>
      {view === "Dashboard" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-3xl font-bold">Welcome to the 340B internal audit dashboard</h2>
              <p className="mt-2 text-slate-600">Use this tool for consistent internal 340B audit reviews. No PHI Stored.</p>
              <button className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white" onClick={() => setView("New Audit")}>Start New Audit</button>
            </section>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Total Audits",kpis.total],["Eligible",kpis.eligible],["Needs Follow-up",kpis.follow],["Completion Rate",`${kpis.completionRate}%`]].map(([l,v]) => <div key={l} className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{l}</p><p className="text-3xl font-bold">{v}</p></div>)}</section>
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold">Recent Audits</h3>
              <div className="space-y-2">
                {filteredAudits.slice(0, 5).map((audit) => (
                  <div key={audit.id} className="rounded-xl border border-slate-200">
                    <button className="grid w-full grid-cols-2 gap-2 p-3 text-left md:grid-cols-6" onClick={() => setExpandedRows((p) => ({ ...p, [audit.id]: !p[audit.id] }))}>
                      <span>{audit.auditNumber}</span><span>{audit.site}</span><span>Internal</span><span><StatusBadge status={audit.status} /></span><span>{new Date(audit.createdAt).toLocaleDateString()}</span><span>{new Date(audit.updatedAt).toLocaleDateString()}</span>
                    </button>
                    {expandedRows[audit.id] && <div className="border-t bg-slate-50 p-3 text-sm">{audit.summary}</div>}
                  </div>
                ))}
              </div>
            </section>
          </div>
          <aside className="rounded-2xl bg-white p-4 shadow-sm"><h3 className="mb-3 text-xl font-semibold">Audit Guidance</h3><ol className="space-y-2 text-sm">{workflowSteps.map((s) => <li key={s}>{s}</li>)}</ol></aside>
        </div>
      )}

      {(view === "New Audit" || view === "Audit Workflow") && (
        <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-3xl font-bold">Start New Audit</h2>
          <div className="grid gap-3 md:grid-cols-3"><input value={form.auditNumber} readOnly className="rounded-xl border px-3 py-2" /><input value={form.auditTitle} onChange={(e) => update("auditTitle", e.target.value)} placeholder="Audit Title (optional)" className="rounded-xl border px-3 py-2 md:col-span-2" /></div>
          <div className="grid gap-2 sm:grid-cols-5">{workflowSteps.map((s, i) => <button key={s} className={`rounded-lg border p-2 text-sm ${i===step?"border-blue-600 bg-blue-50":""}`} onClick={() => setStep(i)}>{i+1}. {s}</button>)}</div>

          {step === 0 && <div className="rounded-xl border p-4"><p className="font-semibold">Is PCP a NOHN provider?</p><p className="mb-2 text-sm text-slate-600">Assigned PCP should be a NOHN provider at the time of service.</p><div className="space-x-2"><button className="rounded border px-3 py-1" onClick={() => update("pcpIsNohn", "Yes")}>Yes</button><button className="rounded border px-3 py-1" onClick={() => update("pcpIsNohn", "No")}>No</button></div></div>}
          {step === 1 && <div className="rounded-xl border p-4"><p className="font-semibold">Is the medication on the Epic med list?</p><div className="my-2 space-x-2"><button className="rounded border px-3 py-1" onClick={() => update("epicMedList", "Yes")}>Yes</button><button className="rounded border px-3 py-1" onClick={() => update("epicMedList", "No")}>No</button></div>{form.epicMedList === "No" && <textarea value={form.epicFollowUp} onChange={(e)=>update("epicFollowUp", e.target.value)} placeholder="Example: Medication needs to be added or corrected on the Epic medication list. Do not enter PHI." className="w-full rounded-xl border p-3" required />}</div>}
          {step === 2 && <div className="rounded-xl border p-4"><p className="font-semibold">Does a valid referral exist?</p><div className="my-2 space-x-2"><button className="rounded border px-3 py-1" onClick={() => update("referralValid", "Yes")}>Yes</button><button className="rounded border px-3 py-1" onClick={() => update("referralValid", "No")}>No</button></div><div className="grid gap-2 md:grid-cols-3"><input placeholder="Referral source" className="rounded border px-3 py-2" value={form.referralSource} onChange={(e)=>update("referralSource", e.target.value)} /><input placeholder="Referral type" className="rounded border px-3 py-2" value={form.referralType} onChange={(e)=>update("referralType", e.target.value)} /><input type="date" className="rounded border px-3 py-2" value={form.referralDate} onChange={(e)=>update("referralDate", e.target.value)} /></div><details className="mt-3 rounded-xl bg-blue-50 p-3"><summary className="cursor-pointer font-semibold">What qualifies?</summary><p className="mt-2 text-sm">A valid referral is documented evidence that the patient was referred for services at the 340B covered entity. The referral should support that the service or treatment was connected to the covered entity.</p></details></div>}
          {step === 3 && <div className="rounded-xl border p-4"><p className="font-semibold">Was there a qualifying encounter on or after the referral date?</p><div className="my-2 space-x-2"><button className="rounded border px-3 py-1" onClick={() => update("encounterValid", "Yes")}>Yes</button><button className="rounded border px-3 py-1" onClick={() => update("encounterValid", "No")}>No</button></div><input type="date" className="rounded border px-3 py-2" value={form.encounterDate} onChange={(e)=>update("encounterDate", e.target.value)} /><p className="mt-2 text-sm text-slate-600">Confirm the encounter supports 340B eligibility according to internal procedure.</p></div>}
          {step === 4 && <div className="rounded-xl border bg-slate-50 p-4"><h3 className="mb-2 text-xl font-semibold">Summary</h3><p>Audit number: {form.auditNumber}</p><p>Audit title: {form.auditTitle || "—"}</p><p>Overall status: <StatusBadge status={overallStatus} /></p><p>PCP Validation: {form.pcpIsNohn || "—"}</p><p>Epic Med List: {form.epicMedList || "—"}</p><p>Referral Review: {form.referralValid || "—"}</p><p>Encounter Check: {form.encounterValid || "—"}</p><p>Follow-up notes: {form.epicFollowUp || "—"}</p><p className="mt-2">Final generated audit notes summary: {SummaryText({ form, overallStatus })}</p><div className="mt-3 flex flex-wrap gap-2"><button className="rounded border px-3 py-2" onClick={() => navigator.clipboard.writeText(SummaryText({ form, overallStatus }))}>Copy Summary</button><button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={saveAudit}>Save Audit</button><button className="rounded border px-3 py-2" onClick={() => { setForm({ ...form, auditNumber: createAuditNumber(), auditTitle: "" }); setStep(0); setView("New Audit"); }}>Start New Audit</button><button className="rounded border px-3 py-2" onClick={() => setView("Saved Audits")}>View Saved Audits</button></div>{saveMessage && <p className="mt-2 text-emerald-700">{saveMessage}</p>}</div>}

          <div className="flex justify-between"><button className="rounded border px-3 py-2" onClick={() => setStep((s) => Math.max(0, s - 1))}>Previous step</button><button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => setStep((s) => Math.min(4, s + 1))}>Continue to next step</button></div>
        </section>
      )}

      {view === "Saved Audits" && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-2xl font-bold">Saved Audits</h2>
          <div className="space-y-2">{filteredAudits.map((audit) => <div key={audit.id} className="rounded-xl border border-slate-200"><div className="flex items-center justify-between p-3"><button className="text-left" onClick={() => setExpandedRows((p)=>({ ...p, [audit.id]: !p[audit.id] }))}><p className="font-semibold">{audit.auditNumber} — {audit.auditTitle || "Untitled Audit"}</p><p className="text-xs text-slate-500">Created: {new Date(audit.createdAt).toLocaleString()} • Updated: {new Date(audit.updatedAt).toLocaleString()}</p></button><div className="flex items-center gap-3"><StatusBadge status={audit.status} /><button className="rounded border border-red-200 px-2 py-1 text-red-600" onClick={() => deleteAudit(audit.id)}>✕</button></div></div>{expandedRows[audit.id] && <div className="border-t bg-slate-50 p-3 text-sm"><p>{audit.summary}</p></div>}</div>)}</div>
        </section>
      )}

      {(view === "Reports" || view === "Settings") && <section className="rounded-2xl bg-white p-8 shadow-sm text-slate-600">{view} page placeholder.</section>}
    </AppShell>
  );
}
