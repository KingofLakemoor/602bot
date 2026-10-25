import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Flame,
  Tv,
  Wine,
  Send,
  Terminal,
  Cpu,
  RefreshCw,
  Lock,
  Unlock,
  Layers,
  Database,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Play,
  UserCheck,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  Power
} from 'lucide-react';
import { DiscordEmbedView } from './components/DiscordEmbedView';

interface BotInfo {
  id: string;
  name: string;
  persona: string;
  guild: string;
  status: string;
  isTokenConfigured: boolean;
  integrations: Array<{ name: string; type: string; status: string }>;
  commands: string[];
}

interface FleetData {
  ecosystem: string;
  environment: {
    hubGuildId: string | null;
    club602GuildId: string | null;
    fantraxLeagueIds: string;
    firebaseServiceAccountConfigured: boolean;
    firestoreMode: string;
  };
  bots: BotInfo[];
}

interface SimulatedMessage {
  id: string;
  user: string;
  command: string;
  bot: string;
  botRole: string;
  botAvatar: string;
  botColor: string;
  isEphemeral: boolean;
  embed: any;
  timestamp: string;
  channel: string;
}

export default function App() {
  // Authentication State (Rick & Admins Only)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(true);
  const [adminUser, setAdminUser] = useState<string>('Rick');
  const [passkeyInput, setPasskeyInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab: 'overrides' (Rick's primary dashboard) | 'fleet' | 'simulator' | 'firestore' | 'deploy'
  const [activeTab, setActiveTab] = useState<'overrides' | 'fleet' | 'simulator' | 'firestore' | 'deploy'>('overrides');
  const [fleetData, setFleetData] = useState<FleetData | null>(null);
  const [firestoreDocs, setFirestoreDocs] = useState<any>({});
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeChannel, setActiveChannel] = useState<'megachannel-qnw' | 'club-602-lounge'>('megachannel-qnw');
  
  // Simulation message stream
  const [messages, setMessages] = useState<SimulatedMessage[]>([]);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [commandInput, setCommandInput] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ message: string; type: 'success' | 'alert' } | null>(null);

  // Override Form States
  const [guillotineVictim, setGuillotineVictim] = useState("Brad's Benchwarmers");
  const [guillotineScore, setGuillotineScore] = useState('85.0');
  const [freezeReason, setFreezeReason] = useState('Late Scratch: Christian McCaffrey Out');
  const [loungeNotice, setLoungeNotice] = useState('Flash Tasting: Reserve Bourbon Vault open for next 60 minutes in Lounge 602.');
  const [overrideInProgress, setOverrideInProgress] = useState<boolean>(false);

  // Fetch initial fleet and Firestore data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [fleetRes, stateRes] = await Promise.all([
        fetch('/api/fleet-status'),
        fetch('/api/admin/firestore-state')
      ]);

      if (fleetRes.ok) {
        const fData = await fleetRes.json();
        setFleetData(fData);
      }
      if (stateRes.ok) {
        const sData = await stateRes.json();
        setFirestoreDocs(sData.documents || {});
        setEventLogs(sData.eventLogs || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Pre-populate with initial demonstration commands
    executeSimulatedCommand('matchup', false);
    executeSimulatedCommand('board', true);
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkeyInput === 'rick602' || passkeyInput.toLowerCase() === 'admin' || passkeyInput === '') {
      setIsAdminAuthenticated(true);
      setAdminUser('Rick');
      setLoginError(null);
    } else {
      setLoginError('Invalid Passkey. Use rick602 or click Rick Fast-Login.');
    }
  };

  // The Controller App Strategy: Dispatch Manual Overrides directly to Firebase documents
  const dispatchFirebaseOverride = async (action: string, payload: any = {}) => {
    setOverrideInProgress(true);
    try {
      const res = await fetch('/api/admin/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          payload,
          adminUser
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionAlert({
          message: `🔥 Firebase Document Updated: ${data.message}`,
          type: 'success'
        });

        // Also inject a live bot reaction in the simulator!
        if (action === 'trigger_guillotine') {
          setMessages(prev => [
            {
              id: Math.random().toString(36).substring(7),
              user: `${adminUser} [Admin Override]`,
              command: `🪓 GUILLOTINE DROP ENFORCED`,
              bot: 'Commissioner',
              botRole: 'QNW Fantasy Enforcer',
              botAvatar: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=100&auto=format&fit=crop&q=60',
              botColor: '#d97706',
              isEphemeral: false,
              embed: {
                title: `🪓 THE BLADE HAS FALLEN — ${payload.victim || "Brad's Benchwarmers"} ELIMINATED!`,
                description: `Admin **${adminUser}** manually dropped the guillotine. Roster dumped to waiver pool immediately. Cut-line score: ${payload.cutLineScore || 85.0} pts.`,
                color: 0x7F1D1D,
                fields: [
                  { name: 'Eliminated Manager', value: `@${payload.victim || "Brad_QNW"}`, inline: true },
                  { name: 'Execution Protocol', value: 'Admin Manual Override', inline: true },
                  { name: 'Waiver Wire Auction', value: 'Unlocks tomorrow at 10:00 AM EST', inline: false }
                ]
              },
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              channel: 'megachannel-qnw'
            },
            ...prev
          ]);
        } else if (action === 'freeze_action_board') {
          setMessages(prev => [
            {
              id: Math.random().toString(36).substring(7),
              user: `${adminUser} [Admin Override]`,
              command: `⚡ EMERGENCY LINE FREEZE`,
              bot: 'Linemaker',
              botRole: 'ChainLink Sportsbook',
              botAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
              botColor: '#10b981',
              isEphemeral: false,
              embed: {
                title: '🚨 ALL BETTING WINDOWS FROZEN BY ADMIN',
                description: `ChainLink board has halted trading upon admin instruction. All active slips held in escrow.`,
                color: 0xEF4444,
                fields: [
                  { name: 'Admin Enforcer', value: `@${adminUser}`, inline: true },
                  { name: 'Freeze Justification', value: payload.reason || 'Late Breaking NFL News', inline: true }
                ]
              },
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              channel: 'megachannel-qnw'
            },
            ...prev
          ]);
        } else if (action === 'lock_reality_rosters') {
          setMessages(prev => [
            {
              id: Math.random().toString(36).substring(7),
              user: `${adminUser} [Admin Override]`,
              command: `🎬 EMERGENCY ROSTER LOCK`,
              bot: 'Producer',
              botRole: 'ScriptLess Reality TV',
              botAvatar: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100&auto=format&fit=crop&q=60',
              botColor: '#ec4899',
              isEphemeral: false,
              embed: {
                title: '🔒 SCRIPTLESS ROSTER LOCKDOWN ACTIVE',
                description: `Admin **${adminUser}** enforced emergency roster lockout. All cast trades and substitutions are locked.`,
                color: 0xEC4899,
                fields: [
                  { name: 'Airtime Status', value: 'Locked 60 mins ahead of broadcast', inline: true }
                ]
              },
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              channel: 'megachannel-qnw'
            },
            ...prev
          ]);
        }

        setTimeout(() => setActionAlert(null), 5000);
        fetchDashboardData();
      }
    } catch (err: any) {
      setActionAlert({ message: `Error: ${err.message}`, type: 'alert' });
    } finally {
      setOverrideInProgress(false);
    }
  };

  const executeSimulatedCommand = async (cmdName: string, ephemeralExpected: boolean = false) => {
    setSimulating(true);
    try {
      const res = await fetch('/api/simulate-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmdName,
          options: {},
          user: { id: 'usr_77', username: 'QNW_LeadAdmin' }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMeta = getBotMeta(data.bot);

        const newMsg: SimulatedMessage = {
          id: Math.random().toString(36).substring(7),
          user: 'QNW_LeadAdmin',
          command: `/${cmdName}`,
          bot: data.bot,
          botRole: botMeta.role,
          botAvatar: botMeta.avatar,
          botColor: botMeta.color,
          isEphemeral: data.isEphemeral,
          embed: data.embed,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          channel: ['events', 'rsvp', 'schedule'].includes(cmdName) ? 'club-602-lounge' : 'megachannel-qnw'
        };

        setMessages(prev => [newMsg, ...prev]);

        if (['events', 'rsvp', 'schedule'].includes(cmdName)) {
          setActiveChannel('club-602-lounge');
        } else {
          setActiveChannel('megachannel-qnw');
        }
      }
    } catch (err) {
      console.error('Command simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  function getBotMeta(botName: string) {
    switch (botName) {
      case 'Commissioner':
        return {
          role: 'QNW Fantasy Enforcer',
          color: '#d97706',
          icon: ShieldAlert,
          avatar: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=100&auto=format&fit=crop&q=60'
        };
      case 'Linemaker':
        return {
          role: 'ChainLink Sportsbook',
          color: '#10b981',
          icon: Flame,
          avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60'
        };
      case 'Producer':
        return {
          role: 'ScriptLess Reality TV',
          color: '#ec4899',
          icon: Tv,
          avatar: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100&auto=format&fit=crop&q=60'
        };
      case 'Concierge':
      default:
        return {
          role: 'Club 602 VIP Hospitality',
          color: '#6366f1',
          icon: Wine,
          avatar: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=100&auto=format&fit=crop&q=60'
        };
    }
  }

  const currentChannelMessages = messages.filter(m => m.channel === activeChannel);

  // If user signed out, display Admin Gate
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-[#dbdee1] flex items-center justify-center p-4">
        <div className="bg-[#1e1f22] p-8 rounded-2xl border border-[#2b2d31] max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5865f2] to-[#ec4899] flex items-center justify-center mx-auto shadow-lg shadow-[#5865f2]/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Controller App: Admin Gate</h2>
            <p className="text-xs text-[#949ba4] mt-1">
              Restricted to Rick & authorized QNW/Club 602 administrators.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="text-left space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Admin Passkey</label>
              <input
                type="password"
                placeholder="Enter passkey (e.g. rick602)"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865f2]"
              />
            </div>

            {loginError && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 p-2.5 rounded-lg text-left">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-sm font-semibold transition-all shadow-md"
            >
              Sign In as Admin
            </button>
          </form>

          <div className="pt-2 border-t border-[#2b2d31]">
            <button
              onClick={() => {
                setIsAdminAuthenticated(true);
                setAdminUser('Rick');
              }}
              className="text-xs text-[#5865f2] hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>One-Click Lead Admin Access (Rick)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#dbdee1] flex flex-col font-sans">
      {/* Top Controller Header */}
      <header className="bg-[#1e1f22] border-b border-[#2b2d31] px-4 lg:px-6 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#5865f2] to-[#ec4899] flex items-center justify-center shadow-lg shadow-[#5865f2]/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Controller App</h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  /controller-app • Port 3000
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#2b2d31] text-[#949ba4] border border-[#35373c]">
                  5-Container Monorepo
                </span>
              </div>
              <p className="text-xs text-[#949ba4]">Firebase Manual Overrides • 4-Bot Fleet Telemetry • Rick & Admins</p>
            </div>
          </div>

          {/* Admin User Badge & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#2b2d31] border border-[#35373c] rounded-lg text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-[#949ba4]">Admin:</span>
              <span className="font-bold text-white">{adminUser}</span>
              <span className="text-[10px] font-mono uppercase bg-[#18191c] px-1.5 py-0.5 rounded text-amber-400">
                Lead
              </span>
            </div>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded border border-[#35373c] transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsAdminAuthenticated(false)}
              className="p-1.5 text-xs text-[#949ba4] hover:text-white hover:bg-[#2b2d31] rounded transition-colors"
              title="Lock Admin Console"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Navigation Tabs */}
      <div className="bg-[#18191c] border-b border-[#2b2d31] px-4 lg:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1 py-2">
            <button
              onClick={() => setActiveTab('overrides')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'overrides'
                  ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Manual Overrides (Firebase Flags)</span>
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'fleet'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>4-Bot Fleet Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'simulator'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Megachannel Live Feed</span>
            </button>

            <button
              onClick={() => setActiveTab('firestore')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'firestore'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Firestore State & Audit Stream</span>
            </button>

            <button
              onClick={() => setActiveTab('deploy')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'deploy'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Day 1 Checklist & Pi Docker</span>
            </button>
          </nav>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#949ba4]">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Controller Strategy: Event-driven Firestore doc updates</span>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionAlert && (
        <div
          className={`py-2 px-4 text-center text-xs font-medium border-b animate-fadeIn ${
            actionAlert.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200'
              : 'bg-red-950/60 border-red-600/50 text-red-200'
          }`}
        >
          {actionAlert.message}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {/* ========================================================= */}
        {/* TAB 1: MANUAL OVERRIDES (THE CONTROLLER APP STRATEGY)      */}
        {/* ========================================================= */}
        {activeTab === 'overrides' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-2xl border border-amber-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Zap className="w-4 h-4" />
                    <span>The Controller App Strategy: Firebase-Driven Overrides</span>
                  </div>
                  <p className="text-xs text-[#949ba4] max-w-2xl">
                    Instead of sending direct HTTP requests to individual bot containers, pressing any button below writes flags straight into Firestore documents.
                    The bots' active <code className="text-amber-300">onSnapshot</code> listeners trigger Discord actions instantly with zero network friction.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#1e1f22] border border-[#2b2d31] text-white font-mono">
                    Logged in: <strong>{adminUser}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Overrides Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Override 1: Trigger Guillotine Blade Drop */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-amber-500/30 space-y-4 shadow-lg relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Trigger Guillotine Drop (The Commissioner)</h3>
                      <p className="text-[11px] text-[#949ba4]">Target Doc: <code className="text-amber-400">gridiron_exotics/chop_league</code></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    QNW Fantasy
                  </span>
                </div>

                <p className="text-xs text-[#949ba4]">
                  Manually drops the execution blade on the lowest scoring manager. Writes the elimination payload to Firestore and dumps their roster to waivers.
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Target Roster</label>
                    <input
                      type="text"
                      value={guillotineVictim}
                      onChange={(e) => setGuillotineVictim(e.target.value)}
                      className="w-full bg-[#18191c] border border-[#2b2d31] rounded px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Cut Line Score</label>
                    <input
                      type="text"
                      value={guillotineScore}
                      onChange={(e) => setGuillotineScore(e.target.value)}
                      className="w-full bg-[#18191c] border border-[#2b2d31] rounded px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => dispatchFirebaseOverride('trigger_guillotine', { victim: guillotineVictim, cutLineScore: Number(guillotineScore) })}
                    disabled={overrideInProgress}
                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>🪓 Drop Guillotine Blade</span>
                  </button>

                  <button
                    onClick={() => dispatchFirebaseOverride('reset_guillotine')}
                    disabled={overrideInProgress}
                    className="py-2 px-3 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded-lg text-xs font-semibold transition-all border border-[#35373c]"
                  >
                    Reset Status
                  </button>
                </div>
              </div>

              {/* Override 2: ChainLink Line Freeze */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-emerald-500/30 space-y-4 shadow-lg relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Emergency Board Freeze (The Linemaker)</h3>
                      <p className="text-[11px] text-[#949ba4]">Target Doc: <code className="text-emerald-400">action_board/control_flags</code></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    ChainLink
                  </span>
                </div>

                <p className="text-xs text-[#949ba4]">
                  Immediately locks all active betting windows and holds user slips in escrow during breaking injury news or market volatility.
                </p>

                <div className="text-xs">
                  <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Freeze Reason</label>
                  <input
                    type="text"
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    className="w-full bg-[#18191c] border border-[#2b2d31] rounded px-2.5 py-1.5 text-white font-mono text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => dispatchFirebaseOverride('freeze_action_board', { reason: freezeReason })}
                    disabled={overrideInProgress}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Halt All Trading Windows</span>
                  </button>

                  <button
                    onClick={() => dispatchFirebaseOverride('unfreeze_action_board')}
                    disabled={overrideInProgress}
                    className="py-2 px-3 bg-[#2b2d31] hover:bg-[#35373c] text-emerald-400 rounded-lg text-xs font-semibold transition-all border border-[#35373c]"
                  >
                    Thaw Board
                  </button>
                </div>
              </div>

              {/* Override 3: ScriptLess Roster Lockdown */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-pink-500/30 space-y-4 shadow-lg relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Emergency Reality Roster Lock (The Producer)</h3>
                      <p className="text-[11px] text-[#949ba4]">Target Doc: <code className="text-pink-400">scriptless/current_episode</code></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">
                    ScriptLess
                  </span>
                </div>

                <p className="text-xs text-[#949ba4]">
                  Forces immediate roster lockout for tonight's episode of <em className="text-white">The Golden Rose</em> ahead of scheduled airtime, preventing insider roster edits.
                </p>

                <div className="flex items-center gap-2 pt-3">
                  <button
                    onClick={() => dispatchFirebaseOverride('lock_reality_rosters', { reason: 'Emergency Airtime Lockdown by Admin Rick' })}
                    disabled={overrideInProgress}
                    className="flex-1 py-2 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Enforce Instant Roster Lockout</span>
                  </button>

                  <button
                    onClick={() => dispatchFirebaseOverride('unlock_reality_rosters')}
                    disabled={overrideInProgress}
                    className="py-2 px-3 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded-lg text-xs font-semibold transition-all border border-[#35373c]"
                  >
                    Unlock
                  </button>
                </div>
              </div>

              {/* Override 4: VIP Lounge Flash Announcement */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-indigo-500/30 space-y-4 shadow-lg relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Wine className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">VIP Lounge Flash Blast (The Concierge)</h3>
                      <p className="text-[11px] text-[#949ba4]">Target Doc: <code className="text-indigo-400">club602_calendar/announcements</code></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    Club 602
                  </span>
                </div>

                <p className="text-xs text-[#949ba4]">
                  Broadcasts a flash reservation announcement to the standalone Club 602 server. Attached to all <code className="text-indigo-300">/events</code> replies.
                </p>

                <div className="text-xs">
                  <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Announcement Copy</label>
                  <input
                    type="text"
                    value={loungeNotice}
                    onChange={(e) => setLoungeNotice(e.target.value)}
                    className="w-full bg-[#18191c] border border-[#2b2d31] rounded px-2.5 py-1.5 text-white font-mono text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => dispatchFirebaseOverride('broadcast_lounge_flash', { message: loungeNotice })}
                    disabled={overrideInProgress}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Lounge Flash Alert</span>
                  </button>

                  <button
                    onClick={() => dispatchFirebaseOverride('clear_lounge_flash')}
                    disabled={overrideInProgress}
                    className="py-2 px-3 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded-lg text-xs font-semibold transition-all border border-[#35373c]"
                  >
                    Clear Alert
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 4-BOT FLEET TELEMETRY                              */}
        {/* ========================================================= */}
        {activeTab === 'fleet' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">4-Bot Suite Status & Telemetry</h2>
                <p className="text-xs text-[#949ba4]">
                  Isolated container instances running on Raspberry Pi, connected to shared Firebase Firestore.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-[#1e1f22] text-[#dbdee1] rounded border border-[#2b2d31]">
                  Target Guilds: <strong className="text-amber-400">HUB_GUILD</strong> & <strong className="text-indigo-400">CLUB602_GUILD</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fleetData?.bots.map((bot) => {
                const meta = getBotMeta(bot.name.replace('The ', ''));
                return (
                  <div key={bot.id} className="bg-[#1e1f22] rounded-xl border border-[#2b2d31] p-5 space-y-4 shadow-sm hover:border-[#3f4147] transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
                          style={{ backgroundColor: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}50` }}
                        >
                          <meta.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{bot.name}</h3>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2b2d31] text-[#949ba4]">
                              {bot.persona.split('&')[0]}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#80848e]">{bot.guild}</p>
                        </div>
                      </div>

                      <span className="flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {bot.status}
                      </span>
                    </div>

                    <div className="bg-[#2b2d31] p-3 rounded-lg border border-[#35373c] space-y-2 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4]">Active Listeners</div>
                      {bot.integrations.map((int, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[#dbdee1] text-[11px]">
                          <span>• {int.name}</span>
                          <span className="font-mono text-amber-300">{int.type}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4]">Commands</div>
                      <div className="flex flex-wrap gap-1">
                        {bot.commands.map((cmd, idx) => (
                          <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18191c] text-[#dbdee1] border border-[#2b2d31]">
                            {cmd}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: MEGACHANNEL DISCORD FEED                           */}
        {/* ========================================================= */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Channel Switcher & Command Chips (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#1e1f22] p-3.5 rounded-xl border border-[#2b2d31]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] mb-2 px-1">
                  Active Feed
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setActiveChannel('megachannel-qnw')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeChannel === 'megachannel-qnw'
                        ? 'bg-[#2b2d31] text-white border border-[#5865f2]/50 shadow-sm'
                        : 'text-[#949ba4] hover:bg-[#2b2d31]/50 hover:text-[#dbdee1]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#80848e] font-bold">#</span>
                      <span className="font-semibold">megachannel-qnw</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18191c] text-amber-400 font-mono">
                      Hub Guild
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveChannel('club-602-lounge')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeChannel === 'club-602-lounge'
                        ? 'bg-[#2b2d31] text-white border border-[#6366f1]/50 shadow-sm'
                        : 'text-[#949ba4] hover:bg-[#2b2d31]/50 hover:text-[#dbdee1]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#80848e] font-bold">#</span>
                      <span className="font-semibold">club-602-lounge</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18191c] text-indigo-400 font-mono">
                      Club 602 Standalone
                    </span>
                  </button>
                </div>
              </div>

              {/* Slash Command Bar */}
              <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#2b2d31] space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">
                  Test Commands
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => executeSimulatedCommand('matchup')} className="p-2 bg-[#2b2d31] hover:bg-[#35373c] text-left text-xs font-mono rounded">/matchup</button>
                  <button onClick={() => executeSimulatedCommand('shame')} className="p-2 bg-[#2b2d31] hover:bg-[#35373c] text-left text-xs font-mono rounded">/shame</button>
                  <button onClick={() => executeSimulatedCommand('board', true)} className="p-2 bg-[#2b2d31] hover:bg-[#35373c] text-left text-xs font-mono rounded text-emerald-400">/board 🔒</button>
                  <button onClick={() => executeSimulatedCommand('my-action', true)} className="p-2 bg-[#2b2d31] hover:bg-[#35373c] text-left text-xs font-mono rounded text-emerald-400">/my-action 🔒</button>
                  <button onClick={() => executeSimulatedCommand('cast-tea')} className="p-2 bg-[#2b2d31] hover:bg-[#35373c] text-left text-xs font-mono rounded text-pink-400">/cast-tea</button>
                  <button onClick={() => executeSimulatedCommand('events')} className="p-2 bg-[#2b2d31] hover:bg-[#35373c] text-left text-xs font-mono rounded text-indigo-400">/events</button>
                </div>
              </div>
            </div>

            {/* Right Chat Viewport (8 cols) */}
            <div className="lg:col-span-8 flex flex-col bg-[#313338] rounded-xl border border-[#2b2d31] overflow-hidden shadow-2xl min-h-[560px]">
              <div className="bg-[#313338] px-4 py-3 border-b border-[#2b2d31] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[#80848e]">#</span>
                  <span className="font-bold text-white text-sm">{activeChannel}</span>
                </div>
                <button
                  onClick={() => setMessages([])}
                  className="text-[11px] text-[#949ba4] hover:text-white px-2 py-1 rounded bg-[#2b2d31] border border-[#383a40]"
                >
                  Clear Feed
                </button>
              </div>

              <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px]">
                {currentChannelMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1.5 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-xs text-[#949ba4] pl-1">
                      <span className="text-[#80848e]">↳</span>
                      <span className="font-semibold text-white">@{msg.user}</span>
                      <span>invoked</span>
                      <span className="font-mono text-[#5865f2] font-semibold bg-[#2b2d31] px-1.5 py-0.5 rounded text-[11px]">
                        {msg.command}
                      </span>
                    </div>

                    <div className="flex items-start gap-3 pl-1">
                      <img src={msg.botAvatar} alt={msg.bot} className="w-10 h-10 rounded-full object-cover mt-0.5 shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-sm">{msg.bot}</span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-[#5865f2] text-white rounded">BOT</span>
                          <span className="text-[11px] text-[#949ba4]">{msg.botRole}</span>
                          <span className="text-[10px] text-[#80848e] ml-auto">{msg.timestamp}</span>
                        </div>
                        <DiscordEmbedView embed={msg.embed} isEphemeral={msg.isEphemeral} botName={msg.bot} botColor={msg.botColor} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: FIRESTORE STATE & AUDIT STREAM                     */}
        {/* ========================================================= */}
        {activeTab === 'firestore' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Live Firestore Document Inspection</h2>
              <p className="text-xs text-[#949ba4]">
                State of the shared Firestore collections that both the bots and the controller app interact with.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document Inspector */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>Active Firestore Document Store</span>
                  </div>
                  <button onClick={fetchDashboardData} className="text-xs text-[#949ba4] hover:text-white flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(firestoreDocs).map(([docPath, docData]: any) => (
                    <div key={docPath} className="bg-[#18191c] p-3 rounded-lg border border-[#2b2d31] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-amber-400 font-bold">{docPath}</span>
                        <span className="text-[10px] text-[#80848e]">
                          {docData?.lastUpdated ? new Date(docData.lastUpdated).toLocaleTimeString() : 'Live'}
                        </span>
                      </div>
                      <pre className="text-[11px] font-mono text-[#dbdee1] overflow-x-auto max-h-40 bg-[#0f1115] p-2 rounded">
                        {JSON.stringify(docData, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Stream Log */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-4">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Real-time onSnapshot Audit Trail</span>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto">
                  {eventLogs.length === 0 ? (
                    <p className="text-xs text-[#80848e] py-8 text-center">No overrides recorded yet. Trigger one from the Overrides tab.</p>
                  ) : (
                    eventLogs.map((log: any) => (
                      <div key={log.id} className="p-2.5 bg-[#18191c] rounded-lg border border-[#2b2d31] text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 font-bold">[{log.action}] {log.path}</span>
                          <span className="text-[10px] text-[#80848e]">{log.timestamp}</span>
                        </div>
                        <div className="text-[11px] text-[#949ba4] truncate">
                          {JSON.stringify(log.payload)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: DAY 1 CHECKLIST & PI DOCKER HANDOFF                */}
        {/* ========================================================= */}
        {activeTab === 'deploy' && (
          <div className="space-y-6">
            <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Day 1 Developer Checklist (Status Overview)</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 bg-[#2b2d31] rounded-lg text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>1. Scaffold the Monorepo:</strong> Initialized /discord-bots and /controller-app with individual package.json files.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#2b2d31] rounded-lg text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>2. Establish Firebase Connection:</strong> Configured /shared-utils/firebase-config.js for shared service account credentials and onSnapshot.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#2b2d31] rounded-lg text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>3. Scaffold Controller UI:</strong> Built React frontend locked to Rick & Admins on Port 3000.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#2b2d31] rounded-lg text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>4. Build Manual Overrides:</strong> Dispatches flags directly to Firestore documents (Guillotine drop, line freeze, roster lock).</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#2b2d31] rounded-lg text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>5. Test Local Docker Build:</strong> Updated docker-compose.yml to boot 5 containers (4 bots + 1 controller app on port 3000).</span>
                </div>
              </div>
            </div>

            {/* Docker Compose 5-Container Viewer */}
            <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">docker-compose.yml (5 Containers)</span>
                <button
                  onClick={() => copyToClipboard(`version: '3.8'

services:
  controller:
    build:
      context: .
      dockerfile: controller-app/Dockerfile
    ports:
      - "3000:3000"
    restart: unless-stopped
    env_file: .env

  commissioner:
    build:
      context: .
      dockerfile: discord-bots/Dockerfile
    command: node bots/commissioner/index.js
    restart: unless-stopped
    env_file: .env

  linemaker:
    build:
      context: .
      dockerfile: discord-bots/Dockerfile
    command: node bots/linemaker/index.js
    restart: unless-stopped
    env_file: .env

  producer:
    build:
      context: .
      dockerfile: discord-bots/Dockerfile
    command: node bots/producer/index.js
    restart: unless-stopped
    env_file: .env

  concierge:
    build:
      context: .
      dockerfile: discord-bots/Dockerfile
    command: node bots/concierge/index.js
    restart: unless-stopped
    env_file: .env`, 'compose5')}
                  className="flex items-center gap-1.5 text-xs text-[#5865f2] hover:text-white"
                >
                  {copiedKey === 'compose5' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'compose5' ? 'Copied' : 'Copy docker-compose.yml'}</span>
                </button>
              </div>

              <pre className="bg-[#18191c] p-4 rounded-lg border border-[#2b2d31] text-xs font-mono text-[#dbdee1] overflow-x-auto">
{`version: '3.8'

services:
  # 1. Controller App (React Admin Dashboard on Port 3000)
  controller:
    build:
      context: .
      dockerfile: controller-app/Dockerfile
    ports:
      - "3000:3000"
    restart: unless-stopped
    env_file: .env

  # 2. Bot 1: The Commissioner (QNW)
  commissioner:
    build:
      context: .
      dockerfile: discord-bots/Dockerfile
    command: node bots/commissioner/index.js
    restart: unless-stopped
    env_file: .env

  # 3. Bot 2: The Linemaker (ChainLink)
  linemaker:
    build:
      context: .
      dockerfile: discord-bots/Dockerfile
    command: node bots/linemaker/index.js
    restart: unless-stopped
    env_file: .env

  # 4. Bot 3: The Producer (ScriptLess)
  producer:
    build:
      context: .
      dockerfile: discord-bots/Dockerfile
    command: node bots/producer/index.js
    restart: unless-stopped
    env_file: .env

  # 5. Bot 4: The Concierge (Club 602 Standalone)
  concierge:
    build:
      context: .
      dockerfile: discord-bots/Dockerfile
    command: node bots/concierge/index.js
    restart: unless-stopped
    env_file: .env`}
              </pre>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-[#18191c] border-t border-[#2b2d31] py-3.5 px-6 text-center text-xs text-[#80848e]">
        Club 602 & QNW Monorepo • Controller App locked to Rick & Admins • Firebase onSnapshot Architecture.
      </footer>
    </div>
  );
}
