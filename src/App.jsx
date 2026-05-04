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

const progressLabels = [
  "PCP is NOHN provider",
  "Visit within 24 months",
  "Medication reconciled",
  "Dental exclusion checked",
  "ED/UC discharge checked",
  "ED/UC coordination",
  "Valid referral in Epic",
  "Referral connection",
  "Specialty documentation",
  "Documentation source",
  "Medication encounter",
  "Care responsibility",
  "Closed-loop coordination",
  "Encounter date",
  "Final decision",
];

const sourceOptions = ["Epic", "Referral record", "Consult note", "Progress note", "Shared records", "Other"];

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

function getAnswerTone(answer) {
  if (!answer) return "pending";
  if (answer.tags?.some((tag) => ["PCP_NOT_NOHN", "NO_NOHN_VISIT_24_MONTHS", "DENTAL_EXCLUDED", "ED_UC_NOT_VALID", "NO_DOCUMENTATION"].includes(tag))) return "finding";
  if (answer.tags?.length) return "review";
  return "pass";
}

function getOutcomeTone(finalStep) {
  if (finalStep === "END_340B_OK") return "pass";
  if (String(finalStep).includes("NOT_ELIGIBLE") || finalStep === "END_NO_DOCUMENTATION") return "finding";
  return "review";
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

function Button({ children, className = "", variant = "default", disabled, onClick }) {
  const styles = {
    default: "border-teal-800 bg-teal-700 text-white shadow-sm hover:bg-teal-800",
    secondary: "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    ghost: "border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    disabled: "border-slate-200 bg-slate-100 text-slate-400",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
        styles[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = "neutral", className = "" }) {
  const styles = {
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
    pass: "border-teal-200 bg-teal-50 text-teal-800",
    review: "border-amber-200 bg-amber-50 text-amber-700",
    finding: "border-red-200 bg-red-50 text-red-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
  };
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", styles[tone], className)}>{children}</span>;
}

function Panel({ children, className = "" }) {
  return <section className={cx("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

function Header({ auditNumber, startedAt, onSaveDraft, onEndAudit, onToggleSettings, copiedAudit, copyAuditNumber }) {
  return (
    <header className="border-b border-slate-200 px-7 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-md border border-teal-300 bg-teal-50 px-3 py-1 text-sm font-bold uppercase tracking-wide text-teal-800">
            NOHN Referral Prescription Review
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">340B Internal Audit Checklist</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-600">
            <span>Audit Number: <strong className="text-slate-950">{auditNumber}</strong></span>
            <button type="button" className="rounded border border-slate-200 px-1.5 py-0.5 text-slate-500 hover:bg-slate-50" onClick={copyAuditNumber}>{copiedAudit ? "Copied" : "Copy"}</button>
            <span>Started: <strong className="font-medium text-slate-700">{startedAt}</strong></span>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row xl:items-start">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-snug text-red-700 sm:w-[390px]">
            <span className="mr-2 text-lg">!</span>{PHI_WARNING}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onSaveDraft}>Save Draft</Button>
            <Button variant="secondary" onClick={onToggleSettings}>Audit Settings</Button>
            <Button onClick={onEndAudit}>End Audit</Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ step, answers, jumpToStep }) {
  const completed = Object.keys(answers).length;
  const progress = Math.round((completed / steps.length) * 100);
  return (
    <Panel className="p-4">
      <div className="mb-4 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-slate-600">
        <span>Audit Progress</span>
        <span>{completed} of {steps.length}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="space-y-1">
        {steps.map((_, index) => {
          const answer = answers[index];
          const active = step === index;
          const tone = getAnswerTone(answer);
          const status = tone === "pending" ? "Pending" : tone === "finding" ? "Finding" : tone === "review" ? "Review" : "Pass";
          return (
            <button
              key={progressLabels[index]}
              type="button"
              onClick={() => jumpToStep(index)}
              className={cx(
                "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition",
                active ? "bg-teal-50 text-teal-950" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <span className={cx(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                active ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-500"
              )}>{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">{progressLabels[index]}</span>
              <Badge tone={tone === "pending" ? "neutral" : tone}>{status}</Badge>
            </button>
          );
        })}
      </div>
      <select
        className="mt-6 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
        value={typeof step === "number" ? step : ""}
        onChange={(event) => jumpToStep(Number(event.target.value))}
      >
        <option value="" disabled>Jump to Decision</option>
        {steps.map((_, index) => <option key={index} value={index}>Decision {index + 1}</option>)}
      </select>
    </Panel>
  );
}

function MetricCards({ step, answers, evidenceComplete, tags }) {
  const decisionCount = Object.keys(answers).length + (typeof step === "string" ? 1 : 0);
  const percent = Math.round((decisionCount / steps.length) * 100);
  const status = typeof step === "string" ? outcomes[step] : "In Progress";
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Panel className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Decisions</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{decisionCount} / {steps.length}</p>
        <p className="text-sm text-slate-600">{percent}% complete</p>
      </Panel>
      <Panel className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Evidence</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{evidenceComplete.length} / {evidenceItems.length}</p>
        <p className="text-sm text-slate-600">{Math.round((evidenceComplete.length / evidenceItems.length) * 100)}% complete</p>
      </Panel>
      <Panel className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Findings</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{tags.length}</p>
        <p className="text-sm text-slate-600">{tags.length ? "Requires review" : "No open findings"}</p>
      </Panel>
      <Panel className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Overall Status</p>
        <p className={cx("mt-2 text-xl font-bold", typeof step === "string" ? "text-teal-800" : "text-blue-700")}>{status}</p>
        <p className="text-sm text-slate-600">{typeof step === "string" ? "Audit finalized" : "Audit not finalized"}</p>
      </Panel>
    </div>
  );
}

function DecisionCard({ step, currentStep, selectedOption, setSelectedOption, noteDraft, setNoteDraft, showInfo, setShowInfo, onBack, onContinue, canBack }) {
  const selectedTags = selectedOption?.tags || [];
  const noteLength = noteDraft.length;
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-800">Decision {step + 1} of {steps.length}</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{currentStep.question}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            {currentStep.info ? "Review the referral guidance before saving this decision." : "Select the answer that matches the documentation found during review."}
          </p>
        </div>
        {currentStep.info && (
          <button type="button" className="text-sm font-bold text-teal-800 hover:text-teal-950" onClick={() => setShowInfo((value) => !value)}>
            {showInfo ? "Hide guidance" : "Show guidance"} info
          </button>
        )}
      </div>
      {showInfo && currentStep.info && <div className="mb-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-relaxed text-teal-950">{currentStep.info}</div>}

      {currentStep.inputType ? (
        <div className="mb-4 grid gap-3">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-600">{currentStep.inputLabel}</label>
          <input
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            type={currentStep.inputType}
            value={selectedOption?.label || ""}
            onChange={(event) => setSelectedOption({ label: event.target.value, next: currentStep.next, note: `${currentStep.notePrefix} ${event.target.value}.`, tone: "pass" })}
          />
        </div>
      ) : (
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          {currentStep.options.map((option) => {
            const selected = selectedOption?.label === option.label;
            const tone = option.tone === "stop" ? "finding" : option.tone === "caution" ? "review" : "pass";
            const subtext = option.tone === "stop" ? "Stop (Finding)" : option.tone === "caution" ? "Needs Review" : "Pass";
            return (
              <button
                type="button"
                key={option.label}
                onClick={() => {
                  setSelectedOption(option);
                  setNoteDraft(option.note);
                }}
                className={cx(
                  "min-h-16 rounded-md border bg-white p-4 text-left transition hover:border-teal-500",
                  selected ? "border-teal-700 shadow-sm ring-1 ring-teal-700" : "border-slate-250"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cx("mt-1 h-4 w-4 rounded-full border", selected ? "border-teal-700 bg-teal-700 shadow-[inset_0_0_0_4px_white]" : "border-slate-400 bg-white")} />
                  <span>
                    <span className="block text-sm font-bold text-slate-950">{option.label}</span>
                    <span className={cx("mt-1 block text-sm font-semibold", tone === "finding" ? "text-red-600" : tone === "review" ? "text-amber-600" : "text-teal-700")}>{subtext}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Reason / Note (Recommended)</label>
      <div className="relative">
        <textarea
          className="min-h-20 w-full resize-none rounded-md border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          maxLength={500}
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          placeholder="Document the reason for this answer without patient identifiers."
        />
        <div className="absolute bottom-2 right-3 flex items-center gap-4 text-xs text-slate-500">
          {noteDraft && <span className="font-semibold text-teal-700">Saved</span>}
          <span>{noteLength} / 500</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Evidence Summary For This Decision</p>
          <p className="mt-1 text-sm text-slate-600">{selectedTags.length ? selectedTags.map((tag) => tagLabels[tag] || tag).join(", ") : "No exception finding selected for this decision."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack} disabled={!canBack}>Back</Button>
          <Button onClick={onContinue} disabled={!selectedOption}>Save & Continue</Button>
        </div>
      </div>
    </Panel>
  );
}

function DecisionHistory({ answers, step }) {
  const rows = [...Array(Math.max(typeof step === "number" ? step + 1 : Object.keys(answers).length, Object.keys(answers).length))]
    .map((_, index) => ({ index, answer: answers[index] }))
    .filter((row) => row.index < steps.length);
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Decision History</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Decision</th>
              <th className="px-4 py-2">Your Answer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Note</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-600">
            {rows.map(({ index, answer }) => {
              const tone = getAnswerTone(answer);
              return (
                <tr key={index}>
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2">{progressLabels[index]}</td>
                  <td className="px-4 py-2 font-semibold text-slate-800">{answer?.label || "--"}</td>
                  <td className="px-4 py-2"><Badge tone={tone === "pending" ? "neutral" : tone}>{tone === "pending" ? "Pending" : tone === "finding" ? "Finding" : tone === "review" ? "Review" : "Pass"}</Badge></td>
                  <td className="max-w-[280px] truncate px-4 py-2">{answer?.note || "--"}</td>
                  <td className="px-4 py-2">{answer?.savedAt || "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function EvidenceReview({ evidenceDetails, setEvidenceDetails, openEvidence, setOpenEvidence }) {
  const verified = evidenceItems.filter((item) => evidenceDetails[item]?.verified).length;
  const today = new Date().toISOString().slice(0, 10);

  const updateItem = (item, patch) => {
    setEvidenceDetails((prev) => ({
      ...prev,
      [item]: {
        source: "Epic",
        date: today,
        note: "",
        verified: false,
        ...prev[item],
        ...patch,
      },
    }));
  };

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Evidence Review <Badge className="ml-2">{verified} / {evidenceItems.length}</Badge></h2>
        <button type="button" className="text-xs font-bold text-teal-800" onClick={() => setOpenEvidence(openEvidence ? null : evidenceItems[0])}>Expand All</button>
      </div>
      <div className="divide-y divide-slate-200">
        {evidenceItems.map((item, index) => {
          const details = evidenceDetails[item] || { source: "Epic", date: today, note: "", verified: false };
          const open = openEvidence === item;
          return (
            <div key={item}>
              <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800" onClick={() => setOpenEvidence(open ? null : item)}>
                <input className="h-4 w-4 accent-teal-700" type="checkbox" checked={details.verified} onChange={(event) => updateItem(item, { verified: event.target.checked })} onClick={(event) => event.stopPropagation()} />
                <span className="flex-1">{item}</span>
                <span className="text-slate-500">{open ? "^" : "v"}</span>
              </button>
              {open && (
                <div className="px-4 pb-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-bold text-slate-600">
                      Source
                      <select className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700" value={details.source} onChange={(event) => updateItem(item, { source: event.target.value })}>
                        {sourceOptions.map((source) => <option key={source}>{source}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-slate-600">
                      Date verified
                      <input className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700" type="date" value={details.date} onChange={(event) => updateItem(item, { date: event.target.value })} />
                    </label>
                  </div>
                  <label className="mt-3 grid gap-1 text-xs font-bold text-slate-600">
                    Note (optional)
                    <textarea className="min-h-16 resize-none rounded-md border border-slate-300 bg-white p-2 text-sm font-normal text-slate-700" maxLength={250} value={details.note} onChange={(event) => updateItem(item, { note: event.target.value })} />
                  </label>
                  {details.verified && <p className="mt-2 text-xs font-semibold text-teal-700">Verified</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function FindingsPanel({ tags }) {
  const firstTag = tags[0];
  return (
    <Panel className="p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Findings <Badge tone={tags.length ? "finding" : "neutral"} className="ml-2">{tags.length}</Badge></h2>
      {tags.length === 0 ? (
        <p className="text-sm text-slate-500">No findings have been recorded.</p>
      ) : (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            Finding #1
            <Badge tone="pass">New</Badge>
          </div>
          <p className="text-sm text-slate-700">{tagLabels[firstTag] || firstTag}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Status
              <select className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700">
                <option>Unresolved</option>
                <option>Resolved</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Required Action
              <textarea className="min-h-14 resize-none rounded-md border border-slate-300 bg-white p-2 text-sm font-normal text-slate-700" defaultValue="Verify documentation or document exception with leadership approval." />
            </label>
          </div>
          {tags.length > 1 && <p className="mt-3 text-xs font-semibold text-teal-800">View all findings</p>}
        </div>
      )}
    </Panel>
  );
}

function SummaryPanel({ finalStep, note, copied, onCopy, onFinalize }) {
  return (
    <Panel className="p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Audit Summary & Export</h2>
      <p className="mt-1 text-xs text-slate-500">{finalStep ? "Audit summary is ready." : "Finalize the audit to generate a summary report."}</p>
      {finalStep && <textarea className="mt-3 min-h-32 w-full resize-none rounded-md border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700" value={note} readOnly />}
      <div className="mt-3 grid gap-2">
        <Button variant="secondary" onClick={onCopy}>{copied ? "Copied Summary" : "Preview Summary"}</Button>
        <Button onClick={onFinalize}>Finalize Audit & Export</Button>
      </div>
    </Panel>
  );
}

function FooterConfirm({ confirmed, setConfirmed, onConfirmSave }) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-6 py-4 text-sm text-blue-900 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 text-lg font-bold">✓</div>
        <div>
          <p className="font-bold">Before saving or exporting this audit, please confirm:</p>
          <p>This audit contains no patient names, DOB, MRN, address, phone number, or other identifying information.</p>
        </div>
      </div>
      <label className="flex items-center gap-2 font-semibold">
        <input className="h-4 w-4 accent-blue-700" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        I confirm no PHI was entered.
      </label>
      <Button variant={confirmed ? "secondary" : "disabled"} disabled={!confirmed} onClick={onConfirmSave}>Confirm & Save</Button>
    </div>
  );
}

function ResultCard({ finalStep, note, onBack, onNewAudit, onSave }) {
  const tone = getOutcomeTone(finalStep);
  const styles = {
    pass: "border-teal-200 bg-teal-50 text-teal-900",
    review: "border-amber-200 bg-amber-50 text-amber-900",
    finding: "border-red-200 bg-red-50 text-red-900",
  };
  return (
    <Panel className="p-5">
      <div className={cx("rounded-lg border p-4", styles[tone])}>
        <p className="text-xs font-bold uppercase tracking-wide opacity-75">Final Decision</p>
        <h2 className="mt-1 text-3xl font-bold">{outcomes[finalStep]}</h2>
        <p className="mt-2 text-sm">{notes[finalStep]}</p>
      </div>
      <textarea className="mt-4 min-h-56 w-full resize-none rounded-md border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700" value={note} readOnly />
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onNewAudit}>New Audit</Button>
          <Button onClick={onSave}>Save Final Audit</Button>
        </div>
      </div>
    </Panel>
  );
}

export default function AuditChecklist() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [stepHistory, setStepHistory] = useState([]);
  const [auditNumber, setAuditNumber] = useState(createAuditNumber);
  const [startedAt] = useState(() => new Date().toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }));
  const [selectedOption, setSelectedOption] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [evidenceDetails, setEvidenceDetails] = useState(() => Object.fromEntries(evidenceItems.map((item, index) => [item, { verified: index < 3, source: "Epic", date: new Date().toISOString().slice(0, 10), note: "" }])));
  const [openEvidence, setOpenEvidence] = useState(evidenceItems[0]);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedAudit, setCopiedAudit] = useState(false);
  const [savedAudits, setSavedAudits] = useState(getSavedAudits());
  const [confirmedPhi, setConfirmedPhi] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const currentStep = typeof step === "number" ? steps[step] : null;
  const tags = getAuditTags(answers);
  const evidenceComplete = evidenceItems.filter((item) => evidenceDetails[item]?.verified);
  const auditNote = buildAuditNote({ finalStep: step, answers, auditNumber, evidenceComplete });

  const copyText = async (text, setFlag) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      setTimeout(() => setFlag(false), 1500);
    } catch {
      setFlag(false);
    }
  };

  const resetStagedDecision = () => {
    setSelectedOption(null);
    setNoteDraft("");
    setShowInfo(false);
  };

  const saveRecord = (finalCode = step, draft = false) => {
    const record = {
      auditNumber,
      savedAt: new Date().toISOString(),
      startedAt,
      outcome: typeof finalCode === "string" ? outcomes[finalCode] : "Draft",
      finalCode,
      note: auditNote,
      answers,
      tags,
      evidenceComplete,
      draft,
    };
    saveAuditRecord(record);
    setSavedAudits(getSavedAudits());
  };

  const handleContinue = () => {
    if (!currentStep || !selectedOption) return;
    const option = selectedOption;
    const note = noteDraft.trim() || option.note;
    const savedAt = new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    setStepHistory((prev) => [...prev, step]);
    setAnswers((prev) => ({ ...prev, [step]: { label: option.label, note, tags: option.tags || [], savedAt } }));
    setStep(option.next);
    resetStagedDecision();
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
    setStep(previousStep);
    resetStagedDecision();
  };

  const jumpToStep = (index) => {
    if (index > Object.keys(answers).length) return;
    setStep(index);
    resetStagedDecision();
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setStepHistory([]);
    setAuditNumber(createAuditNumber());
    resetStagedDecision();
    setConfirmedPhi(false);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-950">
      <Header
        auditNumber={auditNumber}
        startedAt={startedAt}
        onSaveDraft={() => saveRecord(step, true)}
        onEndAudit={() => typeof step === "number" ? setStep("END_RECHECK_CLOSED_LOOP") : saveRecord(step)}
        onToggleSettings={() => setSettingsOpen((value) => !value)}
        copiedAudit={copiedAudit}
        copyAuditNumber={() => copyText(auditNumber, setCopiedAudit)}
      />
      <div className="p-5">
        {settingsOpen && (
          <Panel className="mb-4 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Audit Settings</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" defaultChecked className="accent-teal-700" /> Require PHI confirmation</label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" defaultChecked className="accent-teal-700" /> Include evidence in summary</label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" className="accent-teal-700" /> Compact history table</label>
            </div>
          </Panel>
        )}

        <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_370px]">
          <Sidebar step={step} answers={answers} jumpToStep={jumpToStep} />
          <div className="space-y-4">
            <MetricCards step={step} answers={answers} evidenceComplete={evidenceComplete} tags={tags} />
            {typeof step === "string" ? (
              <ResultCard finalStep={step} note={auditNote} onBack={handleBack} onNewAudit={reset} onSave={() => saveRecord(step)} />
            ) : (
              <DecisionCard
                step={step}
                currentStep={currentStep}
                selectedOption={selectedOption}
                setSelectedOption={setSelectedOption}
                noteDraft={noteDraft}
                setNoteDraft={setNoteDraft}
                showInfo={showInfo}
                setShowInfo={setShowInfo}
                onBack={handleBack}
                onContinue={handleContinue}
                canBack={stepHistory.length > 0}
              />
            )}
            <DecisionHistory answers={answers} step={step} />
          </div>
          <aside className="space-y-4">
            <EvidenceReview evidenceDetails={evidenceDetails} setEvidenceDetails={setEvidenceDetails} openEvidence={openEvidence} setOpenEvidence={setOpenEvidence} />
            <FindingsPanel tags={tags} />
            <SummaryPanel finalStep={typeof step === "string" ? step : null} note={auditNote} copied={copiedSummary} onCopy={() => copyText(auditNote, setCopiedSummary)} onFinalize={() => saveRecord(typeof step === "string" ? step : "END_RECHECK_CLOSED_LOOP")} />
          </aside>
        </div>
        <FooterConfirm confirmed={confirmedPhi} setConfirmed={setConfirmedPhi} onConfirmSave={() => saveRecord(step)} />
        {Object.keys(savedAudits).length > 0 && <p className="mt-3 text-xs text-slate-500">{Object.keys(savedAudits).length} local audit record(s) available in this browser.</p>}
      </div>
    </main>
  );
}
