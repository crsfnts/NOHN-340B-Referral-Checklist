import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabaseClient";

const STORAGE_KEY = "nohn_340b_saved_audits_v3";
const NOTES_STORAGE_KEY = "nohn_340b_notes_v2";
const SITES = [
  "NOHN Family Health Center",
  "NOHN Community Clinic",
  "NOHN Behavioral Health",
  "NOHN Dental Clinic",
  "NOHN Pediatrics",
];

const navItems = ["Dashboard", "Saved Audits", "Notes"];
const AUDIT_QUESTIONS = [
  { question: "Is PCP a NOHN provider?" },
  { question: "Is patient attributed to a NOHN covered location?" },
  { question: "Is medication documented on the Epic med list?" },
  { question: "Was medication ordered by an eligible NOHN provider?", dependsOn: 2, showWhen: "Yes" },
  { question: "Does a valid referral exist?" },
  { question: "Does referral source support covered entity relationship?", dependsOn: 4, showWhen: "Yes" },
  { question: "Is referral date documented?", dependsOn: 4, showWhen: "Yes" },
  { question: "Was there a qualifying encounter on or after referral date?", dependsOn: 4, showWhen: "Yes" },
  { question: "Is encounter documentation complete for internal policy?", dependsOn: 7, showWhen: "Yes" },
  { question: "Are all required chart elements present for 340B audit?" },
  { question: "Does this audit pass internal 340B compliance review?" },
];

const statusStyles = {
  Passed: "bg-teal-100 text-teal-800",
  "Review Needed": "bg-amber-100 text-amber-800",
  Failed: "bg-rose-100 text-rose-800",
  "In Progress": "bg-sky-100 text-sky-800",
};
const brand = { primary: "#0d3f66", accent: "#1e7ea7", soft: "#e9f4fb" };

const createAuditNumber = () => `AUD-${String(Math.floor(10000 + Math.random() * 89999))}`;
const getDefaultAnswers = () => AUDIT_QUESTIONS.map((q) => ({ question: q.question, answer: "", note: "" }));

