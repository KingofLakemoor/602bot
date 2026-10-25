import { EmbedBuilder } from 'discord.js';

// Color Palette for Bot Ecosystem
export const BOT_COLORS = {
  COMMISSIONER: 0xD97706, // Gold / Amber (NFL/Fantasy Trophy)
  LINEMAKER: 0x10B981,    // Emerald Green (Sportsbook / Matrix ticker)
  PRODUCER: 0xEC4899,     // Deep Hot Pink (Reality TV / Drama)
  CONCIERGE: 0x6366F1,    // Royal Indigo (VIP Hospitality / Club 602)
  ALERT: 0xEF4444,        // Red (Severe Warning / Chop block)
  SUCCESS: 0x22C55E       // Green (Claimed / Confirmed)
};

// ==========================================
// 1. COMMISSIONER (QNW Fantasy) EMBEDS
// ==========================================

export function buildMatchupEmbed({ matchups, week = 8, leagueName = 'Gridiron Exotics' }) {
  const embed = new EmbedBuilder()
    .setColor(BOT_COLORS.COMMISSIONER)
    .setTitle(`🏈 ${leagueName} - Week ${week} Matchup Warfare`)
    .setDescription('Head-to-head records, live projections, and unfiltered trash talk directly from the Commissioner\'s desk.')
    .setTimestamp()
    .setFooter({ text: 'QNW Commissioner • Fantrax Verified', iconURL: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=100' });

  matchups.forEach((m, idx) => {
    const t1 = m.team1;
    const t2 = m.team2;
    const diff = (t1.score - t2.score).toFixed(1);
    const leader = diff > 0 ? t1.name : (diff < 0 ? t2.name : 'TIED');
    
    embed.addFields({
      name: `Matchup #${idx + 1}: ${t1.name} (${t1.manager}) vs ${t2.name} (${t2.manager})`,
      value: `📊 **Score:** ${t1.score} - ${t2.score} *(Proj: ${t1.projected || '—'} vs ${t2.projected || '—'})*\n` +
             `🔥 **Spread:** ${m.spread || 'EVEN'}\n` +
             `🎙️ **Commissioner Roast:** *" ${m.trashTalkPrompt || leader + ' has the upper hand, but don\'t count on anything with this sloppy GM work.'} "*`,
      inline: false
    });
  });

  return embed;
}

export function buildShameEmbed({ violations, leagueName = 'Gridiron Exotics' }) {
  const embed = new EmbedBuilder()
    .setColor(BOT_COLORS.ALERT)
    .setTitle(`🚨 THE WALL OF SHAME - ${leagueName}`)
    .setDescription('Automated Fantrax Roster Audit caught managers starting injured players, bye-week ghosts, and zero-effort lineups.')
    .setTimestamp()
    .setFooter({ text: 'Commissioner Audit Protocol • Zero Excuses Accepted' });

  if (!violations || violations.length === 0) {
    embed.setColor(BOT_COLORS.SUCCESS);
    embed.setDescription('✅ Miraculously, all managers set legal lineups this week. Enjoy it while it lasts.');
    return embed;
  }

  violations.forEach((v) => {
    embed.addFields({
      name: `⚠️ Manager: @${v.manager} (${v.teamName})`,
      value: `🚫 **Crime:** ${v.issue} on \`${v.player} (${v.position})\`\n` +
             `📢 **Public Roast:** ${v.roast}`,
      inline: false
    });
  });

  return embed;
}

export function buildGuillotineEmbed({ chopBlock, cutLineScore = 85.0, week = 8 }) {
  const embed = new EmbedBuilder()
    .setColor(0x7F1D1D) // Blood red
    .setTitle(`🪓 GUILLOTINE CHOP BLOCK - WEEK ${week}`)
    .setDescription(`The blade hangs over the lowest scoring roster this week. Cut-line survival threshold: **${cutLineScore} pts**. The lowest team will be sliced and their roster dumped into the waiver pool!`)
    .setTimestamp()
    .setFooter({ text: 'Chop League Enforcer • No Mercy' });

  chopBlock.forEach((c, idx) => {
    const skull = idx === 0 ? '☠️ PRIMARY TARGET' : '⚠️ AT RISK';
    embed.addFields({
      name: `${skull}: ${c.team} (@${c.manager})`,
      value: `Points: **${c.points} pts** | Gap to safety: **${c.gapToSafety || '-'} pts**\nStatus: *${c.dangerLevel || 'EXTREME RISK'}*`,
      inline: true
    });
  });

  return embed;
}

// ==========================================
// 2. LINEMAKER (ChainLink) EMBEDS
// ==========================================

export function buildBoardEmbed({ windows = [] }) {
  const embed = new EmbedBuilder()
    .setColor(BOT_COLORS.LINEMAKER)
    .setTitle('⚡ CHAINLINK ACTION BOARD')
    .setDescription('🔒 Active betting windows, dynamic spread tracking, and stuck-pick counters.')
    .setTimestamp()
    .setFooter({ text: 'ChainLink Engine • Ephemeral View • Private to You' });

  if (!windows.length) {
    embed.setDescription('No open windows right now. Next board unlock begins 30 mins before kickoff.');
    return embed;
  }

  windows.forEach((w) => {
    embed.addFields({
      name: `🎰 ${w.eventTitle} (${w.status || 'OPEN'})`,
      value: `• **Line:** \`${w.line}\` | **Over/Under:** \`${w.total}\`\n` +
             `• **Window Closes:** <t:${Math.floor(new Date(w.closesAt).getTime() / 1000)}:R>\n` +
             `• **Liquidity Pool:** \`$${w.poolSize?.toLocaleString() || '15,400'}\` | **Stuck Picks:** \`${w.stuckCount || 0}\``,
      inline: false
    });
  });

  return embed;
}

export function buildMyActionEmbed({ user, pendingPicks = [], bankroll = 1250 }) {
  const embed = new EmbedBuilder()
    .setColor(BOT_COLORS.LINEMAKER)
    .setTitle(`💼 ChainLink Portfolio: @${user.username || user}`)
    .setDescription(`Active Bankroll: **${bankroll} ProCredits** | Pending Action: **${pendingPicks.length} Slips**`)
    .setTimestamp()
    .setFooter({ text: 'ChainLink Private Slip • Confidential' });

  if (pendingPicks.length === 0) {
    embed.addFields({
      name: 'No Active Action',
      value: 'You have no pending tickets. Use `/board` to view open spreads and place your action.',
      inline: false
    });
    return embed;
  }

  pendingPicks.forEach((p, idx) => {
    embed.addFields({
      name: `Ticket #${idx + 1}: ${p.game}`,
      value: `🎯 **Selection:** \`${p.pick}\` (${p.odds})\n` +
             `💵 **Risk:** \`${p.wager} ProCredits\` ➡️ **Potential Win:** \`${p.toWin} ProCredits\`\n` +
             `⏱️ **Status:** ${p.status || 'PENDING KICKOFF'}`,
      inline: false
    });
  });

  return embed;
}

export function buildProClaimEmbed({ user, streak = 4, bonusAmount = 100, newBalance = 1350 }) {
  return new EmbedBuilder()
    .setColor(BOT_COLORS.SUCCESS)
    .setTitle('🎁 Daily Pro-Claim Dispatched!')
    .setDescription(`Success, @${user.username || user}! You have collected your daily stipend.`)
    .addFields(
      { name: '🔥 Login Streak', value: `${streak} Days`, inline: true },
      { name: '💰 Credited', value: `+${bonusAmount} Credits`, inline: true },
      { name: '💳 New Balance', value: `${newBalance} Credits`, inline: true },
      { name: '⏳ Next Claim Available', value: 'In 24 hours', inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'ChainLink Reward System • Ephemeral' });
}

export function buildLineShiftAlertEmbed({ game, oldLine, newLine, movementReason }) {
  return new EmbedBuilder()
    .setColor(BOT_COLORS.LINEMAKER)
    .setTitle('🚨 CHAINLINK LINE SHIFT DETECTED')
    .setDescription(`Heavy institutional action has triggered an immediate shift on **${game}**.`)
    .addFields(
      { name: 'Previous Line', value: `\`${oldLine}\``, inline: true },
      { name: 'Current Line', value: `\`${newLine}\``, inline: true },
      { name: 'Market Trigger', value: movementReason || 'Sharp influx on underdog', inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'Real-time onSnapshot Broadcast' });
}

// ==========================================
// 3. PRODUCER (ScriptLess) EMBEDS
// ==========================================

export function buildCastTeaEmbed({ show = 'The Golden Rose', dramaLeaders = [] }) {
  const embed = new EmbedBuilder()
    .setColor(BOT_COLORS.PRODUCER)
    .setTitle(`🍸 SCRIPTLESS CAST TEA: ${show.toUpperCase()}`)
    .setDescription('Episode drama breakdown, confessional count power ratings, and villain metrics.')
    .setTimestamp()
    .setFooter({ text: 'ScriptLess Reality Engine • Producer Cut' });

  dramaLeaders.forEach((d, idx) => {
    embed.addFields({
      name: `#${idx + 1} ${d.star} (${d.archetype || 'The Instigator'})`,
      value: `✨ **Drama Score:** \`${d.dramaPoints} pts\`\n` +
             `💬 **Notable On-Screen Moment:** *" ${d.spicyAction} "*\n` +
             `📈 **Roster Value:** \`${d.fantasyCost} pts\``,
      inline: false
    });
  });

  return embed;
}

export function buildGreenRoomEmbed({ user, show = 'The Golden Rose', lockedCast = [] }) {
  const embed = new EmbedBuilder()
    .setColor(BOT_COLORS.PRODUCER)
    .setTitle(`🎬 Green Room Pass: @${user.username || user}`)
    .setDescription(`Your locked roster for tonight's episode of **${show}**. Once the episode airs, no bench substitutions are permitted.`)
    .setTimestamp()
    .setFooter({ text: 'ScriptLess VIP Green Room • Ephemeral' });

  if (lockedCast.length === 0) {
    embed.addFields({
      name: 'No Cast Members Locked',
      value: 'You have not drafted any reality stars for this episode. Roster lock hits 60 minutes before airtime!',
      inline: false
    });
    return embed;
  }

  lockedCast.forEach((c) => {
    embed.addFields({
      name: `⭐ ${c.star} — ${c.role || 'Main Cast'}`,
      value: `Status: **${c.lockStatus || 'LOCKED'}** | Projection: **${c.projectedDrama || 35} Drama Pts**\nBonus Multiplier: \`${c.multiplier || '1.0x'}\``,
      inline: true
    });
  });

  return embed;
}

export function buildSpillEmbed({ show = 'The Golden Rose', rumor, dramaMeter = 88, source = 'Anonymous Production Assistant' }) {
  return new EmbedBuilder()
    .setColor(BOT_COLORS.PRODUCER)
    .setTitle('☕ SCRIPTLESS PRODUCER SPILL')
    .setDescription(`Leaked intel from the cutting room floor for **${show}**.`)
    .addFields(
      { name: '🔥 The Leaked Rumor', value: `*"${rumor}"*`, inline: false },
      { name: '🌡️ Spice Level', value: `\`${dramaMeter}% Drama Verified\``, inline: true },
      { name: '🕵️ Source', value: `\`${source}\``, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'ScriptLess Gossip Wire • Public Broadcast' });
}

export function buildEliminatedEmbed({ show = 'The Golden Rose', week = 5, eliminatedStars = [] }) {
  const embed = new EmbedBuilder()
    .setColor(0x4B5563) // Slate gray
    .setTitle(`🥀 THE WALK OF SHAME: Eliminations (Episode ${week})`)
    .setDescription(`These cast members had their mics cut and were dispatched back to reality.`)
    .setTimestamp()
    .setFooter({ text: 'ScriptLess Elimination Roll' });

  eliminatedStars.forEach((s) => {
    embed.addFields({
      name: `❌ ${s.star} (${s.archetype || 'Cast Member'})`,
      value: `🎙️ **Final Words:** *" ${s.exitQuote || 'They didn\'t deserve my energy anyway.'} "*\n` +
             `📉 **Final Fantasy Contribution:** \`${s.pointsEarned || 12} pts\``,
      inline: false
    });
  });

  return embed;
}

// ==========================================
// 4. CONCIERGE (Club 602) EMBEDS
// ==========================================

export function buildConciergeEventsEmbed({ events = [] }) {
  const embed = new EmbedBuilder()
    .setColor(BOT_COLORS.CONCIERGE)
    .setTitle('🍸 CLUB 602 — UPCOMING GATHERINGS & CALENDAR')
    .setDescription('Exclusive events, private lounge screenings, and member social bookings.')
    .setTimestamp()
    .setFooter({ text: 'Club 602 Concierge • Members & Guests Only' });

  if (events.length === 0) {
    embed.setDescription('No scheduled events this week. Private lounge open for member walk-ins.');
    return embed;
  }

  events.forEach((ev) => {
    embed.addFields({
      name: `📍 ${ev.title}`,
      value: `🗓️ **When:** ${ev.dateStr || 'Tonight at 8:00 PM EST'}\n` +
             `🍸 **Location:** \`${ev.location || 'Penthouse Lounge 602'}\`\n` +
             `👥 **RSVP Status:** \`${ev.rsvpCount || 18} Confirmed\` / \`${ev.capacity || 30} Capacity\`\n` +
             `📝 **Details:** ${ev.details || 'Cocktails, big screen projection, and live game commentary.'}`,
      inline: false
    });
  });

  return embed;
}

export function buildRsvpConfirmationEmbed({ user, eventTitle, status = 'CONFIRMED', guests = 1 }) {
  return new EmbedBuilder()
    .setColor(BOT_COLORS.CONCIERGE)
    .setTitle('🎟️ CLUB 602 RSVP RECEIPT')
    .setDescription(`Your reservation for **${eventTitle}** is logged with the Concierge desk.`)
    .addFields(
      { name: 'Member', value: `@${user.username || user}`, inline: true },
      { name: 'Status', value: `\`${status}\``, inline: true },
      { name: 'Guest Count', value: `\`+${guests} Guest(s)\``, inline: true },
      { name: 'Entry Instructions', value: 'Present your Discord ID badge at the private door entrance.', inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'Club 602 Concierge • Ephemeral RSVP Record' });
}

export function buildScheduleEmbed({ schedule = [] }) {
  const embed = new EmbedBuilder()
    .setColor(BOT_COLORS.CONCIERGE)
    .setTitle('📅 CLUB 602 WEEKLY OPERATING SCHEDULE')
    .setDescription('Weekly lounge hours, member perks, and live broadcast screenings.')
    .setTimestamp()
    .setFooter({ text: 'Club 602 Concierge • Weekly Dispatch' });

  schedule.forEach((item) => {
    embed.addFields({
      name: `${item.day}: ${item.event}`,
      value: `⏰ **Hours:** \`${item.hours}\` | 🍸 **Perk:** ${item.perk}`,
      inline: false
    });
  });

  return embed;
}
