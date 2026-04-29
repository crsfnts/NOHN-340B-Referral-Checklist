import { useState } from "react";

const STORAGE_KEY = "nohn_340b_saved_audits";
const PHI_WARNING = "Do not enter patient names, DOB, MRN, or other identifying information.";

const referralInfo =
  "Qualifying referral summary: NOHN must maintain responsibility for the patient’s care. A valid referral claim generally requires established NOHN primary care, a NOHN visit within the past 24 months, the medication listed in Epic, and documentation connecting the outside provider/specialty care to the patient’s condition or medication. Acceptable documentation may include a referral order, communication referral, progress note, problem list, past medical history, medication list, consult note, specialist communication, shared records, or documented acknowledgement of existing specialty care. Hospitalist discharge prescriptions may qualify when covered by NOHN hospitalist arrangements. ED/Urgent Care discharge prescriptions only qualify if NOHN referred the patient and care coordination is documented. Dental prescriptions are excluded. Specialist prescriptions should not be rewritten solely to create 340B eligibility.";

const steps = [
  { question: "Is the PCP a NOHN provider?", options: [
    { label: "Yes", next: 1, note: "PCP is a NOHN provider." },
    { label: "No", next: "END_NOT_ELIGIBLE_PCP", note: "PCP is not a NOHN provider.", tags: ["PCP_NOT_NOHN"] },
  ]},
  { question: "Is primary care established with NOHN and was the patient seen within the past 24 months?", options: [
    { label: "Yes", next: 2, note: "Primary care established with NOHN and patient seen within past 24 months." },
    { label: "No", next: "END_NOT_ELIGIBLE_PATIENT", note: "Primary care is not established with NOHN or no qualifying NOHN visit within the past 24 months.", tags: ["NO_NOHN_VISIT_24_MONTHS"] },
  ]},
  { question: "Is the medication on the med list in Epic?", options: [
    { label: "Yes", next: 3, note: "Medication is listed on the Epic medication list." },
    { label: "No", next: 3, note: "Medication not found on Epic med list. Add or reconcile medication in Epic if clinically appropriate.", tags: ["MED_NOT_ON_LIST"] },
  ]},
  { question: "Is the prescription from a dental provider?", options: [
    { label: "Yes", next: "END_NOT_ELIGIBLE_DENTAL", note: "Prescription written by dental provider. Dental prescriptions are excluded.", tags: ["DENTAL_EXCLUDED"] },
    { label: "No", next: 4, note: "Prescription is not from a dental provider." },
  ]},
  { question: "Is this an ED or Urgent Care discharge prescription?", options: [
    { label: "Yes", next: 5, note: "Prescription is from ED/Urgent Care discharge." },
    { label: "No", next: 6, note: "Prescription is not from ED/Urgent Care discharge." },
  ]},
  { question: "Did NOHN refer the patient to ED/Urgent Care and is care coordination documented?", options: [
    { label: "Yes", next: 6, note: "NOHN referral to ED/Urgent Care and care coordination documented." },
    { label: "No", next: "END_NOT_ELIGIBLE_ED_UC", note: "ED/Urgent Care prescription without NOHN referral and documented care coordination.", tags: ["ED_UC_NOT_VALID"] },
  ]},
  { question: "Is there a valid referral in Epic?", highlightWord: "referral", info: referralInfo, options: [
    { label: "Yes", next: 7, note: "Valid referral found in Epic." },
    { label: "No", next: 8, note: "No valid referral found in Epic.", tags: ["NO_REFERRAL"] },
  ]},
  { question: "Is the referral connected to the medication, diagnosis, provider, or specialty condition?", highlightWord: "referral", info: referralInfo, options: [
    { label: "Yes", next: 12, note: "Referral is connected to medication, diagnosis, provider, or specialty condition." },
    { label: "No", next: 8, note: "Referral found but connection to medication, diagnosis, provider, or specialty condition is unclear.", tags: ["REFERRAL_CONNECTION_UNCLEAR"] },
  ]},
  { question: "Is there documented specialty care or acknowledgement in Epic?", options: [
    { label: "Yes", next: 9, note: "Documented specialty care or acknowledgement found in Epic." },
    { label: "No", next: 10, note: "No referral or documented specialty care found in Epic.", tags: ["NO_SPECIALTY_DOCUMENTATION"] },
  ]},
  { question: "Where is the specialty care documented?", options: [
    { label: "Progress Note", next: 11, note: "Specialty care documented in progress note." },
    { label: "Problem List / PMH", next: 11, note: "Specialty care documented in problem list or past medical history." },
    { label: "Medication List", next: 11, note: "Specialty care support found through medication list documentation." },
    { label: "Consult Note / Shared Records", next: 11, note: "Specialty care documented through consult note or shared records." },
    { label: "Communication Referral / Specialist Communication", next: 11, note: "Specialty care documented through communication referral or specialist communication." },
    { label: "Other / Unsure", next: 11, note: "Specialty care documentation found, but documentation type requires manual review.", tags: ["SPECIALTY_DOCUMENTATION_UNSURE"] },
  ]},
  { question: "Is there an encounter related to the medication?", options: [
    { label: "Yes", next: 13, note: "No qualifying referral or specialty-care documentation found, but encounter exists for medication. Add referral in Epic if appropriate.", tags: ["ENCOUNTER_FOUND_ADD_REFERRAL"] },
    { label: "No", next: "END_NO_DOCUMENTATION", note: "No qualifying referral, specialty-care documentation, or medication-related encounter found.", tags: ["NO_DOCUMENTATION"] },
  ]},
  { question: "Does documentation show NOHN maintains responsibility for the patient’s care?", options: [
    { label: "Yes", next: 12, note: "Documentation supports that NOHN maintains responsibility for the patient’s care." },
    { label: "No / Unsure", next: "END_RECHECK_CARE_RESPONSIBILITY", note: "Unable to confirm NOHN maintains responsibility for the patient’s care.", tags: ["CARE_RESPONSIBILITY_UNCLEAR"] },
  ]},
  { question: "Is there evidence of closed-loop care coordination or specialist documentation/sign-off?", options: [
    { label: "Yes", next: "END_340B_OK", note: "Closed-loop care coordination or specialist documentation/sign-off found." },
    { label: "No / Needs Follow-up", next: "END_RECHECK_CLOSED_LOOP", note: "Closed-loop care coordination or specialist documentation/sign-off needs follow-up.", tags: ["CLOSED_LOOP_FOLLOWUP"] },
  ]},
  { question: "Enter the encounter date.", inputType: "date", inputLabel: "Encounter Date", next: 14, notePrefix: "Encounter date:" },
  { question: "What type of encounter is related to the medication?", options: [
    { label: "Office Visit", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Office Visit related to medication.", tags: ["ENCOUNTER_OFFICE_VISIT"] },
    { label: "Telehealth", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Telehealth related to medication.", tags: ["ENCOUNTER_TELEHEALTH"] },
    { label: "Hospital / ER", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Hospital / ER related to medication.", tags: ["ENCOUNTER_HOSPITAL_ER"] },
    { label: "Phone / Message", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Phone / Message related to medication.", tags: ["ENCOUNTER_PHONE_MESSAGE"] },
    { label: "Other / Unsure", next: "END_RECHECK_ADD_REFERRAL", note: "Encounter type: Other / Unsure. Requires manual review.", tags: ["ENCOUNTER_TYPE_UNSURE"] },
  ]},
];

const outcomes = {
  END_340B_OK: "✅ 340B OK",
  END_NOT_ELIGIBLE_PCP: "❌ Not Eligible",
  END_NOT_ELIGIBLE_PATIENT: "❌ Not Eligible",
  END_NOT_ELIGIBLE_DENTAL: "❌ Not Eligible",
  END_NOT_ELIGIBLE_ED_UC: "❌ Not Eligible",
  END_NO_DOCUMENTATION: "❌ Not Eligible",
  END_RECHECK_CARE_RESPONSIBILITY: "⚠️ Needs Recheck",
  END_RECHECK_CLOSED_LOOP: "⚠️ Needs Follow-up",
  END_RECHECK_ADD_REFERRAL: "⚠️ Add Referral / Needs Follow-up",
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

function createAuditNumber() {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `AUD-${datePart}-${randomPart}`;
}

function buildAuditNote({ finalStep, answers, auditNumber }) {
  const collectedNotes = Object.values(answers).map((answer) => answer?.note).filter(Boolean);
  const finalNote = notes[finalStep] ? [notes[finalStep]] : [];
  const allNotes = [...collectedNotes, ...finalNote];

  return [
    "340B Internal Audit",
    `Audit Number: ${auditNumber}`,
    `Outcome: ${outcomes[finalStep] || "Pending"}`,
    "",
    "Findings:",
    ...(allNotes.length ? allNotes.map((note) => `- ${note}`) : ["- No issues documented."]),
  ].join("\n");
}

function getAuditTags(answers) {
  return [...new Set(Object.values(answers).flatMap((answer) => answer?.tags || []))];
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

function AppHeader({ auditNumber }) {
  return (
    <div className="mb-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-xl text-white shadow-sm">340B</div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">340B Internal Audit Checklist</h1>
      <p className="mt-2 text-sm font-medium text-slate-500">Audit Number: {auditNumber}</p>
      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 shadow-sm">{PHI_WARNING}</div>
    </div>
  );
}

function ProgressBar({ step }) {
  const progress = typeof step === "number" ? Math.round(((step + 1) / steps.length) * 100) : 100;
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{typeof step === "number" ? `Step ${step + 1} of ${steps.length}` : "Complete"}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Textarea({ className = "", value }) {
  return <textarea className={`w-full resize-none border border-slate-200 p-4 outline-none ${className}`} value={value} readOnly />;
}

function Button({ children, className = "", variant = "default", disabled, onClick }) {
  const styles = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${styles[variant]} ${className} inline-flex items-center justify-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-50`}>
      {children}
    </button>
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
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [openAuditNumber, setOpenAuditNumber] = useState(null);
  const [lookupCopied, setLookupCopied] = useState(false);

  const currentAuditTags = getAuditTags(answers);
  const currentAuditNote = buildAuditNote({ finalStep: step, answers, auditNumber });

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
    const record = { auditNumber, savedAt: new Date().toISOString(), outcome: outcomes[step], finalCode: step, note: currentAuditNote, answers, tags: currentAuditTags };
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
    const currentStep = steps[step];
    if (!inputValue.trim()) return;
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
  };

  const lookupPanel = (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <div className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Saved Audits</h2>
        {Object.keys(savedAudits).length === 0 && <p className="text-sm text-slate-500">No audits saved yet.</p>}
        <div className="flex flex-col gap-3">
          {Object.values(savedAudits).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).map((audit) => {
            const isOpen = openAuditNumber === audit.auditNumber;
            return (
              <div key={audit.auditNumber} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <button className="flex-1 text-left" onClick={() => {
                    setOpenAuditNumber(isOpen ? null : audit.auditNumber);
                    setSelectedAudit(isOpen ? null : audit);
                    setLookupCopied(false);
                  }}>
                    <p className="text-sm font-semibold text-slate-900">{audit.auditNumber}</p>
                    <p className="text-xs text-slate-500">{audit.outcome}</p>
                  </button>
                  <span className="text-xs font-semibold text-slate-400">{isOpen ? "Close" : "Open"}</span>
                  <button className="text-red-500 hover:text-red-700" onClick={() => {
                    const updated = { ...savedAudits };
                    delete updated[audit.auditNumber];
                    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                    setSavedAudits(updated);
                    if (selectedAudit?.auditNumber === audit.auditNumber) setSelectedAudit(null);
                    if (openAuditNumber === audit.auditNumber) setOpenAuditNumber(null);
                  }}>✕</button>
                </div>
                {isOpen && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 text-sm text-slate-700">
                      <p><strong>Audit Number:</strong> {audit.auditNumber}</p>
                      <p><strong>Outcome:</strong> {audit.outcome}</p>
                      <p><strong>Saved:</strong> {new Date(audit.savedAt).toLocaleString()}</p>
                      {audit.tags?.length > 0 && <p><strong>Tags:</strong> {audit.tags.map((tag) => tagLabels[tag] || tag).join(", ")}</p>}
                    </div>
                    <Textarea className="mb-3 min-h-48 rounded-2xl bg-slate-50 text-left text-sm" value={audit.note} />
                    <Button className="w-full rounded-2xl" onClick={() => copyText(audit.note, setLookupCopied)}>{lookupCopied ? "Copied!" : "Copy Note"}</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (typeof step === "string") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <AppHeader auditNumber={auditNumber} />
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-200/60">
              <div className="p-5 sm:p-8">
                <ProgressBar step={step} />
                <div className="mb-6 rounded-3xl bg-slate-950 p-5 text-center text-white sm:p-6">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Result</p>
                  <p className="text-2xl font-bold sm:text-3xl">{outcomes[step]}</p>
                  <p className="mt-3 text-sm text-slate-300">{notes[step]}</p>
                </div>
                {currentAuditTags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {currentAuditTags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{tagLabels[tag] || tag}</span>)}
                  </div>
                )}
                <div className="mb-4">
                  <label className="mb-2 block text-left text-sm font-semibold text-slate-700">Generated audit note</label>
                  <Textarea className="min-h-56 rounded-2xl border-slate-200 bg-slate-50 text-left text-sm" value={currentAuditNote} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button className="min-h-11 rounded-2xl" onClick={() => copyText(currentAuditNote, setCopied)}>{copied ? "Copied!" : "Copy Note"}</Button>
                  <Button className="min-h-11 rounded-2xl" onClick={handleSaveAudit} variant="secondary">{saved ? "Saved!" : "Save Locally"}</Button>
                  <Button className="min-h-11 rounded-2xl" variant="outline" onClick={reset}>New Audit</Button>
                </div>
                <Button className="mt-3 w-full min-h-11 rounded-2xl" variant="ghost" onClick={handleBack} disabled={!stepHistory.length}>Back</Button>
              </div>
            </div>
          </div>
          <div className="lg:pt-44">{lookupPanel}</div>
        </div>
      </div>
    );
  }

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <AppHeader auditNumber={auditNumber} />
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-200/60">
            <div className="p-5 sm:p-8">
              <ProgressBar step={step} />
              <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center sm:p-7">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Decision Point</p>
                <div className="text-xl font-bold leading-snug text-slate-950 sm:text-2xl">
                  {currentStep.highlightWord
                    ? currentStep.question.split(currentStep.highlightWord).map((part, index, array) => (
                      <span key={`${part}-${index}`}>
                        {part}
                        {index < array.length - 1 && (
                          <button className="font-bold text-blue-700 underline decoration-dotted underline-offset-4 transition hover:text-blue-900" onClick={() => setShowInfo((prev) => !prev)}>
                            {currentStep.highlightWord}
                          </button>
                        )}
                      </span>
                    ))
                    : currentStep.question}
                </div>
              </div>
              {showInfo && currentStep.info && <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left text-sm leading-relaxed text-blue-900">{currentStep.info}</div>}
              {currentStep.inputType ? (
                <div className="grid gap-4">
                  <div className="text-left">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">{currentStep.inputLabel}</label>
                    <input className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100" type={currentStep.inputType} value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button className="min-h-12 rounded-2xl" onClick={handleInputSubmit} disabled={!inputValue.trim()}>Continue</Button>
                    <Button className="min-h-12 rounded-2xl" variant="outline" onClick={handleBack} disabled={!stepHistory.length}>Back</Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {currentStep.options.map((opt) => (
                    <Button className="min-h-12 rounded-2xl text-base font-semibold" key={opt.label} onClick={() => handleAnswer(opt.label, opt.next, opt.note)}>
                      {opt.label}
                    </Button>
                  ))}
                  <Button className="min-h-12 rounded-2xl" variant="outline" onClick={handleBack} disabled={!stepHistory.length}>Back</Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="lg:pt-44">{lookupPanel}</div>
      </div>
    </div>
  );
}
