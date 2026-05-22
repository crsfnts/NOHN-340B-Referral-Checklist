import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileCheck, FolderOpen, FileText, Settings, LogOut, 
  ChevronRight, ChevronLeft, CheckCircle, XCircle, AlertTriangle, 
  Clock, Search, Filter, Download, User, Calendar, Plus, Save,
  AlertCircle, Eye, Copy, Trash2, Edit3, ShieldAlert
} from 'lucide-react';

// --- MOCK DATABASE (Used for preview environment) ---
const MOCK_USERS = [
  { id: '1', email: 'admin@nohn.org', password: 'password', role: 'admin', full_name: 'Admin User' },
  { id: '2', email: 'auditor@nohn.org', password: 'password', role: 'auditor', full_name: 'Jane Auditor' }
];

const INITIAL_MOCK_AUDITS = [
  {
    id: 'A-2023-001',
    internal_ref: 'RX-99281',
    date_created: '2023-10-25T10:00:00Z',
    completed_at: '2023-10-25T10:30:00Z',
    auditor_id: '2',
    auditor_name: 'Jane Auditor',
    status: 'passed',
    notes: 'Routine check, all clear.',
    responses: { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes' },
    failed_checks: 0
  },
  {
    id: 'A-2023-002',
    internal_ref: 'RX-77342',
    date_created: '2023-10-26T14:00:00Z',
    completed_at: '2023-10-26T14:15:00Z',
    auditor_id: '2',
    auditor_name: 'Jane Auditor',
    status: 'failed',
    notes: 'Missing referral documentation.',
    responses: { q1: 'yes', q2: 'no', q3: 'yes' },
    failed_checks: 1
  }
];

const AUDIT_QUESTIONS = [
  { id: 'q1', text: 'Is the patient an established NOHN patient?', critical: true },
  { id: 'q2', text: 'Was the patient seen by a NOHN provider or eligible referral provider?', critical: true },
  { id: 'q3', text: 'Is the encounter documented in the medical record?', critical: true },
  { id: 'q4', text: 'Does the prescription originate from an eligible encounter?', critical: true },
  { id: 'q5', text: 'Was the prescription written by an eligible provider?', critical: false },
  { id: 'q6', text: 'Is there a valid referral, if applicable?', critical: false, dependsOn: 'q2', expectedValue: 'yes' },
  { id: 'q7', text: 'Is the drug eligible for 340B capture?', critical: true },
  { id: 'q8', text: 'Was the prescription filled at an eligible contract pharmacy or in-house pharmacy?', critical: true }
];

const App = () => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [audits, setAudits] = useState(INITIAL_MOCK_AUDITS);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from local storage on mount (Mock behavior)
  useEffect(() => {
    const storedUser = localStorage.getItem('nohn_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setSession({ access_token: 'mock_token' });
    }
    
    const storedAudits = localStorage.getItem('nohn_audits');
    if (storedAudits) {
        setAudits(JSON.parse(storedAudits));
    }
    
    setIsLoading(false);
  }, []);

  const handleLogin = (email, password) => {
    const foundUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (foundUser) {
      // Don't store password in local storage in a real app
      const userToStore = { id: foundUser.id, email: foundUser.email, role: foundUser.role, full_name: foundUser.full_name };
      setUser(userToStore);
      setSession({ access_token: 'mock_token' });
      localStorage.setItem('nohn_user', JSON.stringify(userToStore));
      return { success: true };
    }
    return { success: false, error: 'Invalid email or password' };
  };

  const handleLogout = () => {
    setUser(null);
    setSession(null);
    localStorage.removeItem('nohn_user');
  };

  const saveAudit = (newAudit) => {
    const updatedAudits = [newAudit, ...audits];
    setAudits(updatedAudits);
    localStorage.setItem('nohn_audits', JSON.stringify(updatedAudits));
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {activeTab === 'dashboard' && <Dashboard audits={audits} setActiveTab={setActiveTab} />}
          {activeTab === 'new-audit' && <NewAudit user={user} onSave={saveAudit} setActiveTab={setActiveTab} />}
          {activeTab === 'saved-audits' && <SavedAudits audits={audits} />}
          {activeTab === 'reports' && <Reports audits={audits} />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Simulate network delay
    setTimeout(() => {
      const result = onLogin(email, password);
      if (!result.success) {
        setError(result.error);
      }
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white z-10 shadow-2xl relative">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-teal-600 p-2 rounded-lg text-white">
              <ShieldAlert size={28} />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">NOHN 340B</h2>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-600">Secure audit compliance portal</p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
                  <AlertCircle className="text-red-500 mt-0.5" size={18} />
                  <p className="text-sm text-red-700">{error} (Mock: auditor@nohn.org / password)</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" 
                  placeholder="Enter your email"
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" 
                  placeholder="Enter your password"
                  required 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded" />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">Remember me</label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-teal-600 hover:text-teal-500">Forgot password?</a>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Right side - Background Image */}
      <div className="hidden lg:block relative w-0 flex-1 bg-gray-900">
        <img 
          className="absolute inset-0 h-full w-full object-cover opacity-60" 
          src="https://images.squarespace-cdn.com/content/v1/68c866063634045746ac5740/f37d7dd0-43d2-4072-b78f-a4997e91c1fa/port-angeles-wharf-2-1200x800.jpg" 
          alt="Port Angeles Wharf" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-transparent mix-blend-multiply"></div>
      </div>
    </div>
  );
};

const Sidebar = ({ activeTab, setActiveTab, onLogout, user }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-audit', label: 'New Audit', icon: Plus },
    { id: 'saved-audits', label: 'Saved Audits', icon: FolderOpen },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-2 text-teal-700">
          <ShieldAlert size={24} />
          <span className="text-xl font-bold tracking-tight">NOHN 340B</span>
        </div>
      </div>
      
      <div className="p-4 mb-2">
         <button 
            onClick={() => setActiveTab('new-audit')}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-4 rounded-lg shadow-sm transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            Start New Audit
          </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive 
                  ? 'bg-teal-50 text-teal-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-teal-600' : 'text-gray-400'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
};

const Header = () => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-0">
      <h2 className="text-lg font-semibold text-gray-800">Compliance Audit Portal</h2>
      <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
        <div className="flex items-center gap-1">
          <ShieldAlert size={16} className="text-green-500" />
          <span>System Secure</span>
        </div>
        <div className="h-4 w-px bg-gray-300"></div>
        <span>Do not enter PHI</span>
      </div>
    </header>
  );
};

const Dashboard = ({ audits, setActiveTab }) => {
  const passed = audits.filter(a => a.status === 'passed').length;
  const failed = audits.filter(a => a.status === 'failed').length;
  const total = audits.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of 340B compliance activity</p>
        </div>
        <button 
          onClick={() => setActiveTab('new-audit')}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg shadow-sm transition-colors text-sm font-medium"
        >
          <Plus size={16} /> New Audit
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
            <FileText size={16} /> Total Audits
          </div>
          <div className="text-3xl font-bold text-gray-900">{total}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500"/> Passed
          </div>
          <div className="text-3xl font-bold text-gray-900">{passed}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
            <XCircle size={16} className="text-red-500"/> Failed
          </div>
          <div className="text-3xl font-bold text-gray-900">{failed}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
            <AlertCircle size={16} className="text-teal-500"/> Pass Rate
          </div>
          <div className="text-3xl font-bold text-gray-900">{passRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Recent Audits</h3>
            <button onClick={() => setActiveTab('saved-audits')} className="text-sm text-teal-600 hover:text-teal-700 font-medium">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {audits.slice(0, 5).map(audit => (
              <div key={audit.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${audit.status === 'passed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {audit.status === 'passed' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{audit.id} <span className="text-gray-400 font-normal">({audit.internal_ref || 'No Ref'})</span></p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock size={12} /> {new Date(audit.date_created).toLocaleDateString()} by {audit.auditor_name}
                    </p>
                  </div>
                </div>
                <StatusBadge status={audit.status} />
              </div>
            ))}
            {audits.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No audits found. Start one to see data here.</div>
            )}
          </div>
        </div>

        {/* Quick Actions / Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Important Reminders</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-sm text-blue-800">
              <ShieldAlert className="shrink-0 text-blue-600" size={20} />
              <p><strong>No PHI:</strong> Remember not to enter Patient Names, DOBs, or MRNs into any audit notes.</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex gap-3 text-sm text-amber-800">
              <AlertTriangle className="shrink-0 text-amber-600" size={20} />
              <p>Critical failures immediately mark an audit as Failed regardless of other answers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewAudit = ({ user, onSave, setActiveTab }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [internalRef, setInternalRef] = useState('');
  const [responses, setResponses] = useState({});
  const [questionNotes, setQuestionNotes] = useState({});
  const [generalNotes, setGeneralNotes] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  // Filter questions based on conditional logic
  const visibleQuestions = AUDIT_QUESTIONS.filter(q => {
    if (!q.dependsOn) return true;
    return responses[q.dependsOn] === q.expectedValue;
  });

  const handleAnswer = (questionId, answer) => {
    setResponses(prev => ({ ...prev, [questionId]: answer }));
    // Move to next step automatically if it's a Yes/No and not the last question
    if (currentStep < visibleQuestions.length - 1) {
       setTimeout(() => setCurrentStep(prev => prev + 1), 300);
    }
  };

  const handleNote = (questionId, note) => {
    setQuestionNotes(prev => ({ ...prev, [questionId]: note }));
  };

  const calculateResult = () => {
    let failedCount = 0;
    let isCriticalFailure = false;

    visibleQuestions.forEach(q => {
      if (responses[q.id] === 'no') {
        failedCount++;
        if (q.critical) isCriticalFailure = true;
      }
    });

    const status = isCriticalFailure || failedCount > 0 ? 'failed' : 'passed';
    return { status, failedCount };
  };

  const handleSave = () => {
    const { status, failedCount } = calculateResult();
    const newAudit = {
      id: `A-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      internal_ref: internalRef,
      date_created: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      auditor_id: user?.id,
      auditor_name: user?.full_name,
      status,
      notes: generalNotes,
      responses,
      questionNotes,
      failed_checks: failedCount
    };
    
    onSave(newAudit);
    setActiveTab('saved-audits');
  };

  if (isFinished) {
    const result = calculateResult();
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${result.status === 'passed' ? 'bg-green-100' : 'bg-red-100'}`}>
            {result.status === 'passed' ? <CheckCircle size={40} className="text-green-600" /> : <XCircle size={40} className="text-red-600" />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Audit Complete</h2>
          <p className="text-gray-500 mb-6">Based on your responses, this audit has <strong className={result.status === 'passed' ? 'text-green-600' : 'text-red-600'}>{result.status}</strong>.</p>
          
          <div className="text-left mb-8 bg-gray-50 p-4 rounded-lg">
             <label className="block text-sm font-medium text-gray-700 mb-2">General Audit Notes (Optional - NO PHI)</label>
             <textarea 
               value={generalNotes}
               onChange={(e) => setGeneralNotes(e.target.value)}
               className="w-full border-gray-300 rounded-md shadow-sm p-3 focus:ring-teal-500 focus:border-teal-500 text-sm"
               rows="3"
               placeholder="Add any final remarks here..."
             ></textarea>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={() => setIsFinished(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              Review Answers
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-teal-600 rounded-lg text-white font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm">
              <Save size={18} /> Save Audit
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = visibleQuestions[currentStep];
  const progress = Math.round((Object.keys(responses).length / visibleQuestions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Audit</h1>
          <p className="text-sm text-gray-500 mt-1">Step {currentStep + 1} of {visibleQuestions.length}</p>
        </div>
        <div className="w-1/3 bg-gray-200 rounded-full h-2.5">
          <div className="bg-teal-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal Reference / Encounter ID (NO PHI)</label>
          <input 
            type="text" 
            value={internalRef}
            onChange={(e) => setInternalRef(e.target.value)}
            className="w-full md:w-1/2 border-gray-300 rounded-md shadow-sm p-2.5 text-sm focus:ring-teal-500 focus:border-teal-500 border"
            placeholder="e.g. RX-12345"
          />
        </div>

        <div className="border-t border-gray-100 pt-8 pb-4 min-h-[300px]">
          {currentQ && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               {currentQ.critical && (
                  <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-4">
                    Critical Check
                  </span>
               )}
              <h2 className="text-xl font-medium text-gray-900 mb-8">{currentQ.text}</h2>
              
              <div className="flex gap-4 mb-8">
                <button 
                  onClick={() => handleAnswer(currentQ.id, 'yes')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                    responses[currentQ.id] === 'yes' 
                    ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' 
                    : 'border-gray-200 hover:border-green-200 hover:bg-green-50/50 text-gray-600'
                  }`}
                >
                  Yes
                </button>
                <button 
                  onClick={() => handleAnswer(currentQ.id, 'no')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                    responses[currentQ.id] === 'no' 
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' 
                    : 'border-gray-200 hover:border-red-200 hover:bg-red-50/50 text-gray-600'
                  }`}
                >
                  No
                </button>
                <button 
                  onClick={() => handleAnswer(currentQ.id, 'na')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                    responses[currentQ.id] === 'na' 
                    ? 'border-gray-400 bg-gray-100 text-gray-800 shadow-sm' 
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  N/A
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                   <Edit3 size={14}/> Notes for this question (Optional)
                </label>
                <input 
                  type="text" 
                  value={questionNotes[currentQ.id] || ''}
                  onChange={(e) => handleNote(currentQ.id, e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm p-2.5 text-sm focus:ring-teal-500 focus:border-teal-500 border bg-gray-50"
                  placeholder="Add context..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-auto">
        <button 
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        
        {currentStep === visibleQuestions.length - 1 ? (
           <button 
            onClick={() => setIsFinished(true)}
            disabled={!responses[currentQ?.id]}
            className="px-6 py-2 bg-teal-600 rounded-lg text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Review & Complete
          </button>
        ) : (
          <button 
            onClick={() => setCurrentStep(prev => Math.min(visibleQuestions.length - 1, prev + 1))}
            disabled={!responses[currentQ?.id]}
            className="px-4 py-2 bg-gray-800 rounded-lg text-white font-medium hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const SavedAudits = ({ audits }) => {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="max-w-6xl mx-auto">
       <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Saved Audits</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search ID or Ref..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500 shadow-sm" />
          </div>
          <button className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Audit ID</th>
                <th className="px-6 py-4">Ref / Enc</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Auditor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {audits.map((audit) => (
                <React.Fragment key={audit.id}>
                  <tr className={`hover:bg-gray-50 transition-colors ${expandedId === audit.id ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">{audit.id}</td>
                    <td className="px-6 py-4">{audit.internal_ref || '-'}</td>
                    <td className="px-6 py-4">{new Date(audit.date_created).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{audit.auditor_name}</td>
                    <td className="px-6 py-4"><StatusBadge status={audit.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => toggleExpand(audit.id)} className="text-teal-600 hover:text-teal-800 font-medium mr-3">
                        {expandedId === audit.id ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {/* Expanded Detail View */}
                  {expandedId === audit.id && (
                    <tr>
                      <td colSpan="6" className="p-0 border-b-2 border-teal-100">
                        <div className="bg-teal-50/30 p-6 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex justify-between items-start">
                             <div>
                               <h4 className="font-semibold text-gray-900">Audit Details</h4>
                               <p className="text-xs text-gray-500 mt-1">Completed {new Date(audit.completed_at).toLocaleString()}</p>
                             </div>
                             <div className="flex gap-2">
                               <button className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1"><Copy size={14}/> Duplicate</button>
                               <button className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1"><Download size={14}/> PDF</button>
                             </div>
                          </div>
                          
                          {audit.notes && (
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">General Notes</span>
                              <p className="text-sm text-gray-800">{audit.notes}</p>
                            </div>
                          )}

                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Question Responses
                            </div>
                            <ul className="divide-y divide-gray-100">
                              {Object.entries(audit.responses).map(([qId, answer]) => {
                                const q = AUDIT_QUESTIONS.find(ques => ques.id === qId);
                                if (!q) return null;
                                return (
                                  <li key={qId} className="px-4 py-3 flex justify-between gap-4">
                                    <div className="text-sm text-gray-700 flex-1">{q.text}</div>
                                    <div className="flex items-center gap-4">
                                       {audit.questionNotes?.[qId] && (
                                         <span className="text-xs text-gray-500 italic flex items-center gap-1"><Edit3 size={12}/> Note attached</span>
                                       )}
                                       <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                                        answer === 'yes' ? 'bg-green-100 text-green-700' : 
                                        answer === 'no' ? 'bg-red-100 text-red-700' : 
                                        'bg-gray-200 text-gray-700'
                                      }`}>
                                        {answer}
                                      </span>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {audits.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No saved audits found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Reports = ({ audits }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Export</h1>
          <p className="text-gray-500 mt-1">Generate CSV/Excel reports for compliance review.</p>
        </div>
        <button className="px-4 py-2 bg-teal-600 rounded-lg text-white font-medium hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-2">
          <Download size={18} /> Export Full Report (.csv)
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Export Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
             <select className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm border focus:ring-teal-500 focus:border-teal-500">
               <option>Last 30 Days</option>
               <option>This Quarter</option>
               <option>Year to Date</option>
               <option>Custom Range...</option>
             </select>
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
             <select className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm border focus:ring-teal-500 focus:border-teal-500">
               <option>All Statuses</option>
               <option>Passed</option>
               <option>Failed</option>
             </select>
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Auditor</label>
             <select className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm border focus:ring-teal-500 focus:border-teal-500">
               <option>All Auditors</option>
               <option>Jane Auditor</option>
               <option>Admin User</option>
             </select>
           </div>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-sm text-blue-800">
         <AlertCircle className="shrink-0 text-blue-600" size={20} />
         <p><strong>Note:</strong> Exports do not contain PHI as no PHI is collected by this tool. Internal Reference IDs are included to cross-reference with the EMR.</p>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">Audit Questions Configuration</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">Manage the questions presented during a new audit. (Admin only)</p>
          <div className="space-y-3">
            {AUDIT_QUESTIONS.slice(0,3).map(q => (
              <div key={q.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">{q.text}</p>
                  <p className="text-xs text-gray-500 mt-1">ID: {q.id} | {q.critical ? 'Critical Check' : 'Standard'}</p>
                </div>
                <button className="text-gray-400 hover:text-teal-600"><Edit3 size={16}/></button>
              </div>
            ))}
            <div className="text-center p-3 text-sm text-gray-500 italic">... {AUDIT_QUESTIONS.length - 3} more questions</div>
          </div>
          <button className="mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Plus size={16}/> Add Question
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  if (status === 'passed') {
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle size={12}/> Passed</span>;
  }
  if (status === 'failed') {
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><XCircle size={12}/> Failed</span>;
  }
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Pending</span>;
};

export default App;
