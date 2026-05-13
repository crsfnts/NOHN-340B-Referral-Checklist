import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nohn_340b_saved_audits_v3";
const SITES = [
  "NOHN Family Health Center",
  "NOHN Community Clinic",
  "NOHN Behavioral Health",
  "NOHN Dental Clinic",
  "NOHN Pediatrics",
];

const navItems = ["Dashboard", "Audit Workflow", "Saved Audits"];

const statusStyles = {
  Completed: "bg-emerald-100 text-emerald-800",
  Eligible: "bg-teal-100 text-teal-800",
  "Needs Follow-up": "bg-orange-100 text-orange-800",
  "In Progress": "bg-blue-100 text-blue-800",
};

const AUDIT_QUESTIONS = [
  "Is PCP a NOHN provider?",
  "Is patient attributed to a NOHN covered location?",
  "Is medication documented on the Epic med list?",
  "Was medication ordered by an eligible NOHN provider?",
  "Does a valid referral exist?",
  "Does referral source support covered entity relationship?",
  "Is referral date documented?",
  "Was there a qualifying encounter on or after referral date?",
  "Is encounter documentation complete for internal policy?",
  "Are all required chart elements present for 340B audit?",
  "Does this audit pass internal 340B compliance review?",
];

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

const StatusBadge = ({ status }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>
);

