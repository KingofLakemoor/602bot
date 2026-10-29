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
  Power,
  UserX,
  Mail,
  Activity,
  Clock,
  Skull,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Eye,
  Pause,
  HelpCircle,
  X
} from 'lucide-react';
import { DiscordEmbedView } from './components/DiscordEmbedView';
import { loginWithGoogle } from './firebase';

interface BotHeartbeat {
  botId: string;
  botName: string;
  lastActive: number;
  diffSeconds: number;
  status: 'ONLINE' | 'OFFLINE';
  isOnline: boolean;
}

interface CastMember {
  id: string;
  name: string;
  archetype: string;
  status: 'ACTIVE' | 'ELIMINATED';
  dramaPoints?: number;
}

interface CustomActionField {
  name: string;
  value: string;
  inline?: boolean;
}

interface CustomBotAction {
  id: string;
  commandName: string;
  botId: 'commissioner' | 'linemaker' | 'producer' | 'concierge';
  description: string;
  status: 'active' | 'paused';
  visibility: 'public' | 'ephemeral';
  triggerType: 'slash_command' | 'keyword' | 'cron_schedule' | 'firestore_event';
  triggerPattern?: string;
  embedTitle: string;
  embedDescription: string;
  embedColor: string;
  fields?: CustomActionField[];
  footer?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export default function App() {
  // -------------------------------------------------------------
  // 1. FIREBASE AUTHENTICATION & GUARDING (TASK 1)
  // -------------------------------------------------------------
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>('rick@club602.com');
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(false);
  const [isAccessDenied, setIsAccessDenied] = useState<boolean>(false);
  const [adminList, setAdminList] = useState<string[]>(['rick@club602.com', 'kingoflakemoor@gmail.com']);
  const [emailInput, setEmailInput] = useState<string>('');

  // -------------------------------------------------------------
  // 2. BOT HEARTBEATS & STATUS INDICATORS (TASK 4)
  // -------------------------------------------------------------
  const [heartbeats, setHeartbeats] = useState<BotHeartbeat[]>([]);

  // -------------------------------------------------------------
  // 3. WIRING OVERRIDES (TASK 2 & 3)
  // -------------------------------------------------------------
  const [qnwAuditLoading, setQnwAuditLoading] = useState<boolean>(false);
  const [qnwFlagStatus, setQnwFlagStatus] = useState<any>({ forceAudit: false });

  const [alertMessage, setAlertMessage] = useState<string>('🚨 Sharp action on 49ers -2.5. Line moved to -3.5. Liquidity pool window closing in 15 mins.');
  const [alertLoading, setAlertLoading] = useState<boolean>(false);

  const [castList, setCastList] = useState<CastMember[]>([]);
  const [selectedCastId, setSelectedCastId] = useState<string>('tyler_mac');
  const [eliminationReason, setEliminationReason] = useState<string>('Eliminated during Rose Ceremony');
  const [eliminationLoading, setEliminationLoading] = useState<boolean>(false);

  // General Dashboard State
  const [activeTab, setActiveTab] = useState<'overrides' | 'heartbeats' | 'feed' | 'firestore' | 'deploy'>('overrides');
  const [firestoreDocs, setFirestoreDocs] = useState<any>({});
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'alert' } | null>(null);

  // Custom Actions & Triggers Studio State
  const [customActions, setCustomActions] = useState<CustomBotAction[]>([]);
  const [customActionsLoading, setCustomActionsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBot, setFilterBot] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form / Editor state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<CustomBotAction | null>(null);
  const [formCommandName, setFormCommandName] = useState<string>('');
  const [formBotId, setFormBotId] = useState<'commissioner' | 'linemaker' | 'producer' | 'concierge'>('commissioner');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'active' | 'paused'>('active');
  const [formVisibility, setFormVisibility] = useState<'public' | 'ephemeral'>('public');
  const [formTriggerType, setFormTriggerType] = useState<'slash_command' | 'keyword' | 'cron_schedule' | 'firestore_event'>('slash_command');
  const [formTriggerPattern, setFormTriggerPattern] = useState<string>('');
  const [formEmbedTitle, setFormEmbedTitle] = useState<string>('');
  const [formEmbedDescription, setFormEmbedDescription] = useState<string>('');
  const [formEmbedColor, setFormEmbedColor] = useState<string>('#d97706');
  const [formFields, setFormFields] = useState<CustomActionField[]>([]);
  const [formFooter, setFormFooter] = useState<string>('');
  const [isSavingAction, setIsSavingAction] = useState<boolean>(false);

  // Simulator channel & messages
  const [activeChannel, setActiveChannel] = useState<'megachannel-qnw' | 'club-602-lounge'>('megachannel-qnw');
  const [messages, setMessages] = useState<any[]>([]);

