import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot
} from 'firebase/firestore';
import { 
  Shield, 
  Activity, 
  Lock, 
  Smartphone, 
  Globe, 
  Menu, 
  X, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Search, 
  Terminal,
  Eye,
  Zap,
  Layout,
  FileText,
  Monitor,
  Plus,
  ArrowRight,
  Copy,
  Check,
  MessageCircle,
  Cpu
} from 'lucide-react';

// --- Firebase Configuration & Init ---

// Safely retrieve injected configuration or provide a placeholder for local development.
let firebaseConfig = {};
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    firebaseConfig = JSON.parse(__firebase_config);
} else {
    console.warn("Running in Local Development Mode: Firebase configuration not found. Using a dummy config. Sign-in features may rely on mock data or fail if not properly configured with your own Firebase project.");
    // A minimal, valid config object is needed for initializeApp
    firebaseConfig = {
        apiKey: "LOCAL_DEV_API_KEY",
        authDomain: "local-dev.firebaseapp.com",
        projectId: "local-dev-project",
        appId: "1:0:web:dummy"
    };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Safely retrieve app ID or provide a fallback
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Mock Data & Constants ---
const MOCK_ALERTS = [
  { id: 1, platform: 'Discord', user: '@fuzzy_bear', severity: 'high', type: 'Solicitation', timestamp: '2m ago' },
  { id: 2, platform: 'Roblox', user: 'builder_99', severity: 'medium', type: 'PII Request', timestamp: '15m ago' },
  { id: 3, platform: 'Minecraft', user: 'block_jumper', severity: 'low', type: 'Profanity', timestamp: '1h ago' },
];

const CODE_SNIPPETS = {
  web: `import { ApexGuard } from '@apex/web';

// Initialize with a smile :)
const guard = new ApexGuard({
  key: 'pk_live_12345',
  theme: 'playful'
});

// Watch the chat!
guard.monitor('#chat-box');`,
  node: `const Apex = require('@apex/node');
const client = new Apex('sk_live_54321');

// Safe kids, happy life
app.post('/message', async (req, res) => {
  const safety = await client.check(req.body.text);
  if (safety.isSafe) {
     saveMessage(req.body);
  }
});`,
  mobile: `// Swift / iOS
import ApexSafety

let safety = Apex.shared
safety.configure(apiKey: "pk_ios_999")

func onSend(_ text: String) {
    if safety.isClean(text) {
        sendMessage(text)
    }
}`
};

// --- Components ---

const Navbar = ({ view, setView, user, handleLogin, handleLogout }) => (
  <nav className="fixed top-4 left-4 right-4 z-50">
    <div className="max-w-5xl mx-auto bg-white/90 backdrop-blur-md border border-stone-200 rounded-full px-6 py-3 shadow-lg shadow-stone-200/50 flex items-center justify-between">
      <div 
        className="flex items-center cursor-pointer gap-2 group" 
        onClick={() => setView('landing')}
      >
        <div className="bg-indigo-600 text-white p-1.5 rounded-lg group-hover:rotate-12 transition-transform shadow-[3px_2px_0px_#312e81]">
            <Shield className="h-5 w-5 fill-current" />
        </div>
        <span className="text-xl font-serif font-bold text-stone-900 tracking-tight">Apex</span>
      </div>
      
      <div className="hidden md:flex items-center gap-1 bg-stone-100/50 p-1 rounded-full border border-stone-200/50">
        <NavBtn active={view === 'landing'} onClick={() => setView('landing')}>Home</NavBtn>
        <NavBtn active={view === 'install'} onClick={() => setView('install')}>Install</NavBtn>
        <NavBtn active={view === 'docs'} onClick={() => setView('docs')}>Docs</NavBtn>
      </div>

      <div className="flex items-center gap-3">
          {user ? (
              <div className="flex items-center gap-3">
                  <button 
                      onClick={() => setView('portal')}
                      className={`text-sm font-bold transition-colors ${view === 'portal' ? 'text-indigo-600' : 'text-stone-500 hover:text-stone-900'}`}
                  >
                      Dashboard
                  </button>
                  <div className="w-8 h-8 rounded-full bg-yellow-300 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-stone-800 cursor-help" title={user.email}>
                    {user.email?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <button 
                      onClick={handleLogout}
                      className="text-sm font-medium text-stone-400 hover:text-red-500"
                  >
                      <X className="w-4 h-4" />
                  </button>
              </div>
          ) : (
              <button 
                  onClick={() => setView('portal')}
                  className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                  Dashboard
              </button>
          )}
      </div>
    </div>
  </nav>
);

const NavBtn = ({ children, onClick, active }) => (
  <button
    onClick={onClick}
    className={`${
      active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
    } px-4 py-1.5 rounded-full text-sm font-medium transition-all`}
  >
    {children}
  </button>
);

const StickyNote = ({ color = "bg-yellow-200", rotate = "rotate-1", children, title, icon: Icon }) => (
    <div className={`${color} text-stone-900 p-8 w-full shadow-[6px_6px_0px_rgba(0,0,0,0.1)] border-2 border-stone-900 hover:shadow-[10px_10px_0px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all transform ${rotate} flex flex-col rounded-xl h-full`}>
        <div className="mb-4 text-stone-900">
            {Icon && <Icon className="w-8 h-8" strokeWidth={2.5} />}
        </div>
        <h3 className="font-serif font-bold text-2xl mb-3">{title}</h3>
        <div className="font-medium opacity-90 leading-relaxed text-sm md:text-base">
            {children}
        </div>
    </div>
);

const CodeHighlighter = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const highlight = (text) => {
        return text.split(/(\s+)/).map((word, i) => {
            if (['import', 'from', 'const', 'let', 'var', 'async', 'await', 'function', 'return', 'if', 'else', 'new'].includes(word)) {
                return <span key={i} className="text-purple-600 font-bold">{word}</span>;
            }
            if (['true', 'false', 'null', 'undefined'].includes(word)) {
                return <span key={i} className="text-orange-600">{word}</span>;
            }
            if (word.startsWith("'") || word.startsWith('"') || word.startsWith("`")) {
                return <span key={i} className="text-green-700">{word}</span>;
            }
            if (word.startsWith('//')) {
                return <span key={i} className="text-stone-400 italic">{word}</span>;
            }
            return <span key={i} className="text-stone-700">{word}</span>;
        });
    };

    const handleCopy = () => {
        // Use a more robust method for local environments
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code);
        } else {
            // Fallback for iFrame restrictions
            const textarea = document.createElement('textarea');
            textarea.value = code;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,0.1)] border-2 border-stone-900 overflow-hidden relative group">
            <div className="flex items-center justify-between px-4 py-3 bg-stone-100 border-b-2 border-stone-900">
                <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10" />
                    <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10" />
                </div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{language}</span>
                <div className="w-10"></div> 
            </div>
            <div className="p-6 overflow-x-auto bg-stone-50">
                <pre className="font-mono text-sm leading-relaxed text-stone-800">
                    {highlight(code)}
                </pre>
            </div>
            <button 
                onClick={handleCopy}
                className="absolute top-14 right-4 p-2 rounded-lg bg-white border-2 border-stone-200 hover:border-stone-900 text-stone-500 hover:text-stone-900 transition-all shadow-sm"
            >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
    );
};

