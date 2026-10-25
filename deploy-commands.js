import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 1. COMMISSIONER COMMANDS (Hub Guild - QNW / Gridiron Exotics)
 * All public replies
 */
export const commissionerCommands = [
  new SlashCommandBuilder()
    .setName('matchup')
    .setDescription('Pulls head-to-head records and unfiltered Commissioner roasts'),
  new SlashCommandBuilder()
    .setName('shame')
    .setDescription('Audits Fantrax rosters for injured players, byes, and slacking managers'),
  new SlashCommandBuilder()
    .setName('guillotine-check')
    .setDescription('Checks the current Chop league danger block and cut-line score')
].map(cmd => cmd.toJSON());

/**
 * 2. LINEMAKER COMMANDS (Hub Guild - ChainLink)
 * All ephemeral replies (ephemeral: true) to prevent megachannel clutter
 */
export const linemakerCommands = [
  new SlashCommandBuilder()
    .setName('board')
    .setDescription('Displays open ChainLink betting windows, lines, and stuck picks (Ephemeral)'),
  new SlashCommandBuilder()
    .setName('my-action')
    .setDescription('Displays your personal pending slips, odds, and risk totals (Ephemeral)'),
  new SlashCommandBuilder()
    .setName('pro-claim')
    .setDescription('Claims your daily login stipend and streak bonus (Ephemeral)')
].map(cmd => cmd.toJSON());

/**
 * 3. PRODUCER COMMANDS (Hub Guild - ScriptLess)
 * Mixed replies (Public drama / Ephemeral green room)
 */
export const producerCommands = [
  new SlashCommandBuilder()
    .setName('cast-tea')
    .setDescription('Shows top drama scorers and confessional counts for reality rosters')
    .addStringOption(option =>
      option.setName('show')
        .setDescription('Reality show name (e.g., The Golden Rose)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('green-room')
    .setDescription('Displays your locked-in cast roster for tonight\'s episode (Ephemeral)')
    .addStringOption(option =>
      option.setName('show')
        .setDescription('Reality show name')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('spill')
    .setDescription('Leaks verified backstage drama rumors and cutting-room gossip')
    .addStringOption(option =>
      option.setName('show')
        .setDescription('Reality show name')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('eliminated')
    .setDescription('Lists reality stars sent home and eliminated this week')
    .addStringOption(option =>
      option.setName('show')
        .setDescription('Reality show name')
        .setRequired(false)
    )
].map(cmd => cmd.toJSON());

/**
 * 4. CONCIERGE COMMANDS (Standalone Club 602 Server)
 */
export const conciergeCommands = [
  new SlashCommandBuilder()
    .setName('events')
    .setDescription('Lists upcoming Club 602 gatherings, screenings, and private lounge events'),
  new SlashCommandBuilder()
    .setName('rsvp')
    .setDescription('RSVP to an upcoming gathering or review your guestlist pass (Ephemeral)')
    .addStringOption(option =>
      option.setName('event')
        .setDescription('Event name or title')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('guests')
        .setDescription('Number of additional guests')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Displays the weekly Club 602 operating schedule, screenings, and perks')
].map(cmd => cmd.toJSON());

export async function deployAllCommands() {
  console.log('====================================================');
  console.log('🚀 Deploying Club 602 & QNW Monorepo Slash Commands');
  console.log('====================================================');

  const hubGuildId = process.env.HUB_GUILD_ID;
  const club602GuildId = process.env.CLUB602_GUILD_ID;

  const results = {
    commissioner: { count: commissionerCommands.length, status: 'SKIPPED' },
    linemaker: { count: linemakerCommands.length, status: 'SKIPPED' },
    producer: { count: producerCommands.length, status: 'SKIPPED' },
    concierge: { count: conciergeCommands.length, status: 'SKIPPED' }
  };

  // Helper to deploy
  async function deployBot(name, token, clientId, guildId, commands) {
    if (!token || !clientId) {
      console.warn(`[Deploy] Skipping ${name}: Missing ${name.toUpperCase()}_TOKEN or ${name.toUpperCase()}_CLIENT_ID`);
      return { status: 'MISSING_ENV', reason: 'Token or Client ID missing' };
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
      if (guildId) {
        console.log(`[Deploy] Registering ${commands.length} commands for ${name} in Guild (${guildId})...`);
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands }
        );
        console.log(`[Deploy] ✅ Successfully registered commands for ${name} to Guild ${guildId}`);
        return { status: 'SUCCESS', target: `Guild: ${guildId}` };
      } else {
        console.log(`[Deploy] Registering ${commands.length} commands globally for ${name}...`);
        await rest.put(
          Routes.applicationCommands(clientId),
          { body: commands }
        );
        console.log(`[Deploy] ✅ Successfully registered global commands for ${name}`);
        return { status: 'SUCCESS', target: 'Global' };
      }
    } catch (err) {
      console.error(`[Deploy] ❌ Error deploying for ${name}:`, err.message);
      return { status: 'ERROR', error: err.message };
    }
  }

  // 1. Commissioner -> Hub Guild
  results.commissioner = await deployBot(
    'Commissioner',
    process.env.COMMISSIONER_TOKEN,
    process.env.COMMISSIONER_CLIENT_ID,
    hubGuildId,
    commissionerCommands
  );

  // 2. Linemaker -> Hub Guild
  results.linemaker = await deployBot(
    'Linemaker',
    process.env.LINEMAKER_TOKEN,
    process.env.LINEMAKER_CLIENT_ID,
    hubGuildId,
    linemakerCommands
  );

  // 3. Producer -> Hub Guild
  results.producer = await deployBot(
    'Producer',
    process.env.PRODUCER_TOKEN,
    process.env.PRODUCER_CLIENT_ID,
    hubGuildId,
    producerCommands
  );

  // 4. Concierge -> Standalone Club 602 Guild
  results.concierge = await deployBot(
    'Concierge',
    process.env.CONCIERGE_TOKEN,
    process.env.CONCIERGE_CLIENT_ID,
    club602GuildId,
    conciergeCommands
  );

  console.log('====================================================');
  console.log('Deploy Summary:', results);
  return results;
}

// Auto-run when executed directly
if (process.argv[1]?.endsWith('deploy-commands.js')) {
  deployAllCommands().catch(console.error);
}