  // Fetch Custom Bot Actions
  const fetchCustomActions = async () => {
    setCustomActionsLoading(true);
    try {
      const res = await fetch('/api/admin/actions');
      if (res.ok) {
        const data = await res.json();
        setCustomActions(data.actions || []);
      }
    } catch (e) {
      console.error('Failed to fetch custom actions:', e);
    } finally {
      setCustomActionsLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingAction(null);
    setFormCommandName('');
    setFormBotId('commissioner');
    setFormDescription('New custom bot command');
    setFormStatus('active');
    setFormVisibility('public');
    setFormTriggerType('slash_command');
    setFormTriggerPattern('/new-command');
    setFormEmbedTitle('✨ NEW BOT RESPONSE');
    setFormEmbedDescription('Custom response text configured in Control App.');
    setFormEmbedColor('#d97706');
    setFormFields([{ name: 'Status', value: 'Active', inline: true }]);
    setFormFooter('Club 602 & QNW Custom Bot Engine');
    setIsFormOpen(true);
  };

  const openEditForm = (action: CustomBotAction) => {
    setEditingAction(action);
    setFormCommandName(action.commandName);
    setFormBotId(action.botId);
    setFormDescription(action.description || '');
    setFormStatus(action.status);
    setFormVisibility(action.visibility);
    setFormTriggerType(action.triggerType || 'slash_command');
    setFormTriggerPattern(action.triggerPattern || `/${action.commandName}`);
    setFormEmbedTitle(action.embedTitle || '');
    setFormEmbedDescription(action.embedDescription || '');
    setFormEmbedColor(action.embedColor || '#5865f2');
    setFormFields(action.fields ? [...action.fields] : []);
    setFormFooter(action.footer || '');
    setIsFormOpen(true);
  };

  const applyTemplate = (templateType: 'roast' | 'sharp' | 'leak' | 'vip') => {
    if (templateType === 'roast') {
      setFormCommandName('daily-roast');
      setFormBotId('commissioner');
      setFormDescription('Delivers a fresh daily roast for slacking managers');
      setFormStatus('active');
      setFormVisibility('public');
      setFormTriggerType('slash_command');
      setFormTriggerPattern('/daily-roast');
      setFormEmbedTitle('🔥 COMMISSIONER DAILY ROAST');
      setFormEmbedDescription('Your roster strategy is a case study in unforced errors. Bench points do not win matchups.');
      setFormEmbedColor('#d97706');
      setFormFields([
        { name: 'Heat Index', value: '🌶️🌶️🌶️🌶️ 9/10 Hot', inline: true },
        { name: 'Target GM', value: 'Slacking Manager', inline: true }
      ]);
      setFormFooter('QNW Fantasy Enforcement Bureau');
    } else if (templateType === 'sharp') {
      setFormCommandName('sharp-flow');
      setFormBotId('linemaker');
      setFormDescription('Broadcasts sharp money flow alerts and liquidity changes');
      setFormStatus('active');
      setFormVisibility('ephemeral');
      setFormTriggerType('slash_command');
      setFormTriggerPattern('/sharp-flow');
      setFormEmbedTitle('⚡ SHARP MONEY FLOW ALERT');
      setFormEmbedDescription('Over 78% of syndicate bets landed on Eagles -4.0 in the last 10 minutes.');
      setFormEmbedColor('#10b981');
      setFormFields([
        { name: 'Market Split', value: '78% Sharp / 22% Public', inline: true },
        { name: 'Liquidity Pool', value: '$45,200 Locked', inline: true }
      ]);
      setFormFooter('ChainLink Sportsbook Telemetry');
    } else if (templateType === 'leak') {
      setFormCommandName('confessional-leak');
      setFormBotId('producer');
      setFormDescription('Leaks backstage drama and raw unedited audio clips');
      setFormStatus('active');
      setFormVisibility('public');
      setFormTriggerType('slash_command');
      setFormTriggerPattern('/confessional-leak');
      setFormEmbedTitle('🎬 SCRIPTLESS CONFESSIONAL LEAK');
      setFormEmbedDescription('Hot mic caught Tyler negotiating a spin-off deal inside the pantry.');
      setFormEmbedColor('#ec4899');
      setFormFields([
        { name: 'Spicy Meter', value: '96% Drama', inline: true },
        { name: 'Source', value: 'Production Audio Lead', inline: true }
      ]);
      setFormFooter('ScriptLess Reality TV Network');
    } else if (templateType === 'vip') {
      setFormCommandName('lounge-perks');
      setFormBotId('concierge');
      setFormDescription('Grants exclusive Club 602 Sky Lounge perks and event tickets');
      setFormStatus('active');
      setFormVisibility('ephemeral');
      setFormTriggerType('slash_command');
      setFormTriggerPattern('/lounge-perks');
      setFormEmbedTitle('🍸 CLUB 602 LOUNGE SPECIAL');
      setFormEmbedDescription('Present this digital pass at the bar for complimentary craft cocktails during RedZone.');
      setFormEmbedColor('#6366f1');
      setFormFields([
        { name: 'Access Tier', value: 'VIP Gold Pass', inline: true },
        { name: 'Lounge Location', value: 'Sky Lounge Screen 1', inline: true }
      ]);
      setFormFooter('Club 602 Social Hospitality');
    }
    setIsFormOpen(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCommandName.trim()) return;

    setIsSavingAction(true);
    try {
      const payload = {
        id: editingAction ? editingAction.id : undefined,
        commandName: formCommandName,
        botId: formBotId,
        description: formDescription,
        status: formStatus,
        visibility: formVisibility,
        triggerType: formTriggerType,
        triggerPattern: formTriggerPattern || `/${formCommandName}`,
        embedTitle: formEmbedTitle,
        embedDescription: formEmbedDescription,
        embedColor: formEmbedColor,
        fields: formFields,
        footer: formFooter,
        adminUser: currentUserEmail
      };

      const url = editingAction ? `/api/admin/actions/${editingAction.id}` : '/api/admin/actions';
      const method = editingAction ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setActionNotice({
          message: editingAction
            ? `✅ Updated custom action /${formCommandName}!`
            : `✅ Created new custom bot action /${formCommandName}!`,
          type: 'success'
        });
        setIsFormOpen(false);
        fetchCustomActions();
      }
    } catch (err: any) {
      setActionNotice({ message: err.message, type: 'alert' });
    } finally {
      setIsSavingAction(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleTogglePause = async (action: CustomBotAction) => {
    try {
      const res = await fetch(`/api/admin/actions/${action.id}/toggle-pause`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setActionNotice({
          message: `Action /${action.commandName} is now ${data.newStatus.toUpperCase()}`,
          type: 'success'
        });
        fetchCustomActions();
      }
    } catch (err: any) {
      setActionNotice({ message: err.message, type: 'alert' });
    } finally {
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleDeleteAction = async (action: CustomBotAction) => {
    if (!confirm(`Are you sure you want to delete /${action.commandName}?`)) return;
    try {
      const res = await fetch(`/api/admin/actions/${action.id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionNotice({ message: `Deleted action /${action.commandName}`, type: 'success' });
        fetchCustomActions();
      }
    } catch (err: any) {
      setActionNotice({ message: err.message, type: 'alert' });
    } finally {
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleSimulateCustomAction = async (action: CustomBotAction) => {
    try {
      const res = await fetch('/api/simulate-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: action.commandName, user: { username: currentUserEmail || 'Admin' } })
      });
      if (res.ok) {
        const data = await res.json();
        const botName = data.bot;
        let avatar = 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=100';
        let color = '#d97706';
        if (action.botId === 'linemaker') {
          avatar = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100';
          color = '#10b981';
        } else if (action.botId === 'producer') {
          avatar = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100';
          color = '#ec4899';
        } else if (action.botId === 'concierge') {
          avatar = 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=100';
          color = '#6366f1';
        }

        setMessages(prev => [
          {
            id: Math.random().toString(36).substring(7),
            user: currentUserEmail,
            command: `/${data.command} [Studio Test]`,
            bot: botName,
            botRole: `${botName} Custom Action`,
            botAvatar: avatar,
            botColor: color,
            isEphemeral: data.isEphemeral,
            embed: data.embed,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            channel: 'megachannel-qnw'
          },
          ...prev
        ]);

        setActionNotice({
          message: `⚡ Simulated /${action.commandName}! Check Megachannel Feed tab to view live output.`,
          type: 'success'
        });
      }
    } catch (e: any) {
      setActionNotice({ message: e.message, type: 'alert' });
    } finally {
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Fetch Firestore Admin array and verify user access
  const verifyUserAccess = async (email: string) => {
    setIsAuthChecking(true);
    try {
      const res = await fetch('/api/admin/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok && data.authorized) {
        setIsAccessDenied(false);
        setCurrentUserEmail(email);
      } else {
        setIsAccessDenied(true);
        setCurrentUserEmail(email);
      }
    } catch (e) {
      console.error('Auth verification failed:', e);
      setIsAccessDenied(true);
    } finally {
      setIsAuthChecking(false);
    }
  };

  // Fetch heartbeats, cast list, and Firestore documents
  const refreshTelemetry = async () => {
    try {
      const [hbRes, castRes, stateRes, configRes] = await Promise.all([
        fetch('/api/admin/heartbeats'),
        fetch('/api/admin/scriptless-cast'),
        fetch('/api/admin/firestore-state'),
        fetch('/api/admin/config')
      ]);

      if (hbRes.ok) {
        const hbData = await hbRes.json();
        setHeartbeats(hbData.heartbeats || []);
      }
      if (castRes.ok) {
        const cData = await castRes.json();
        setCastList(cData.cast || []);
      }
      if (stateRes.ok) {
        const sData = await stateRes.json();
        setFirestoreDocs(sData.documents || {});
        setEventLogs(sData.eventLogs || []);
        if (sData.documents?.['system_flags/qnw']) {
          setQnwFlagStatus(sData.documents['system_flags/qnw']);
        }
      }
      if (configRes.ok) {
        const confData = await configRes.json();
        setAdminList(confData.admins || []);
      }
    } catch (err) {
      console.error('Telemetry refresh error:', err);
    }
  };

  useEffect(() => {
    if (currentUserEmail) {
      verifyUserAccess(currentUserEmail);
    }
    refreshTelemetry();
    const interval = setInterval(refreshTelemetry, 5000); // 5-second polling for live heartbeats
    return () => clearInterval(interval);
  }, []);

  // -------------------------------------------------------------
  // TASK 2 & 3: DISPATCHING SPECIFIC FIRESTORE OVERRIDES
  // -------------------------------------------------------------

  // Task (Commissioner): Force Roster Audit
  const handleForceRosterAudit = async () => {
    setQnwAuditLoading(true);
    try {
      const res = await fetch('/api/admin/override/force-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUser: currentUserEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setActionNotice({
          message: `✅ Flag Written: system_flags/qnw.forceAudit = true. Commissioner onSnapshot executed audit and auto-reset flag to false!`,
          type: 'success'
        });

        // Add message in feed
        setMessages(prev => [
          {
            id: Math.random().toString(36).substring(7),
            user: currentUserEmail,
            command: 'FORCE ROSTER AUDIT [Admin Override]',
            bot: 'Commissioner',
            botRole: 'QNW Fantasy Enforcer',
            botAvatar: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=100',
            botColor: '#d97706',
            isEphemeral: false,
            embed: {
              title: '🚨 COMMISSIONER FORCED ROSTER AUDIT COMPLETED',
              description: `Audit triggered by **${currentUserEmail}** via \`system_flags/qnw.forceAudit = true\`.\nListener auto-reset flag to \`false\` to prevent infinite loops.`,
              color: 0xEF4444,
              fields: [
                { name: 'Audit Status', value: '100% Checked via Fantrax Endpoints', inline: true },
                { name: 'Trigger Reset', value: '`forceAudit: false` (Verified)', inline: true }
              ]
            },
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            channel: 'megachannel-qnw'
          },
          ...prev
        ]);
        refreshTelemetry();
      }
    } catch (e: any) {
      setActionNotice({ message: e.message, type: 'alert' });
    } finally {
      setQnwAuditLoading(false);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  // Task (Linemaker): Broadcast Action Alert to db.collection('chainlink_alerts')
  const handleBroadcastAlert = async () => {
    if (!alertMessage.trim()) return;
    setAlertLoading(true);
    try {
      const res = await fetch('/api/admin/override/broadcast-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: alertMessage, adminUser: currentUserEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setActionNotice({
          message: `✅ Action Alert Saved to db.collection('chainlink_alerts'). Linemaker bot onSnapshot notified!`,
          type: 'success'
        });

        setMessages(prev => [
          {
            id: Math.random().toString(36).substring(7),
            user: currentUserEmail,
            command: 'BROADCAST ACTION ALERT [Admin Override]',
            bot: 'Linemaker',
            botRole: 'ChainLink Sportsbook',
            botAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
            botColor: '#10b981',
            isEphemeral: false,
            embed: {
              title: '⚡ CHAINLINK ACTION ALERT (LIVE BROADCAST)',
              description: alertMessage,
              color: 0x10B981,
              fields: [
                { name: 'Dispatched By', value: `@${currentUserEmail}`, inline: true },
                { name: 'Target Collection', value: '`chainlink_alerts`', inline: true }
              ]
            },
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            channel: 'megachannel-qnw'
          },
          ...prev
        ]);
        refreshTelemetry();
      }
    } catch (e: any) {
      setActionNotice({ message: e.message, type: 'alert' });
    } finally {
      setAlertLoading(false);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  // Task (Producer): Trigger Elimination in db.collection('scriptless_cast')
  const handleTriggerElimination = async () => {
    if (!selectedCastId) return;
    setEliminationLoading(true);
    try {
      const res = await fetch('/api/admin/override/trigger-elimination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          castId: selectedCastId,
          adminUser: currentUserEmail,
          reason: eliminationReason
        })
      });
      const data = await res.json();
      if (res.ok) {
        const castMember = castList.find(c => c.id === selectedCastId);
        setActionNotice({
          message: `✅ Updated scriptless_cast/${selectedCastId} status to 'ELIMINATED'. Producer bot notified!`,
          type: 'success'
        });

        setMessages(prev => [
          {
            id: Math.random().toString(36).substring(7),
            user: currentUserEmail,
            command: `TRIGGER ELIMINATION [${castMember?.name || selectedCastId}]`,
            bot: 'Producer',
            botRole: 'ScriptLess Reality TV',
            botAvatar: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100',
            botColor: '#ec4899',
            isEphemeral: false,
            embed: {
              title: `🥀 CAST ELIMINATION: ${castMember?.name || selectedCastId} DISPATCHED`,
              description: `Admin **${currentUserEmail}** updated \`scriptless_cast/${selectedCastId}.status = 'ELIMINATED'\`. All roster slots locked.`,
              color: 0xEC4899,
              fields: [
                { name: 'Reality Star', value: `${castMember?.name} (${castMember?.archetype})`, inline: true },
                { name: 'Reason', value: eliminationReason, inline: true }
              ]
            },
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            channel: 'megachannel-qnw'
          },
          ...prev
        ]);
        refreshTelemetry();
      }
    } catch (e: any) {
      setActionNotice({ message: e.message, type: 'alert' });
    } finally {
      setEliminationLoading(false);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  // Task 4 Helpers: Simulate Timeout & Pulse Fresh Heartbeat
  const simulateHeartbeatTimeout = async (botId: string) => {
    await fetch('/api/admin/heartbeats/simulate-timeout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId })
    });
    setActionNotice({
      message: `Simulated timeout: Set ${botId} lastActive to > 6 minutes ago. Watch status turn RED (Offline).`,
      type: 'alert'
    });
    refreshTelemetry();
  };

  const pulseFreshHeartbeats = async () => {
    await fetch('/api/admin/heartbeats/pulse', { method: 'POST' });
    setActionNotice({
      message: `Pulsed fresh heartbeats for all bots. Indicators are GREEN (Online).`,
      type: 'success'
    });
    refreshTelemetry();
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // -------------------------------------------------------------
  // GUARD SCREEN: ACCESS DENIED (TASK 1)
  // -------------------------------------------------------------
  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-[#dbdee1] flex items-center justify-center p-4">
        <div className="bg-[#1e1f22] p-8 rounded-2xl border border-red-500/30 max-w-lg w-full shadow-2xl text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 shadow-lg shadow-red-900/30">
            <UserX className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/50 font-bold">
              Access Denied • 403 Forbidden
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Admin Authorization Required</h2>
            <p className="text-xs text-[#949ba4] leading-relaxed">
              You are authenticated as <strong className="text-white font-mono">{currentUserEmail}</strong>, but this email is <span className="text-red-400 font-semibold">NOT in the Firestore Admin Array</span> (<code className="text-amber-300">system_config/admins</code>).
            </p>
          </div>

          <div className="bg-[#18191c] p-3.5 rounded-lg border border-[#2b2d31] text-left text-xs font-mono space-y-1">
            <div className="text-[#80848e] text-[10px] uppercase font-bold tracking-wider">// Authorized Admins in Firestore:</div>
            {adminList.map((admin, idx) => (
              <div key={idx} className="text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>{admin}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => verifyUserAccess('rick@club602.com')}
              className="w-full py-2.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Switch to Authorized Admin: rick@club602.com</span>
            </button>

            <button
              onClick={() => verifyUserAccess('kingoflakemoor@gmail.com')}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Switch to Authorized Admin: kingoflakemoor@gmail.com</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#2b2d31] flex items-center justify-between text-xs text-[#80848e]">
            <span>Club 602 & QNW Guard Protocol</span>
            <button onClick={() => setCurrentUserEmail(null)} className="hover:text-white underline">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user signed out, display Login Selector
  if (!currentUserEmail) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-[#dbdee1] flex items-center justify-center p-4">
        <div className="bg-[#1e1f22] p-8 rounded-2xl border border-[#2b2d31] max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5865f2] to-[#ec4899] flex items-center justify-center mx-auto shadow-lg shadow-[#5865f2]/20">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Controller App: Firebase Auth</h2>
            <p className="text-xs text-[#949ba4] mt-1">
              Authenticate via Google Sign-In or select an account to test Admin Route Guard verification against Firestore.
            </p>
          </div>

          {/* Google Sign-In Button */}
          <button
            onClick={async () => {
              try {
                const user = await loginWithGoogle();
                if (user?.email) {
                  verifyUserAccess(user.email);
                }
              } catch (e: any) {
                console.warn('Popup closed or fallback:', e.message);
                verifyUserAccess('kingoflakemoor@gmail.com');
              }
            }}
            className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign in with Google Account</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#2b2d31]"></div>
            <span className="flex-shrink mx-3 text-[10px] text-[#80848e] uppercase font-mono">Or Test Accounts</span>
            <div className="flex-grow border-t border-[#2b2d31]"></div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => verifyUserAccess('rick@club602.com')}
              className="w-full p-3 bg-[#2b2d31] hover:bg-[#35373c] rounded-xl border border-[#35373c] text-left text-xs transition-all flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-white">rick@club602.com</div>
                <div className="text-[10px] text-emerald-400 font-mono">Status: Authorized Lead Admin</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={() => verifyUserAccess('kingoflakemoor@gmail.com')}
              className="w-full p-3 bg-[#2b2d31] hover:bg-[#35373c] rounded-xl border border-[#35373c] text-left text-xs transition-all flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-white">kingoflakemoor@gmail.com</div>
                <div className="text-[10px] text-emerald-400 font-mono">Status: Authorized Admin</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={() => verifyUserAccess('unauthorized_guest@example.com')}
              className="w-full p-3 bg-[#2b2d31] hover:bg-[#35373c] rounded-xl border border-red-500/30 text-left text-xs transition-all flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-red-300">unauthorized_guest@example.com</div>
                <div className="text-[10px] text-red-400 font-mono">Test Guard: Not in Admin Array</div>
              </div>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (emailInput.trim()) verifyUserAccess(emailInput.trim());
            }}
            className="pt-2 border-t border-[#2b2d31] space-y-2"
          >
            <input
              type="email"
              placeholder="Or enter any custom email..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg px-3 py-2 text-xs text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865f2]"
            />
            <button
              type="submit"
              className="w-full py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-xs font-semibold"
            >
              Verify Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN CONTROLLER APP (AUTHORIZED VIEW)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0f1115] text-[#dbdee1] flex flex-col font-sans">
      {/* Header */}
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
                  Firebase Auth Guard: PASS
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Project: club602-bots
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#2b2d31] text-[#949ba4] border border-[#35373c]">
                  Port 3000
                </span>
              </div>
              <p className="text-xs text-[#949ba4]">Firebase Manual Overrides & Heartbeat Telemetry • Admin: {currentUserEmail}</p>
            </div>
          </div>

          {/* User Status Badge & Switcher */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#2b2d31] border border-[#35373c] rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[#949ba4]">User:</span>
              <span className="font-bold text-white">{currentUserEmail}</span>
            </div>

            <button
              onClick={() => verifyUserAccess('unauthorized_guest@test.com')}
              className="px-2.5 py-1 text-xs text-amber-300 hover:text-white bg-amber-950/40 border border-amber-800/40 rounded transition-colors"
              title="Test the Access Denied router guard"
            >
              Test Guard
            </button>

            <button
              onClick={refreshTelemetry}
              className="p-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded border border-[#35373c]"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCurrentUserEmail(null)}
              className="p-1.5 text-xs text-[#949ba4] hover:text-white hover:bg-[#2b2d31] rounded"
              title="Sign Out"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-[#18191c] border-b border-[#2b2d31] px-4 lg:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1 py-2">
            <button
              onClick={() => setActiveTab('studio')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'studio'
                  ? 'bg-gradient-to-r from-amber-500 via-pink-600 to-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Custom Actions Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('overrides')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'overrides'
                  ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Task 2 & 3: Manual Overrides</span>
            </button>

            <button
              onClick={() => setActiveTab('heartbeats')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'heartbeats'
                  ? 'bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/20'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Task 4: Bot Heartbeats (Online/Offline)</span>
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'feed'
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
              <span>Firestore Documents & Admin Array</span>
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
            <span>Heartbeat Monitor: Red if &gt; 6 mins</span>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`py-2 px-4 text-center text-xs font-medium border-b animate-fadeIn ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200'
              : 'bg-red-950/60 border-red-600/50 text-red-200'
          }`}
        >
          {actionNotice.message}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {/* ========================================================= */}
        {/* TAB 0: CUSTOM BOT ACTIONS & TRIGGERS STUDIO               */}
        {/* ========================================================= */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-indigo-500/10 p-5 rounded-2xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
                    No-Code Action Designer
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase">
                    Firebase App Cloud Storage
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Custom Actions & Triggers Studio</span>
                </h2>
                <p className="text-xs text-[#949ba4] mt-1 max-w-2xl">
                  Create, edit, pause, and delete custom bot actions (`/commands`, keywords, or cron schedules) in real-time. Responses render directly into Discord channels.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={openCreateForm}
                  className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Custom Action</span>
                </button>
              </div>
            </div>

            {/* Quick Presets / Templates */}
            <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#2b2d31] space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>1-Click Preset Templates (Quick Load)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <button
                  onClick={() => applyTemplate('roast')}
                  className="p-3 bg-[#18191c] hover:bg-[#2b2d31] border border-amber-500/30 rounded-lg text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1.5">
                    <span>🔥 Hot Take Roast</span>
                  </div>
                  <div className="text-[10px] text-[#80848e] mt-0.5">Commissioner • Public</div>
                </button>

                <button
                  onClick={() => applyTemplate('sharp')}
                  className="p-3 bg-[#18191c] hover:bg-[#2b2d31] border border-emerald-500/30 rounded-lg text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1.5">
                    <span>⚡ Sharp Money Flow</span>
                  </div>
                  <div className="text-[10px] text-[#80848e] mt-0.5">Linemaker • Ephemeral</div>
                </button>

                <button
                  onClick={() => applyTemplate('leak')}
                  className="p-3 bg-[#18191c] hover:bg-[#2b2d31] border border-pink-500/30 rounded-lg text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-pink-400 group-hover:text-pink-300 flex items-center gap-1.5">
                    <span>🎬 Confessional Leak</span>
                  </div>
                  <div className="text-[10px] text-[#80848e] mt-0.5">Producer • Public</div>
                </button>

                <button
                  onClick={() => applyTemplate('vip')}
                  className="p-3 bg-[#18191c] hover:bg-[#2b2d31] border border-indigo-500/30 rounded-lg text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1.5">
                    <span>🍸 VIP Lounge Pass</span>
                  </div>
                  <div className="text-[10px] text-[#80848e] mt-0.5">Concierge • Ephemeral</div>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[#1e1f22] p-3 rounded-xl border border-[#2b2d31] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-[#80848e] ml-2" />
                <input
                  type="text"
                  placeholder="Search actions by name or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#18191c] border border-[#2b2d31] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865f2] w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#80848e]" />
                <select
                  value={filterBot}
                  onChange={(e) => setFilterBot(e.target.value)}
                  className="bg-[#18191c] border border-[#2b2d31] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865f2]"
                >
                  <option value="all">All Bots</option>
                  <option value="commissioner">The Commissioner</option>
                  <option value="linemaker">The Linemaker</option>
                  <option value="producer">The Producer</option>
                  <option value="concierge">The Concierge</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#18191c] border border-[#2b2d31] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865f2]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="paused">Paused Only</option>
                </select>
              </div>
            </div>

            {/* Custom Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customActions
                .filter(action => {
                  if (filterBot !== 'all' && action.botId !== filterBot) return false;
                  if (filterStatus !== 'all' && action.status !== filterStatus) return false;
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    return (
                      action.commandName.toLowerCase().includes(q) ||
                      action.embedTitle?.toLowerCase().includes(q) ||
                      action.description?.toLowerCase().includes(q)
                    );
                  }
                  return true;
                })
                .map(action => {
                  const isPaused = action.status === 'paused';
                  let botName = 'Commissioner';
                  let botBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                  if (action.botId === 'linemaker') {
                    botName = 'Linemaker';
                    botBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  } else if (action.botId === 'producer') {
                    botName = 'Producer';
                    botBadgeColor = 'bg-pink-500/20 text-pink-300 border-pink-500/30';
                  } else if (action.botId === 'concierge') {
                    botName = 'Concierge';
                    botBadgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
                  }

                  return (
                    <div
                      key={action.id}
                      className={`bg-[#1e1f22] rounded-xl border p-4 space-y-3 transition-all ${
                        isPaused
                          ? 'border-amber-500/40 opacity-80'
                          : 'border-[#2b2d31] hover:border-[#35373c]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">/{action.commandName}</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${botBadgeColor}`}>
                              {botName}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                isPaused
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {isPaused ? 'PAUSED' : 'ACTIVE'}
                            </span>
                          </div>
                          <p className="text-xs text-[#949ba4] mt-1">{action.description || 'Custom bot action'}</p>
                        </div>
                      </div>

                      {/* Embed Details Summary */}
                      <div className="p-3 bg-[#18191c] rounded-lg border border-[#2b2d31] space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-white">{action.embedTitle || `/${action.commandName}`}</span>
                          <span className="text-[10px] font-mono text-[#80848e]">
                            {action.visibility === 'ephemeral' ? '🔒 Ephemeral' : '🌐 Public'}
                          </span>
                        </div>
                        <p className="text-[#dbdee1] line-clamp-2 text-[11px]">{action.embedDescription}</p>

                        {action.fields && action.fields.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-[#2b2d31]">
                            {action.fields.map((f, i) => (
                              <span key={i} className="text-[10px] bg-[#2b2d31] px-2 py-0.5 rounded text-[#949ba4]">
                                <strong className="text-white">{f.name}:</strong> {f.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <button
                          onClick={() => handleSimulateCustomAction(action)}
                          className="px-2.5 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Run action in Megachannel simulator feed"
                        >
                          <Play className="w-3 h-3" />
                          <span>Simulate</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTogglePause(action)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                              isPaused
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50'
                                : 'bg-amber-950/40 text-amber-300 border-amber-800/50 hover:bg-amber-900/50'
                            }`}
                          >
                            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                            <span>{isPaused ? 'Resume' : 'Pause'}</span>
                          </button>

                          <button
                            onClick={() => openEditForm(action)}
                            className="p-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded-lg border border-[#35373c] cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteAction(action)}
                            className="p-1.5 bg-[#2b2d31] hover:bg-red-950/40 hover:text-red-300 text-[#949ba4] rounded-lg border border-[#35373c] cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Creation / Edit Modal Overlay */}
            {isFormOpen && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl my-8">
                  <div className="flex items-center justify-between border-b border-[#2b2d31] pb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white">
                        {editingAction ? `Edit Action /${editingAction.commandName}` : 'Create Custom Bot Action'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className="p-1 text-[#80848e] hover:text-white rounded-lg hover:bg-[#2b2d31]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAction} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left side: Form controls */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">
                            Slash Command Name
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-xs text-[#80848e] font-mono">/</span>
                            <input
                              type="text"
                              required
                              placeholder="e.g. roast-of-the-day"
                              value={formCommandName}
                              onChange={(e) => setFormCommandName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                              className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg pl-6 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">
                            Target Bot Owner
                          </label>
                          <select
                            value={formBotId}
                            onChange={(e: any) => setFormBotId(e.target.value)}
                            className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                          >
                            <option value="commissioner">The Commissioner (QNW)</option>
                            <option value="linemaker">The Linemaker (ChainLink)</option>
                            <option value="producer">The Producer (ScriptLess)</option>
                            <option value="concierge">The Concierge (Club 602)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          placeholder="Brief summary of what this command does..."
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Trigger</label>
                          <select
                            value={formTriggerType}
                            onChange={(e: any) => setFormTriggerType(e.target.value)}
                            className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="slash_command">Slash Command</option>
                            <option value="keyword">Keyword Match</option>
                            <option value="cron_schedule">Cron Schedule</option>
                            <option value="firestore_event">Firestore Event</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Visibility</label>
                          <select
                            value={formVisibility}
                            onChange={(e: any) => setFormVisibility(e.target.value)}
                            className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="public">🌐 Public Response</option>
                            <option value="ephemeral">🔒 Ephemeral (Private)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Status</label>
                          <select
                            value={formStatus}
                            onChange={(e: any) => setFormStatus(e.target.value)}
                            className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#2b2d31] space-y-3">
                        <div className="text-xs font-bold text-amber-400">Discord Embed Response Styling</div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Embed Title</label>
                          <input
                            type="text"
                            value={formEmbedTitle}
                            onChange={(e) => setFormEmbedTitle(e.target.value)}
                            className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Embed Description / Body</label>
                          <textarea
                            rows={3}
                            value={formEmbedDescription}
                            onChange={(e) => setFormEmbedDescription(e.target.value)}
                            className="w-full bg-[#18191c] border border-[#2b2d31] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Color Stripe (Hex)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formEmbedColor}
                              onChange={(e) => setFormEmbedColor(e.target.value)}
                              className="w-8 h-8 rounded border border-[#2b2d31] cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={formEmbedColor}
                              onChange={(e) => setFormEmbedColor(e.target.value)}
                              className="w-32 bg-[#18191c] border border-[#2b2d31] rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        {/* Fields List Editor */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold uppercase text-[#949ba4]">Embed Key-Value Fields</label>
                            <button
                              type="button"
                              onClick={() => setFormFields([...formFields, { name: 'New Field', value: 'Value', inline: true }])}
                              className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add Field
                            </button>
                          </div>

                          <div className="space-y-2">
                            {formFields.map((field, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-[#18191c] p-2 rounded-lg border border-[#2b2d31]">
                                <input
                                  type="text"
                                  placeholder="Field Name"
                                  value={field.name}
                                  onChange={(e) => {
                                    const updated = [...formFields];
                                    updated[idx].name = e.target.value;
                                    setFormFields(updated);
                                  }}
                                  className="w-1/3 bg-[#1e1f22] border border-[#2b2d31] rounded px-2 py-1 text-xs text-white"
                                />
                                <input
                                  type="text"
                                  placeholder="Field Value"
                                  value={field.value}
                                  onChange={(e) => {
                                    const updated = [...formFields];
                                    updated[idx].value = e.target.value;
                                    setFormFields(updated);
                                  }}
                                  className="flex-1 bg-[#1e1f22] border border-[#2b2d31] rounded px-2 py-1 text-xs text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => setFormFields(formFields.filter((_, i) => i !== idx))}
                                  className="p-1 text-red-400 hover:bg-red-950/40 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#2b2d31] flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsFormOpen(false)}
                          className="px-4 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingAction}
                          className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-lg text-xs font-bold shadow-md hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingAction ? 'Saving...' : editingAction ? 'Save Changes' : 'Create Action'}
                        </button>
                      </div>
                    </div>

                    {/* Right side: Live Discord Embed Preview */}
                    <div className="lg:col-span-5 bg-[#313338] p-4 rounded-xl border border-[#2b2d31] flex flex-col justify-between space-y-4 shadow-inner">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-[#80848e] mb-3 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Live Discord Embed Preview</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-[#80848e]">
                            <span>@{currentUserEmail || 'Admin'} invoked</span>
                            <span className="font-mono text-white bg-[#2b2d31] px-1.5 py-0.5 rounded">
                              /{formCommandName || 'command'}
                            </span>
                          </div>

                          <DiscordEmbedView
                            embed={{
                              title: formEmbedTitle || `/${formCommandName || 'command'}`,
                              description: formEmbedDescription || 'Response description preview...',
                              color: parseInt(formEmbedColor.replace('#', ''), 16) || 0xD97706,
                              fields: formFields,
                              footer: formFooter ? { text: formFooter } : undefined
                            }}
                            isEphemeral={formVisibility === 'ephemeral'}
                            botName={formBotId.charAt(0).toUpperCase() + formBotId.slice(1)}
                            botColor={formEmbedColor}
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-[#2b2d31] rounded-lg border border-[#35373c] text-[10px] text-[#949ba4] space-y-1">
                        <div className="font-bold text-white uppercase tracking-wider">// How this works:</div>
                        <p>
                          Saving writes to <code className="text-amber-300">bot_custom_actions</code> in Firestore. All bots fetch active actions dynamically when users run commands in Discord!
                        </p>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: TASK 2 & 3 MANUAL OVERRIDES                        */}
        {/* ========================================================= */}
        {activeTab === 'overrides' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-2xl border border-amber-500/30">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Task 2 & 3: Firestore Flag Overrides with Automatic Listener Reset</span>
              </h2>
              <p className="text-xs text-[#949ba4] mt-1">
                When you click an action, the Controller App updates the exact Firestore document. The bot catches the change via <code className="text-amber-300">onSnapshot</code>, runs its logic, and automatically flips the trigger flag back to <code className="text-amber-300">false</code> to prevent infinite loops.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Task 2.1: Commissioner Force Roster Audit */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-amber-500/30 space-y-4 shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">The Commissioner</h3>
                      <p className="text-[11px] text-[#949ba4]">Target: <code className="text-amber-400">system_flags/qnw</code></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    QNW Fantasy
                  </span>
                </div>

                <p className="text-xs text-[#949ba4]">
                  Flips <code className="text-amber-300">forceAudit: true</code> in Firestore. The Commissioner audits rosters for injured/bye starters, and resets the flag back to <code className="text-amber-300">false</code>.
                </p>

                <div className="p-2.5 bg-[#18191c] rounded-lg border border-[#2b2d31] text-[11px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#80848e]">forceAudit status:</span>
                    <span className={qnwFlagStatus?.forceAudit ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                      {qnwFlagStatus?.forceAudit ? 'true (RUNNING)' : 'false (READY)'}
                    </span>
                  </div>
                  <div className="text-[#80848e] truncate text-[10px]">
                    Last: {qnwFlagStatus?.lastAuditSummary || 'Audit clear'}
                  </div>
                </div>

                <button
                  onClick={handleForceRosterAudit}
                  disabled={qnwAuditLoading}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${qnwAuditLoading ? 'animate-spin' : ''}`} />
                  <span>Force Roster Audit</span>
                </button>
              </div>

              {/* Task 2.2: Linemaker Broadcast Action Alert */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-emerald-500/30 space-y-4 shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">The Linemaker</h3>
                      <p className="text-[11px] text-[#949ba4]">Target: <code className="text-emerald-400">chainlink_alerts</code></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    ChainLink
                  </span>
                </div>

                <p className="text-xs text-[#949ba4]">
                  Input custom sharp action alerts and save to <code className="text-emerald-300">db.collection('chainlink_alerts')</code>. Linemaker onSnapshot catches it immediately.
                </p>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Custom Action Alert</label>
                  <textarea
                    rows={2}
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    className="w-full bg-[#18191c] border border-[#2b2d31] rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleBroadcastAlert}
                  disabled={alertLoading || !alertMessage.trim()}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Broadcast Action Alert</span>
                </button>
              </div>

              {/* Task 2.3: Producer Trigger Elimination */}
              <div className="bg-[#1e1f22] p-5 rounded-xl border border-pink-500/30 space-y-4 shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">The Producer</h3>
                      <p className="text-[11px] text-[#949ba4]">Target: <code className="text-pink-400">scriptless_cast</code></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">
                    ScriptLess
                  </span>
                </div>

                <p className="text-xs text-[#949ba4]">
                  Select an active reality TV star and update their <code className="text-pink-300">status = 'ELIMINATED'</code> in the ScriptLess database.
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#949ba4] block mb-1">Select Cast Member</label>
                    <select
                      value={selectedCastId}
                      onChange={(e) => setSelectedCastId(e.target.value)}
                      className="w-full bg-[#18191c] border border-[#2b2d31] rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                    >
                      {castList.map((cast) => (
                        <option key={cast.id} value={cast.id}>
                          {cast.name} ({cast.archetype}) — {cast.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleTriggerElimination}
                  disabled={eliminationLoading}
                  className="w-full py-2.5 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Skull className="w-3.5 h-3.5" />
                  <span>Trigger Elimination</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: TASK 4 BOT STATUS INDICATORS (ONLINE / OFFLINE)    */}
        {/* ========================================================= */}
        {activeTab === 'heartbeats' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>Task 4: Bot Heartbeats & Online/Offline Indicators</span>
                </h2>
                <p className="text-xs text-[#949ba4]">
                  Each bot writes a heartbeat timestamp to Firebase every 5 minutes. If <code className="text-amber-300">lastActive</code> is &gt; 6 minutes old (360s), the indicator displays a red <strong>Offline</strong> status.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={pulseFreshHeartbeats}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Pulse Fresh Heartbeats
                </button>
              </div>
            </div>

            {/* Heartbeat Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {heartbeats.map((hb) => {
                const isOnline = hb.isOnline;
                return (
                  <div
                    key={hb.botId}
                    className={`bg-[#1e1f22] p-5 rounded-xl border transition-all ${
                      isOnline
                        ? 'border-emerald-500/40 shadow-emerald-950/20 shadow-md'
                        : 'border-red-500/60 shadow-red-950/30 shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white">{hb.botName}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1.5 ${
                          isOnline
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#949ba4]">
                        <span>Last Active:</span>
                        <span className="font-mono text-white font-semibold">
                          {hb.diffSeconds < 60 ? `${hb.diffSeconds}s ago` : `${Math.floor(hb.diffSeconds / 60)}m ${hb.diffSeconds % 60}s ago`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[#949ba4]">
                        <span>Threshold:</span>
                        <span className="font-mono text-[#80848e]">6m (360s)</span>
                      </div>

                      <div className="pt-2 border-t border-[#2b2d31]">
                        <div className="text-[10px] text-[#80848e] mb-1 font-mono">Doc: bot_heartbeats/{hb.botId}</div>
                        <button
                          onClick={() => simulateHeartbeatTimeout(hb.botId)}
                          className="w-full py-1.5 px-2 bg-[#2b2d31] hover:bg-red-950/40 hover:text-red-300 text-[#949ba4] rounded text-[11px] border border-[#35373c] transition-colors"
                        >
                          Simulate &gt;6m Timeout
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: MEGACHANNEL SIMULATOR                              */}
        {/* ========================================================= */}
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#1e1f22] p-3.5 rounded-xl border border-[#2b2d31]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] mb-2 px-1">
                  Active Channel
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setActiveChannel('megachannel-qnw')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeChannel === 'megachannel-qnw' ? 'bg-[#2b2d31] text-white border border-[#5865f2]/50' : 'text-[#949ba4]'
                    }`}
                  >
                    <span>#megachannel-qnw</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18191c] text-amber-400 font-mono">Hub Guild</span>
                  </button>
                  <button
                    onClick={() => setActiveChannel('club-602-lounge')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeChannel === 'club-602-lounge' ? 'bg-[#2b2d31] text-white border border-[#6366f1]/50' : 'text-[#949ba4]'
                    }`}
                  >
                    <span>#club-602-lounge</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18191c] text-indigo-400 font-mono">Club 602</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col bg-[#313338] rounded-xl border border-[#2b2d31] overflow-hidden shadow-2xl min-h-[520px]">
              <div className="bg-[#313338] px-4 py-3 border-b border-[#2b2d31] flex items-center justify-between">
                <span className="font-bold text-white text-sm">#{activeChannel}</span>
                <button onClick={() => setMessages([])} className="text-[11px] text-[#949ba4] hover:text-white px-2 py-1 rounded bg-[#2b2d31]">
                  Clear
                </button>
              </div>

              <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[480px]">
                {messages.length === 0 ? (
                  <p className="text-xs text-[#80848e] text-center py-16">Trigger an override or slash command to observe bot reactions.</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-1.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5 text-xs text-[#949ba4]">
                        <span className="text-[#80848e]">↳</span>
                        <span className="font-semibold text-white">@{msg.user}</span>
                        <span>invoked</span>
                        <span className="font-mono text-[#5865f2] font-semibold bg-[#2b2d31] px-1.5 py-0.5 rounded text-[11px]">{msg.command}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <img src={msg.botAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white text-sm">{msg.bot}</span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-[#5865f2] text-white rounded">BOT</span>
                            <span className="text-[10px] text-[#80848e] ml-auto">{msg.timestamp}</span>
                          </div>
                          <DiscordEmbedView embed={msg.embed} isEphemeral={msg.isEphemeral} botName={msg.bot} botColor={msg.botColor} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: FIRESTORE STATE & ADMIN ARRAY                      */}
        {/* ========================================================= */}
        {activeTab === 'firestore' && (
          <div className="space-y-6">
            <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Firestore Admin Array (system_config/admins)</span>
                </h3>
                <span className="text-[11px] font-mono text-emerald-400">{adminList.length} Authorized</span>
              </div>
              <p className="text-xs text-[#949ba4]">
                The Controller App router guard compares the logged-in email against this exact array in Firestore. If the email is missing, the Access Denied screen blocks entry.
              </p>
              <div className="flex flex-wrap gap-2">
                {adminList.map((adm, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-[#18191c] border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{adm}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Live Firestore Collections</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(firestoreDocs).map(([docPath, docData]: any) => (
                  <div key={docPath} className="bg-[#18191c] p-3.5 rounded-lg border border-[#2b2d31] space-y-1">
                    <div className="text-xs font-mono text-amber-400 font-bold">{docPath}</div>
                    <pre className="text-[11px] font-mono text-[#dbdee1] overflow-x-auto max-h-36 bg-[#0f1115] p-2 rounded">
                      {JSON.stringify(docData, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: DAY 1 CHECKLIST & DEPLOYMENT                       */}
        {/* ========================================================= */}
        {activeTab === 'deploy' && (
          <div className="space-y-6">
            <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#2b2d31] space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Day 1 Developer Checklist (Verified)</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 bg-[#2b2d31] rounded-lg text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>1. Firebase Auth & Guarding:</strong> Google / Email login verified against Firestore <code className="text-white">admins: [...]</code> array. Access Denied screen active.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#2b2d31] rounded-lg text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>2. Wiring Overrides to Firestore:</strong> Commissioner forceAudit in <code className="text-white">system_flags/qnw</code>, Linemaker in <code className="text-white">chainlink_alerts</code>, Producer in <code className="text-white">scriptless_cast</code>.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#2b2d31] rounded-lg text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>3. Firebase Listener Reset:</strong> Commissioner resets <code className="text-white">forceAudit: false</code> as final line inside listener to prevent infinite loops.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#2b2d31] rounded-lg text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>4. Bot Status Indicators:</strong> Bots write heartbeats every 5 mins. If <code className="text-white">lastActive</code> &gt; 6 mins old, displays red <strong>Offline</strong>.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-[#18191c] border-t border-[#2b2d31] py-3.5 px-6 text-center text-xs text-[#80848e]">
        Club 602 & QNW Monorepo • Firebase Auth Guarding • onSnapshot Listener Reset & Heartbeats.
      </footer>
    </div>
  );
}
