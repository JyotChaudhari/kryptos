import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  MessageSquare, 
  Video, 
  Phone, 
  Image as ImageIcon, 
  Send, 
  Heart, 
  MessageCircle, 
  Share2, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  PhoneOff,
  User,
  Loader2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  LogOut,
  Volume2,
  VolumeX,
  Menu,
  Search
  , Trash2
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const api = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('kryptos_uid') || '', ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `Request failed (${response.status})`);
  return response.json();
};

// --- E2EE SIMULATION UTILITIES ---
const ENCRYPTION_KEY = "KRYPTOS_CORE_SECRET_KEY_999";

const encryptMessage = (text) => {
  const encoded = encodeURIComponent(text);
  let encrypted = '';
  for (let i = 0; i < encoded.length; i++) {
    encrypted += String.fromCharCode(encoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
  }
  return btoa(encrypted); 
};

const decryptMessage = (cipherText) => {
  try {
    const decoded = atob(cipherText);
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
    }
    return decodeURIComponent(decrypted);
  } catch (e) {
    return "🔒 [Encrypted Message Unreadable]";
  }
};

// --- HELPER FUNCTIONS ---
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "Just now";
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageNotice, setMessageNotice] = useState(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      try {
        const uid = localStorage.getItem('kryptos_uid');
        const session = await api('/api/session', { method: 'POST', body: JSON.stringify({ userId: uid }) });
        localStorage.setItem('kryptos_uid', session.uid);
        setUser({ uid: session.uid });
        setUserProfile(await api('/api/profile'));
      } catch (error) {
        console.error("Auth Error:", error);
        setAuthError('Could not connect to the local backend. Start it with npm run server.');
      } finally {
        setLoadingAuth(false);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    const events = new EventSource(`${API_URL}/api/events?userId=${encodeURIComponent(user.uid)}`);
    events.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.recipientId !== user.uid || message.authorId === selectedContact?.uid) return;
      setMessageNotice(message);
    });
    return () => events.close();
  }, [user, selectedContact]);

  const handleLogout = async () => {
    localStorage.removeItem('kryptos_uid');
    setUserProfile(null);
    setUser(null);
  };

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-zinc-950 text-white">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-600 blur-xl opacity-50 rounded-full animate-pulse"></div>
          <Shield className="w-16 h-16 text-violet-500 relative z-10 animate-pulse" />
        </div>
        <p className="mt-6 text-zinc-400 font-medium tracking-widest text-sm uppercase">Securing Kryptos Engine</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-zinc-950 p-6 text-white">
        <div className="w-full max-w-xl rounded-2xl border border-rose-400/30 bg-zinc-900 p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-rose-300">Kryptos could not connect</h1>
          <p className="mt-4 text-zinc-300">{authError}</p>
          <p className="mt-4 text-sm text-zinc-400">
            Start the local backend with <code>npm run server</code>, then reload this app.
          </p>
        </div>
      </div>
    );
  }

  if (user && !userProfile) {
    return <Onboarding user={user} onComplete={setUserProfile} />;
  }

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-violet-500/30">
      {messageNotice && (
        <MessageNotification
          message={messageNotice}
          onOpen={() => {
            setSelectedContact({ uid: messageNotice.authorId, username: messageNotice.authorName });
            setActiveTab('chat');
            setMessageNotice(null);
          }}
          onClose={() => setMessageNotice(null)}
        />
      )}
      {/* Desktop Sidebar */}
      <Sidebar 
        userProfile={userProfile} 
        setUserProfile={setUserProfile}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        setSelectedContact={setSelectedContact}
        onLogout={handleLogout}
      />

      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/75 p-4 pt-16 backdrop-blur-sm">
          <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <h2 className="font-bold text-white">Find people</h2>
                <p className="text-xs text-zinc-500">Search by username to start chatting</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="rounded-lg px-3 py-1 text-2xl leading-none text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Close username search"
              >
                ×
              </button>
            </div>
            <UsernameSearch
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileSearchOpen(false);
              }}
              setSelectedContact={setSelectedContact}
              currentUserId={userProfile?.uid}
              mobile
            />
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-full bg-black/40 shadow-inner pb-16 md:pb-0">
        {activeTab === 'home' && <HomeFeed userProfile={userProfile} user={user} />}
        {activeTab === 'chat' && <E2EEChat userProfile={userProfile} user={user} selectedContact={selectedContact} />}
        {activeTab === 'reels' && <ReelsFeed user={user} />}
        {activeTab === 'call' && <VideoCallMockup selectedContact={selectedContact} />}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSearch={() => setMobileSearchOpen(true)}
      />
    </div>
  );
}

