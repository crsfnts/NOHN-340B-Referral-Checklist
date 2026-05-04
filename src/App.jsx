import { useMemo, useState } from "react";

const STORAGE_KEY = "nohn_340b_saved_audits";
const PHI_WARNING = "Do not enter patient names, DOB, MRN, or other identifying information.";

const referralInfo =
  "Qualifying referral summary: NOHN must maintain responsibility for the patient's care. A valid referral claim generally requires established NOHN primary care, a NOHN visit within the past 24 months, the medication listed in Epic, and documentation connecting the outside provider/specialty care to the patient's condition or medication. Acceptable documentation may include a referral order, communication referral, progress note, problem list, past medical history, medication list, consult note, specialist communication, shared records, or documented acknowledgement of existing specialty care. Hospitalist discharge prescriptions may qualify when covered by NOHN hospitalist arrangements. ED/Urgent Care discharge prescriptions only qualify if NOHN referred the patient and care coordination is documented. Dental prescriptions are excluded. Specialist prescriptions should not be rewritten solely to create 340B eligibility.";

const steps = [
  { question: "Is the PCP a NOHN provider?", options: [
    { label: "Yes", next: 1, note: "PCP is a NOHN provider.", tone: "good" },
    { label: "No", next: "END_NOT_ELIGIBLE_PCP", note: "PCP is not a NOHN provider.", tags: ["PCP_NOT_NOHN"], tone: "stop" },
  ]},
  { question: "Is primary care established with NOHN and was the patient seen within the past 24 months?", options: [
    { label: "Yes", next: 2, note: "Primary care established with NOHN and patient seen within past 24 months.", tone: "good" },
    { label: "No", next: "END_NOT_ELIGIBLE_PATIENT", note: "Primary care is not established with NOHN or no qualifying NOHN visit within the past 24 months.", tags: ["NO_NOHN_VISIT_24_MONTHS"], tone: "stop" },
  ]},
  { question: "Is the medication on the med list in Epic?", options: [
    { label: "Yes", next: 3, note: "Medication is listed on the Epic medication list.", tone: "good" },
    { label: "No", next: 3, note: "Medication not found on Epic med list. Add or reconcile medication in Epic if clinically appropriate.", tags: ["MED_NOT_ON_LIST"], tone: "caution" },
  ]},
  { question: "Is the prescription from a dental provider?", options: [
    { label: "Yes", next: "END_NOT_ELIGIBLE_DENTAL", note: "Prescription written by dental provider. Dental prescriptions are excluded.", tags: ["DENTAL_EXCLUDED"], tone: "stop" },
    { label: "No", next: 4, note: "Prescription is not from a dental provider.", tone: "good" },
  ]},
  { question: "Is this an ED or Urgent Care discharge prescription?", options: [
    { label: "Yes", next: 5, note: "Prescription is from ED/Urgent Care discharge.", tone: "caution" },
    { label: "No", next: 6, note: "Prescription is not from ED/Urgent Care discharge.", tone: "good" },
  ]},
  { question: "Did NOHN refer the patient to ED/Urgent Care and is care coordination documented?", options: [
    { label: "Yes", next: 6, note: "NOHN referral to ED/Urgent Care and care coordination documented.", tone: "good" },
    { label: "No", next: "END_NOT_ELIGIBLE_ED_UC", note: "ED/Urgent Care prescription without NOHN referral and documented care coordination.", tags: ["ED_UC_NOT_VALID"], tone: "stop" },
  ]},
  { question: "Is there a valid referral in Epic?", highlightWord: "referral", info: referralInfo, options: [
    { label: "Yes", next: 7, note: "Valid referral found in Epic.", tone: "good" },
    { label: "No", next: 8, note: "No valid referral found in Epic.", tags: ["NO_REFERRAL"], tone: "caution" },
  ]},
  { question: "Is the referral connected to the medication, diagnosis, provider, or specialty condition?", highlightWord: "referral", info: referralInfo, options: [
    { label: "Yes", next: 12, note: "Referral is connected to medication, diagnosis, provider, or specialty condition.", tone: "good" },
    { label: "No", next: 8, note: "Referral found but connection to medication, diagnosis, provider, or specialty condition is unclear.", tags: ["REFERRAL_CONNECTION_UNCLEAR"], tone: "caution" },
  ]},
  { question: "Is there documented specialty care or acknowledgement in Epic?", options: [
    { label: "Yes", next: 9, note: "Documented specialty care or acknowledgement found in Epic.", tone: "good" },
    { label: "No", next: 10, note: "No referral or documented specialty care found in Epic.", tags: ["NO_SPECIALTY_DOCUMENTATION"], tone: "stop" },
  ]},
  { question: "Where is the specialty care documented?", options: [
    { label: "Progress Note", next: 11, note: "Specialty care documented in progress note.", tone: "good" },
    { label: "Problem List / PMH", next: 11, note: "Specialty care documented in problem list or past medical history.", tone: "good" },
    { label: "Medication List", next: 11, note: "Specialty care support found through medication list documentation.", tone: "good" },
    { label: "Consult Note / Shared Records", next: 11, note: "Specialty care documented through consult note or shared records.", tone: "good" },
    { label: "Communication Referral / Specialist Communication", next: 11, note: "Specialty care documented through communication referral or specialist communication.", tone: "good" },
    { label: "Other / Unsure", next: 11, note: "Specialty care documentation found, but documentation type requires manual review.", tags: ["SPECIALTY_DOCUMENTATION_UNSURE"], tone: "caution" },
  ]},
  { question: "Is there an encounter related to the medication?", options: [
    { label: "Yes", next: 13, note: "No qualifying referral or specialty-care documentation found, but encounter exists for medication. Add referral in Epic if appropriate.", tags: ["ENCOUNTER_FOUND_ADD_REFERRAL"], tone: "caution" },
    { label: "No", next: "END_NO_DOCUMENTATION", note: "No qualifying referral, specialty-care documentation, or medication-related encounter found.", tags: ["NO_DOCUMENTATION"], tone: "stop" },
  ]},
  { question: "Does documentation show NOHN maintains responsibility for the patient's care?", options: [
    { label: "Yes", next: 12, note: "Documentation supports that NOHN maintains responsibility for the patient's care.", tone: "good" },
    { label: "No / Unsure", next: "END_RECHECK_CARE_RESPONSIBILITY", note: "Unable to confirm NOHN maintains responsibility for the patient's care.", tags: ["CARE_RESPONSIBILITY_UNCLEAR"], tone: "caution" },
  ]},
  { question: "Is there evidence of closed-loop care coordination or specialist documentation/sign-off?", options: [
    { label: "Yes", next: "END_340B_OK", note: "Closed-loop care coordination or specialist documentation/sign-off found.", tone: "good" },
    { label: "No / Needs Follow-up", next: "END_RECHECK_CLOSED_LOOP", note: "Closed-loop care coordination or specialist documentation/sign-off needs follow-up.", tags: ["CLOSED_LOOP_FOLLOWUP"], tone: "caution" },
  ]},
  { question: "Enter the encounter date.", inputType: "date", inputLabel: "Encounter Date", next: 14, notePrefix: "Encounter date:" },
  { question: "What type of encounter is related to the medication?", options: [
    { label: "Office Visit", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Office Visit related to medication.", tags: ["ENCOUNTER_OFFICE_VISIT"], tone: "caution" },
    { label: "Telehealth", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Telehealth related to medication.", tags: ["ENCOUNTER_TELEHEALTH"], tone: "caution" },
    { label: "Hospital / ER", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Hospital / ER related to medication.", tags: ["ENCOUNTER_HOSPITAL_ER"], tone: "caution" },
    { label: "Phone / Message", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Phone / Message related to medication.", tags: ["ENCOUNTER_PHONE_MESSAGE"], tone: "caution" },
    { label: "Other / Unsure", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Other / Unsure. Requires manual review.", tags: ["ENCOUNTER_TYPE_UNSURE"], tone: "caution" },
  ]},
];

const outcomes = {
  END_340B_OK: "340B OK",
  END_NOT_ELIGIBLE_PCP: "Not Eligible",
  END_NOT_ELIGIBLE_PATIENT: "Not Eligible",
  END_NOT_ELIGIBLE_DENTAL: "Not Eligible",
  END_NOT_ELIGIBLE_ED_UC: "Not Eligible",
  END_NO_DOCUMENTATION: "Not Eligible",
  END_RECHECK_CARE_RESPONSIBILITY: "Needs Recheck",
  END_RECHECK_CLOSED_LOOP: "Needs Follow-up",
  END_RECHECK_ADD_REFERRAL: "Add Referral / Needs Follow-up",
};

const notes = {
  END_340B_OK: "Minimum documentation criteria met for 340B referral prescription review.",
  END_NOT_ELIGIBLE_PCP: "PCP is not a NOHN provider; claim does not meet NOHN referral prescription criteria.",
  END_NOT_ELIGIBLE_PATIENT: "Patient does not meet established NOHN primary care or 24-month visit requirement.",
  END_NOT_ELIGIBLE_DENTAL: "Dental prescriptions are excluded from NOHN referral prescription eligibility.",
  END_NOT_ELIGIBLE_ED_UC: "ED/Urgent Care discharge prescription does not qualify without NOHN referral and documented care coordination.",
  END_NO_DOCUMENTATION: "Documentation cannot be found in Epic; prescription does not qualify for 340B under referral prescription procedure.",
  END_RECHECK_CARE_RESPONSIBILITY: "Care responsibility is unclear. Manual review required before determining eligibility.",
  END_RECHECK_CLOSED_LOOP: "Closed-loop care coordination needs follow-up before final eligibility decision.",
  END_RECHECK_ADD_REFERRAL: "Medication-related encounter found without qualifying referral documentation. Add referral or complete follow-up review in Epic.",
};

const tagLabels = {
  PCP_NOT_NOHN: "PCP not NOHN",
  NO_NOHN_VISIT_24_MONTHS: "No qualifying NOHN visit",
  MED_NOT_ON_LIST: "Medication not on list",
  DENTAL_EXCLUDED: "Dental excluded",
  ED_UC_NOT_VALID: "ED/UC not valid",
  NO_REFERRAL: "No referral",
  REFERRAL_CONNECTION_UNCLEAR: "Referral connection unclear",
  NO_SPECIALTY_DOCUMENTATION: "No specialty documentation",
  SPECIALTY_DOCUMENTATION_UNSURE: "Specialty documentation unsure",
  ENCOUNTER_FOUND_ADD_REFERRAL: "Encounter found/add referral",
  NO_DOCUMENTATION: "No documentation",
  CARE_RESPONSIBILITY_UNCLEAR: "Care responsibility unclear",
  CLOSED_LOOP_FOLLOWUP: "Closed-loop follow-up",
  ENCOUNTER_OFFICE_VISIT: "Encounter: Office visit",
  ENCOUNTER_TELEHEALTH: "Encounter: Telehealth",
  ENCOUNTER_HOSPITAL_ER: "Encounter: Hospital/ER",
  ENCOUNTER_PHONE_MESSAGE: "Encounter: Phone/message",
  ENCOUNTER_TYPE_UNSURE: "Encounter type unsure",
};

const evidenceItems = [
  "NOHN primary care relationship confirmed",
  "NOHN visit date verified within 24 months",
  "Medication reconciled in Epic",
  "Referral, specialty record, or acknowledgement reviewed",
  "Medication or condition connection documented",
  "Closed-loop coordination checked",
];

function createAuditNumber() {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `AUD-${datePart}-${randomPart}`;
}

function getSavedAudits() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveAuditRecord(record) {
  const savedAudits = getSavedAudits();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...savedAudits, [record.auditNumber]: record }));
}

function getAuditTags(answers) {
  return [...new Set(Object.values(answers).flatMap((answer) => answer?.tags || []))];
}

function getOutcomeTone(finalStep) {
  if (finalStep === "END_340B_OK") return "good";
  if (String(finalStep).includes("NOT_ELIGIBLE") || finalStep === "END_NO_DOCUMENTATION") return "stop";
  return "caution";
}

function buildAuditNote({ finalStep, answers, auditNumber, evidenceComplete }) {
  const collectedNotes = Object.values(answers).map((answer) => answer?.note).filter(Boolean);
  const finalNote = notes[finalStep] ? [notes[finalStep]] : [];
  const evidenceNotes = evidenceComplete.length
    ? ["Evidence reviewed:", ...evidenceComplete.map((item) => `- ${item}`)]
    : [];

  return [
    "340B Internal Audit",
    `Audit Number: ${auditNumber}`,
    `Outcome: ${outcomes[finalStep] || "Pending"}`,
    "",
    "Findings:",
    ...(collectedNotes.length || finalNote.length ? [...collectedNotes, ...finalNote].map((note) => `- ${note}`) : ["- No issues documented."]),
    ...(evidenceNotes.length ? ["", ...evidenceNotes] : []),
  ].join("\n");
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function AppShell({ children }) {
  return (
    <main className="min-h-screen bg-[#f6f8f7] text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}

function AppHeader({ auditNumber }) {
  return (
    <header className="mb-4 border-b border-slate-200 pb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
            NOHN referral prescription review
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">340B Internal Audit Checklist</h1>
          <p className="mt-1 text-sm text-slate-600">Audit Number: <span className="font-semibold text-slate-900">{auditNumber}</span></p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 lg:max-w-md">
          {PHI_WARNING}
        </div>
      </div>
    </header>
  );
}

function ProgressBar({ step }) {
  const progress = typeof step === "number" ? Math.round(((step + 1) / steps.length) * 100) : 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{typeof step === "number" ? `Decision ${step + 1} of ${steps.length}` : "Complete"}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-teal-700 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Button({ children, className = "", variant = "default", disabled, onClick }) {
  const styles = {
    default: "border border-teal-800 bg-teal-800 text-white hover:bg-teal-900",
    secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
    outline: "border border-slate-300 bg-transparent text-slate-900 hover:bg-white",
    ghost: "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        styles[variant],
        className,
        "inline-flex min-h-10 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      {children}
    </button>
  );
}

function Textarea({ className = "", value }) {
  return <textarea className={cx("w-full resize-none rounded-md border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none", className)} value={value} readOnly />;
}

function StatusChip({ children, tone = "neutral" }) {
  const styles = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    good: "border-teal-200 bg-teal-50 text-teal-800",
    caution: "border-amber-200 bg-amber-50 text-amber-800",
    stop: "border-red-200 bg-red-50 text-red-800",
  };
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", styles[tone])}>{children}</span>;
}

function EvidenceChecklist({ evidence, onToggle }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Evidence Review</h2>
        <StatusChip tone={evidence.length === evidenceItems.length ? "good" : "neutral"}>{evidence.length}/{evidenceItems.length}</StatusChip>
      </div>
      <div className="grid gap-2">
        {evidenceItems.map((item) => {
          const checked = evidence.includes(item);
          return (
            <label key={item} className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-white">
              <input className="mt-1 h-4 w-4 accent-teal-700" type="checkbox" checked={checked} onChange={() => onToggle(item)} />
              <span className={checked ? "font-medium text-slate-950" : ""}>{item}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function TrailPanel({ answers }) {
  const entries = Object.entries(answers).sort(([a], [b]) => Number(a) - Number(b));
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Answer Trail</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">Selections will appear here as the review progresses.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map(([stepIndex, answer]) => (
            <li key={stepIndex} className="border-l-2 border-teal-700 pl-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision {Number(stepIndex) + 1}</p>
              <p className="text-sm font-semibold text-slate-950">{answer.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{answer.note}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function TagPanel({ tags }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Findings</h2>
      {tags.length === 0 ? (
        <p className="text-sm text-slate-500">No exception findings recorded.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => <StatusChip key={tag} tone="caution">{tagLabels[tag] || tag}</StatusChip>)}
        </div>
      )}
    </section>
  );
}

function SavedAuditPanel({ audits, openAuditNumber, setOpenAuditNumber, removeAudit, copyText }) {
  const [query, setQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [copiedAudit, setCopiedAudit] = useState(null);

  const filteredAudits = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return Object.values(audits)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
      .filter((audit) => {
        const matchesQuery = !normalized || [audit.auditNumber, audit.outcome, ...(audit.tags || []).map((tag) => tagLabels[tag] || tag)].join(" ").toLowerCase().includes(normalized);
        const matchesOutcome = outcomeFilter === "All" || audit.outcome === outcomeFilter;
        return matchesQuery && matchesOutcome;
      });
  }, [audits, outcomeFilter, query]);

  const outcomeOptions = ["All", ...new Set(Object.values(audits).map((audit) => audit.outcome).filter(Boolean))];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Saved Audits</h2>
        <StatusChip>{Object.keys(audits).length}</StatusChip>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1 xl:grid-cols-[1fr_auto]">
        <input
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          placeholder="Search audit, outcome, or finding"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          value={outcomeFilter}
          onChange={(event) => setOutcomeFilter(event.target.value)}
        >
          {outcomeOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>
      <div className="mt-4 space-y-3">
        {filteredAudits.length === 0 ? (
          <p className="text-sm text-slate-500">No matching saved audits.</p>
        ) : filteredAudits.map((audit) => {
          const isOpen = openAuditNumber === audit.auditNumber;
          return (
            <article key={audit.auditNumber} className="rounded-lg border border-slate-200 bg-slate-50">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                onClick={() => {
                  setOpenAuditNumber(isOpen ? null : audit.auditNumber);
                  setCopiedAudit(null);
                }}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-950">{audit.auditNumber}</span>
                  <span className="mt-1 block text-xs text-slate-500">{new Date(audit.savedAt).toLocaleString()}</span>
                </span>
                <StatusChip tone={getOutcomeTone(audit.finalCode)}>{audit.outcome}</StatusChip>
              </button>
              {isOpen && (
                <div className="border-t border-slate-200 p-3">
                  {audit.tags?.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {audit.tags.map((tag) => <StatusChip key={tag} tone="caution">{tagLabels[tag] || tag}</StatusChip>)}
                    </div>
                  )}
                  <Textarea className="mb-3 min-h-48 bg-white" value={audit.note} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button onClick={() => copyText(audit.note, (value) => setCopiedAudit(value ? audit.auditNumber : null))}>
                      {copiedAudit === audit.auditNumber ? "Copied" : "Copy Note"}
                    </Button>
                    <Button variant="danger" onClick={() => removeAudit(audit.auditNumber)}>Delete</Button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DecisionQuestion({ currentStep, showInfo, setShowInfo }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-800">Active Decision</p>
      <h2 className="text-xl font-semibold leading-snug text-slate-950 sm:text-2xl">
        {currentStep.highlightWord
          ? currentStep.question.split(currentStep.highlightWord).map((part, index, array) => (
            <span key={`${part}-${index}`}>
              {part}
              {index < array.length - 1 && (
                <button
                  type="button"
                  className="font-semibold text-teal-800 underline decoration-dotted underline-offset-4 transition hover:text-teal-950"
                  onClick={() => setShowInfo((prev) => !prev)}
                >
                  {currentStep.highlightWord}
                </button>
              )}
            </span>
          ))
          : currentStep.question}
      </h2>
      {showInfo && currentStep.info && <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-relaxed text-teal-950">{currentStep.info}</p>}
    </div>
  );
}

function ResultPanel({ step, tags, note, copied, saved, onCopy, onSave, onReset, onBack, canGoBack }) {
  const tone = getOutcomeTone(step);
  const styles = {
    good: "border-teal-200 bg-teal-50 text-teal-950",
    caution: "border-amber-200 bg-amber-50 text-amber-950",
    stop: "border-red-200 bg-red-50 text-red-950",
  };
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className={cx("mb-4 rounded-lg border p-4", styles[tone])}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-75">Final Review Status</p>
        <h2 className="text-2xl font-semibold tracking-tight">{outcomes[step]}</h2>
        <p className="mt-2 text-sm leading-relaxed">{notes[step]}</p>
      </div>
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((tag) => <StatusChip key={tag} tone="caution">{tagLabels[tag] || tag}</StatusChip>)}
        </div>
      )}
      <label className="mb-2 block text-sm font-semibold text-slate-700">Generated audit note</label>
      <Textarea className="min-h-72 bg-slate-50" value={note} />
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Button onClick={onCopy}>{copied ? "Copied" : "Copy Note"}</Button>
        <Button onClick={onSave} variant="secondary">{saved ? "Saved" : "Save Locally"}</Button>
        <Button onClick={onReset} variant="outline">New Audit</Button>
        <Button onClick={onBack} variant="ghost" disabled={!canGoBack}>Back</Button>
      </div>
    </section>
  );
}

export default function AuditChecklist() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [stepHistory, setStepHistory] = useState([]);
  const [auditNumber, setAuditNumber] = useState(createAuditNumber);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [savedAudits, setSavedAudits] = useState(getSavedAudits());
  const [openAuditNumber, setOpenAuditNumber] = useState(null);
  const [evidenceComplete, setEvidenceComplete] = useState([]);

  const currentAuditTags = getAuditTags(answers);
  const currentAuditNote = buildAuditNote({ finalStep: step, answers, auditNumber, evidenceComplete });
  const currentStep = typeof step === "number" ? steps[step] : null;
  const currentProgress = typeof step === "number" ? Math.round(((step + 1) / steps.length) * 100) : 100;

  const copyText = async (text, onSuccess) => {
    try {
      await navigator.clipboard.writeText(text);
      onSuccess(true);
      setTimeout(() => onSuccess(false), 1500);
    } catch {
      onSuccess(false);
    }
  };

  const handleSaveAudit = () => {
    if (typeof step !== "string") return;
    const record = {
      auditNumber,
      savedAt: new Date().toISOString(),
      outcome: outcomes[step],
      finalCode: step,
      note: currentAuditNote,
      answers,
      tags: currentAuditTags,
      evidenceComplete,
    };
    saveAuditRecord(record);
    setSavedAudits(getSavedAudits());
    setSaved(true);
  };

  const handleAnswer = (label, next, note) => {
    const selectedOption = steps[step]?.options?.find((option) => option.label === label);
    setStepHistory((prev) => [...prev, step]);
    setAnswers((prev) => ({ ...prev, [step]: { label, note, tags: selectedOption?.tags || [] } }));
    setCopied(false);
    setSaved(false);
    setInputValue("");
    setShowInfo(false);
    setStep(next);
  };

  const handleBack = () => {
    if (!stepHistory.length) return;
    const previousStep = stepHistory[stepHistory.length - 1];
    setStepHistory((prev) => prev.slice(0, -1));
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[previousStep];
      return updated;
    });
    setCopied(false);
    setSaved(false);
    setInputValue("");
    setShowInfo(false);
    setStep(previousStep);
  };

  const handleInputSubmit = () => {
    if (!currentStep || !inputValue.trim()) return;
    handleAnswer(inputValue, currentStep.next, `${currentStep.notePrefix} ${inputValue}.`);
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setStepHistory([]);
    setAuditNumber(createAuditNumber());
    setCopied(false);
    setSaved(false);
    setInputValue("");
    setShowInfo(false);
    setEvidenceComplete([]);
  };

  const toggleEvidence = (item) => {
    setEvidenceComplete((prev) => prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]);
    setSaved(false);
  };

  const removeAudit = (auditNumberToRemove) => {
    const updated = { ...savedAudits };
    delete updated[auditNumberToRemove];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedAudits(updated);
    if (openAuditNumber === auditNumberToRemove) setOpenAuditNumber(null);
  };

  return (
    <AppShell>
      <AppHeader auditNumber={auditNumber} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <ProgressBar step={step} />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{currentProgress}%</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Findings</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{currentAuditTags.length}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{evidenceComplete.length}/{evidenceItems.length}</p>
              </div>
            </div>
          </section>

          {typeof step === "string" ? (
            <ResultPanel
              step={step}
              tags={currentAuditTags}
              note={currentAuditNote}
              copied={copied}
              saved={saved}
              onCopy={() => copyText(currentAuditNote, setCopied)}
              onSave={handleSaveAudit}
              onReset={reset}
              onBack={handleBack}
              canGoBack={stepHistory.length > 0}
            />
          ) : (
            <>
              <DecisionQuestion currentStep={currentStep} showInfo={showInfo} setShowInfo={setShowInfo} />
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                {currentStep.inputType ? (
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">{currentStep.inputLabel}</label>
                      <input
                        className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                        type={currentStep.inputType}
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button onClick={handleInputSubmit} disabled={!inputValue.trim()}>Continue</Button>
                      <Button variant="outline" onClick={handleBack} disabled={!stepHistory.length}>Back</Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {currentStep.options.map((option) => (
                      <button
                        type="button"
                        key={option.label}
                        onClick={() => handleAnswer(option.label, option.next, option.note)}
                        className="group flex min-h-14 items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 text-left transition hover:border-teal-700 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-100"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-slate-950">{option.label}</span>
                          {option.tags?.length > 0 && <span className="mt-1 block text-xs text-slate-500">{option.tags.map((tag) => tagLabels[tag] || tag).join(", ")}</span>}
                        </span>
                        <StatusChip tone={option.tone || "neutral"}>{option.tone === "stop" ? "Stop" : option.tone === "caution" ? "Review" : "Pass"}</StatusChip>
                      </button>
                    ))}
                    <Button className="mt-1" variant="outline" onClick={handleBack} disabled={!stepHistory.length}>Back</Button>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <EvidenceChecklist evidence={evidenceComplete} onToggle={toggleEvidence} />
          <TagPanel tags={currentAuditTags} />
          <TrailPanel answers={answers} />
          <SavedAuditPanel
            audits={savedAudits}
            openAuditNumber={openAuditNumber}
            setOpenAuditNumber={setOpenAuditNumber}
            removeAudit={removeAudit}
            copyText={copyText}
          />
        </aside>
      </div>
    </AppShell>
  );
}