const Hero = ({ setView }) => (
  <div className="relative pt-40 pb-20 overflow-hidden bg-[#FFFDF9]">
    {/* Grid Background */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

    <div className="max-w-4xl mx-auto px-6 text-center z-10 relative">
      <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold mb-8 border border-indigo-100 shadow-sm">
        <Shield className="w-4 h-4 mr-2 fill-current" /> Safety First Architecture
      </div>
      
      <h1 className="text-6xl md:text-8xl font-serif font-bold text-stone-900 tracking-tight leading-[0.9] mb-8">
        Social safety<br/>
        <span className="italic text-indigo-500 font-light">reimagined.</span>
      </h1>
      
      <p className="mt-6 max-w-2xl mx-auto text-xl text-stone-600 leading-relaxed font-light">
        Apex is the API that helps platforms like Roblox and Discord keep kids safe. 
        We detect the bad stuff so you can focus on the fun stuff.
      </p>

      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
        <button 
          onClick={() => setView('install')}
          className="px-8 py-4 bg-stone-900 text-white font-bold rounded-full shadow-[4px_4px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 border-2 border-stone-900"
        >
          Get Started <ChevronRight className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setView('docs')}
          className="px-8 py-4 bg-white text-stone-900 font-bold rounded-full border-2 border-stone-200 shadow-sm hover:border-stone-900 transition-all"
        >
          Read Documentation
        </button>
      </div>

      <div className="mt-20 flex flex-wrap justify-center gap-8 opacity-60">
        <span className="font-serif italic text-2xl text-stone-400">Integrate with</span>
        <span className="font-bold text-xl text-stone-500 tracking-widest">WEB</span>
        <span className="font-bold text-xl text-stone-500 tracking-widest">MOBILE</span>
        <span className="font-bold text-xl text-stone-500 tracking-widest">DESKTOP</span>
      </div>
    </div>
  </div>
);