// --- ONBOARDING COMPONENT ---
function Onboarding({ user, onComplete }) {
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    
    setSaving(true);
    try {
      const profileData = await api('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ username })
      });
      onComplete(profileData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save profile. Ensure connection.");
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-zinc-950 text-white relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-cyan-400 blur-lg opacity-50"></div>
             <div className="w-20 h-20 bg-zinc-900 border border-white/20 rounded-2xl flex items-center justify-center shadow-lg relative z-10">
               <Shield className="text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-cyan-400 w-10 h-10 stroke-[url(#kryptos-grad)]" />
               <svg width="0" height="0">
                  <linearGradient id="kryptos-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop stopColor="#a78bfa" offset="0%" />
                    <stop stopColor="#22d3ee" offset="100%" />
                  </linearGradient>
                </svg>
             </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Welcome to Kryptos</h1>
        <p className="text-zinc-400 text-center mb-8 text-sm">Claim your secure identity on the network.</p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="username"
                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-white placeholder-zinc-600"
                maxLength={20}
              />
            </div>
            {error && <p className="text-rose-400 text-xs mt-2 ml-1">{error}</p>}
          </div>

          <button 
            type="submit" 
            disabled={saving || !username.trim()}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl py-3 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-violet-900/50"
          >
            {saving ? <Loader2 className="animate-spin w-5 h-5" /> : 'Enter the Vault'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- NAVIGATION COMPONENTS ---
function Sidebar({ userProfile, setUserProfile, activeTab, setActiveTab, setSelectedContact, onLogout }) {
  const [editingProfile, setEditingProfile] = useState(false);
  return (
    <nav className="hidden md:flex w-72 bg-zinc-950/90 backdrop-blur-xl border-r border-white/5 flex-col justify-between relative z-20 shadow-2xl">
      <div>
        <div className="p-6 flex items-center gap-4 border-b border-white/5">
          <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight text-white">
            KRYPTOS
          </h1>
        </div>
        
        <div className="flex flex-col gap-2 px-4 mt-6">
          <NavItem icon={<Home size={22} />} label="Feed" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={<MessageSquare size={22} />} label="Secure Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <NavItem icon={<Video size={22} />} label="Reels" isActive={activeTab === 'reels'} onClick={() => setActiveTab('reels')} />
          <NavItem icon={<Phone size={22} />} label="Video Call" isActive={activeTab === 'call'} onClick={() => setActiveTab('call')} />
        </div>
        <UsernameSearch
          setActiveTab={setActiveTab}
          setSelectedContact={setSelectedContact}
          currentUserId={userProfile?.uid}
        />
      </div>

      <div className="p-4 m-4 bg-zinc-900/80 border border-white/10 rounded-2xl flex flex-col gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/10 rounded-full flex items-center justify-center flex-shrink-0">
             <User size={18} className="text-zinc-300" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-bold truncate text-zinc-100">@{userProfile?.username}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">E2EE Active</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditingProfile(true)}
          className="w-full rounded-xl bg-white/5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-violet-500/10 hover:text-violet-300"
        >
          Edit username
        </button>
        <button 
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-xl transition-colors text-sm font-medium"
        >
          <LogOut size={16} /> Disconnect
        </button>
      </div>
      {editingProfile && (
        <ProfileSettings
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          onClose={() => setEditingProfile(false)}
        />
      )}
    </nav>
  );
}

function ProfileSettings({ userProfile, setUserProfile, onClose }) {
  const [username, setUsername] = useState(userProfile?.username || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveUsername = async (event) => {
    event.preventDefault();
    const normalized = username.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '_');
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      setError('Use 3-20 letters, numbers, or underscores.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updatedProfile = await api('/api/profile', { method: 'PUT', body: JSON.stringify({ username: normalized }) });
      setUserProfile(updatedProfile);
      onClose();
    } catch (saveError) {
      console.error('Profile update error:', saveError);
      setError(saveError.message || 'Could not update username. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
      <form onSubmit={saveUsername} className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white">Edit username</h2>
        <p className="mt-1 text-xs text-zinc-500">Like Instagram, this is how people find you.</p>
        <div className="relative mt-5">
          <span className="absolute left-3 top-3 text-zinc-500">@</span>
          <input
            autoFocus
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950 py-2.5 pl-8 pr-3 text-white outline-none focus:border-cyan-500"
          />
        </div>
        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-white/5 py-2.5 text-sm text-zinc-300">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function UsernameSearch({ setActiveTab, setSelectedContact, currentUserId, mobile = false }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const searchUsers = async (event) => {
    event.preventDefault();
    const normalizedTerm = term.trim().toLowerCase().replace(/^@/, '');
    if (normalizedTerm.length < 2) {
      setResults([]);
      setError('Enter at least 2 characters.');
      return;
    }

    setSearching(true);
    setError('');
    try {
      const found = await api(`/api/users?q=${encodeURIComponent(normalizedTerm)}`);
      setResults(found);
      if (!found.length) setError('No users found.');
    } catch (searchError) {
      console.error('Username search error:', searchError);
      setError('Search failed. Check your backend connection.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={mobile ? 'p-4' : 'mx-4 mt-6 border-t border-white/5 pt-5'}>
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Find a user
      </p>
      <form onSubmit={searchUsers} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="absolute left-3 top-3 text-zinc-500" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="@username"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition focus:border-cyan-500 placeholder:text-zinc-600"
            aria-label="Search username"
          />
        </div>
        <button
          type="submit"
          disabled={searching || term.trim().length < 2}
          className="rounded-xl bg-cyan-500 px-3 text-xs font-bold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>
      {searching && <p className="mt-2 px-1 text-xs text-zinc-500">Searching...</p>}
      {error && !searching && <p className="mt-2 px-1 text-xs text-amber-400">{error}</p>}
      {results.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 shadow-xl">
          {results.map((profile) => (
            <div key={profile.id} className="flex items-center gap-2 border-b border-white/5 px-3 py-2 last:border-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                <User size={13} />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">@{profile.username}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedContact(profile);
                  setActiveTab('chat');
                }}
                className="rounded-lg bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20"
              >
                Message
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedContact(profile);
                  setActiveTab('call');
                }}
                className="rounded-lg bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-300 hover:bg-violet-500/20"
              >
                Call
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BottomNav({ activeTab, setActiveTab, onSearch }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 z-50 px-4 py-3 flex justify-between items-center pb-safe">
      <MobileNavItem icon={<Home size={24} />} isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
      <MobileNavItem icon={<MessageSquare size={24} />} isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
      <MobileNavItem icon={<Search size={24} />} isActive={false} onClick={onSearch} label="Search users" />
      <MobileNavItem icon={<Video size={24} />} isActive={activeTab === 'reels'} onClick={() => setActiveTab('reels')} />
      <MobileNavItem icon={<Phone size={24} />} isActive={activeTab === 'call'} onClick={() => setActiveTab('call')} />
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
        isActive 
          ? 'text-white bg-white/10 font-semibold shadow-inner border border-white/5' 
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>
      )}
      <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-cyan-400' : 'group-hover:scale-110 group-hover:text-cyan-400'}`}>
        {icon}
      </div>
      <span className="relative z-10">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, isActive, onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label} className={`p-3 rounded-full transition-all ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
      {icon}
    </button>
  );
}

// --- HOME FEED ---
function HomeFeed({ userProfile, user }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!user) return;
    api('/api/posts').then(setPosts).catch(console.error);
    const events = new EventSource(`${API_URL}/api/events?userId=${encodeURIComponent(user.uid)}`);
    events.addEventListener('posts', (event) => setPosts(JSON.parse(event.data).slice().reverse()));
    return () => events.close();
  }, [user]);

  return (
    <div className="h-full overflow-y-auto w-full flex justify-center custom-scrollbar">
      <div className="w-full max-w-2xl px-4 py-8 flex flex-col gap-8">
        <CreatePost userProfile={userProfile} user={user} />
        
        <div className="flex flex-col gap-8">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 flex flex-col items-center bg-zinc-900/30 rounded-3xl border border-white/5">
              <Shield className="w-12 h-12 mb-4 opacity-20" />
              <p>The feed is encrypted and empty.</p>
              <p className="text-sm mt-2">Upload a photo or video to begin.</p>
            </div>
          ) : (
            posts.map(post => <PostCard key={post.id} post={post} user={user} />)
          )}
        </div>
      </div>
    </div>
  );
}

function CreatePost({ userProfile, user }) {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handlePost = async () => {
    if (!caption.trim() && !file) return;
    setUploading(true);

    try {
      let mediaUrl = null;
      let mediaType = null;

      if (file) throw new Error('Media uploads are temporarily disabled on the local backend. Remove the file and post text only.');
      await api('/api/posts', { method: 'POST', body: JSON.stringify({ caption }) });

      setCaption('');
      setFile(null);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Post error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="flex gap-4 items-start relative z-10">
        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10">
          <User size={20} className="text-zinc-400" />
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <textarea 
            className="w-full bg-transparent border-none text-zinc-100 text-lg focus:ring-0 resize-none placeholder:text-zinc-600 outline-none"
            placeholder={`Share securely, @${userProfile?.username}...`}
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          
          {file && (
            <div className="relative w-fit bg-zinc-950/80 p-3 rounded-xl border border-white/10 flex items-center gap-3 backdrop-blur-md">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                {file.type.startsWith('video/') ? <Video size={16} /> : <ImageIcon size={16} />}
              </div>
              <span className="text-sm text-zinc-300 truncate max-w-[200px]">
                {file.name}
              </span>
              <button 
                onClick={() => setFile(null)} 
                className="bg-rose-500/20 text-rose-400 rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-rose-500 hover:text-white transition-colors ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {uploading && (
            <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-cyan-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*" 
                onChange={(e) => setFile(e.target.files[0])}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm"
                disabled
              >
                <ImageIcon size={18} /> Media unavailable
              </button>
            </div>
            
            <button 
              onClick={handlePost}
              disabled={uploading || (!caption.trim() && !file)}
              className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : 'Post to Feed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, user }) {
  const handleLike = async () => {
    await api(`/api/posts/${post.id}/like`, { method: 'POST' });
  };
  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    await api(`/api/posts/${post.id}`, { method: 'DELETE' });
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
      <div className="p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 border border-white/10">
          <User size={20} />
        </div>
        <div>
          <h3 className="font-bold text-zinc-100 group-hover:text-cyan-400 transition-colors">@{post.authorName}</h3>
          <p className="text-xs text-zinc-500 font-medium tracking-wide mt-0.5">
            {formatTimeAgo(post.timestamp)}
          </p>
        </div>
        {post.authorId === user?.uid && (
          <button onClick={handleDelete} className="ml-auto rounded-lg p-2 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400" title="Delete post">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {post.caption && (
        <div className="px-5 pb-4 text-zinc-200 text-[15px] leading-relaxed break-words">
          {post.caption}
        </div>
      )}

      {post.mediaUrl && (
        <div className="w-full bg-black flex justify-center max-h-[600px] border-y border-white/5">
          {post.mediaType === 'video' ? (
            <video 
              src={post.mediaUrl} 
              controls 
              className="w-full object-contain max-h-[600px]"
            />
          ) : (
            <img 
              src={post.mediaUrl} 
              alt="Post content" 
              className="w-full object-contain max-h-[600px]"
            />
          )}
        </div>
      )}

      <div className="p-4 md:p-5 flex gap-6 bg-zinc-950/50">
        <button onClick={handleLike} className="group/btn flex items-center gap-2 text-zinc-400 hover:text-rose-500 transition-colors">
          <div className="p-2 rounded-full group-hover/btn:bg-rose-500/10 transition-colors">
            <Heart size={22} className="group-hover/btn:fill-current" />
          </div>
          <span className="font-bold">{post.likes || 0}</span>
        </button>
        <button className="group/btn flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors">
          <div className="p-2 rounded-full group-hover/btn:bg-cyan-400/10 transition-colors">
             <MessageCircle size={22} />
          </div>
          <span className="font-bold">0</span>
        </button>
        <button className="group/btn flex items-center gap-2 text-zinc-400 hover:text-violet-400 transition-colors ml-auto">
          <div className="p-2 rounded-full group-hover/btn:bg-violet-400/10 transition-colors">
             <Share2 size={22} />
          </div>
        </button>
      </div>
    </div>
  );
}

// --- SECURE CHAT ---
function E2EEChat({ userProfile, user, selectedContact }) {
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [showRaw, setShowRaw] = useState(false); 
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api('/api/chat/threads').then(setThreads).catch(console.error);
    if (!selectedContact) return;
    const load = () => api(`/api/chat?contact=${encodeURIComponent(selectedContact.uid)}`).then(setMessages).catch(console.error);
    load();
    const events = new EventSource(`${API_URL}/api/events?userId=${encodeURIComponent(user.uid)}`);
    events.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if ((message.authorId === user.uid && message.recipientId === selectedContact.uid) || (message.authorId === selectedContact.uid && message.recipientId === user.uid)) {
        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) return current;
          return [...current.filter((item) => !item.pending), message];
        });
        api('/api/chat/threads').then(setThreads).catch(console.error);
      }
    });
    return () => events.close();
  }, [user, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const plainText = newMessage.trim();
    const encryptedText = encryptMessage(plainText);
    const optimisticMessage = {
      id: `pending-${Date.now()}`,
      authorId: user.uid,
      authorName: userProfile.username,
      recipientId: selectedContact.uid,
      recipientName: selectedContact.username,
      text: encryptedText,
      timestamp: Date.now(),
      isEncrypted: true,
      pending: true
    };
    setMessages((current) => [...current, optimisticMessage]);
    setNewMessage('');
    setSendError('');
    setSending(true);
    try {
      await api('/api/chat', { method: 'POST', body: JSON.stringify({ recipientId: selectedContact.uid, text: encryptedText, isEncrypted: true }) });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
      setNewMessage(plainText);
      setSendError('Message could not be sent. Check the connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950/50 backdrop-blur-md relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-zinc-950/80 md:block">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-xl font-bold text-white">Messages</h2>
            <p className="mt-1 text-xs text-zinc-500">Your conversations</p>
          </div>
          <div className="max-h-full overflow-y-auto">
            {threads.length === 0 ? (
              <p className="p-5 text-sm text-zinc-500">Search a username to start chatting.</p>
            ) : threads.map((thread) => (
              <button
                key={thread.uid}
                onClick={() => setSelectedContact({ uid: thread.uid, username: thread.username })}
                className={`flex w-full items-center gap-3 border-b border-white/5 p-4 text-left hover:bg-white/5 ${selectedContact?.uid === thread.uid ? 'bg-white/10' : ''}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 font-bold text-white">
                  {thread.username[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-200">@{thread.username}</p>
                  <p className="truncate text-xs text-zinc-500">{decryptMessage(thread.lastMessage.text)}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
      {/* Chat Header */}
      <div className="px-4 md:px-6 py-4 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl z-10 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-inner">
            <ShieldCheck className="text-emerald-400 w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              {selectedContact ? `Chat with @${selectedContact.username}` : 'Kryptos Vault'}
            </h2>
            <p className="text-[10px] md:text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
              <Lock size={10} className="text-emerald-500" /> End-to-End Encrypted
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowRaw(!showRaw)}
          className={`px-3 py-2 md:py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-colors ${
            showRaw ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-zinc-900 border-white/10 text-zinc-500 hover:text-zinc-300'
          }`}
          title="Toggle Raw Cipher View"
        >
          {showRaw ? <EyeOff size={14} /> : <Eye size={14} />}
          <span className="hidden md:inline">{showRaw ? 'Hide Cipher' : 'View DB Cipher'}</span>
        </button>
      </div>

      {!selectedContact ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-zinc-400">
          <MessageSquare className="mb-4 h-14 w-14 text-cyan-400/40" />
          <h3 className="text-lg font-bold text-zinc-200">Choose a secure contact</h3>
          <p className="mt-2 max-w-md text-sm">
            Search for a username in the left sidebar, then choose Chat to open a private conversation.
          </p>
        </div>
      ) : (
      <>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 custom-scrollbar z-10">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-center">
            <Lock className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">Welcome to the secure channel.</p>
            <p className="text-sm mt-1">All messages are encrypted before leaving your device.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.authorId === user.uid;
            const displayText = msg.isEncrypted ? decryptMessage(msg.text) : msg.text;

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-800 border border-white/10 rounded-full flex flex-shrink-0 items-center justify-center text-zinc-500">
                  <User size={14} />
                </div>
                <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1.5 px-1">
                    <span className="text-xs font-bold text-zinc-300">@{msg.authorName}</span>
                    <span className="text-[10px] text-zinc-500">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  
                  <div className="relative group">
                    <div className={`px-4 md:px-5 py-2.5 md:py-3 rounded-2xl text-[14px] md:text-[15px] shadow-lg leading-relaxed ${
                      isMe 
                        ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm shadow-violet-900/30 border border-violet-400/20' 
                        : 'bg-zinc-800/80 backdrop-blur-sm border border-white/10 text-zinc-100 rounded-tl-sm'
                    }`}>
                      {showRaw && msg.isEncrypted ? (
                        <span className="font-mono text-xs break-all opacity-70 text-emerald-300">{msg.text}</span>
                      ) : (
                        displayText
                      )}
                    </div>
                    {msg.isEncrypted && !showRaw && (
                      <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                        <Lock size={12} className="text-emerald-500/50" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
        </div>

        <div className="p-4 md:p-6 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 z-10">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="relative flex items-center group">
            <div className="absolute left-4 text-emerald-500 pointer-events-none transition-transform group-focus-within:scale-110">
              <Lock size={18} />
            </div>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type an encrypted message..."
              className="w-full bg-zinc-900 border border-white/10 rounded-full py-3.5 md:py-4 pl-12 pr-14 text-zinc-100 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-zinc-900 transition-all shadow-inner placeholder-zinc-600"
            />
            {sendError && <p className="mb-2 px-3 text-xs text-rose-400">{sendError}</p>}
            <button 
              type="submit" 
              disabled={!newMessage.trim() || sending}
              className="absolute right-2 p-2.5 bg-white hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded-full transition-all shadow-lg"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={newMessage.trim() ? 'ml-0.5' : ''} />}
            </button>
          </form>
          <div className="mt-2 md:mt-3 text-center">
            <span className="text-[10px] text-zinc-500 font-mono flex items-center justify-center gap-1">
              <Unlock size={10} /> Client-side encryption active
            </span>
          </div>
        </div>
        </div>
      </>
      )}
        </div>
      </div>
    </div>
  );
}

function MessageNotification({ message, onOpen, onClose }) {
  return (
    <div className="fixed right-5 top-5 z-[70] w-80 rounded-2xl border border-cyan-400/30 bg-zinc-900 p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 font-bold text-white">
          {message.authorName?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">New message</p>
          <p className="mt-1 font-bold text-white">@{message.authorName}</p>
          <p className="mt-1 truncate text-sm text-zinc-300">{decryptMessage(message.text)}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-xl bg-white/5 py-2 text-xs text-zinc-300">Dismiss</button>
        <button onClick={onOpen} className="flex-1 rounded-xl bg-cyan-600 py-2 text-xs font-bold text-white">Open chat</button>
      </div>
    </div>
  );
}

// --- REELS FEED ---
function ReelsFeed({ user }) {
  const [videoPosts, setVideoPosts] = useState([]);
  const [isMuted, setIsMuted] = useState(true);
  
  useEffect(() => {
    api('/api/posts').then((fetched) => {
      const videos = fetched.filter(p => p.mediaType === 'video').sort((a, b) => b.timestamp - a.timestamp);
      setVideoPosts(videos);
    }).catch(console.error);
  }, []);

  return (
    <div className="h-full w-full bg-black flex justify-center items-center overflow-hidden relative">
      
      {/* Global Mute Toggle */}
      {videoPosts.length > 0 && (
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-6 right-6 z-50 bg-black/50 backdrop-blur-xl border border-white/10 p-3 rounded-full text-white hover:bg-black/70 transition-colors shadow-lg"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}

      {videoPosts.length === 0 ? (
         <div className="text-center p-10 bg-zinc-900/50 rounded-3xl border border-white/5 max-w-sm backdrop-blur-xl m-4">
           <Video className="w-16 h-16 mx-auto mb-6 text-zinc-600" />
           <h3 className="text-xl md:text-2xl font-bold mb-2 text-white">No Reels Found</h3>
           <p className="text-zinc-400 text-sm">Upload a video in the Feed to see it here.</p>
         </div>
      ) : (
        <div className="h-full w-full max-w-[450px] bg-zinc-950 overflow-y-scroll snap-y snap-mandatory hide-scrollbar border-x border-white/5 shadow-2xl relative">
          {videoPosts.map(post => (
            <div key={post.id} className="h-[100svh] w-full snap-start relative flex flex-col justify-center bg-black group">
              <video 
                src={post.mediaUrl}
                className="w-full h-full object-cover"
                loop
                autoPlay
                muted={isMuted}
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none"></div>
              
              {/* Overlay UI */}
              <div className="absolute bottom-20 md:bottom-12 left-4 right-16 text-white z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full border border-white/20 flex items-center justify-center shadow-lg">
                    <User size={16} />
                  </div>
                  <h4 className="font-bold text-lg shadow-black drop-shadow-md">@{post.authorName}</h4>
                  <button className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold pointer-events-auto hover:bg-white/30 border border-white/10">Follow</button>
                </div>
                <p className="text-sm line-clamp-3 text-zinc-200 drop-shadow-lg">{post.caption}</p>
              </div>

              {/* Sidebar Controls */}
              <div className="absolute bottom-20 md:bottom-12 right-2 md:right-4 flex flex-col gap-5 items-center z-10">
                {post.authorId === user?.uid && (
                  <button
                    onClick={async () => {
                      if (!window.confirm('Remove this reel?')) return;
                      await api(`/api/posts/${post.id}`, { method: 'DELETE' });
                      setVideoPosts((current) => current.filter((item) => item.id !== post.id));
                    }}
                    className="flex flex-col items-center gap-1 text-white hover:text-rose-400"
                  >
                    <div className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10"><Trash2 size={24} /></div>
                    <span className="text-xs font-bold">Remove</span>
                  </button>
                )}
                <button className="flex flex-col items-center gap-1 text-white hover:text-rose-500 transition-colors group/icon">
                   <div className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 group-hover/icon:bg-rose-500/20"><Heart size={24} /></div>
                   <span className="text-xs font-bold drop-shadow-md">{post.likes || 0}</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-white hover:text-cyan-400 transition-colors group/icon">
                   <div className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 group-hover/icon:bg-cyan-400/20"><MessageCircle size={24} /></div>
                   <span className="text-xs font-bold drop-shadow-md">0</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-white hover:text-emerald-400 transition-colors group/icon">
                   <div className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 group-hover/icon:bg-emerald-400/20"><Share2 size={24} /></div>
                   <span className="text-xs font-bold drop-shadow-md">Share</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 1rem); }
      `}} />
    </div>
  );
}

// --- VIDEO CALL MOCKUP ---
function VideoCallMockup({ selectedContact }) {
  const localVideoRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callStarted, setCallStarted] = useState(false);

  useEffect(() => {
    let activeStream = null;

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        activeStream = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setStreamActive(true);
      } catch (err) {
        setError("Hardware access denied or unavailable.");
      }
    };

    startWebcam();
    return () => {
      if (activeStream) activeStream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const toggleTrack = (kind, stateDispatcher, currentState) => {
    if (!localVideoRef.current?.srcObject) return;
    const stream = localVideoRef.current.srcObject;
    const tracks = kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
    tracks.forEach(track => track.enabled = !currentState);
    stateDispatcher(!currentState);
  };

  return (
    <div className="h-full bg-zinc-950 p-2 md:p-6 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 to-zinc-950 pointer-events-none"></div>

      <div className="flex-1 relative rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center z-10">
        {!selectedContact && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/95 p-8 text-center">
            <div>
              <Phone className="mx-auto mb-4 h-14 w-14 text-violet-400/60" />
              <h2 className="text-xl font-bold text-white">Choose someone to call</h2>
              <p className="mt-2 max-w-md text-sm text-zinc-400">
                Search for a username in the left sidebar and press Call.
              </p>
            </div>
          </div>
        )}
        
        <video 
          ref={localVideoRef}
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-opacity duration-700 ${streamActive && camOn ? 'opacity-100' : 'opacity-0'}`}
        />

        {(!streamActive || !camOn) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-zinc-900/90 backdrop-blur-xl">
             <div className="w-24 h-24 md:w-32 md:h-32 bg-zinc-800 rounded-full flex items-center justify-center shadow-inner border border-white/5">
               <User size={48} className="text-zinc-600" />
             </div>
             <p className="text-lg md:text-xl font-medium text-zinc-300 tracking-wide text-center px-4">
               {error ? <span className="text-rose-400 text-sm bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20">{error}</span> : 'Video Paused'}
             </p>
          </div>
        )}

        <div className="absolute top-4 right-4 md:top-8 md:right-8 w-24 h-36 md:w-56 md:h-80 bg-zinc-900 rounded-2xl md:rounded-3xl border border-white/20 shadow-2xl overflow-hidden z-20 flex items-center justify-center backdrop-blur-md">
           <div className="text-center p-3">
             <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3 md:mb-4"></div>
             <p className="text-[10px] md:text-xs text-zinc-400 font-medium">
               {selectedContact
                 ? callStarted
                   ? `Connected to @${selectedContact.username}`
                   : `Ready to call @${selectedContact.username}`
                 : 'Select a user to call'}
             </p>
           </div>
        </div>

        <div className="absolute bottom-24 md:bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-3 md:gap-4 bg-zinc-900/90 backdrop-blur-xl px-6 md:px-8 py-3 md:py-4 rounded-full border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20">
          <button 
            onClick={() => toggleTrack('audio', setMicOn, micOn)}
            className={`p-3 md:p-4 rounded-full transition-all ${micOn ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`}
          >
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          
          <button 
            onClick={() => toggleTrack('video', setCamOn, camOn)}
            className={`p-3 md:p-4 rounded-full transition-all ${camOn ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`}
          >
            {camOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
          </button>
          
          <div className="w-px h-6 md:h-8 bg-white/10 mx-1 md:mx-2"></div>

          <button
            onClick={() => setCallStarted((started) => !started)}
            disabled={!selectedContact}
            className={`px-6 md:px-8 py-3 md:py-4 rounded-full text-white font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(225,29,72,0.4)] flex items-center gap-2 text-sm md:text-base disabled:cursor-not-allowed disabled:opacity-40 ${
              callStarted ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {callStarted ? <PhoneOff size={18} /> : <Phone size={18} />}
            <span className="hidden md:inline">{callStarted ? 'End' : 'Call'}</span>
          </button>
        </div>

        <div className="absolute top-4 left-4 md:top-8 md:left-8 bg-zinc-900/80 backdrop-blur-xl px-4 md:px-5 py-2 md:py-2.5 rounded-full border border-white/20 z-20 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-xs md:text-sm font-bold text-white tracking-wide">Kryptos Secure Room</span>
          </div>
        </div>
      </div>
    </div>
  );
}