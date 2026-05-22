import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, FileCheck, FolderOpen, FileText, Settings, LogOut, 
  ChevronRight, ChevronLeft, CheckCircle, XCircle, AlertTriangle, 
  Clock, Search, Filter, Download, User, Calendar, Plus, Save,
  Eye, Copy, Trash2, Edit3, ShieldAlert, Activity, ClipboardList
} from 'lucide-react';

// --- SUPABASE SETUP ---
// Safely checks for Vercel database keys. If missing, runs seamlessly with mock data.
let supabase = null;
try {
  const supabaseUrl = typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : '';
  const supabaseAnonKey = typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : '';
  if (supabaseUrl && supabaseAnonKey) {
    // import { createClient } from '@supabase/supabase-js';
    // supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (e) {
  console.log("Running in local mock mode.");
}

// --- MOCK DATA ---
const MOCK_USER = { id: '1', email: 'auditor@nohn.org', full_name: 'NOHN Auditor' };
const MOCK_AUDITS = [
  { id: 'AUD-8392', date: '2026-05-20', status: 'Passed', auditor: 'Sarah Jenkins', failed_checks: 0, notes: 'Routine check.' },
  { id: 'AUD-1029', date: '2026-05-21', status: 'Failed', auditor: 'Mark Ruffalo', failed_checks: 2, notes: 'No valid referral found for outside provider.' },
  { id: 'AUD-4491', date: '2026-05-21', status: 'Passed', auditor: 'Sarah Jenkins', failed_checks: 0, notes: '' },
  { id: 'AUD-5582', date: '2026-05-22', status: 'Needs Review', auditor: 'Admin User', failed_checks: 1, notes: 'Pending provider confirmation on carve-out.' },
  { id: 'AUD-9921', date: '2026-05-22', status: 'Passed', auditor: 'Sarah Jenkins', failed_checks: 0, notes: '' },
  { id: 'AUD-1102', date: '2026-05-22', status: 'Passed', auditor: 'Mark Ruffalo', failed_checks: 0, notes: '' },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('login'); 
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [audits, setAudits] = useState(MOCK_AUDITS);
  const [currentAudit, setCurrentAudit] = useState(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('nohn_session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
      setCurrentView('dashboard');
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      const user = MOCK_USER;
      setSession(user);
      localStorage.setItem('nohn_session', JSON.stringify(user));
      setCurrentView('dashboard');
      setIsLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('nohn_session');
    setCurrentView('login');
  };

  const startNewAudit = () => {
    setCurrentAudit({
      id: `AUD-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toISOString().split('T')[0],
      status: 'In Progress',
      responses: {},
      notes: ''
    });
    setCurrentView('new');
  };

  const saveAudit = (auditData) => {
    setAudits([auditData, ...audits]);
    setCurrentAudit(null);
    setCurrentView('saved');
  };

  if (currentView === 'login') return <LoginPage onLogin={handleLogin} isLoading={isLoading} errorMsg={errorMsg} />;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 hidden md:flex z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-teal-500" size={24} />
            NOHN 340B
          </h1>
          <p className="text-xs text-slate-400 mt-1">Compliance Audit Tool</p>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <NavItem icon={LayoutDashboard} label="Dashboard" isActive={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <NavItem icon={Plus} label="New Audit" isActive={currentView === 'new'} onClick={startNewAudit} highlight />
          <NavItem icon={FolderOpen} label="Saved Audits" isActive={currentView === 'saved'} onClick={() => setCurrentView('saved')} />
          <NavItem icon={FileText} label="Reports" isActive={currentView === 'reports'} onClick={() => setCurrentView('reports')} />
          <NavItem icon={Settings} label="Settings" isActive={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-teal-600/20 text-teal-400 border border-teal-600/30 flex items-center justify-center font-bold">
              {session?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">Compliance Team</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-20">
          <h1 className="font-bold flex items-center gap-2">
             <ShieldAlert className="text-teal-500" size={20} />
             NOHN 340B
          </h1>
          <button onClick={handleLogout} className="text-slate-300 hover:text-white"><LogOut size={20} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          {currentView === 'dashboard' && <Dashboard audits={audits} onNewAudit={startNewAudit} />}
          {currentView === 'new' && <AuditWorkflow currentAudit={currentAudit} onSave={saveAudit} onCancel={() => setCurrentView('dashboard')} />}
          {currentView === 'saved' && <SavedAudits audits={audits} />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// COMPONENT: LOGIN PAGE
// ==========================================
function LoginPage({ onLogin, isLoading, errorMsg }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.squarespace-cdn.com/content/v1/68c866063634045746ac5740/f37d7dd0-43d2-4072-b78f-a4997e91c1fa/port-angeles-wharf-2-1200x800.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/30">
            <ShieldAlert size={32} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">NOHN Compliance</h2>
        <p className="text-center text-slate-500 text-sm mb-8">Sign in to the 340B Audit Tool</p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle size={16} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={onLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white"
              placeholder="auditor@nohn.org"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-md transition-all flex items-center justify-center disabled:opacity-70 mt-4"
          >
            {isLoading ? <Clock className="animate-spin" size={20} /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: DASHBOARD & INTERACTIVE PIE CHART
// ==========================================
function Dashboard({ audits, onNewAudit }) {
  const stats = useMemo(() => {
    const total = audits.length;
    const passed = audits.filter(a => a.status === 'Passed').length;
    const failed = audits.filter(a => a.status === 'Failed').length;
    const review = audits.filter(a => a.status === 'Needs Review').length;
    const passRate = total === 0 ? 0 : Math.round((passed / total) * 100);
    return { total, passed, failed, review, passRate };
  }, [audits]);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 mt-1">Overview of 340B compliance auditing.</p>
        </div>
        <button 
          onClick={onNewAudit}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all hover:shadow-teal-600/20 hover:-translate-y-0.5"
        >
          <Plus size={20} />
          Start New Audit
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Audits" value={stats.total} icon={FileText} color="bg-slate-100 text-slate-600" />
        <KpiCard title="Passed" value={stats.passed} icon={CheckCircle} color="bg-teal-50 text-teal-600" />
        <KpiCard title="Failed" value={stats.failed} icon={XCircle} color="bg-red-50 text-red-600" />
        <KpiCard title="Needs Review" value={stats.review} icon={AlertTriangle} color="bg-yellow-50 text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Interactive Pie Chart Area */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Audit Results</h3>
          <p className="text-sm text-slate-500 mb-6">Interactive distribution of all audits.</p>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <InteractiveDonutChart passed={stats.passed} failed={stats.failed} review={stats.review} total={stats.total} />
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
            <span className="text-sm font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full">{stats.passRate}% Pass Rate</span>
          </div>
          
          <div className="space-y-3">
            {audits.slice(0, 6).map(audit => (
              <div key={audit.id} className="flex items-center gap-4 p-4 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm rounded-xl transition-all">
                <StatusIcon status={audit.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{audit.id}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar size={12} /> {audit.date} <span className="mx-1">•</span> <User size={12} /> {audit.auditor}
                  </p>
                </div>
                <StatusBadge status={audit.status} />
              </div>
            ))}
            {audits.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No recent audits to display.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Pure SVG Interactive Donut Chart (No external libraries required)
function InteractiveDonutChart({ passed, failed, review, total }) {
  const [hoveredData, setHoveredData] = useState(null);
  
  if (total === 0) return <div className="text-slate-400 text-sm text-center py-10">No data available</div>;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  
  const passedPct = passed / total;
  const failedPct = failed / total;
  const reviewPct = review / total;

  const passedDash = passedPct * circumference;
  const failedDash = failedPct * circumference;
  const reviewDash = reviewPct * circumference;

  const passedOffset = 0;
  const failedOffset = -passedDash;
  const reviewOffset = failedOffset - failedDash;

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-center">
        {hoveredData ? (
          <div className="animate-in fade-in zoom-in duration-200">
            <p className="text-3xl font-bold text-slate-800 leading-none">{hoveredData.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: hoveredData.color }}>
              {hoveredData.label}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <p className="text-3xl font-bold text-slate-800 leading-none">{total}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Total</p>
          </div>
        )}
      </div>

      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible">
        {/* Background Track */}
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
        
        {/* Passed Slice */}
        {passed > 0 && (
          <circle 
            cx="50" cy="50" r={radius} fill="transparent" stroke="#0d9488" strokeWidth="12"
            strokeDasharray={`${passedDash} ${circumference}`} strokeDashoffset={passedOffset}
            className="transition-all duration-300 cursor-pointer origin-center hover:stroke-[16px] drop-shadow-sm"
            onMouseEnter={() => setHoveredData({ label: 'Passed', value: passed, color: '#0d9488' })}
            onMouseLeave={() => setHoveredData(null)}
          />
        )}
        
        {/* Failed Slice */}
        {failed > 0 && (
          <circle 
            cx="50" cy="50" r={radius} fill="transparent" stroke="#ef4444" strokeWidth="12"
            strokeDasharray={`${failedDash} ${circumference}`} strokeDashoffset={failedOffset}
            className="transition-all duration-300 cursor-pointer origin-center hover:stroke-[16px] drop-shadow-sm"
            onMouseEnter={() => setHoveredData({ label: 'Failed', value: failed, color: '#ef4444' })}
            onMouseLeave={() => setHoveredData(null)}
          />
        )}

        {/* Review Slice */}
        {review > 0 && (
          <circle 
            cx="50" cy="50" r={radius} fill="transparent" stroke="#eab308" strokeWidth="12"
            strokeDasharray={`${reviewDash} ${circumference}`} strokeDashoffset={reviewOffset}
            className="transition-all duration-300 cursor-pointer origin-center hover:stroke-[16px] drop-shadow-sm"
            onMouseEnter={() => setHoveredData({ label: 'Review', value: review, color: '#eab308' })}
            onMouseLeave={() => setHoveredData(null)}
          />
        )}
      </svg>
    </div>
  );
}

// ==========================================
// COMPONENT: FULL AUDIT WORKFLOW (11 Questions grouped)
// ==========================================
const AUDIT_SECTIONS = [
  {
    title: 'Patient & Provider',
    questions: [
      { id: 'q1', text: 'Is the patient an established NOHN patient?', helpText: 'Patient must have an established record prior to the date of the Rx.', failImmediate: true },
      { id: 'q2', text: 'Was the patient seen by a NOHN provider or eligible referral provider?', failImmediate: true },
      { id: 'q3', text: 'Is there a valid referral?', helpText: 'Required if seen by an outside provider.', condition: { dependsOn: 'q2', value: 'No' }, failImmediate: true },
      { id: 'q4', text: 'Is the referral documented and active for the relevant DOS?', condition: { dependsOn: 'q3', value: 'Yes' }, failImmediate: true }
    ]
  },
  {
    title: 'Encounter Details',
    questions: [
      { id: 'q5', text: 'Is the encounter documented in the medical record?', failImmediate: true },
      { id: 'q6', text: 'Does the prescription originate from an eligible encounter?', failImmediate: true },
      { id: 'q7', text: 'Was the prescription written by an eligible provider?', failImmediate: true }
    ]
  },
  {
    title: 'Pharmacy & 340B Eligibility',
    questions: [
      { id: 'q8', text: 'Is the drug eligible for 340B capture?', helpText: 'Verify medicaid status and allowable drugs.', failImmediate: true },
      { id: 'q9', text: 'Was the prescription filled at an eligible contract or in-house pharmacy?', failImmediate: true },
      { id: 'q10', text: 'Is there any indication this prescription should be carved out?', failImmediate: false }, // Answer "Yes" here might trigger a review, not an immediate fail.
      { id: 'q11', text: 'Are there any compliance concerns requiring review?', failImmediate: false }
    ]
  }
];

function AuditWorkflow({ currentAudit, onSave, onCancel }) {
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [responses, setResponses] = useState({});
  const [notes, setNotes] = useState({});
  const [globalNote, setGlobalNote] = useState('');

  const currentSection = AUDIT_SECTIONS[currentSectionIdx];
  const isLastSection = currentSectionIdx === AUDIT_SECTIONS.length - 1;

  // Determine critical failure immediately
  const isCriticalFailure = AUDIT_SECTIONS.flatMap(s => s.questions).some(q => 
    q.failImmediate && responses[q.id] === 'No'
  );

  // Check if a specific question should be visible based on condition
  const isVisible = (q) => {
    if (!q.condition) return true;
    return responses[q.condition.dependsOn] === q.condition.value;
  };

  const handleAnswer = (qId, answer) => {
    setResponses(prev => ({ ...prev, [qId]: answer }));
  };

  const handleSaveAndComplete = () => {
    let finalStatus = 'Passed';
    
    // Logic for Final Status
    if (isCriticalFailure) {
      finalStatus = 'Failed';
    } else {
      const allQIds = AUDIT_SECTIONS.flatMap(s => s.questions).filter(isVisible).map(q => q.id);
      const answeredCount = allQIds.filter(id => responses[id]).length;
      
      if (answeredCount < allQIds.length) {
        finalStatus = 'Incomplete';
      } else if (responses['q10'] === 'Yes' || responses['q11'] === 'Yes') {
        finalStatus = 'Needs Review';
      }
    }

    const completedAudit = {
      ...currentAudit,
      responses,
      notes: globalNote,
      questionNotes: notes,
      status: finalStatus,
      failed_checks: isCriticalFailure ? 1 : 0, // Simplified for UI
      completed_at: new Date().toISOString()
    };
    onSave(completedAudit);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Workflow Header */}
      <div className="mb-6">
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium mb-4 transition-colors w-fit">
          <ChevronLeft size={16} /> Cancel & Return
        </button>
        <div className="flex justify-between items-end bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <ClipboardList className="text-teal-600" />
              New Compliance Audit
            </h2>
            <p className="text-slate-500 mt-1 font-mono text-sm">{currentAudit?.id}</p>
          </div>
          {isCriticalFailure && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 animate-in fade-in zoom-in duration-300">
              <AlertTriangle size={18} /> Failed Status Triggered
            </div>
          )}
        </div>
      </div>

      {/* PHI Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="text-yellow-600 mt-0.5 shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-bold text-yellow-800">NO PHI ALLOWED</h4>
          <p className="text-xs text-yellow-700 mt-1">
            Do not enter Patient Names, Dates of Birth, MRNs, Addresses, or Rx Numbers in this tool. Use non-PHI identifiers only.
          </p>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="flex gap-2 mb-8">
        {AUDIT_SECTIONS.map((sec, idx) => (
          <div key={idx} className="flex-1">
            <div className={`h-2 rounded-full mb-2 transition-colors duration-500 ${
              idx <= currentSectionIdx ? (isCriticalFailure ? 'bg-red-400' : 'bg-teal-500') : 'bg-slate-200'
            }`}></div>
            <p className={`text-xs font-bold uppercase tracking-wider ${idx <= currentSectionIdx ? 'text-slate-700' : 'text-slate-400'}`}>
              {sec.title}
            </p>
          </div>
        ))}
      </div>

      {/* Questions Form */}
      <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
        <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-4 mb-6">
          {currentSection.title}
        </h3>

        {currentSection.questions.filter(isVisible).map((q) => (
          <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-teal-200">
            <p className="text-lg font-medium text-slate-800 mb-1">{q.text}</p>
            {q.helpText && <p className="text-sm text-slate-500 mb-4 italic">{q.helpText}</p>}
            
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={() => handleAnswer(q.id, 'Yes')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border-2 font-semibold transition-all flex items-center justify-center gap-2
                  ${responses[q.id] === 'Yes' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <CheckCircle size={18} className={responses[q.id] === 'Yes' ? 'text-teal-600' : 'text-slate-400'} /> Yes
              </button>
              <button
                onClick={() => handleAnswer(q.id, 'No')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border-2 font-semibold transition-all flex items-center justify-center gap-2
                  ${responses[q.id] === 'No' ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <XCircle size={18} className={responses[q.id] === 'No' ? 'text-red-600' : 'text-slate-400'} /> No
              </button>
              <button
                onClick={() => handleAnswer(q.id, 'N/A')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border-2 font-semibold transition-all
                  ${responses[q.id] === 'N/A' ? 'bg-slate-200 border-slate-400 text-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                N/A
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Global Notes & Final Action (Only on last step) */}
      {isLastSection && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6 animate-in fade-in">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Final Audit Notes</h3>
          <p className="text-sm text-slate-500 mb-4">Summarize any issues or findings (No PHI).</p>
          <textarea 
            value={globalNote}
            onChange={(e) => setGlobalNote(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm resize-none mb-6"
            rows="4" placeholder="Auditor notes..."
          ></textarea>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex justify-between items-center mt-8 border-t border-slate-200 pt-6">
        <button 
          onClick={() => setCurrentSectionIdx(s => Math.max(0, s - 1))}
          className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
            currentSectionIdx === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ChevronLeft size={18} /> Back
        </button>
        
        {isLastSection ? (
          <button 
            onClick={handleSaveAndComplete}
            className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Save size={20} /> Save Completed Audit
          </button>
        ) : (
          <button 
            onClick={() => setCurrentSectionIdx(s => Math.min(AUDIT_SECTIONS.length - 1, s + 1))}
            className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            Next Section <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: SAVED AUDITS
// ==========================================
function SavedAudits({ audits }) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Saved Audits</h2>
          <p className="text-slate-500 mt-1">Review and export past compliance records.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search ID or Auditor..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-full md:w-64" />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2">
            <Filter size={18} /> <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-500 tracking-wider">
                <th className="p-5 font-semibold">Audit ID</th>
                <th className="p-5 font-semibold">Date Completed</th>
                <th className="p-5 font-semibold">Auditor</th>
                <th className="p-5 font-semibold">Status</th>
                <th className="p-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits.map((audit) => (
                <tr key={audit.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-5 font-bold text-slate-900">{audit.id}</td>
                  <td className="p-5 text-sm text-slate-600">{audit.date}</td>
                  <td className="p-5 text-sm text-slate-600 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                      {audit.auditor?.charAt(0) || 'S'}
                    </div>
                    {audit.auditor || 'System'}
                  </td>
                  <td className="p-5"><StatusBadge status={audit.status} /></td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors" title="View"><Eye size={18}/></button>
                      <button className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors" title="Export CSV"><Download size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PLACEHOLDER COMPONENTS (Reports, Settings)
// ==========================================
function ReportsView() {
  return (
    <div className="max-w-4xl mx-auto text-center py-20">
      <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-teal-100">
        <Download size={40} />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-3">Export Compliance Reports</h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto text-lg">Generate detailed CSV or Excel summaries of your audits for HRSA or internal review.</p>
      <button className="bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-md inline-flex items-center gap-2 hover:-translate-y-0.5">
        <Download size={20} /> Download Full CSV Export
      </button>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-slate-900 mb-6">Settings</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Audit Configuration</h3>
        <p className="text-slate-500 mb-6 pb-6 border-b border-slate-100">Manage the questions and logic used in the audit workflow.</p>
        <button className="px-6 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-2">
          <Edit3 size={18} /> Edit Question Bank
        </button>
      </div>
    </div>
  );
}

// ==========================================
// UI UTILITIES
// ==========================================
function NavItem({ icon: Icon, label, isActive, onClick, highlight }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        highlight 
          ? 'bg-teal-600 text-white shadow-md hover:bg-teal-500 mt-4 mb-2' 
          : isActive 
            ? 'bg-slate-800 text-white shadow-inner' 
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function KpiCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:border-slate-300 transition-colors">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Passed': 'bg-teal-50 text-teal-700 border-teal-200',
    'Failed': 'bg-red-50 text-red-700 border-red-200',
    'Needs Review': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'In Progress': 'bg-slate-50 text-slate-700 border-slate-200',
    'Incomplete': 'bg-slate-100 text-slate-600 border-slate-300',
  }[status] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${styles}`}>
      {status}
    </span>
  );
}

function StatusIcon({ status }) {
  switch(status) {
    case 'Passed': return <CheckCircle className="text-teal-500 shrink-0" size={20} />;
    case 'Failed': return <XCircle className="text-red-500 shrink-0" size={20} />;
    case 'Needs Review': return <AlertTriangle className="text-yellow-500 shrink-0" size={20} />;
    default: return <Clock className="text-slate-400 shrink-0" size={20} />;
  }
}
