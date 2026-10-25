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
  Eye,
  Lock,
  Layers,
  Database,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Sliders,
  AlertTriangle,
  Play
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
  const [activeTab, setActiveTab] = useState<'simulator' | 'fleet' | 'firebase' | 'deploy'>('simulator');
  const [fleetData, setFleetData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<'megachannel-qnw' | 'club-602-lounge'>('megachannel-qnw');
  
  // Simulation message stream
  const [messages, setMessages] = useState<SimulatedMessage[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deployResults, setDeployResults] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [eventAlert, setEventAlert] = useState<string | null>(null);

  // Fetch initial fleet health
  const fetchFleetStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fleet-status');
      if (res.ok) {
        const data = await res.json();
        setFleetData(data);
      }
    } catch (err) {
      console.error('Failed to load fleet status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetStatus();
    // Pre-populate with initial demonstration commands
    executeSimulatedCommand('matchup', false);
    executeSimulatedCommand('board', true);
  }, []);

  const executeSimulatedCommand = async (cmdName: string, ephemeralExpected: boolean = false) => {
    setSimulating(true);
    try {
      const res = await fetch('/api/simulate-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmdName,
          options: {},
          user: { id: 'usr_77', username: 'Vanguard_GM' }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMeta = getBotMeta(data.bot);

        const newMsg: SimulatedMessage = {
          id: Math.random().toString(36).substring(7),
          user: 'Vanguard_GM',
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

        // Auto-switch channel view if needed
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

  const triggerFirebaseEvent = async (eventType: string) => {
    try {
      const res = await fetch('/api/trigger-firebase-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType })
      });
      const data = await res.json();
      setEventAlert(`🔥 Event Broadcasted: ${eventType} (Firestore onSnapshot triggered)`);
      setTimeout(() => setEventAlert(null), 4000);
      fetchFleetStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeployCommands = async () => {
    setIsDeploying(true);
    try {
      const res = await fetch('/api/deploy-commands', { method: 'POST' });
      const data = await res.json();
      setDeployResults(data.results || data);
    } catch (err: any) {
      setDeployResults({ error: err.message });
    } finally {
      setIsDeploying(false);
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

  // Filter messages for active channel
  const currentChannelMessages = messages.filter(m => m.channel === activeChannel);

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#dbdee1] flex flex-col font-sans">
      {/* Top Ecosystem Bar */}
      <header className="bg-[#1e1f22] border-b border-[#2b2d31] px-4 lg:px-6 py-3.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#5865f2] to-[#ec4899] flex items-center justify-center shadow-lg shadow-[#5865f2]/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Club 602 & QNW Bot Ecosystem</h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#2b2d31] text-[#949ba4] border border-[#35373c]">
                  Docker Monorepo • Node 20
                </span>
              </div>
              <p className="text-xs text-[#949ba4]">4 Persona Suite • Shared Firestore onSnapshot • Megachannel Rules</p>
            </div>
          </div>

          {/* Quick Status Badges */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2b2d31] border border-[#35373c]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[#949ba4]">Pi Deployment:</span>
              <span className="text-white font-mono font-medium">Ready</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2b2d31] border border-[#35373c]">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[#949ba4]">Firestore:</span>
              <span className="text-amber-300 font-mono font-medium">
                {fleetData?.environment?.firestoreMode === 'LIVE_FIRESTORE' ? 'Live' : 'Zero-Cost Listener'}
              </span>
            </div>
            <button
              onClick={fetchFleetStatus}
              disabled={loading}
              className="p-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded border border-[#35373c] transition-colors"
              title="Refresh Fleet Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Tab Navigation */}
      <div className="bg-[#18191c] border-b border-[#2b2d31] px-4 lg:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1 py-2">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'simulator'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Megachannel Simulator</span>
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
              <span>4-Bot Fleet Architecture</span>
            </button>

            <button
              onClick={() => setActiveTab('firebase')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'firebase'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>onSnapshot & Fantrax Stream</span>
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
              <span>Raspberry Pi & Docker Handoff</span>
            </button>
          </nav>

          {/* Quick Notice */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#949ba4]">
            <Lock className="w-3 h-3 text-[#5865f2]" />
            <span>Strict Ephemeral reply routing enforced for private feeds</span>
          </div>
        </div>
      </div>

      {/* Global Event Alert Banner */}
      {eventAlert && (
        <div className="bg-gradient-to-r from-amber-900/60 via-amber-800/40 to-amber-900/60 border-b border-amber-600/50 py-2 px-4 text-center text-xs text-amber-200 font-medium animate-fadeIn">
          {eventAlert}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {/* ========================================================= */}
        {/* TAB 1: MEGACHANNEL DISCORD SIMULATOR                      */}
        {/* ========================================================= */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Command Launcher & Rules (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Channel Selector */}
              <div className="bg-[#1e1f22] p-3.5 rounded-xl border border-[#2b2d31] shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] mb-2 px-1">
                  Discord Server Routing
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

              {/* Quick Slash Command Palette */}
              <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#2b2d31] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">
                    Interactive Slash Commands
                  </div>
                  <span className="text-[10px] text-[#949ba4]">Click to fire</span>
                </div>

                {/* Commissioner Group */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>The Commissioner (QNW)</span>
                    <span className="text-[10px] text-[#949ba4] ml-auto font-normal">All Public</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => executeSimulatedCommand('matchup', false)}
                      disabled={simulating}
                      className="flex items-center justify-between px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-amber-500/50"
                    >
                      <span>/matchup</span>
                      <span className="text-[10px] text-amber-400 font-sans">Head-to-head roasts</span>
                    </button>
                    <button
                      onClick={() => executeSimulatedCommand('shame', false)}
                      disabled={simulating}
                      className="flex items-center justify-between px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-amber-500/50"
                    >
                      <span>/shame</span>
                      <span className="text-[10px] text-red-400 font-sans">Fantrax roster audit</span>
                    </button>
                    <button
                      onClick={() => executeSimulatedCommand('guillotine-check', false)}
                      disabled={simulating}
                      className="flex items-center justify-between px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-amber-500/50"
                    >
                      <span>/guillotine-check</span>
                      <span className="text-[10px] text-amber-400 font-sans">Chop block danger</span>
                    </button>
                  </div>
                </div>

                {/* Linemaker Group */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-2">
                    <Flame className="w-3.5 h-3.5" />
                    <span>The Linemaker (ChainLink)</span>
                    <span className="text-[10px] text-emerald-400 ml-auto font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Strict Ephemeral
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => executeSimulatedCommand('board', true)}
                      disabled={simulating}
                      className="flex items-center justify-between px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-emerald-500/50"
                    >
                      <span className="flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-emerald-400" />
                        <span>/board</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-sans">Active line windows</span>
                    </button>
                    <button
                      onClick={() => executeSimulatedCommand('my-action', true)}
                      disabled={simulating}
                      className="flex items-center justify-between px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-emerald-500/50"
                    >
                      <span className="flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-emerald-400" />
                        <span>/my-action</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-sans">Pending slips</span>
                    </button>
                    <button
                      onClick={() => executeSimulatedCommand('pro-claim', true)}
                      disabled={simulating}
                      className="flex items-center justify-between px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-emerald-500/50"
                    >
                      <span className="flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-emerald-400" />
                        <span>/pro-claim</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-sans">Daily stipend</span>
                    </button>
                  </div>
                </div>

                {/* Producer Group */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-pink-400 mb-2">
                    <Tv className="w-3.5 h-3.5" />
                    <span>The Producer (ScriptLess)</span>
                    <span className="text-[10px] text-[#949ba4] ml-auto font-normal">Reality Engine</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => executeSimulatedCommand('cast-tea', false)}
                      disabled={simulating}
                      className="px-2.5 py-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-pink-500/50"
                    >
                      /cast-tea
                    </button>
                    <button
                      onClick={() => executeSimulatedCommand('green-room', true)}
                      disabled={simulating}
                      className="px-2.5 py-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-pink-500/50 flex items-center justify-between"
                    >
                      <span>/green-room</span>
                      <Lock className="w-2.5 h-2.5 text-pink-400" />
                    </button>
                    <button
                      onClick={() => executeSimulatedCommand('spill', false)}
                      disabled={simulating}
                      className="px-2.5 py-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-pink-500/50"
                    >
                      /spill
                    </button>
                    <button
                      onClick={() => executeSimulatedCommand('eliminated', false)}
                      disabled={simulating}
                      className="px-2.5 py-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-pink-500/50"
                    >
                      /eliminated
                    </button>
                  </div>
                </div>

                {/* Concierge Group */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 mb-2">
                    <Wine className="w-3.5 h-3.5" />
                    <span>The Concierge (Club 602)</span>
                    <span className="text-[10px] text-indigo-400 ml-auto font-mono">Standalone</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => executeSimulatedCommand('events', false)}
                      disabled={simulating}
                      className="flex items-center justify-between px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-indigo-500/50"
                    >
                      <span>/events</span>
                      <span className="text-[10px] text-indigo-300 font-sans">Calendar & Screenings</span>
                    </button>
                    <button
                      onClick={() => executeSimulatedCommand('rsvp', true)}
                      disabled={simulating}
                      className="flex items-center justify-between px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-indigo-500/50"
                    >
                      <span className="flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-indigo-400" />
                        <span>/rsvp</span>
                      </span>
                      <span className="text-[10px] text-indigo-300 font-sans">VIP Guestlist</span>
                    </button>
                    <button
                      onClick={() => executeSimulatedCommand('schedule', false)}
                      disabled={simulating}
                      className="flex items-center justify-between px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-xs font-mono text-left rounded border border-[#35373c] transition-all hover:border-indigo-500/50"
                    >
                      <span>/schedule</span>
                      <span className="text-[10px] text-indigo-300 font-sans">Weekly Lounge Hours</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* The Megachannel Rule Explainer Card */}
              <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#2b2d31] text-xs text-[#949ba4] space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>The Megachannel Rule Verified</span>
                </div>
                <p>
                  To eliminate channel clutter in the merged Hub Guild, commands like <code className="text-emerald-400">/board</code>, <code className="text-emerald-400">/my-action</code>, and <code className="text-pink-400">/green-room</code> reply strictly with <span className="text-white font-mono font-bold">ephemeral: true</span>.
                </p>
                <p className="text-[11px] text-[#80848e]">
                  Public roasts (<code className="text-amber-400">/shame</code>, <code className="text-amber-400">/matchup</code>) stay visible to fuel banter.
                </p>
              </div>
            </div>

            {/* Right Column: Authentic Discord Chat Viewport (8 cols) */}
            <div className="lg:col-span-8 flex flex-col bg-[#313338] rounded-xl border border-[#2b2d31] overflow-hidden shadow-2xl min-h-[620px]">
              {/* Discord Channel Header */}
              <div className="bg-[#313338] px-4 py-3 border-b border-[#2b2d31] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[#80848e]">#</span>
                  <span className="font-bold text-white text-sm">{activeChannel}</span>
                  <span className="text-xs text-[#949ba4] border-l border-[#3f4147] pl-3 ml-2 hidden sm:inline">
                    {activeChannel === 'megachannel-qnw'
                      ? 'The unified arena for QNW Commissioner, ChainLink Linemaker, and ScriptLess Producer'
                      : 'Club 602 Private Lounge, social bookings, and RSVP concierge'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMessages([])}
                    className="text-[11px] text-[#949ba4] hover:text-white px-2 py-1 rounded bg-[#2b2d31] border border-[#383a40]"
                  >
                    Clear Feed
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 space-y-5 overflow-y-auto max-h-[580px]">
                {currentChannelMessages.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <Terminal className="w-10 h-10 text-[#4e5058] mx-auto" />
                    <p className="text-sm font-medium text-[#949ba4]">No interactions logged in #{activeChannel} yet.</p>
                    <p className="text-xs text-[#80848e]">
                      Click any slash command on the left panel to test execution and privacy visibility.
                    </p>
                  </div>
                ) : (
                  currentChannelMessages.map((msg) => (
                    <div key={msg.id} className="space-y-1.5 animate-fadeIn">
                      {/* User Invocation Line */}
                      <div className="flex items-center gap-1.5 text-xs text-[#949ba4] pl-1">
                        <span className="text-[#80848e]">↳</span>
                        <span className="font-semibold text-white">@{msg.user}</span>
                        <span>used</span>
                        <span className="font-mono text-[#5865f2] font-semibold bg-[#2b2d31] px-1.5 py-0.5 rounded text-[11px]">
                          {msg.command}
                        </span>
                      </div>

                      {/* Bot Response Message */}
                      <div className="flex items-start gap-3 pl-1">
                        <img
                          src={msg.botAvatar}
                          alt={msg.bot}
                          className="w-10 h-10 rounded-full object-cover mt-0.5 shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white text-sm">{msg.bot}</span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-[#5865f2] text-white rounded">
                              BOT
                            </span>
                            <span className="text-[11px] text-[#949ba4]">{msg.botRole}</span>
                            <span className="text-[10px] text-[#80848e] ml-auto">{msg.timestamp}</span>
                          </div>

                          {/* Embed Container with Ephemeral Styling */}
                          <DiscordEmbedView
                            embed={msg.embed}
                            isEphemeral={msg.isEphemeral}
                            botName={msg.bot}
                            botColor={msg.botColor}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Discord Input Bar */}
              <div className="p-3 bg-[#383a40]/60 border-t border-[#2b2d31] flex items-center gap-2">
                <div className="flex-1 bg-[#383a40] rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-[#949ba4]">
                  <span className="font-mono text-[#80848e]">/</span>
                  <input
                    type="text"
                    placeholder={`Message #${activeChannel} or type /matchup, /board, /rsvp...`}
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && commandInput.trim()) {
                        const clean = commandInput.replace(/^\//, '').trim();
                        executeSimulatedCommand(clean);
                        setCommandInput('');
                      }
                    }}
                    className="bg-transparent flex-1 text-white placeholder-[#80848e] focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    if (commandInput.trim()) {
                      const clean = commandInput.replace(/^\//, '').trim();
                      executeSimulatedCommand(clean);
                      setCommandInput('');
                    }
                  }}
                  disabled={simulating || !commandInput.trim()}
                  className="p-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg disabled:opacity-40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 4-BOT FLEET ARCHITECTURE                           */}
        {/* ========================================================= */}
        {activeTab === 'fleet' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">4 Distinct Bot Personas (Unified Monorepo)</h2>
                <p className="text-xs text-[#949ba4]">
                  Each bot operates with isolated event dispatchers, targeted cron loops, and strict privacy routing.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-[#1e1f22] text-[#dbdee1] rounded border border-[#2b2d31]">
                  Target Guilds: <strong className="text-amber-400">HUB_GUILD</strong> & <strong className="text-indigo-400">CLUB602_GUILD</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bot 1: The Commissioner */}
              <div className="bg-[#1e1f22] rounded-xl border border-amber-500/30 overflow-hidden shadow-lg relative">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-amber-600"></div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">The Commissioner</h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                            QNW Fantasy
                          </span>
                        </div>
                        <p className="text-xs text-[#949ba4]">Fantasy sports enforcer, roster auditor, and ruthless trash-talker.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#2b2d31] p-2.5 rounded-lg border border-[#35373c] space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Data Integrations</div>
                      <div className="flex items-center justify-between text-[#dbdee1]">
                        <span>• Gridiron Exotics (Firestore)</span>
                        <span className="font-mono text-amber-400 text-[11px]">onSnapshot (instant standings)</span>
                      </div>
                      <div className="flex items-center justify-between text-[#dbdee1]">
                        <span>• Fantrax JSON API</span>
                        <span className="font-mono text-amber-400 text-[11px]">node-cron (Sunday 09:00 audit)</span>
                      </div>
                    </div>

                    <div className="bg-[#2b2d31] p-2.5 rounded-lg border border-[#35373c] space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Registered Commands (All Public)</div>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                        <span className="text-amber-300">/matchup <span className="text-[#949ba4] font-sans font-normal">— H2H records & commissioner roast</span></span>
                        <span className="text-amber-300">/shame <span className="text-[#949ba4] font-sans font-normal">— Public audit for injured/bye starters</span></span>
                        <span className="text-amber-300">/guillotine-check <span className="text-[#949ba4] font-sans font-normal">— Chop block cut line score</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bot 2: The Linemaker */}
              <div className="bg-[#1e1f22] rounded-xl border border-emerald-500/30 overflow-hidden shadow-lg relative">
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">The Linemaker</h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                            ChainLink
                          </span>
                        </div>
                        <p className="text-xs text-[#949ba4]">Real-time betting board alerts, stuck pick monitor, and private slips.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#2b2d31] p-2.5 rounded-lg border border-[#35373c] space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Data Integrations</div>
                      <div className="flex items-center justify-between text-[#dbdee1]">
                        <span>• action_board (Firestore)</span>
                        <span className="font-mono text-emerald-400 text-[11px]">onSnapshot only (line shifts)</span>
                      </div>
                      <div className="flex items-center justify-between text-[#dbdee1]">
                        <span>• stuck_picks (Firestore)</span>
                        <span className="font-mono text-emerald-400 text-[11px]">onSnapshot only (liquidity alerts)</span>
                      </div>
                    </div>

                    <div className="bg-[#2b2d31] p-2.5 rounded-lg border border-[#35373c] space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] flex items-center justify-between">
                        <span>Registered Commands</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Strictly Ephemeral: true</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                        <span className="text-emerald-300">/board <span className="text-[#949ba4] font-sans font-normal">— Open ChainLink windows & lines</span></span>
                        <span className="text-emerald-300">/my-action <span className="text-[#949ba4] font-sans font-normal">— Personal pending picks & bankroll</span></span>
                        <span className="text-emerald-300">/pro-claim <span className="text-[#949ba4] font-sans font-normal">— Daily login bonus & streak</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bot 3: The Producer */}
              <div className="bg-[#1e1f22] rounded-xl border border-pink-500/30 overflow-hidden shadow-lg relative">
                <div className="h-1.5 bg-gradient-to-r from-pink-500 to-pink-600"></div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                        <Tv className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">The Producer</h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold">
                            ScriptLess
                          </span>
                        </div>
                        <p className="text-xs text-[#949ba4]">Reality TV roster management, episode lockouts, and drama metrics.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#2b2d31] p-2.5 rounded-lg border border-[#35373c] space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Data Integrations</div>
                      <div className="flex items-center justify-between text-[#dbdee1]">
                        <span>• current_episode (Firestore)</span>
                        <span className="font-mono text-pink-400 text-[11px]">onSnapshot (drama points)</span>
                      </div>
                      <div className="flex items-center justify-between text-[#dbdee1]">
                        <span>• Roster-Lock Deadlines</span>
                        <span className="font-mono text-pink-400 text-[11px]">node-cron (1h before airtime)</span>
                      </div>
                    </div>

                    <div className="bg-[#2b2d31] p-2.5 rounded-lg border border-[#35373c] space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Registered Commands</div>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                        <span className="text-pink-300">/cast-tea <span className="text-[#949ba4] font-sans font-normal">(Public) — Drama scorers per show</span></span>
                        <span className="text-pink-300">/green-room <span className="text-emerald-400 font-sans font-normal">(Ephemeral) — User locked-in cast</span></span>
                        <span className="text-pink-300">/spill <span className="text-[#949ba4] font-sans font-normal">(Public) — Cutting-room drama rumors</span></span>
                        <span className="text-pink-300">/eliminated <span className="text-[#949ba4] font-sans font-normal">(Public) — Stars sent home this week</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bot 4: The Concierge */}
              <div className="bg-[#1e1f22] rounded-xl border border-indigo-500/30 overflow-hidden shadow-lg relative">
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Wine className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">The Concierge</h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                            Club 602 Standalone
                          </span>
                        </div>
                        <p className="text-xs text-[#949ba4]">Social scheduling, private lounge screening sync, and RSVP concierge.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#2b2d31] p-2.5 rounded-lg border border-[#35373c] space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Data Integrations</div>
                      <div className="flex items-center justify-between text-[#dbdee1]">
                        <span>• club602_calendar (Firestore)</span>
                        <span className="font-mono text-indigo-400 text-[11px]">onSnapshot (live event sync)</span>
                      </div>
                      <div className="flex items-center justify-between text-[#dbdee1]">
                        <span>• Member RSVP Tracking</span>
                        <span className="font-mono text-indigo-400 text-[11px]">onSnapshot (guestlist capacity)</span>
                      </div>
                    </div>

                    <div className="bg-[#2b2d31] p-2.5 rounded-lg border border-[#35373c] space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Registered Commands</div>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                        <span className="text-indigo-300">/events <span className="text-[#949ba4] font-sans font-normal">(Public) — Upcoming lounge screenings</span></span>
                        <span className="text-indigo-300">/rsvp <span className="text-emerald-400 font-sans font-normal">(Ephemeral) — Private guestlist confirmation</span></span>
                        <span className="text-indigo-300">/schedule <span className="text-[#949ba4] font-sans font-normal">(Public) — Weekly operating hours & perks</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FIREBASE & FANTRAX STREAM                          */}
        {/* ========================================================= */}
        {activeTab === 'firebase' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Event-Driven Architecture (Cost Minimization)</h2>
              <p className="text-xs text-[#949ba4]">
                To avoid high cloud egress and polling fees, bots utilize Firestore <code className="text-amber-400">onSnapshot</code> and strict <code className="text-amber-400">node-cron</code> intervals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Firestore Real-Time Trigger Playground */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Simulate Firestore onSnapshot Mutation</span>
                </div>
                <p className="text-xs text-[#949ba4]">
                  Fire simulated updates into the shared collections to verify that the bots catch changes instantly without polling:
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => triggerFirebaseEvent('action_board_shift')}
                    className="w-full flex items-center justify-between p-3 bg-[#2b2d31] hover:bg-[#35373c] rounded-lg border border-[#35373c] text-left text-xs transition-all"
                  >
                    <div>
                      <div className="font-bold text-white">⚡ Trigger ChainLink Line Shift</div>
                      <div className="text-[11px] text-[#949ba4]">Shifts SF -2.5 ➡️ SF -3.5 in action_board</div>
                    </div>
                    <Play className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    onClick={() => triggerFirebaseEvent('chop_block_update')}
                    className="w-full flex items-center justify-between p-3 bg-[#2b2d31] hover:bg-[#35373c] rounded-lg border border-[#35373c] text-left text-xs transition-all"
                  >
                    <div>
                      <div className="font-bold text-white">🪓 Update Chop Block Target</div>
                      <div className="text-[11px] text-[#949ba4]">Brad's Benchwarmers drops to 68.4 pts</div>
                    </div>
                    <Play className="w-4 h-4 text-amber-400" />
                  </button>

                  <button
                    onClick={() => triggerFirebaseEvent('roster_lock_triggered')}
                    className="w-full flex items-center justify-between p-3 bg-[#2b2d31] hover:bg-[#35373c] rounded-lg border border-[#35373c] text-left text-xs transition-all"
                  >
                    <div>
                      <div className="font-bold text-white">🎬 Broadcast 1-Hour Roster Lock Alert</div>
                      <div className="text-[11px] text-[#949ba4]">Simulates node-cron ScriptLess episode deadline</div>
                    </div>
                    <Play className="w-4 h-4 text-pink-400" />
                  </button>

                  <button
                    onClick={() => triggerFirebaseEvent('calendar_event_added')}
                    className="w-full flex items-center justify-between p-3 bg-[#2b2d31] hover:bg-[#35373c] rounded-lg border border-[#35373c] text-left text-xs transition-all"
                  >
                    <div>
                      <div className="font-bold text-white">🍸 Sync Club 602 Private Screening</div>
                      <div className="text-[11px] text-[#949ba4]">Adds VIP Tasting & Draft Session to calendar</div>
                    </div>
                    <Play className="w-4 h-4 text-indigo-400" />
                  </button>
                </div>
              </div>

              {/* Fantrax Endpoint Inspector */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Fantrax API Client (shared-utils/fantrax-api.js)</span>
                </div>
                <p className="text-xs text-[#949ba4]">
                  Native fetch routines query public JSON endpoints without puppeteer overhead. Audits illegal rosters:
                </p>

                <div className="bg-[#18191c] p-3 rounded-lg border border-[#2b2d31] font-mono text-[11px] text-[#dbdee1] space-y-2">
                  <div className="text-[#949ba4]">// Configured Fantrax League:</div>
                  <div className="text-amber-300">FANTRAX_LEAGUE_IDS = "{fleetData?.environment?.fantraxLeagueIds}"</div>
                  <div className="text-[#949ba4]">// Endpoint pattern:</div>
                  <div className="text-emerald-400">GET /fxea/general/getLeagueMatchups?leagueId=...</div>
                  <div className="text-emerald-400">GET /fxea/general/getRosters?leagueId=...</div>
                  <div className="text-[#949ba4]">// Scheduled Audit:</div>
                  <div className="text-white">cron.schedule('0 9 * * 0') // Sunday 9am EST</div>
                </div>

                <div className="p-3 bg-[#2b2d31]/50 rounded-lg border border-[#35373c] text-xs space-y-1">
                  <div className="font-semibold text-white">Automated Wall of Shame Logic:</div>
                  <p className="text-[#949ba4] text-[11px]">
                    Scans starting roster slots (QB, RB, WR, TE). If injury status contains OUT, IR, or PUP, or if player is on BYE week, Commissioner prepares a roast embed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: RASPBERRY PI & DOCKER HANDOFF                      */}
        {/* ========================================================= */}
        {activeTab === 'deploy' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Developer Handoff Spec: Raspberry Pi Deployment</h2>
                <p className="text-xs text-[#949ba4]">
                  Deliver this exact package to your engineer to boot all 4 bot containers via Docker Compose on the Pi.
                </p>
              </div>

              {/* Slash Command Registration Trigger */}
              <button
                onClick={handleDeployCommands}
                disabled={isDeploying}
                className="flex items-center gap-2 px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{isDeploying ? 'Registering with Discord...' : 'Run deploy-commands.js REST'}</span>
              </button>
            </div>

            {/* Deploy Output Banner */}
            {deployResults && (
              <div className="p-4 bg-[#1e1f22] rounded-xl border border-[#35373c] text-xs font-mono space-y-2">
                <div className="text-amber-400 font-bold">deploy-commands.js Results:</div>
                <pre className="text-[#dbdee1] overflow-x-auto text-[11px]">
                  {JSON.stringify(deployResults, null, 2)}
                </pre>
              </div>
            )}

            {/* Step-by-Step Pi Instructions */}
            <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Terminal Quickstart on Raspberry Pi</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[#949ba4] mb-1">1. Copy monorepo to Raspberry Pi and prepare environment:</div>
                  <div className="relative">
                    <pre className="bg-[#18191c] p-3 rounded-lg border border-[#2b2d31] text-emerald-400 overflow-x-auto">
{`mkdir -p ~/discord-bots-monorepo
cd ~/discord-bots-monorepo
cp .env.example .env
nano .env  # Enter Discord tokens, Guild IDs, and service account path`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard('mkdir -p ~/discord-bots-monorepo && cd ~/discord-bots-monorepo && cp .env.example .env', 'cmd1')}
                      className="absolute top-2 right-2 p-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded"
                      title="Copy command"
                    >
                      {copiedKey === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[#949ba4] mb-1">2. Register Discord Slash Commands (REST API):</div>
                  <div className="relative">
                    <pre className="bg-[#18191c] p-3 rounded-lg border border-[#2b2d31] text-emerald-400 overflow-x-auto">
{`npm install
node deploy-commands.js`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard('npm install && node deploy-commands.js', 'cmd2')}
                      className="absolute top-2 right-2 p-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded"
                    >
                      {copiedKey === 'cmd2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[#949ba4] mb-1">3. Launch all 4 bot containers via Docker Compose:</div>
                  <div className="relative">
                    <pre className="bg-[#18191c] p-3 rounded-lg border border-[#2b2d31] text-emerald-400 overflow-x-auto">
{`docker compose up -d --build
docker compose ps
docker compose logs -f commissioner`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard('docker compose up -d --build && docker compose ps', 'cmd3')}
                      className="absolute top-2 right-2 p-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded"
                    >
                      {copiedKey === 'cmd3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Docker Compose YAML Viewer */}
            <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white font-mono">docker-compose.yml</span>
                <button
                  onClick={() => copyToClipboard(`version: '3.8'

services:
  commissioner:
    build: .
    command: node bots/commissioner/index.js
    restart: unless-stopped
    env_file: .env

  linemaker:
    build: .
    command: node bots/linemaker/index.js
    restart: unless-stopped
    env_file: .env

  producer:
    build: .
    command: node bots/producer/index.js
    restart: unless-stopped
    env_file: .env

  concierge:
    build: .
    command: node bots/concierge/index.js
    restart: unless-stopped
    env_file: .env`, 'compose')}
                  className="flex items-center gap-1.5 text-xs text-[#5865f2] hover:text-white"
                >
                  {copiedKey === 'compose' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'compose' ? 'Copied' : 'Copy docker-compose.yml'}</span>
                </button>
              </div>
              <pre className="bg-[#18191c] p-4 rounded-lg border border-[#2b2d31] text-xs font-mono text-[#dbdee1] overflow-x-auto">
{`version: '3.8'

services:
  commissioner:
    build: .
    command: node bots/commissioner/index.js
    restart: unless-stopped
    env_file: .env

  linemaker:
    build: .
    command: node bots/linemaker/index.js
    restart: unless-stopped
    env_file: .env

  producer:
    build: .
    command: node bots/producer/index.js
    restart: unless-stopped
    env_file: .env

  concierge:
    build: .
    command: node bots/concierge/index.js
    restart: unless-stopped
    env_file: .env`}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#18191c] border-t border-[#2b2d31] py-4 px-6 text-center text-xs text-[#80848e]">
        Club 602 & QNW Discord Bot Ecosystem • Built strictly according to the Raspberry Pi Docker Monorepo & Slash Command Routing Specification.
      </footer>
    </div>
  );
}