const getDefaultAnswers = () => AUDIT_QUESTIONS.map((q) => ({ question: q, answer: "", note: "" }));

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
        </aside>
        <div>
          <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
            <h1 className="text-lg font-semibold">NOHN 340B Audit Tool</h1>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audits / locations / keywords" className="min-w-[220px] flex-1 rounded-xl border border-slate-300 px-3 py-2" />
            <div className="text-sm text-slate-500">Audit Manager</div>
          </header>
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [savedAudits, setSavedAudits] = useState(() => loadSavedAudits());
  const [expandedRows, setExpandedRows] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [form, setForm] = useState({
    auditNumber: createAuditNumber(),
    auditTitle: "",
    site: SITES[0],
    answers: getDefaultAnswers(),
  });

  useEffect(() => setSavedAudits(loadSavedAudits()), []);

  const updateAnswer = (index, updates) => {
    setForm((prev) => {
      const answers = [...prev.answers];
      answers[index] = { ...answers[index], ...updates };
      return { ...prev, answers };
    });
  };

  const answeredCount = useMemo(() => form.answers.filter((a) => a.answer).length, [form.answers]);

  const overallStatus = useMemo(() => {
    if (answeredCount < AUDIT_QUESTIONS.length) return "In Progress";
    const allYes = form.answers.every((a) => a.answer === "Yes");
    return allYes ? "Eligible" : "Needs Follow-up";
  }, [answeredCount, form.answers]);

  const filteredAudits = useMemo(
    () => savedAudits.filter((a) => `${a.auditNumber} ${a.auditTitle} ${a.site}`.toLowerCase().includes(search.toLowerCase())),
    [savedAudits, search],
  );

  const kpis = useMemo(
    () => ({
      total: savedAudits.length,
      eligible: savedAudits.filter((a) => a.status === "Eligible").length,
      follow: savedAudits.filter((a) => a.status === "Needs Follow-up").length,
      completionRate: savedAudits.length ? Math.round((savedAudits.filter((a) => a.status !== "In Progress").length / savedAudits.length) * 100) : 0,
    }),
    [savedAudits],
  );

  const handleDecision = (answer) => {
    if (isAdvancing) return;
    updateAnswer(questionIndex, { answer });
    setIsAdvancing(true);
    setTimeout(() => {
      setQuestionIndex((idx) => Math.min(idx + 1, AUDIT_QUESTIONS.length));
      setIsAdvancing(false);
    }, 170);
  };

  const saveAudit = () => {
    const now = new Date().toISOString();
    const record = { ...form, id: `${form.auditNumber}-${now}`, createdAt: now, completedAt: now, updatedAt: now, status: overallStatus };
    const updated = [record, ...savedAudits];
    setSavedAudits(updated);
    persistAudits(updated);
    setSaveMessage("Audit saved successfully.");
    setView("Saved Audits");
  };

  const exportAuditsToExcel = (audits) => {
    const rows = audits.flatMap((audit) =>
      audit.answers.map((item) => [
        audit.auditNumber,
        audit.auditTitle || "Untitled",
        audit.site,
        new Date(audit.createdAt).toLocaleString(),
        new Date(audit.completedAt || audit.updatedAt).toLocaleString(),
        audit.status,
        item.question,
        item.answer || "",
        item.note || "",
      ]),
    );
    const header = ["Audit Number", "Audit Title", "Site", "Created Date", "Completed Date", "Status", "Question", "Answer", "Follow-up Notes"];
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `NOHN_340B_Audits_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const currentQuestion = form.answers[questionIndex];
  const complete = questionIndex >= AUDIT_QUESTIONS.length;

  return (
    <AppShell view={view} setView={setView} search={search} setSearch={setSearch}>
      {view === "Dashboard" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-3xl font-bold">Welcome to the 340B internal audit dashboard</h2>
              <button className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white" onClick={() => setView("Audit Workflow")}>Start New Audit</button>
            </section>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Total Audits", kpis.total], ["Eligible", kpis.eligible], ["Needs Follow-up", kpis.follow], ["Completion Rate", `${kpis.completionRate}%`]].map(([l, v]) => <div key={l} className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{l}</p><p className="text-3xl font-bold">{v}</p></div>)}</section>
          </div>
        </div>
      )}

      {view === "Audit Workflow" && (
        <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-3xl font-bold">340B Audit Workflow</h2>
          <div className="grid gap-3 md:grid-cols-3"><input value={form.auditNumber} readOnly className="rounded-xl border px-3 py-2" /><input value={form.auditTitle} onChange={(e) => setForm((p) => ({ ...p, auditTitle: e.target.value }))} placeholder="Audit Title (optional)" className="rounded-xl border px-3 py-2" /><select value={form.site} onChange={(e) => setForm((p) => ({ ...p, site: e.target.value }))} className="rounded-xl border px-3 py-2">{SITES.map((site) => <option key={site}>{site}</option>)}</select></div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-600">Question {Math.min(questionIndex + 1, AUDIT_QUESTIONS.length)} of {AUDIT_QUESTIONS.length}</p>
            <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${(answeredCount / AUDIT_QUESTIONS.length) * 100}%` }} /></div>
          </div>

          {!complete && (
            <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 ${isAdvancing ? "scale-[0.99] opacity-90" : "opacity-100"}`}>
              <p className="text-xl font-semibold">{currentQuestion.question}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button onClick={() => handleDecision("Yes")} className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 active:translate-y-0 active:scale-[0.99]">Yes</button>
                <button onClick={() => handleDecision("No")} className="rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white shadow transition duration-200 hover:-translate-y-0.5 hover:bg-rose-500 active:translate-y-0 active:scale-[0.99]">No</button>
              </div>
              <textarea value={currentQuestion.note} onChange={(e) => updateAnswer(questionIndex, { note: e.target.value })} placeholder="Optional notes / follow-up flags" className="mt-4 w-full rounded-xl border border-slate-300 p-3" />
            </div>
          )}

          {complete && (
            <div className="animate-in rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <h3 className="text-2xl font-bold">Audit Summary</h3>
              <p>Audit number: {form.auditNumber}</p>
              <p>Audit title: {form.auditTitle || "Untitled"}</p>
              <p>Date/time completed: {new Date().toLocaleString()}</p>
              <p>Final status: <StatusBadge status={overallStatus} /></p>
              <div className="mt-3 space-y-2">
                {form.answers.map((a, i) => (
                  <div key={a.question} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-medium">{i + 1}. {a.question}</p>
                    <p>Answer: <strong>{a.answer || "—"}</strong></p>
                    <p>Notes: {a.note || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={saveAudit}>Save Audit</button>
                <button className="rounded border px-3 py-2" onClick={() => exportAuditsToExcel([{ ...form, createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), status: overallStatus }])}>Export to Excel</button>
                <button className="rounded border px-3 py-2" onClick={() => { setForm({ auditNumber: createAuditNumber(), auditTitle: "", site: SITES[0], answers: getDefaultAnswers() }); setQuestionIndex(0); setView("Audit Workflow"); }}>Start New Audit</button>
              </div>
              {saveMessage && <p className="mt-2 text-emerald-700">{saveMessage}</p>}
            </div>
          )}
        </section>
      )}

      {view === "Saved Audits" && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">Saved Audits</h2><button className="rounded border px-3 py-2" onClick={() => exportAuditsToExcel(filteredAudits)}>Export to Excel</button></div>
          <div className="space-y-2">{filteredAudits.map((audit) => <div key={audit.id} className="rounded-xl border border-slate-200"><div className="flex items-center justify-between p-3"><button className="text-left" onClick={() => setExpandedRows((p) => ({ ...p, [audit.id]: !p[audit.id] }))}><p className="font-semibold">{audit.auditNumber} — {audit.auditTitle || "Untitled Audit"}</p><p className="text-xs text-slate-500">Created: {new Date(audit.createdAt).toLocaleString()} • Completed: {new Date(audit.completedAt || audit.updatedAt).toLocaleString()}</p></button><StatusBadge status={audit.status} /></div>{expandedRows[audit.id] && <div className="border-t bg-slate-50 p-3 text-sm">{audit.answers.map((a, idx) => <p key={`${audit.id}-${idx}`}>{idx + 1}. {a.question}: <strong>{a.answer || "—"}</strong> {a.note ? `• ${a.note}` : ""}</p>)}</div>}</div>)}</div>
        </section>
      )}
    </AppShell>
  );
}