const FeatureBoard = () => (
    <div className="py-24 bg-white border-t border-stone-100">
        <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 p-4">
                <div className="pt-12">
                    <StickyNote title="Smart Scanning" icon={Eye} color="bg-yellow-200" rotate="-rotate-2">
                        We don't just look for keywords. Our AI understands <span className="underline decoration-wavy decoration-stone-900/30">context</span> and intent.
                    </StickyNote>
                </div>
                <div>
                    <StickyNote title="Privacy First" icon={Lock} color="bg-blue-200" rotate="rotate-2">
                        We never store conversations. Everything is processed in memory and vanished instantly.
                    </StickyNote>
                </div>
                <div className="pt-8">
                    <StickyNote title="Plug and Play" icon={Zap} color="bg-green-200" rotate="-rotate-1">
                        With plug-and-play integration, setup and getting started is a breeze. No complicated setup!
                    </StickyNote>
                </div>
            </div>
        </div>
    </div>
);

const InstallationPage = () => {
  const [platform, setPlatform] = useState('web');

  return (
    <div className="min-h-screen bg-[#FFFDF9] pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-5xl font-serif font-bold text-stone-900 mb-6">Let's get set up.</h2>
                <p className="text-xl text-stone-500 max-w-2xl mx-auto">Choose your flavor below. It only takes a few lines of code.</p>
            </div>

            <div className="bg-white rounded-[3rem] shadow-[8px_8px_0px_rgba(0,0,0,0.05)] border-2 border-stone-900 overflow-hidden flex flex-col md:flex-row">
                {/* Sidebar */}
                <div className="w-full md:w-72 bg-stone-50 p-8 border-b md:border-b-0 md:border-r-2 border-stone-900 flex flex-col gap-3">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 pl-4">Platform</div>
                    {[
                        { id: 'web', label: 'Web / React', icon: Globe },
                        { id: 'node', label: 'Node.js', icon:  Terminal },
                        { id: 'mobile', label: 'iOS & Android', icon: Smartphone },
                    ].map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPlatform(p.id)}
                            className={`w-full flex items-center p-4 rounded-xl border-2 transition-all font-bold text-left ${
                                platform === p.id 
                                ? 'bg-white text-stone-900 border-stone-900 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]' 
                                : 'border-transparent text-stone-500 hover:bg-stone-100'
                            }`}
                        >
                            <p.icon className={`w-5 h-5 mr-3 ${platform === p.id ? 'text-indigo-600' : 'text-stone-400'}`} />
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Code Area */}
                <div className="flex-1 p-8 md:p-12 bg-[#FFFDF9]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex space-x-2">
                             <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10" />
                             <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10" />
                             <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10" />
                        </div>
                        <span className="text-sm font-mono text-stone-400 font-bold">installation.js</span>
                    </div>
                    
                    <div className="mb-8">
                        <CodeHighlighter code={CODE_SNIPPETS[platform]} language={platform} />
                    </div>

                    <div className="flex gap-4 text-sm text-stone-600 bg-blue-50 p-4 rounded-xl border-2 border-blue-100">
                        <div className="bg-blue-100 text-blue-700 p-1 rounded-full"><CheckCircle className="w-4 h-4"/></div>
                        <p>Estimated setup time: <span className="font-bold text-stone-900">Less than 5 minutes</span></p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

const Documentation = () => (
    <div className="pt-32 max-w-6xl mx-auto px-6 pb-20 flex flex-col md:flex-row gap-12 bg-[#FFFDF9] min-h-screen">
        <div className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-32">
                <h3 className="font-serif font-bold text-xl text-stone-900 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Contents
                </h3>
                <ul className="space-y-1">
                    {['Introduction', 'Authentication', 'Handling Events', 'Webhooks', 'Privacy Policy'].map((item, i) => (
                        <li key={item} className={`px-4 py-2 rounded-lg cursor-pointer text-sm font-bold transition-colors ${i === 0 ? 'bg-indigo-100 text-indigo-900' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'}`}>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        <div className="flex-1 max-w-3xl">
            <h1 className="text-5xl font-serif font-bold text-stone-900 mb-8">Introduction</h1>
            <p className="text-xl text-stone-600 mb-8 leading-relaxed font-light">
                Welcome to the Apex API. We've designed our endpoints to be as human-readable as possible. 
                Our goal is to help you build safer communities without the headache.
            </p>
            
            <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-2xl mb-10 shadow-[4px_4px_0px_#FDE047]">
                <h4 className="flex items-center text-yellow-800 font-bold mb-2 gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Sensitive Data
                </h4>
                <p className="text-yellow-900/80 leading-relaxed font-medium">
                    Always hash user identifiers before sending them to Apex. We love data privacy as much as you do.
                </p>
            </div>

            <h2 className="text-3xl font-serif font-bold text-stone-900 mb-6">Quick Start</h2>
            <p className="text-stone-600 mb-4">Just send a POST request to our scan endpoint.</p>
            <div className="bg-white p-6 rounded-2xl border-2 border-stone-900 shadow-[4px_4px_0px_rgba(0,0,0,0.1)] font-mono text-sm text-indigo-600 font-bold">
                POST https://api.apex.security/v1/scan
            </div>
        </div>
    </div>
);

const DashboardOnboarding = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ type: '', name: '' });

    const handleNext = () => {
        if (step === 1 && formData.type) setStep(2);
        if (step === 2 && formData.name) onComplete(formData);
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 flex items-center justify-center bg-[#FFFDF9]">
            <div className="max-w-xl w-full text-center">
                <h2 className="text-4xl font-serif font-bold text-stone-900 mb-8">
                    {step === 1 ? "What are we building?" : "Name your project."}
                </h2>
                
                {step === 1 ? (
                    <div className="grid grid-cols-1 gap-4">
                         {['Web App', 'Mobile App', 'Discord Bot'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFormData({ ...formData, type })}
                                className={`p-6 rounded-2xl border-2 text-lg font-bold transition-all ${formData.type === type ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-900'}`}
                            >
                                {type}
                            </button>
                         ))}
                         <button 
                            onClick={handleNext}
                            disabled={!formData.type}
                            className="mt-6 bg-indigo-600 text-white font-bold py-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            Next Step
                         </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <input 
                            type="text"
                            placeholder="e.g. Project Alpha"
                            className="w-full p-4 text-2xl font-serif font-bold text-center border-b-2 border-stone-300 focus:border-stone-900 focus:outline-none bg-transparent placeholder-stone-300"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                        />
                         <button 
                            onClick={handleNext}
                            disabled={!formData.name}
                            className="mt-6 bg-stone-900 text-white font-bold py-4 rounded-full disabled:opacity-50"
                         >
                            Create Project
                         </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const Dashboard = ({ user, handleLogin }) => {
    const [recentAlerts, setRecentAlerts] = useState(MOCK_ALERTS); // Default to mock alerts to prevent errors
    const [project, setProject] = useState(null); 
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [apiKey, setApiKey] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [sumResult, setSumResult] = useState(null);
    
    // Sentence Store State
    const [sentenceInput, setSentenceInput] = useState('');
    const [sentences, setSentences] = useState([]);
    const [loadingSentences, setLoadingSentences] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // --- API FUNCTIONS ---

    const generateApiKey = async () => {
        setGenerating(true);
        setApiKey(null);
        setSumResult(null);
        try {
            const payload = { project: project?.name || 'default' };
            const res = await fetch('http://localhost:5000/api/generate_key', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            setApiKey(data.key);
        } catch (err) {
            console.error('Failed to generate API key', err);
            setApiKey('ERROR_GENERATING_KEY');
        } finally {
            setGenerating(false);
        }
    };

    const computeSum = async () => {
        if (!apiKey) return;
        setSumResult(null);
        try {
            const res = await fetch('http://localhost:5000/api/sum_digits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: apiKey })
            });
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            setSumResult(data.sum);
        } catch (err) {
            console.error('Failed to compute sum', err);
            setSumResult('ERR');
        }
    };

    const submitSentence = async () => {
        if (!apiKey) return;
        const sentence = sentenceInput?.trim();
        if (!sentence) return;
        
        setSubmitting(true);
        try {
            const res = await fetch('http://localhost:5000/api/submit_sentence', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ sentence })
            });
            if (!res.ok) throw new Error('submit failed');
            
            setSentenceInput('');
            await fetchSentences(); // Refresh list
        } catch (err) {
            console.error('Failed to submit sentence', err);
            alert('Failed to submit. Ensure Backend is running.');
        } finally {
            setSubmitting(false);
        }
    };

    const fetchSentences = async () => {
        if (!apiKey) return;
        setLoadingSentences(true);
        try {
            const res = await fetch('http://localhost:5000/api/sentences', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!res.ok) throw new Error('failed to fetch');
            const data = await res.json();
            setSentences(data.sentences || []);
        } catch (err) {
            console.error('Failed to load sentences', err);
        } finally {
            setLoadingSentences(false);
        }
    };

    // --- EFFECTS ---

    useEffect(() => {
        if (apiKey) fetchSentences();
        else setSentences([]);
    }, [apiKey]);

    // Keyboard shortcut 'G'
    useEffect(() => {
        if (!project) return;
        const handler = (e) => {
            if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey) {
                // Prevent triggering if typing in an input
                if(document.activeElement.tagName !== 'INPUT') {
                    generateApiKey();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [project]);


    // --- RENDER ---

    if (!user) {
        return (
            <div className="min-h-screen pt-32 flex items-center justify-center px-6 bg-[#FFFDF9]">
                <div className="bg-white p-10 rounded-3xl shadow-[8px_8px_0px_rgba(0,0,0,0.1)] border-2 border-stone-900 max-w-md w-full text-center relative overflow-hidden">
                    <div className="bg-stone-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-stone-900">
                        <Shield className="w-10 h-10 text-stone-900" />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-stone-900 mb-3">Company Portal</h2>
                    <p className="text-stone-500 mb-8 font-medium">Sign in to view your safety reports.</p>
                    <button 
                        onClick={handleLogin}
                        className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl flex items-center justify-center hover:bg-stone-800 transition-all gap-3 shadow-md hover:-translate-y-0.5"
                    >
                        <Layout className="w-5 h-5" />
                        Sign in with Google
                    </button>
                </div>
            </div>
        );
    }

    if (showOnboarding) {
        return <DashboardOnboarding onComplete={(data) => { setProject(data); setShowOnboarding(false); }} />;
    }

    return (
        <div className="pt-32 px-6 max-w-6xl mx-auto pb-12 bg-[#FFFDF9]">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">Projects</h1>
                    <p className="text-stone-500 font-medium">Manage your active integrations.</p>
                </div>
                <button 
                    onClick={() => setShowOnboarding(true)}
                    className="px-6 py-3 bg-stone-900 text-white rounded-full shadow-[4px_4px_0px_rgba(0,0,0,0.2)] text-sm font-bold hover:bg-stone-800 flex items-center gap-2 hover:-translate-y-0.5 transition-all"
                >
                    <Plus className="w-4 h-4" /> Add Project
                </button>
            </header>

            {/* Project List */}
            <div className="grid grid-cols-1 gap-8 mb-16">
                {project ? (
                    <>
                        {/* 1. The Project Card */}
                        <div className="bg-blue-100 p-8 rounded-[2rem] border-2 border-stone-900 shadow-[6px_6px_0px_rgba(0,0,0,0.1)] flex flex-col h-56 justify-between relative overflow-hidden group hover:-translate-y-1 transition-all">
                             <div className="flex justify-between items-start z-10">
                                 <div>
                                    <span className="inline-block px-3 py-1 bg-white border border-stone-900 rounded-full text-xs font-bold uppercase tracking-widest text-stone-900 mb-3">{project.type}</span>
                                    <h3 className="text-3xl font-serif font-bold text-stone-900">{project.name}</h3>
                                 </div>
                                 <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-stone-900 animate-pulse"></div>
                            </div>
                            <div className="flex flex-wrap gap-3 z-10 items-center">
                                 <button
                                     onClick={generateApiKey}
                                     className="px-4 py-2 bg-white border-2 border-stone-900 rounded-lg text-sm font-bold text-stone-900 hover:bg-stone-50 transition-colors flex items-center gap-2"
                                     disabled={generating}
                                 >
                                     {generating ? 'Generating…' : 'Generate Key'}
                                 </button>
                                 
                                 {apiKey && (
                                     <div className="flex items-center gap-2 bg-white p-2 rounded-lg border-2 border-stone-900 ml-auto">
                                         <code className="font-mono text-sm text-stone-800 px-2">{apiKey}</code>
                                         <div className="h-4 w-px bg-stone-300"></div>
                                         <button onClick={() => navigator.clipboard?.writeText(apiKey)} className="p-1.5 hover:bg-stone-100 rounded"><Copy className="w-4 h-4"/></button>
                                         <button onClick={computeSum} className="p-1.5 hover:bg-stone-100 rounded font-bold text-xs">SUM</button>
                                         {sumResult !== null && <span className="font-bold text-green-600 text-sm px-2">{sumResult}</span>}
                                     </div>
                                 )}
                            </div>
                        </div>

                        {/* 2. The Sentence Store (Moved Here) */}
                        <div className="bg-white rounded-[2rem] border-2 border-stone-900 shadow-[6px_6px_0px_rgba(0,0,0,0.1)] p-8">
                            <h3 className="font-serif font-bold text-xl text-stone-900 mb-4 flex items-center gap-2">
                                <MessageCircle className="w-6 h-6" />
                                Data Recall System
                            </h3>
                            
                            {!apiKey ? (
                                <div className="p-6 bg-stone-50 border-2 border-dashed border-stone-200 rounded-xl text-center text-stone-400">
                                    Generate an API key above to start storing data.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex gap-3">
                                        <input
                                            value={sentenceInput}
                                            onChange={(e) => setSentenceInput(e.target.value)}
                                            placeholder="Type something to store securely..."
                                            className="flex-1 p-4 border-2 border-stone-200 rounded-xl bg-stone-50 focus:outline-none focus:border-stone-900 transition-colors"
                                            onKeyDown={(e) => e.key === 'Enter' && submitSentence()}
                                        />
                                        <button
                                            onClick={submitSentence}
                                            disabled={submitting || !sentenceInput}
                                            className="px-6 py-2 bg-stone-900 text-white rounded-xl font-bold disabled:opacity-50 hover:-translate-y-0.5 transition-transform shadow-sm"
                                        >
                                            {submitting ? 'Saving...' : 'Store'}
                                        </button>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-sm text-stone-500 uppercase tracking-widest">Stored Data</h4>
                                            <button onClick={fetchSentences} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Refresh List</button>
                                        </div>
                                        
                                        <div className="max-h-64 overflow-y-auto pr-2 space-y-3">
                                            {loadingSentences ? (
                                                <div className="text-center py-8 text-stone-400">Loading data...</div>
                                            ) : sentences.length === 0 ? (
                                                <div className="text-center py-8 text-stone-400 italic border-2 border-dashed border-stone-100 rounded-xl">
                                                    No data stored yet.
                                                </div>
                                            ) : (
                                                sentences.map((s, i) => (
                                                    <div key={i} className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-start group hover:border-stone-400 transition-colors">
                                                        <div className="text-stone-800 font-medium">{s.sentence}</div>
                                                        <div className="text-xs font-mono text-stone-400 mt-1 bg-white px-2 py-1 rounded border border-stone-100">
                                                            {new Date((s.ts||0)*1000).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <button 
                        onClick={() => setShowOnboarding(true)}
                        className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-stone-300 flex flex-col items-center justify-center h-56 text-stone-400 hover:border-stone-500 hover:text-stone-600 transition-all hover:bg-stone-50"
                    >
                        <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="font-bold">Create your first project</span>
                    </button>
                )}
            </div>
        </div>
    );
};

const Footer = () => (
    <footer className="bg-stone-50 border-t border-stone-200 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
                <div className="flex items-center mb-6 gap-2">
                    <div className="bg-stone-900 text-white p-1 rounded">
                        <Shield className="h-4 w-4 fill-current" />
                    </div>
                    <span className="text-xl font-serif font-bold text-stone-900">Apex.</span>
                </div>
                <p className="text-stone-500 text-sm leading-relaxed">
                    Building a safer internet for the next generation, one message at a time.
                </p>
            </div>
            <div>
                <h4 className="font-bold text-stone-900 mb-6">Product</h4>
                <ul className="space-y-3 text-sm text-stone-500">
                    <li className="hover:text-indigo-600 cursor-pointer transition-colors font-medium">Integration</li>
                    <li className="hover:text-indigo-600 cursor-pointer transition-colors font-medium">Pricing</li>
                    <li className="hover:text-indigo-600 cursor-pointer transition-colors font-medium">Security</li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-stone-900 mb-6">Company</h4>
                <ul className="space-y-3 text-sm text-stone-500">
                    <li className="hover:text-indigo-600 cursor-pointer transition-colors font-medium">About</li>
                    <li className="hover:text-indigo-600 cursor-pointer transition-colors font-medium">Blog</li>
                    <li className="hover:text-indigo-600 cursor-pointer transition-colors font-medium">Careers</li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-stone-900 mb-6">Legal</h4>
                <ul className="space-y-3 text-sm text-stone-500">
                    <li className="hover:text-indigo-600 cursor-pointer transition-colors font-medium">Privacy</li>
                    <li className="hover:text-indigo-600 cursor-pointer transition-colors font-medium">Terms</li>
                </ul>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-stone-400 text-xs font-bold">© 2025 Apex Security Inc. Made in Waterloo.</p>
        </div>
    </footer>
);

export default function App() {
    const [view, setView] = useState('landing');
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Skip Firebase auth subscription in local/dummy mode — use mock login instead.
        setUser(null);
    }, []);

    const handleLogin = async () => {
        // For local development we skip Firebase and use a mock user directly.
        const mockUser = {
            uid: 'demo_admin',
            displayName: 'Demo Admin',
            email: 'admin@apex.security',
            isAnonymous: false
        };
        setUser(mockUser);
    };

    const handleLogout = async () => {
        // Skip Firebase sign-out in local mode; just clear the mock user.
        setUser(null);
        setView('landing');
    };

    return (
        <div className="min-h-screen bg-[#FFFDF9] text-stone-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <Navbar view={view} setView={setView} user={user} handleLogin={handleLogin} handleLogout={handleLogout} />
            <main>
                {view === 'landing' && (
                    <>
                        <Hero setView={setView} />
                        <FeatureBoard />
                    </>
                )}
                {view === 'install' && <InstallationPage />}
                {view === 'docs' && <Documentation />}
                {view === 'portal' && <Dashboard user={user} handleLogin={handleLogin} />}
            </main>
            
            <Footer />
        </div>
    );
}