import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nohn_340b_saved_audits_v3";
const SITES = [
  "NOHN Family Health Center",
  "NOHN Community Clinic",
  "NOHN Behavioral Health",
  "NOHN Dental Clinic",
  "NOHN Pediatrics",
];

const navItems = ["Dashboard", "Saved Audits"];
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

const statusStyles = {
  Eligible: "bg-teal-100 text-teal-800",
  "Needs Follow-up": "bg-amber-100 text-amber-800",
  "In Progress": "bg-sky-100 text-sky-800",
};
const brand = { primary: "#0d3f66", accent: "#1e7ea7", soft: "#e9f4fb" };

const createAuditNumber = () => `AUD-${String(Math.floor(10000 + Math.random() * 89999))}`;
const getDefaultAnswers = () => AUDIT_QUESTIONS.map((q) => ({ question: q, answer: "", note: "" }));

function loadSavedAudits() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
const persistAudits = (audits) => localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
const dayKey = (value) => new Date(value).toISOString().slice(0, 10);

const StatusBadge = ({ status }) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>;

export default function App() {
  const [view, setView] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [savedAudits, setSavedAudits] = useState(() => loadSavedAudits());
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [form, setForm] = useState({ auditNumber: createAuditNumber(), auditTitle: "", site: SITES[0], answers: getDefaultAnswers() });

  useEffect(() => setSavedAudits(loadSavedAudits()), []);

  const updateAnswer = (index, updates) => setForm((prev) => {
    const answers = [...prev.answers]; answers[index] = { ...answers[index], ...updates }; return { ...prev, answers };
  });

  const answeredCount = useMemo(() => form.answers.filter((a) => a.answer).length, [form.answers]);
  const overallStatus = useMemo(() => (answeredCount < AUDIT_QUESTIONS.length ? "In Progress" : form.answers.every((a) => a.answer === "Yes") ? "Eligible" : "Needs Follow-up"), [answeredCount, form.answers]);
  const completedAudits = useMemo(() => savedAudits.filter((a) => a.status !== "In Progress"), [savedAudits]);
  const auditsByDate = useMemo(() => completedAudits.reduce((acc, a) => ({ ...acc, [dayKey(a.completedAt || a.updatedAt)]: true }), {}), [completedAudits]);

  const filteredAudits = useMemo(() => savedAudits.filter((a) => {
    const textMatch = `${a.auditNumber} ${a.auditTitle} ${a.site}`.toLowerCase().includes(search.toLowerCase());
    const dateMatch = selectedDate ? dayKey(a.completedAt || a.updatedAt) === selectedDate : true;
    return textMatch && dateMatch;
  }), [savedAudits, search, selectedDate]);

  const saveAudit = () => {
    const now = new Date().toISOString();
    const record = { ...form, id: `${form.auditNumber}-${now}`, createdAt: now, completedAt: now, updatedAt: now, status: overallStatus };
    const updated = [record, ...savedAudits]; setSavedAudits(updated); persistAudits(updated); setShowWorkflow(false); setView("Saved Audits");
  };

  const exportAuditsToExcel = (audits) => {
    const rows = audits.flatMap((audit) => audit.answers.map((item) => [audit.auditNumber, audit.auditTitle || "Untitled", audit.site, new Date(audit.createdAt).toLocaleString(), new Date(audit.completedAt || audit.updatedAt).toLocaleString(), audit.status, item.question, item.answer || "", item.note || ""]));
    const header = ["Audit Number", "Audit Title", "Site", "Created Date", "Completed Date", "Status", "Question", "Answer", "Follow-up Notes"];
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `NOHN_340B_Audits_${new Date().toISOString().slice(0, 10)}.xlsx`; link.click(); URL.revokeObjectURL(link.href);
  };

  const currentQuestion = form.answers[questionIndex]; const complete = questionIndex >= AUDIT_QUESTIONS.length;
  const handleDecision = (answer) => { if (isAdvancing) return; updateAnswer(questionIndex, { answer }); setIsAdvancing(true); setTimeout(() => { setQuestionIndex((i) => Math.min(i + 1, AUDIT_QUESTIONS.length)); setIsAdvancing(false); }, 190); };

  const kpis = {
    total: savedAudits.length,
    completed: completedAudits.length,
    follow: savedAudits.filter((a) => a.status === "Needs Follow-up").length,
    eligible: savedAudits.filter((a) => a.status === "Eligible").length,
    review: savedAudits.filter((a) => a.status !== "Eligible" && a.status !== "In Progress").length,
  };

  const calendarDays = [...Array(31)].map((_, i) => String(i + 1).padStart(2, "0"));

  return <div className="min-h-screen bg-slate-100 text-slate-800">
    <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
      <aside className="bg-slate-900 p-4 text-slate-100">
        <div className="mb-8 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)" }}><div className="text-xl font-bold">NOHN</div><p className="text-xs text-slate-300">340B Audit Checklist</p></div>
        <nav className="space-y-2">{navItems.map((item) => <button key={item} onClick={() => setView(item)} className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-700" style={view === item ? { background: brand.accent } : {}}>{item}</button>)}</nav>
      </aside>
      <main>
        <header className="border-b bg-white/90 px-4 py-4 backdrop-blur md:px-6"><div className="flex flex-wrap items-center gap-3"><h1 className="text-lg font-semibold">NOHN 340B Audit Dashboard</h1><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved audits" className="min-w-[220px] flex-1 rounded-xl border px-3 py-2" /><button onClick={() => { setForm({ auditNumber: createAuditNumber(), auditTitle: "", site: SITES[0], answers: getDefaultAnswers() }); setQuestionIndex(0); setShowWorkflow(true); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5" style={{ background: brand.primary }}>New Audit</button></div></header>

        <div className="p-4 md:p-6">{view === "Dashboard" && <div className="grid gap-4 xl:grid-cols-[1fr_290px]">
          <section className="space-y-4"><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{new Date().toLocaleDateString()}</p><h2 className="text-2xl font-bold" style={{ color: brand.primary }}>Audit Activity Overview</h2></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Total Audits", kpis.total], ["Completed", kpis.completed], ["Needs Follow-up", kpis.follow], ["Eligible / Review", `${kpis.eligible} / ${kpis.review}`]].map(([l, v]) => <div key={l} className="rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5"><p className="text-xs text-slate-500">{l}</p><p className="text-3xl font-bold">{v}</p></div>)}</div>
            <div className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Saved Audits</h3><button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setView("Saved Audits")}>Open list</button></div>
              <div className="space-y-1">{filteredAudits.slice(0, 6).map((audit) => <button key={audit.id} className="flex w-full items-center justify-between rounded-xl border-b border-slate-100 px-2 py-2 text-left transition hover:bg-slate-50" onClick={() => { setView("Saved Audits"); setSelectedAudit(audit); }}><div><p className="text-sm font-semibold">{audit.auditNumber} • {audit.auditTitle || "Untitled Audit"}</p><p className="text-xs text-slate-500">{new Date(audit.completedAt || audit.updatedAt).toLocaleDateString()}</p></div><StatusBadge status={audit.status} /></button>)}</div></div>
          </section>
          <aside className="rounded-2xl bg-white p-4 shadow-sm"><h3 className="font-semibold">Calendar Filter</h3><p className="mb-2 text-xs text-slate-500">{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</p><div className="grid grid-cols-7 gap-1 text-center text-xs">{calendarDays.map((d) => { const date = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${d}`; const active = selectedDate === date; return <button key={d} onClick={() => setSelectedDate(date)} className="relative rounded-lg px-1 py-2 transition hover:bg-slate-100" style={active ? { background: brand.soft, color: brand.primary, fontWeight: 700 } : {}}>{Number(d)}{auditsByDate[date] && <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: brand.accent }} />}</button>; })}</div><button className="mt-3 text-xs font-medium" style={{ color: brand.accent }} onClick={() => setSelectedDate("")}>Show all audits</button></aside>
        </div>}

        {view === "Saved Audits" && <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]"><section className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Saved Audits</h2><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => exportAuditsToExcel(filteredAudits)}>Export to Excel</button></div>
          <div className="space-y-1">{filteredAudits.map((audit) => <button key={audit.id} onClick={() => setSelectedAudit(audit)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"><div className="flex items-start gap-3"><span className="mt-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: audit.status === "Eligible" ? "#14b8a6" : "#f59e0b" }} /><div><p className="text-sm font-semibold">{audit.auditNumber} — {audit.auditTitle || "Untitled"}</p><p className="text-xs text-slate-500">{new Date(audit.completedAt || audit.updatedAt).toLocaleString()} • {audit.site}</p></div></div><StatusBadge status={audit.status} /></button>)}</div>
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm"><h3 className="mb-3 text-lg font-semibold">Audit Timeline</h3>{selectedAudit ? <div className="space-y-3">{selectedAudit.answers.map((a, idx) => <div key={`${selectedAudit.id}-${idx}`} className="relative rounded-xl border border-slate-200 bg-slate-50 p-3 pl-6 animate-[fadeIn_.3s_ease]"><span className="absolute left-2 top-4 h-2 w-2 rounded-full" style={{ background: a.answer === "Yes" ? "#14b8a6" : "#f59e0b" }} /><p className="text-xs text-slate-500">Question {idx + 1}</p><p className="text-sm font-semibold">{a.question}</p><p className="text-sm">Answer: <strong>{a.answer || "—"}</strong></p><p className="text-xs text-slate-600">Notes: {a.note || "—"}</p></div>)}</div> : <p className="text-sm text-slate-500">Select an audit to view timeline history.</p>}</section></div>}
        </div>
      </main>
    </div>

    {showWorkflow && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><div><h3 className="text-xl font-bold" style={{ color: brand.primary }}>New 340B Audit</h3><p className="text-xs text-slate-500">{form.auditNumber}</p></div><button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setShowWorkflow(false)}>Close</button></div>
      <div className="grid gap-3 md:grid-cols-3"><input readOnly value={form.auditNumber} className="rounded-xl border px-3 py-2" /><input value={form.auditTitle} onChange={(e) => setForm((p) => ({ ...p, auditTitle: e.target.value }))} placeholder="Audit title" className="rounded-xl border px-3 py-2" /><select value={form.site} onChange={(e) => setForm((p) => ({ ...p, site: e.target.value }))} className="rounded-xl border px-3 py-2">{SITES.map((site) => <option key={site}>{site}</option>)}</select></div>
      <div className="mt-4 rounded-xl p-3" style={{ background: brand.soft }}><p className="text-sm font-medium" style={{ color: brand.primary }}>Question {Math.min(questionIndex + 1, AUDIT_QUESTIONS.length)} of {AUDIT_QUESTIONS.length}</p><div className="mt-2 h-2 rounded-full bg-white"><div className="h-2 rounded-full transition-all duration-300" style={{ background: brand.accent, width: `${(answeredCount / AUDIT_QUESTIONS.length) * 100}%` }} /></div></div>
      {!complete ? <div className={`mt-4 rounded-2xl border p-4 transition duration-200 ${isAdvancing ? "translate-x-1 opacity-80" : "opacity-100"}`}><p className="text-lg font-semibold">{currentQuestion.question}</p><div className="mt-4 flex gap-2"><button onClick={() => handleDecision("Yes")} className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5 active:scale-[0.98]">Yes</button><button onClick={() => handleDecision("No")} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:-translate-y-0.5 active:scale-[0.98]">No</button></div><textarea value={currentQuestion.note} onChange={(e) => updateAnswer(questionIndex, { note: e.target.value })} placeholder="Optional notes / follow-up" className="mt-3 w-full rounded-xl border p-3 text-sm" /></div> : <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 p-4"><h4 className="text-lg font-bold">Audit Complete</h4><p className="text-sm">Status: <StatusBadge status={overallStatus} /></p><div className="mt-3 flex gap-2"><button className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: brand.primary }} onClick={saveAudit}>Save Audit</button><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => exportAuditsToExcel([{ ...form, createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), status: overallStatus }])}>Export to Excel</button></div></div>}
    </div></div>}
  </div>;
}
