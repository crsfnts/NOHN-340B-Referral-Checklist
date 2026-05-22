import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, FileCheck, FolderOpen, FileText, Settings, LogOut, 
  ChevronRight, ChevronLeft, CheckCircle, XCircle, AlertTriangle, 
  Clock, Search, Filter, Download, User, Calendar, Plus, Save,
  Eye, Copy, Trash2, Edit3, ShieldAlert
} from 'lucide-react';

// --- SUPABASE SETUP ---
// This safely checks for your Vercel database keys. 
// If they aren't there yet, the app won't crash—it will just use mock data!
let supabase = null;
try {
  // We use standard try/catch to prevent compile errors in restricted environments
  const supabaseUrl = typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : '';
  const supabaseAnonKey = typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : '';
  
  if (supabaseUrl && supabaseAnonKey) {
    // If you've run npm install @supabase/supabase-js, uncomment the line below in your final repo:
    // import { createClient } from '@supabase/supabase-js';
    // supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (e) {
  console.log("Supabase not fully configured yet, using local mock mode.");
}

// --- MOCK DATA ---
const MOCK_USER = { id: '1', email: 'auditor@nohn.org', full_name: 'NOHN Auditor' };
const MOCK_AUDITS = [
  { id: '1001', date: '2026-05-20', status: 'Passed', auditor: 'Sarah Jenkins', failed_checks: 0, notes: 'Routine check.' },
  { id: '1002', date: '2026-05-21', status: 'Failed', auditor: 'Mark Ruffalo', failed_checks: 2, notes: 'No valid referral found.' },
  { id: '1003', date: '2026-05-22', status: 'Needs Review', auditor: 'Sarah Jenkins', failed_checks: 1, notes: 'Pending provider confirmation.' },
];

export default function App() {
  // State
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // login, dashboard, new, saved, reports, settings
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Dashboard & Audit State
  const [audits, setAudits] = useState(MOCK_AUDITS);
  const [currentAudit, setCurrentAudit] = useState(null);

  // Auto-login check (mocked for UI demo)
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
      // Mock login success
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

  if (currentView === 'login') {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        isLoading={isLoading} 
        errorMsg={errorMsg} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-teal-500" size={24} />
            NOHN 340B
          </h1>
          <p className="text-xs text-slate-400 mt-1">Compliance Audit Tool</p>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" isActive={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <NavItem icon={Plus} label="New Audit" isActive={currentView === 'new'} onClick={startNewAudit} highlight />
          <NavItem icon={FolderOpen} label="Saved Audits" isActive={currentView === 'saved'} onClick={() => setCurrentView('saved')} />
          <NavItem icon={FileText} label="Reports" isActive={currentView === 'reports'} onClick={() => setCurrentView('reports')} />
          <NavItem icon={Settings} label="Settings" isActive={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold">
              {session?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">Auditor</p>
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
          <h1 className="font-bold flex items-center gap-2">
             <ShieldAlert className="text-teal-500" size={20} />
             NOHN 340B
          </h1>
          <button onClick={handleLogout} className="text-slate-300 hover:text-white"><LogOut size={20} /></button>
        </header>

        {/* Dynamic View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {currentView === 'dashboard' && <Dashboard audits={audits} onNewAudit={startNewAudit} />}
          {currentView === 'new' && <AuditWorkflow currentAudit={currentAudit} onSave={saveAudit} onCancel={() => setCurrentView('dashboard')} />}
          {currentView === 'saved' && <SavedAudits audits={audits} />}
          {currentView === 'reports' && <ReportsView audits={audits} />}
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
      {/* Background Image & Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.squarespace-cdn.com/content/v1/68c866063634045746ac5740/f37d7dd0-43d2-4072-b78f-a4997e91c1fa/port-angeles-wharf-2-1200x800.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        <div className="p-8">
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
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                placeholder="auditor@nohn.org"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-slate-600">
                <input type="checkbox" className="mr-2 rounded text-teal-600 focus:ring-teal-500" />
                Remember me
              </label>
              <a href="#" className="text-sm font-medium text-teal-600 hover:text-teal-700">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-md transition-all flex items-center justify-center disabled:opacity-70"
            >
              {isLoading ? <Clock className="animate-spin" size={20} /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: DASHBOARD
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
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
        >
          <Plus size={20} />
          Start New Audit
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Audits" value={stats.total} icon={FileText} color="bg-blue-50 text-blue-600" />
        <KpiCard title="Passed" value={stats.passed} icon={CheckCircle} color="bg-green-50 text-green-600" />
        <KpiCard title="Failed" value={stats.failed} icon={XCircle} color="bg-red-50 text-red-600" />
        <KpiCard title="Pass Rate" value={`${stats.passRate}%`} icon={LayoutDashboard} color="bg-teal-50 text-teal-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Recent Audit Performance</h3>
          
          {/* Custom CSS Bar Chart */}
          <div className="h-64 flex items-end justify-around gap-2 pb-6 border-b border-slate-100 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-t border-slate-300 w-full"></div>
              <div className="border-t border-slate-300 w-full"></div>
              <div className="border-t border-slate-300 w-full"></div>
              <div className="border-t border-slate-300 w-full"></div>
            </div>
            
            {/* Mock Data Bars */}
            {[
              { label: 'Jan', pass: 80, fail: 10 },
              { label: 'Feb', pass: 95, fail: 5 },
              { label: 'Mar', pass: 70, fail: 20 },
              { label: 'Apr', pass: 85, fail: 8 },
              { label: 'May', pass: parseInt(stats.passRate) || 0, fail: 100 - (parseInt(stats.passRate) || 0) },
            ].map((col, i) => (
              <div key={i} className="flex flex-col items-center gap-2 group z-10 w-12">
                <div className="w-full bg-slate-100 rounded-t-md h-full flex flex-col justify-end overflow-hidden">
                  <div 
                    style={{ height: `${col.fail}%` }} 
                    className="w-full bg-red-400 hover:bg-red-500 transition-all rounded-t-sm"
                    title={`Failed: ${col.fail}%`}
                  ></div>
                  <div 
                    style={{ height: `${col.pass}%` }} 
                    className="w-full bg-teal-500 hover:bg-teal-600 transition-all rounded-t-sm"
                    title={`Passed: ${col.pass}%`}
                  ></div>
                </div>
                <span className="text-xs font-medium text-slate-500">{col.label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm text-slate-600">
            <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-500"></div> Passed</span>
            <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"></div> Failed</span>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {audits.slice(0, 5).map(audit => (
              <div key={audit.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                <StatusIcon status={audit.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">Audit {audit.id}</p>
                  <p className="text-xs text-slate-500">{audit.date}</p>
                </div>
                <StatusBadge status={audit.status} />
              </div>
            ))}
            {audits.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No recent audits.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: AUDIT WORKFLOW (Stepper)
// ==========================================
// Define the logic and questions
const AUDIT_QUESTIONS = [
  {
    id: 'q1',
    text: 'Is the patient an established NOHN patient?',
    helpText: 'Patient must have an established record prior to the date of the prescription.',
    criticalFail: true,
  },
  {
    id: 'q2',
    text: 'Was the patient seen by a NOHN provider or eligible referral provider?',
    helpText: 'Check the encounter notes matching the Rx date.',
    criticalFail: true,
  },
  {
    id: 'q3',
    text: 'Is there a valid referral?',
    helpText: 'Required if seen by an outside provider.',
    criticalFail: false,
    conditional: true // Simplified logic
  },
  {
    id: 'q4',
    text: 'Is the drug eligible for 340B capture?',
    helpText: 'Verify against carve-out list and medicaid status.',
    criticalFail: true,
  },
  {
    id: 'q5',
    text: 'Was the prescription filled at an eligible contract pharmacy?',
    helpText: 'Match NPI/Location with current active contract list.',
    criticalFail: true,
  }
];

function AuditWorkflow({ currentAudit, onSave, onCancel }) {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [notes, setNotes] = useState({});
  const [globalNote, setGlobalNote] = useState('');
  const [isCriticalFailure, setIsCriticalFailure] = useState(false);

  const currentQ = AUDIT_QUESTIONS[step];
  const isLastStep = step === AUDIT_QUESTIONS.length - 1;

  const handleAnswer = (answer) => {
    setResponses(prev => ({ ...prev, [currentQ.id]: answer }));
    
    // Logic check
    if (answer === 'No' && currentQ.criticalFail) {
      setIsCriticalFailure(true);
    }
    
    if (answer === 'Yes' && isCriticalFailure && currentQ.criticalFail) {
      // Re-evaluate if they changed their mind
      const otherFails = AUDIT_QUESTIONS.some(q => q.id !== currentQ.id && responses[q.id] === 'No' && q.criticalFail);
      if (!otherFails) setIsCriticalFailure(false);
    }

    // Auto-advance after short delay if not last step
    if (!isLastStep) {
      setTimeout(() => setStep(s => s + 1), 300);
    }
  };

  const handleComplete = () => {
    // Calculate final status
    const failedCount = Object.values(responses).filter(r => r === 'No').length;
    let finalStatus = 'Passed';
    if (isCriticalFailure) finalStatus = 'Failed';
    else if (failedCount > 0 || Object.keys(responses).length < AUDIT_QUESTIONS.length) finalStatus = 'Needs Review';

    const completedAudit = {
      ...currentAudit,
      responses,
      questionNotes: notes,
      notes: globalNote,
      status: finalStatus,
      failed_checks: failedCount,
      completed_at: new Date().toISOString()
    };
    onSave(completedAudit);
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Workflow Header */}
      <div className="mb-8">
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium mb-4 transition-colors">
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Conduct Audit</h2>
            <p className="text-slate-500">Ref: {currentAudit?.id}</p>
          </div>
          {isCriticalFailure && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 animate-in fade-in zoom-in duration-300">
              <AlertTriangle size={18} /> Critical Failure Detected
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${isCriticalFailure ? 'bg-red-500' : 'bg-teal-500'}`}
          style={{ width: `${((step + 1) / AUDIT_QUESTIONS.length) * 100}%` }}
        ></div>
      </div>

      {/* PHI Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-start gap-3">
        <AlertTriangle className="text-yellow-600 mt-0.5 shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-semibold text-yellow-800">PHI Restriction Warning</h4>
          <p className="text-xs text-yellow-700 mt-1">
            Do NOT enter Patient Names, DOBs, MRNs, or Rx Numbers in the notes. Use internal audit reference IDs only.
          </p>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 relative overflow-hidden">
        {/* Step indicator */}
        <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-4">
          Question {step + 1} of {AUDIT_QUESTIONS.length}
        </div>
        
        <h3 className="text-xl font-medium text-slate-800 mb-2">{currentQ.text}</h3>
        {currentQ.helpText && (
          <p className="text-sm text-slate-500 mb-8 italic">{currentQ.helpText}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => handleAnswer('Yes')}
            className={`flex-1 py-4 px-6 rounded-xl border-2 font-semibold text-lg transition-all flex items-center justify-center gap-2
              ${responses[currentQ.id] === 'Yes' 
                ? 'bg-green-50 border-green-500 text-green-700' 
                : 'border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50/50'}`}
          >
            <CheckCircle size={24} className={responses[currentQ.id] === 'Yes' ? 'text-green-600' : 'text-slate-400'} />
            Yes
          </button>
          
          <button
            onClick={() => handleAnswer('No')}
            className={`flex-1 py-4 px-6 rounded-xl border-2 font-semibold text-lg transition-all flex items-center justify-center gap-2
              ${responses[currentQ.id] === 'No' 
                ? 'bg-red-50 border-red-500 text-red-700' 
                : 'border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50/50'}`}
          >
            <XCircle size={24} className={responses[currentQ.id] === 'No' ? 'text-red-600' : 'text-slate-400'} />
            No
          </button>
          
          <button
            onClick={() => handleAnswer('N/A')}
            className={`flex-1 py-4 px-6 rounded-xl border-2 font-semibold text-lg transition-all
              ${responses[currentQ.id] === 'N/A' 
                ? 'bg-slate-100 border-slate-400 text-slate-700' 
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
          >
            N/A
          </button>
        </div>

        {/* Question specific notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
          <textarea 
            value={notes[currentQ.id] || ''}
            onChange={(e) => setNotes({...notes, [currentQ.id]: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm resize-none"
            rows="2"
            placeholder="Add context to your answer..."
          ></textarea>
        </div>
      </div>

      {/* Global Notes & Final Action (Only on last step) */}
      {isLastStep && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Final Audit Notes</h3>
          <textarea 
            value={globalNote}
            onChange={(e) => setGlobalNote(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm mb-6 resize-none"
            rows="4"
            placeholder="Overall observations or compliance concerns..."
          ></textarea>
          
          <button 
            onClick={handleComplete}
            disabled={Object.keys(responses).length === 0}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            Complete & Save Audit
          </button>
        </div>
      )}

      {/* Navigation Controls */}
      {!isLastStep && (
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <button 
            onClick={() => setStep(s => Math.min(AUDIT_QUESTIONS.length - 1, s + 1))}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium text-slate-800 transition-colors flex items-center gap-2"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}
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
          <p className="text-slate-500 mt-1">Review and manage past compliance checks.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search audits..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-full md:w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 tracking-wider">
                <th className="p-4 font-medium">Audit ID</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Auditor</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits.map((audit) => (
                <tr key={audit.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 font-medium text-slate-900">{audit.id}</td>
                  <td className="p-4 text-sm text-slate-600">{audit.date}</td>
                  <td className="p-4 text-sm text-slate-600 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                      {audit.auditor?.charAt(0) || 'S'}
                    </div>
                    {audit.auditor || 'System'}
                  </td>
                  <td className="p-4"><StatusBadge status={audit.status} /></td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-teal-600 rounded-md hover:bg-teal-50 transition-colors" title="View"><Eye size={18}/></button>
                      <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Export PDF"><Download size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {audits.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No saved audits found.</td></tr>
              )}
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
      <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Download size={40} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Export & Reports</h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">Generate CSV or Excel summaries of your compliance audits for external review.</p>
      <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors inline-flex items-center gap-2">
        <Download size={20} /> Download Full Report (CSV)
      </button>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Settings</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Audit Configuration</h3>
        <p className="text-sm text-slate-500 mb-4">Only administrators can edit the question logic.</p>
        <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Edit Question Bank</button>
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
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        highlight 
          ? 'bg-teal-600 text-white shadow-md hover:bg-teal-500 mt-4 mb-2' 
          : isActive 
            ? 'bg-slate-800 text-white' 
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Passed': 'bg-green-100 text-green-800 border-green-200',
    'Failed': 'bg-red-100 text-red-800 border-red-200',
    'Needs Review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'In Progress': 'bg-slate-100 text-slate-800 border-slate-200',
  }[status] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${styles}`}>
      {status}
    </span>
  );
}

function StatusIcon({ status }) {
  switch(status) {
    case 'Passed': return <CheckCircle className="text-green-500" size={20} />;
    case 'Failed': return <XCircle className="text-red-500" size={20} />;
    case 'Needs Review': return <AlertTriangle className="text-yellow-500" size={20} />;
    default: return <Clock className="text-slate-400" size={20} />;
  }
}