function loadSavedAudits() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function loadSavedNotes() { try { return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || "[]"); } catch { return []; } }
const persistAudits = (audits) => localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
const persistLocalPendingAudits = (audits) => localStorage.setItem(`${STORAGE_KEY}_pending`, JSON.stringify(audits));
function loadLocalPendingAudits() { try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}_pending`) || "[]"); } catch { return []; } }
const persistNotes = (notes) => localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
const dayKey = (value) => new Date(value).toISOString().slice(0, 10);

const StatusBadge = ({ status }) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>;

export default function App() {
  const [view, setView] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [savedAudits, setSavedAudits] = useState(() => loadSavedAudits());
  const [pendingLocalAudits, setPendingLocalAudits] = useState(() => loadLocalPendingAudits());
  const [sessionUser, setSessionUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authTimeoutReached, setAuthTimeoutReached] = useState(false);
  const [syncState, setSyncState] = useState(hasSupabaseConfig ? "Loading saved audits..." : "Supabase is not configured. Check Netlify environment variables and redeploy.");
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authState, setAuthState] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [isClosingWorkflow, setIsClosingWorkflow] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [notes, setNotes] = useState(() => loadSavedNotes());
  const [draftNote, setDraftNote] = useState("");
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [failContext, setFailContext] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeletingAudit, setIsDeletingAudit] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [form, setForm] = useState({ auditNumber: createAuditNumber(), auditTitle: "", site: SITES[0], answers: getDefaultAnswers() });

  const toSupabaseRecord = (audit, userId) => ({
    user_id: userId,
    audit_number: audit.auditNumber,
    audit_title: audit.auditTitle || "",
    status: audit.status,
    result: audit.status,
    answers: audit.answers,
    notes: audit.answers.map((a) => `${a.question}: ${a.note || ""}`).filter((s) => !s.endsWith(": ")).join("\n"),
    completed_at: audit.completedAt || audit.updatedAt || new Date().toISOString(),
    created_at: audit.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const fromSupabaseRecord = (row) => ({
    id: row.id,
    supabaseId: row.id,
    auditNumber: row.audit_number,
    auditTitle: row.audit_title || "",
    site: "NOHN Family Health Center",
    status: row.status,
    answers: Array.isArray(row.answers) ? row.answers : [],
    notes: row.notes || "",
    createdAt: row.created_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  });

  const fetchSupabaseAudits = async (userId) => {
    const { data, error } = await supabase.from("audits").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    console.log("[sync] fetched audits", data?.length ?? 0);
    return (data || []).map(fromSupabaseRecord);
  };

  useEffect(() => {
    setSavedAudits(loadSavedAudits());
    setPendingLocalAudits(loadLocalPendingAudits());
    setNotes(loadSavedNotes());
  }, []);

  useEffect(() => {
    let mounted = true;
    console.log("Auth init started");
    console.log("Supabase configured:", Boolean(supabase));

    const authTimeoutId = window.setTimeout(() => {
      if (!mounted) return;
      console.log("[auth] init timeout reached");
      setSessionUser(null);
      setAuthState("Session check timed out. Please sign in again.");
      setAuthTimeoutReached(true);
      setIsAuthLoading(false);
      console.log("Auth loading false");
    }, 7000);

    const loadAuditsForUser = async (userId) => {
      setSyncState("Loading saved audits...");
      try {
        const cloudAudits = await fetchSupabaseAudits(userId);
        if (!mounted) return;
        setSavedAudits(cloudAudits);
        persistAudits(cloudAudits);
        setSyncState("Saved to cloud");
      } catch (error) {
        console.log("[sync] cloud load failed", error);
        if (!mounted) return;
        setSyncState("Cloud load failed. Showing local cache.");
      }
    };

    const initAuth = async () => {
      setIsAuthLoading(true);
      try {
        if (!supabase) {
          console.warn("Supabase client missing");
          if (mounted) {
            setSessionUser(null);
            setSyncState("Supabase is not configured. Check Netlify environment variables and redeploy.");
            setAuthState("Supabase is not configured.");
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        console.log("Session exists:", Boolean(data?.session));
        if (error) {
          console.error("getSession failed:", error);
          if (mounted) {
            setAuthState("Could not verify session. Please try again.");
            setSyncState("Sign in to access your audit dashboard.");
          }
          return;
        }

        const user = data?.session?.user ?? null;
        if (mounted) {
          setSessionUser(user);
          setAuthTimeoutReached(false);
          setAuthState("");
        }

        if (user?.id) {
          await loadAuditsForUser(user.id);
        } else if (mounted) {
          setSyncState("Sign in to access your audit dashboard.");
        }
      } catch (error) {
        console.error("Auth init crashed:", error);
        if (mounted) {
          setAuthState("Could not verify session. Please try again.");
          setSyncState("Sign in to access your audit dashboard.");
        }
      } finally {
        if (mounted) {
          window.clearTimeout(authTimeoutId);
          setIsAuthLoading(false);
          console.log("Auth init completed");
          console.log("Auth loading false");
        }
      }
    };

    initAuth();

    if (!supabase) {
      return () => {
        mounted = false;
        window.clearTimeout(authTimeoutId);
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, Boolean(session));
      if (!mounted) return;
      setIsAuthLoading(false);
      setAuthTimeoutReached(false);
      if (!session?.user && event !== "SIGNED_OUT") {
        const { data: recovered } = await supabase.auth.getSession();
        if (recovered?.session?.user) {
          setSessionUser(recovered.session.user);
          return;
        }
      }
      const user = session?.user || null;
      setSessionUser(user);
      if (!user?.id) {
        setSyncState("Sign in to access your audit dashboard.");
        return;
      }
      await loadAuditsForUser(user.id);
    });

    return () => {
      mounted = false;
      window.clearTimeout(authTimeoutId);
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const isQuestionVisible = (index, answers) => {
    const cfg = AUDIT_QUESTIONS[index];
    if (cfg.dependsOn === undefined) return true;
    return answers[cfg.dependsOn]?.answer === cfg.showWhen;
  };

  const nextVisibleQuestionIndex = (startIndex, answers) => {
    for (let i = startIndex; i < AUDIT_QUESTIONS.length; i += 1) {
      if (isQuestionVisible(i, answers)) return i;
    }
    return AUDIT_QUESTIONS.length;
  };

  const askedIndexes = useMemo(() => AUDIT_QUESTIONS.map((_, idx) => idx).filter((idx) => isQuestionVisible(idx, form.answers)), [form.answers]);
  const askedCount = askedIndexes.length;
  const answeredCount = useMemo(() => askedIndexes.filter((idx) => form.answers[idx].answer).length, [askedIndexes, form.answers]);
  const overallStatus = useMemo(() => {
    if (answeredCount < askedCount) return "In Progress";
    const answeredAsked = askedIndexes.map((idx) => form.answers[idx]);
    if (answeredAsked.some((a) => a.answer === "No")) return "Review Needed";
    return "Passed";
  }, [answeredCount, askedCount, askedIndexes, form.answers]);
  const completedAudits = useMemo(() => savedAudits.filter((a) => a.status !== "In Progress"), [savedAudits]);
  const auditsByDate = useMemo(() => completedAudits.reduce((acc, a) => ({ ...acc, [dayKey(a.completedAt || a.updatedAt)]: true }), {}), [completedAudits]);

  const filteredAudits = useMemo(() => savedAudits.filter((a) => {
    const textMatch = `${a.auditNumber} ${a.auditTitle} ${a.site}`.toLowerCase().includes(search.toLowerCase());
    const dateMatch = selectedDate ? dayKey(a.completedAt || a.updatedAt) === selectedDate : true;
    return textMatch && dateMatch;
  }), [savedAudits, search, selectedDate]);

  const saveAudit = async (statusOverride, failReasonOverride = null) => {
    console.log("Saving audit, user exists:", Boolean(sessionUser));
    const now = new Date().toISOString();
    const visibleAnswers = form.answers.filter((_, idx) => isQuestionVisible(idx, form.answers));
    const status = statusOverride || overallStatus;
    const record = { ...form, answers: visibleAnswers, id: `${form.auditNumber}-${now}`, createdAt: now, completedAt: now, updatedAt: now, status, failReason: failReasonOverride };
    const localUpdated = [record, ...savedAudits];
    if (!sessionUser?.id || !supabase) {
      setAuthState("Please sign in to save this audit to the cloud.");
      setSavedAudits(localUpdated); persistAudits(localUpdated);
      const pending = [record, ...pendingLocalAudits];
      setPendingLocalAudits(pending); persistLocalPendingAudits(pending);
      setSyncState("Not logged in — saved on this device only.");
      closeWorkflow(); setView("Saved Audits");
      return;
    }
    setSyncState("Saving...");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setSyncState("Could not verify session. Please try saving again.");
        return;
      }
      const activeUserId = sessionData?.session?.user?.id;
      if (!activeUserId) {
        setSyncState("Could not verify session. Please try saving again.");
        return;
      }
      const { data: inserted, error } = await supabase.from("audits").insert(toSupabaseRecord(record, activeUserId)).select("*").single();
      if (error) throw error;
      console.log("[sync] save success", inserted?.id);
      const cloudRecord = fromSupabaseRecord(inserted);
      const updated = [cloudRecord, ...savedAudits.filter((a) => a.auditNumber !== cloudRecord.auditNumber || a.completedAt !== cloudRecord.completedAt)];
      setSavedAudits(updated); persistAudits(updated);
      setSyncState("Saved to cloud");
      console.log("Save complete, user still exists:", Boolean(sessionUser));
      } catch (e) {
      setSavedAudits(localUpdated); persistAudits(localUpdated);
      const pending = [record, ...pendingLocalAudits];
      setPendingLocalAudits(pending); persistLocalPendingAudits(pending);
      console.log("[sync] save failed", e);
      setSyncState("Cloud save failed, saved locally.");
    }
    closeWorkflow(); setView("Saved Audits");
  };

  const closeWorkflow = () => {
    console.log("audit modal close requested");
    setIsClosingWorkflow(true);
    setTimeout(() => {
      setShowWorkflow(false);
      setIsClosingWorkflow(false);
    }, 180);
  };

  const saveNotes = () => {
    const now = new Date().toISOString();
    const trimmedTitle = noteTitle.trim() || draftNote.trim().split("\n")[0] || "Untitled note";
    const trimmedContent = draftNote.trim();
    if (!trimmedContent) return;
    const noteId = activeNoteId || `note-${Date.now()}`;
    const updatedNote = { id: noteId, title: trimmedTitle, content: draftNote, updatedAt: now };
    const updated = activeNoteId ? notes.map((note) => note.id === activeNoteId ? updatedNote : note) : [updatedNote, ...notes];
    setNotes(updated);
    setActiveNoteId(noteId);
    persistNotes(updated);
  };

  const startNewNote = () => {
    setActiveNoteId(null);
    setNoteTitle("");
    setDraftNote("");
  };

  const loadNote = (note) => {
    setActiveNoteId(note.id);
    setNoteTitle(note.title || "");
    setDraftNote(note.content || "");
  };

  const deleteNote = (noteId) => {
    const updated = notes.filter((note) => note.id !== noteId);
    setNotes(updated);
    persistNotes(updated);
    if (activeNoteId === noteId) startNewNote();
  };

  const exportAuditsToExcel = (audits) => {
    const rows = audits.flatMap((audit) => audit.answers.map((item) => [audit.auditNumber, audit.auditTitle || "Untitled", audit.site, new Date(audit.createdAt).toLocaleString(), new Date(audit.completedAt || audit.updatedAt).toLocaleString(), audit.status, item.question, item.answer || "", item.note || ""]));
    const header = ["Audit Number", "Audit Title", "Site", "Created Date", "Completed Date", "Status", "Question", "Answer", "Follow-up Notes"];
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `NOHN_340B_Audits_${new Date().toISOString().slice(0, 10)}.xlsx`; link.click(); URL.revokeObjectURL(link.href);
  };

  const removeAuditFromState = (auditId) => {
    const updated = savedAudits.filter((audit) => audit.id !== auditId);
    setSavedAudits(updated);
    persistAudits(updated);
    setSelectedAudit((prev) => (prev?.id === auditId ? null : prev));
  };

  const deleteAudit = async () => {
    if (!deleteTarget || isDeletingAudit) return;
    setDeleteError("");
    setIsDeletingAudit(true);
    try {
      if (supabase) {
        const rowId = deleteTarget.supabaseId || deleteTarget.id;
        const isLikelySupabaseRow = typeof rowId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rowId);
        if (isLikelySupabaseRow) {
          const { data: authData, error: authError } = await supabase.auth.getUser();
          if (authError) throw authError;
          const userId = authData?.user?.id;
          if (userId) {
            const { error: deleteSupabaseError } = await supabase.from("audits").delete().eq("id", rowId).eq("user_id", userId);
            if (deleteSupabaseError) throw deleteSupabaseError;
            console.log("[sync] delete success", rowId);
          }
        }
      }
      removeAuditFromState(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      setDeleteError("Could not delete audit. Please try again.");
    } finally {
      setIsDeletingAudit(false);
    }
  };

  useEffect(() => {
    const migratePending = async () => {
      if (!sessionUser?.id || !supabase || !pendingLocalAudits.length) return;
      const existingNumbers = new Set(savedAudits.map((a) => `${a.auditNumber}::${a.completedAt || a.updatedAt}`));
      const toMigrate = pendingLocalAudits.filter((a) => !existingNumbers.has(`${a.auditNumber}::${a.completedAt || a.updatedAt}`));
      if (!toMigrate.length) {
        setPendingLocalAudits([]);
        persistLocalPendingAudits([]);
        return;
      }
      try {
        await supabase.from("audits").insert(toMigrate.map((a) => toSupabaseRecord(a, sessionUser.id)));
        const cloud = await fetchSupabaseAudits(sessionUser.id);
        setSavedAudits(cloud); persistAudits(cloud);
        setPendingLocalAudits([]); persistLocalPendingAudits([]);
        setSyncState("Saved to cloud");
      } catch (error) {
        console.log("[sync] pending migration failed", error);
        setSyncState("Cloud save failed, saved locally.");
      }
    };
    migratePending();
  }, [sessionUser?.id, pendingLocalAudits.length]);

  const handleAuth = async () => {
    if (!supabase) {
      setAuthState("Supabase is not configured. Check Netlify environment variables and redeploy.");
      return;
    }
    setIsAuthSubmitting(true);
    setAuthState("");
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setAuthState("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setAuthState("Signed in successfully.");
      }
    } catch (error) {
      console.log("[auth] failed", error);
      setAuthState(error?.message || "Authentication failed.");
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log("[auth] sign out failed", error);
      setAuthState(error.message || "Sign out failed.");
      return;
    }
    setAuthState("Logged out.");
  };

  const handleResetSession = async () => {
    try {
      await supabase?.auth?.signOut();
    } catch (error) {
      console.log("[auth] reset sign out warning", error);
    }
    setSessionUser(null);
    setSavedAudits(loadSavedAudits());
    setPendingLocalAudits(loadLocalPendingAudits());
    setAuthState("Session reset. Please sign in again.");
    setSyncState("Sign in to access your audit dashboard.");
  };

  const currentQuestion = form.answers[questionIndex]; const complete = questionIndex >= AUDIT_QUESTIONS.length;

  const handleDecision = (answer) => {
    console.log("Answer selected:", answer);
    if (isAdvancing) return;
    const updatedAnswers = form.answers.map((entry, idx) => {
      if (idx === questionIndex) return { ...entry, answer };
      const cfg = AUDIT_QUESTIONS[idx];
      if (cfg.dependsOn === questionIndex && answer !== cfg.showWhen) return { ...entry, answer: "", note: "" };
      return entry;
    });
    setForm((prev) => ({ ...prev, answers: updatedAnswers }));
    const isHardFail = answer === "No" && (questionIndex === 0 || questionIndex === 3);
    if (isHardFail) {
      setFailContext({ questionIndex, question: AUDIT_QUESTIONS[questionIndex].question, answer: "No" });
      setQuestionIndex(AUDIT_QUESTIONS.length);
      return;
    }
    setIsAdvancing(true);
    setTimeout(() => {
      setQuestionIndex(nextVisibleQuestionIndex(questionIndex + 1, updatedAnswers));
      setIsAdvancing(false);
    }, 190);
  };

  const kpis = {
    total: savedAudits.length,
    completed: completedAudits.length,
    failed: savedAudits.filter((a) => a.status === "Failed").length,
    passed: savedAudits.filter((a) => a.status === "Passed").length,
    review: savedAudits.filter((a) => a.status === "Review Needed").length,
  };

  const weeklyActivity = useMemo(() => {
    const days = [...Array(7)].map((_, idx) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - (6 - idx));
      const key = dayKey(dt.toISOString());
      const count = savedAudits.filter((audit) => dayKey(audit.completedAt || audit.updatedAt) === key).length;
      return { label: dt.toLocaleDateString("en-US", { weekday: "short" }), count };
    });
    return days;
  }, [savedAudits]);

  const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const firstWeekday = monthStart.getDay();
  const calendarCells = [...Array(firstWeekday).fill(null), ...[...Array(daysInMonth)].map((_, i) => i + 1)];

  if (isAuthLoading) {
    return <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-700"><div className="rounded-2xl bg-white px-6 py-5 text-sm shadow-sm"><p>Loading audit dashboard...</p><button type="button" onClick={handleResetSession} className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50">Reset Session</button></div></div>;
  }

  if (!sessionUser) {
    return <div className="grid min-h-screen place-items-center bg-slate-100 p-4 text-slate-800"><div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="grid md:grid-cols-2">
        <div className="p-6 md:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: brand.accent }}>NOHN 340B Audit Dashboard</p>
            <h2 id="auth-title" className="mt-2 text-3xl font-bold" style={{ color: brand.primary }}>{authMode === "signup" ? "Create Your Account" : "Welcome Back"}</h2>
            <p className="mt-2 text-sm text-slate-500">{authMode === "signup" ? "Create an account to save and access audits across devices." : "Sign in to access your audit dashboard."}</p>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700" htmlFor="auth-email">Email</label>
            <input id="auth-email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="name@nohn.org" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
            <label className="block text-sm font-medium text-slate-700" htmlFor="auth-password">Password</label>
            <div className="relative">
              <input id="auth-password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Enter password" type={showPassword ? "text" : "password"} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-16 text-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
              <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">{showPassword ? "Hide" : "Show"}</button>
            </div>
            <button type="button" disabled={isAuthSubmitting || !authEmail || !authPassword} onClick={handleAuth} className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60" style={{ background: brand.primary }}>{isAuthSubmitting ? "Working..." : authMode === "signup" ? "Create Account" : "Sign In"}</button>
            {authState && <p className={`rounded-xl border px-3 py-2 text-sm transition ${authState.includes("Check your email") || authState.includes("successfully") ? "border-teal-200 bg-teal-50 text-teal-800" : "border-rose-200 bg-rose-50 text-rose-700"}`} role="status">{authState}</p>}
            {(authTimeoutReached || (authState && !authState.includes("Check your email") && !authState.includes("successfully"))) && <div className="pt-1"><button type="button" onClick={handleResetSession} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50">Reset Session</button></div>}
            <p className="pt-1 text-center text-sm text-slate-600">{authMode === "signup" ? "Already have an account?" : "Need an account?"} <button type="button" onClick={() => { setAuthMode((m) => m === "signup" ? "login" : "signup"); setAuthState(""); }} className="font-semibold transition hover:underline" style={{ color: brand.accent }}>{authMode === "signup" ? "Sign in" : "Create one"}</button></p>
          </div>
        </div>
        <div className="relative min-h-[220px] overflow-hidden bg-slate-900 md:rounded-r-3xl">
          <img src="https://images.squarespace-cdn.com/content/v1/68c866063634045746ac5740/f37d7dd0-43d2-4072-b78f-a4997e91c1fa/port-angeles-wharf-2-1200x800.jpg" alt="Port Angeles waterfront" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-[#0d3f66]/45 to-slate-900/30" />
          <div className="absolute bottom-0 p-6 text-white md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">Port Angeles, Washington</p>
            <p className="mt-2 max-w-xs text-sm text-slate-100">Supporting consistent, compliant 340B audits across every NOHN care location.</p>
          </div>
        </div>
      </div>
    </div></div>;
  }

  return <div className="min-h-screen bg-slate-100 text-slate-800">
    <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
      <aside className="bg-slate-900 p-4 text-slate-100">
        <div className="mb-8 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)" }}><div className="text-xl font-bold">NOHN</div><p className="text-xs text-slate-300">340B Audit Checklist</p></div>
        <nav className="space-y-2">{navItems.map((item) => <button type="button" key={item} onClick={() => setView(item)} className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-700" style={view === item ? { background: brand.accent } : {}}>{item}</button>)}</nav>
      </aside>
      <main>
        <header className="border-b bg-white/90 px-4 py-4 backdrop-blur md:px-6"><div className="flex flex-wrap items-center gap-3"><h1 className="text-lg font-semibold">NOHN 340B Audit Dashboard</h1><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved audits" className="w-full max-w-xl min-w-[220px] flex-1 rounded-xl border px-3 py-2" /><button type="button" onClick={() => { const fresh = { auditNumber: createAuditNumber(), auditTitle: "", site: SITES[0], answers: getDefaultAnswers() }; setForm(fresh); setQuestionIndex(nextVisibleQuestionIndex(0, fresh.answers)); setFailContext(null); console.log("New audit clicked"); setShowWorkflow(true); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:scale-[0.98]" style={{ background: brand.primary }}>New Audit</button></div><p className="mt-2 text-xs text-slate-500">{syncState}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <p className="text-slate-600"><span className="font-medium text-slate-700">Signed in as {sessionUser.email}</span></p>
            <button type="button" onClick={handleSignOut} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium transition hover:bg-slate-50">Sign Out</button>
          </div>
          {authState && sessionUser && <p className="mt-2 text-xs text-slate-600">{authState}</p>}
        </header>

        <div className="p-4 md:p-6">{view === "Dashboard" && <div className="grid gap-4 xl:grid-cols-[1fr_290px]">
          <section className="space-y-4"><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{new Date().toLocaleDateString()}</p><h2 className="text-2xl font-bold" style={{ color: brand.primary }}>Audit Activity Overview</h2></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Total Audits", kpis.total], ["Completed", kpis.completed], ["Passed / Review", `${kpis.passed} / ${kpis.review}`], ["Failed", kpis.failed]].map(([l, v]) => <div key={l} className="rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5"><p className="text-xs text-slate-500">{l}</p><p className="text-3xl font-bold">{v}</p></div>)}</div>
            <div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-white p-4 shadow-sm"><h3 className="mb-2 font-semibold">Last 7 Days</h3><div className="flex h-24 items-end gap-2">{weeklyActivity.map((d) => <div key={d.label} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t" style={{ height: `${Math.max(8, d.count * 14)}px`, background: brand.accent, opacity: d.count ? 0.95 : 0.25 }} /><span className="text-[11px] text-slate-500">{d.label}</span></div>)}</div></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Saved Audits</h3><button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setView("Saved Audits")}>Open list</button></div>
                <div className="space-y-1">{filteredAudits.slice(0, 5).map((audit) => <button type="button" key={audit.id} className="flex w-full items-center justify-between rounded-xl border-b border-slate-100 px-2 py-2 text-left transition hover:bg-slate-50" onClick={() => { setView("Saved Audits"); setSelectedAudit(audit); }}><div><p className="text-sm font-semibold">{audit.auditNumber} • {audit.auditTitle || "Untitled Audit"}</p><p className="text-xs text-slate-500">{new Date(audit.completedAt || audit.updatedAt).toLocaleDateString()}</p></div><StatusBadge status={audit.status} /></button>)}</div></div></div>
          </section>
          <aside className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Calendar Filter</h3><div className="flex gap-1"><button type="button" className="rounded border px-2 text-xs" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}>‹</button><button type="button" className="rounded border px-2 text-xs" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}>›</button></div></div><p className="mb-2 text-xs text-slate-500">{calendarDate.toLocaleString("default", { month: "long", year: "numeric" })}</p><div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}</div><div className="grid grid-cols-7 gap-1 text-center text-xs">{calendarCells.map((d, idx) => {
            if (!d) return <div key={`empty-${idx}`} className="px-1 py-2" />;
            const date = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const active = selectedDate === date;
            return <button type="button" key={date} onClick={() => setSelectedDate(date)} className="relative rounded-lg px-1 py-2 transition hover:bg-slate-100" style={active ? { background: brand.soft, color: brand.primary, fontWeight: 700 } : {}}>{d}{auditsByDate[date] && <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: brand.accent }} />}</button>;
          })}</div><button type="button" className="mt-3 text-xs font-medium" style={{ color: brand.accent }} onClick={() => setSelectedDate("")}>Show all audits</button></aside>
        </div>}

        {view === "Saved Audits" && <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]"><section className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Saved Audits</h2><button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => exportAuditsToExcel(filteredAudits)}>Export to Excel</button></div>
          <div className="space-y-1">{filteredAudits.map((audit) => <div key={audit.id} className="flex items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-slate-50"><button type="button" onClick={() => setSelectedAudit((prev) => prev?.id === audit.id ? null : audit)} className="flex min-w-0 flex-1 items-center justify-between rounded-xl px-2 py-2 text-left"><div className="flex min-w-0 items-start gap-3"><span className="mt-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: audit.status === "Failed" ? "#e11d48" : audit.status === "Passed" ? "#14b8a6" : "#f59e0b" }} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{audit.auditNumber} — {audit.auditTitle || "Untitled"}</p><p className="truncate text-xs text-slate-500">{new Date(audit.completedAt || audit.updatedAt).toLocaleString()} • {audit.site}</p></div></div><StatusBadge status={audit.status} /></button><button type="button" onClick={() => { setDeleteError(""); setDeleteTarget(audit); }} className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${audit.auditNumber}`}><span aria-hidden="true" className="text-sm leading-none">🗑️</span></button></div>)}</div>
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm"><h3 className="mb-3 text-lg font-semibold">Audit Timeline</h3>{selectedAudit ? <div className="space-y-3 animate-fade-in">{selectedAudit.failReason && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"><strong>Failure trigger:</strong> {selectedAudit.failReason.question} — <strong>{selectedAudit.failReason.answer}</strong></div>}{selectedAudit.answers.map((a, idx) => <div key={`${selectedAudit.id}-${idx}`} className="relative rounded-xl border border-slate-200 bg-slate-50 p-3 pl-6"><span className="absolute left-2 top-4 h-2 w-2 rounded-full" style={{ background: a.answer === "No" ? "#e11d48" : "#14b8a6" }} /><p className="text-xs text-slate-500">Question {idx + 1}</p><p className="text-sm font-semibold">{a.question}</p><p className="text-sm">Answer: <strong>{a.answer || "—"}</strong></p><p className="text-xs text-slate-600">Notes: {a.note || "—"}</p></div>)}</div> : <p className="text-sm text-slate-500">Select an audit to view timeline history.</p>}</section></div>}

        {view === "Notes" && <section className="grid gap-4 xl:grid-cols-[1fr_360px]"><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Notes</h2><button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={startNewNote}>New Note</button></div><p className="mb-3 text-sm text-slate-500">Save quick working notes for your audits.</p><input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title" className="mb-3 w-full rounded-xl border px-3 py-2 text-sm" /><textarea value={draftNote} onChange={(e) => setDraftNote(e.target.value)} className="min-h-[190px] w-full rounded-xl border p-3 text-sm" placeholder="Type notes here..." /><div className="mt-3 flex items-center justify-between"><p className="text-xs text-slate-500">Last updated: {activeNoteId ? new Date((notes.find((n) => n.id === activeNoteId)?.updatedAt) || Date.now()).toLocaleString() : "Not saved yet"}</p><button type="button" className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5" style={{ background: brand.primary }} onClick={saveNotes}>Save Note</button></div></div><aside className="rounded-2xl bg-white p-4 shadow-sm"><h3 className="mb-3 text-lg font-semibold">Saved Notes</h3><div className="space-y-2">{notes.length ? notes.map((note) => <div key={note.id} className="rounded-xl border p-3"><button type="button" className="w-full text-left" onClick={() => loadNote(note)}><p className="text-sm font-semibold">{note.title || "Untitled note"}</p><p className="text-xs text-slate-500">{new Date(note.updatedAt).toLocaleString()}</p><p className="mt-1 text-xs text-slate-600">{note.content.slice(0, 72) || "No content"}{note.content.length > 72 ? "..." : ""}</p></button><button type="button" className="mt-2 text-xs text-rose-700" onClick={() => deleteNote(note.id)}>Delete</button></div>) : <p className="text-sm text-slate-500">No saved notes yet.</p>}</div></aside></section>}
        </div>
      </main>
    </div>

    {showWorkflow && <div className={`fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4 backdrop-blur-sm ${isClosingWorkflow ? "animate-fade-out" : "animate-fade-in"}`}><div className={`max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl ${isClosingWorkflow ? "animate-modal-out" : "animate-modal-in"}`}>
      <div className="mb-4 flex items-center justify-between"><div><h3 className="text-xl font-bold" style={{ color: brand.primary }}>New 340B Audit</h3><p className="text-xs text-slate-500">{form.auditNumber}</p></div><button type="button" className="rounded-lg border px-3 py-1.5 text-sm transition active:scale-95" onClick={closeWorkflow}>Close</button></div>
      <div className="grid gap-3 md:grid-cols-3"><input readOnly value={form.auditNumber} className="rounded-xl border px-3 py-2" /><input value={form.auditTitle} onChange={(e) => setForm((p) => ({ ...p, auditTitle: e.target.value }))} placeholder="Audit title" className="rounded-xl border px-3 py-2" /><select value={form.site} onChange={(e) => setForm((p) => ({ ...p, site: e.target.value }))} className="rounded-xl border px-3 py-2">{SITES.map((site) => <option key={site}>{site}</option>)}</select></div>
      <div className="mt-4 rounded-xl p-3" style={{ background: brand.soft }}><p className="text-sm font-medium" style={{ color: brand.primary }}>Question {Math.min(answeredCount + 1, askedCount)} of {askedCount}</p><div className="mt-2 h-2 rounded-full bg-white"><div className="h-2 rounded-full transition-all duration-300" style={{ background: brand.accent, width: `${askedCount ? (answeredCount / askedCount) * 100 : 0}%` }} /></div></div>
      {!complete && !failContext ? <div className={`mt-4 rounded-2xl border p-4 transition duration-200 ${isAdvancing ? "translate-x-1 opacity-80" : "opacity-100"}`}><p className="text-lg font-semibold animate-fade-in">{currentQuestion.question}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => handleDecision("Yes")} className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5 active:scale-95">Yes</button><button type="button" onClick={() => handleDecision("No")} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:-translate-y-0.5 active:scale-95">No</button></div><textarea value={currentQuestion.note} onChange={(e) => setForm((prev) => { const answers = [...prev.answers]; answers[questionIndex] = { ...answers[questionIndex], note: e.target.value }; return { ...prev, answers }; })} placeholder="Optional notes / follow-up" className="mt-3 w-full rounded-xl border p-3 text-sm" /></div> : failContext ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 animate-complete-pop"><h4 className="text-lg font-bold text-rose-900">Audit Failed</h4><p className="mb-2 text-sm">Status: <StatusBadge status="Failed" /></p><div className="space-y-1 text-sm"><p><strong>Audit:</strong> {form.auditNumber} — {form.auditTitle || "Untitled Audit"}</p><p><strong>Date:</strong> {new Date().toLocaleString()}</p><p><strong>Failed Question:</strong> {failContext.question}</p><p><strong>Answer:</strong> {failContext.answer}</p></div><div className="mt-3 flex gap-2"><button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: brand.primary }} onClick={() => saveAudit("Failed", failContext)}>Save Audit</button><button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => exportAuditsToExcel([{ ...form, answers: form.answers.filter((a) => a.answer), createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), status: "Failed", failReason: failContext }])}>Export to Excel</button></div></div> : <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 p-4 animate-complete-pop"><h4 className="text-lg font-bold">Audit Complete</h4><p className="text-sm">Status: <StatusBadge status={overallStatus} /></p><div className="mt-3 flex gap-2"><button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:scale-95" style={{ background: brand.primary }} onClick={() => saveAudit(overallStatus)}>Save Audit</button><button type="button" className="rounded-lg border px-3 py-2 text-sm transition active:scale-95" onClick={() => exportAuditsToExcel([{ ...form, answers: form.answers.filter((_, idx) => isQuestionVisible(idx, form.answers)), createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), status: overallStatus }])}>Export to Excel</button></div></div>}
    </div></div>}

    {deleteTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4 backdrop-blur-sm animate-fade-in"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl animate-modal-in"><h3 className="text-lg font-semibold" style={{ color: brand.primary }}>Delete audit?</h3><p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this audit? This action cannot be undone.</p>{deleteError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p>}<div className="mt-4 flex items-center justify-end gap-2"><button type="button" className="rounded-lg border px-3 py-2 text-sm transition active:scale-95" onClick={() => { if (!isDeletingAudit) { setDeleteTarget(null); setDeleteError(""); } }} disabled={isDeletingAudit}>Cancel</button><button type="button" className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70" onClick={deleteAudit} disabled={isDeletingAudit}>{isDeletingAudit ? "Deleting..." : "Delete Audit"}</button></div></div></div>}
  </div>;
}
