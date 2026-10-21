// AION 2 Scheduled Events & Boss Database

const REGIONS = {
  'NA_EAST': {
    name: 'US East (NA East - EDT/EST)',
    timeZone: 'America/New_York',
    description: 'Auto-adjusts for Daylight Saving (EDT: UTC-4, EST: UTC-5)'
  },
  'NA_WEST': {
    name: 'US West (NA West - PDT/PST)',
    timeZone: 'America/Los_Angeles',
    description: 'Auto-adjusts for Daylight Saving (PDT: UTC-7, PST: UTC-8)'
  },
  'EU': {
    name: 'Europe (EU - CEST/CET)',
    timeZone: 'Europe/Paris',
    description: 'Auto-adjusts for Daylight Saving (CEST: UTC+2, CET: UTC+1)'
  },
  'KR': {
    name: 'Korea (KR - KST / UTC+9)',
    timeZone: 'Asia/Seoul',
    description: 'Korea Standard Time (UTC+9)'
  },
  'TW': {
    name: 'Taiwan (TW - CST / UTC+8)',
    timeZone: 'Asia/Taipei',
    description: 'Taiwan Standard Time (UTC+8)'
  },
  'UTC': {
    name: 'UTC Time (UTC+0)',
    timeZone: 'UTC',
    description: 'Universal Coordinated Time'
  }
};

// Helper to get real, dynamic offset in hours for any region at a given date
function getRegionOffsetHours(regionKey, date = new Date()) {
  if (regionKey === 'NA') regionKey = 'NA_EAST';
  const reg = REGIONS[regionKey] || REGIONS['NA_EAST'];
  if (!reg.timeZone || reg.timeZone === 'UTC') return 0;
  try {
    const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzStr = date.toLocaleString('en-US', { timeZone: reg.timeZone });
    return (new Date(tzStr) - new Date(utcStr)) / 3600000;
  } catch (e) {
    return 0;
  }
}

// 1. Major World Bosses (4 Major / Raid Bosses)
const MAJOR_WORLD_BOSSES = [
  {
    id: 'kaira',
    name: 'Watcher Kaira',
    category: 'boss',
    categoryLabel: 'Major World Boss',
    tier: 'major',
    tierLabel: 'Major World Boss',
    zone: 'reshanta',
    zoneLabel: 'Chaotic Lower Reshanta',
    level: 50,
    location: 'Abandoned Island',
    icon: '⚔️',
    color: '#f59e0b',
    durationMinutes: 30,
    timeBasis: 'utc',
    type: 'scheduled',
    // Global UTC schedule: every 3 hours starting at 01:00 UTC (1, 4, 7, 10, 13, 16, 19, 22)
    recurrence: {
      type: 'fixed_hours',
      hours: [1, 4, 7, 10, 13, 16, 19, 22],
      minute: 0
    },
    description: 'Chaotic world boss dropping high-tier weapon fragments and Reshanta relics.'
  },
  {
    id: 'nahma',
    name: 'Guardian Lord Nahma',
    category: 'boss',
    categoryLabel: 'Major World Boss',
    tier: 'major',
    tierLabel: 'Major World Boss',
    zone: 'reshanta',
    zoneLabel: 'Chaotic Lower Reshanta',
    level: 50,
    location: 'Reshanta\'s Root',
    icon: '👑',
    color: '#ef4444',
    durationMinutes: 45,
    timeBasis: 'server',
    type: 'scheduled',
    // Fridays (5) and Sundays (0) at 21:00 server time
    recurrence: {
      type: 'weekly_days',
      days: [0, 5],
      hour: 21,
      minute: 0
    },
    description: 'Legendary world raid boss requiring alliance coordination.'
  },
  {
    id: 'executors',
    name: 'Executors (Tamasa & Argo)',
    category: 'boss',
    categoryLabel: 'Major World Boss',
    tier: 'major',
    tierLabel: 'Major World Boss',
    zone: 'reshanta',
    zoneLabel: 'Reshanta\'s Root & Siel\'s Heart',
    level: 50,
    location: 'Reshanta\'s Root & Siel\'s Heart',
    icon: '🗡️',
    color: '#ec4899',
    durationMinutes: 30,
    timeBasis: 'server',
    type: 'scheduled',
    // Mondays (1), Thursdays (4), Saturdays (6) at 21:30 server time
    recurrence: {
      type: 'weekly_days',
      days: [1, 4, 6],
      hour: 21,
      minute: 30
    },
    description: 'Simultaneous tri-boss spawn with contested territory drops.'
  },
  {
    id: 'wb_gartua',
    name: 'Eternal Gartua',
    category: 'boss',
    categoryLabel: 'Major World Boss',
    tier: 'major',
    tierLabel: 'Major World Boss',
    zone: 'verteron',
    zoneLabel: 'Verteron (Elyos)',
    level: 51,
    location: 'Immortal Isle Waters',
    icon: '👑',
    color: '#ef4444',
    type: 'cooldown',
    defaultMinutes: 360, // 6h cooldown
    description: 'Endgame Archboss drawing massive server zergs.'
  }
];

// 2. Scheduled World Events (Rifts, Invasions, Sieges, Resets)
const SCHEDULED_EVENTS = [
  ...MAJOR_WORLD_BOSSES.filter(b => b.type === 'scheduled'),
  {
    id: 'spacetime_rift',
    name: 'Spacetime Rift',
    category: 'rift',
    categoryLabel: 'Rift & PvP',
    location: 'Contested Zones & Enemy Territory',
    icon: '🌀',
    color: '#8b5cf6',
    durationMinutes: 10,
    fullDurationMinutes: 60,
    timeBasis: 'utc',
    // Global UTC schedule: Every 3 hours on the hour (0, 3, 6, 9, 12, 15, 18, 21 UTC)
    recurrence: {
      type: 'fixed_hours',
      hours: [0, 3, 6, 9, 12, 15, 18, 21],
      minute: 0
    },
    description: 'Dimensional gate opens to enemy faction territories. Window is 10m open, 1h active.'
  },
  {
    id: 'artifact_siege',
    name: 'Artifact Siege',
    category: 'siege',
    categoryLabel: 'Siege Battle',
    location: 'Reshanta Artifact Outposts',
    icon: '🏰',
    color: '#06b6d4',
    durationMinutes: 45,
    recurrence: {
      type: 'weekly_days',
      days: [1, 4, 6],
      hour: 21,
      minute: 0
    },
    description: 'Faction fortress & artifact capture contest for faction supremacy.'
  },
  {
    id: 'dimensional_invasion',
    name: 'Dimensional Invasion',
    category: 'rift',
    categoryLabel: 'Invasion',
    location: 'Borderlands',
    icon: '⚡',
    color: '#3b82f6',
    durationMinutes: 15,
    recurrence: {
      type: 'hourly',
      minute: 30
    },
    description: 'Balaur assault wave spawning elite invasion officers.'
  },
  {
    id: 'shugo_festival',
    name: 'Shugo Festival Minigame',
    category: 'event',
    categoryLabel: 'Minigame',
    location: 'Shugo Pavilion',
    icon: '🎭',
    color: '#10b981',
    durationMinutes: 15,
    recurrence: {
      type: 'hourly',
      minute: 0
    },
    description: 'Jump Jump, Hidden Lugi, and Goldrin\'s Treasure rotation.'
  },
  {
    id: 'daily_reset',
    name: 'Daily Server Reset',
    category: 'reset',
    categoryLabel: 'Reset',
    location: 'All Realms',
    icon: '🔄',
    color: '#64748b',
    durationMinutes: 5,
    recurrence: {
      type: 'daily',
      hour: 9,
      minute: 0
    },
    description: 'Daily quest refresh, dungeon entrance resets, and daily missions.'
  },
  {
    id: 'weekly_reset',
    name: 'Weekly Server Reset',
    category: 'reset',
    categoryLabel: 'Reset',
    location: 'All Realms',
    icon: '📅',
    color: '#6366f1',
    durationMinutes: 10,
    recurrence: {
      type: 'weekly_days',
      days: [3],
      hour: 9,
      minute: 0
    },
    description: 'Abyss rank tally, raid locks reset, and Ascension Trials reset.'
  }
];

// 3. Verteron Lesser World Bosses (22 Elyos Regional Field Bosses)
const VERTERON_LESSER_BOSSES = [
  { id: 'wb_dartan', name: 'Silent Dartan', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 48, location: 'Basfelt Ruins', defaultMinutes: 120, icon: '🌊', color: '#06b6d4', type: 'cooldown' },
  { id: 'wb_kashapa', name: 'Soul Ruler Kashapa', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 48, location: 'Fafnite Deposit / Idun\'s Lake', defaultMinutes: 120, icon: '🦂', color: '#3b82f6', type: 'cooldown' },
  { id: 'wb_kernon', name: 'Kernon of the West', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Coastal Camp', defaultMinutes: 120, icon: '🛡️', color: '#10b981', type: 'cooldown' },
  { id: 'wb_neikel', name: 'Neikel of the East', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Cantas Valley Mushroom Tree Peak', defaultMinutes: 120, icon: '🍄', color: '#14b8a6', type: 'cooldown' },
  { id: 'wb_kutar', name: 'Rotten Kutar', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Marsh Outpost', defaultMinutes: 120, icon: '🐊', color: '#84cc16', type: 'cooldown' },
  { id: 'wb_kusan', name: 'Kusan the Mad Gladiator', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Collapsed Pillar', defaultMinutes: 120, icon: '⚔️', color: '#f59e0b', type: 'cooldown' },
  { id: 'wb_garshim', name: 'Ritualist Garshim', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Illusion Oratory Entrance', defaultMinutes: 120, icon: '🔮', color: '#a855f7', type: 'cooldown' },
  { id: 'wb_korin', name: 'Blooming Korin', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Phantom Tenpair Camp', defaultMinutes: 120, icon: '🌸', color: '#ec4899', type: 'cooldown' },
  { id: 'wb_saursus', name: 'Furious Saursus', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Astin Mercenaries Base', defaultMinutes: 120, icon: '🦖', color: '#f97316', type: 'cooldown' },
  { id: 'wb_pnyn', name: 'Bloodfang Pnyn', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Southern Shugo Station', defaultMinutes: 120, icon: '🐺', color: '#ef4444', type: 'cooldown' },
  { id: 'wb_layla', name: 'Heretic Layla', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Pilgrim\'s Respite', defaultMinutes: 120, icon: '🕯️', color: '#eab308', type: 'cooldown' },
  { id: 'wb_lawa', name: 'Black Tentacle Lawa', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Miraju\'s Sacred Grove', defaultMinutes: 120, icon: '🐙', color: '#6366f1', type: 'cooldown' },
  { id: 'wb_kasia', name: 'Phantasm Kasia', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Tolbas Forest', defaultMinutes: 120, icon: '👻', color: '#8b5cf6', type: 'cooldown' },
  { id: 'wb_demiros', name: 'Centurion Demiros', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Verteron Citadel Approach', defaultMinutes: 120, icon: '🏛️', color: '#38bdf8', type: 'cooldown' },
  { id: 'wb_ansas', name: 'Divine Ansas', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Altars of Aion', defaultMinutes: 120, icon: '✨', color: '#facc15', type: 'cooldown' },
  { id: 'wb_moshav', name: 'Harvest Manager Moshav', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Northern Tolbas Farmlands', defaultMinutes: 120, icon: '🌾', color: '#a3e635', type: 'cooldown' },
  { id: 'wb_knash', name: 'Sentinel K\'nash', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Geolus Basin', defaultMinutes: 120, icon: '🗿', color: '#94a3b8', type: 'cooldown' },
  { id: 'wb_aulla', name: 'Scholar Aulla', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Zuun Ruins', defaultMinutes: 120, icon: '📜', color: '#cbd5e1', type: 'cooldown' },
  { id: 'wb_aullamu', name: 'Forest Warrior Aullamu', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Tolbas Pass', defaultMinutes: 120, icon: '🏹', color: '#22c55e', type: 'cooldown' },
  { id: 'wb_taulo', name: 'Chaser Taulo', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Dusk Watch Outpost', defaultMinutes: 120, icon: '🦅', color: '#0ea5e9', type: 'cooldown' },
  { id: 'wb_setram', name: 'Researcher Setram', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Subterranean Lab', defaultMinutes: 120, icon: '🧪', color: '#d946ef', type: 'cooldown' },
  { id: 'wb_teegant', name: 'Bodyguard Teegant', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'verteron', zoneLabel: 'Verteron (Elyos)', level: 45, location: 'Cantas Coast', defaultMinutes: 120, icon: '🛡️', color: '#64748b', type: 'cooldown' }
];

// 4. Altgard Lesser World Bosses (21 Asmodian Regional Field Bosses)
const ALTGARD_LESSER_BOSSES = [
  { id: 'wb_lagta', name: 'High Commander Lagta', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 48, location: 'Elim\'s Rest', defaultMinutes: 120, icon: '⚡', color: '#3b82f6', type: 'cooldown' },
  { id: 'wb_danar', name: 'Melted Danar', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Dredgion Crash Site / Creion Camp', defaultMinutes: 240, icon: '🔥', color: '#f97316', type: 'cooldown' },
  { id: 'wb_aed', name: 'Black Warrior Aed', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Nameless Cemetery', defaultMinutes: 240, icon: '⚔️', color: '#f59e0b', type: 'cooldown' },
  { id: 'wb_rajit', name: 'Faithful Rajit', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Sanctum Outpost / Temporary Retreat', defaultMinutes: 180, icon: '🛡️', color: '#eab308', type: 'cooldown' },
  { id: 'wb_vargor', name: 'Berserker Vargor', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Sanctum Outpost', defaultMinutes: 180, icon: '🪓', color: '#ec4899', type: 'cooldown' },
  { id: 'wb_garsan', name: 'Predator Garsan', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Moslan Forest', defaultMinutes: 180, icon: '🐲', color: '#8b5cf6', type: 'cooldown' },
  { id: 'wb_hardirun', name: 'Addicted Hardirun', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Fafnite Deposit', defaultMinutes: 120, icon: '🧪', color: '#a855f7', type: 'cooldown' },
  { id: 'wb_resana', name: 'Advisor Resana', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Dranactus', defaultMinutes: 120, icon: '👁️', color: '#818cf8', type: 'cooldown' },
  { id: 'wb_lannar', name: 'Blood Warrior Lannar', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Moslan Forest', defaultMinutes: 120, icon: '🩸', color: '#f43f5e', type: 'cooldown' },
  { id: 'wb_kelpina', name: 'Blue Wave Kelpina', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Purifying Forest', defaultMinutes: 120, icon: '🌊', color: '#06b6d4', type: 'cooldown' },
  { id: 'wb_vishwada', name: 'Dark Shadow Vishwada', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Kumrica\'s Cellar', defaultMinutes: 120, icon: '🌑', color: '#64748b', type: 'cooldown' },
  { id: 'wb_trid', name: 'Deceiver Trid', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Uruthumheim', defaultMinutes: 120, icon: '🎭', color: '#eab308', type: 'cooldown' },
  { id: 'wb_newbold', name: 'Desecrator Newbold', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Basfelt Ruins', defaultMinutes: 120, icon: '💀', color: '#94a3b8', type: 'cooldown' },
  { id: 'wb_guruta', name: 'Drakan Battalion Weapon Guruta', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Eastern Gribade Highland', defaultMinutes: 120, icon: '⚙️', color: '#f97316', type: 'cooldown' },
  { id: 'wb_barthien', name: 'Executioner Barthien', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Western Gribade Highland', defaultMinutes: 120, icon: '🪓', color: '#ef4444', type: 'cooldown' },
  { id: 'wb_nutah', name: 'High Overseer Nutah', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Dranactus', defaultMinutes: 120, icon: '🦅', color: '#3b82f6', type: 'cooldown' },
  { id: 'wb_shylak', name: 'Sharp Shylak', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Impetusium Square', defaultMinutes: 120, icon: '🗡️', color: '#ec4899', type: 'cooldown' },
  { id: 'wb_linx', name: 'Special Operations Leader Linx', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Basfelt Ruins', defaultMinutes: 120, icon: '🎯', color: '#14b8a6', type: 'cooldown' },
  { id: 'wb_axios', name: 'Specter Archon Axios', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Basfelt Ruins', defaultMinutes: 120, icon: '👻', color: '#a855f7', type: 'cooldown' },
  { id: 'wb_shujakan', name: 'Veteran Shujakan', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Black Claw Village', defaultMinutes: 120, icon: '🐾', color: '#f59e0b', type: 'cooldown' },
  { id: 'wb_karuka', name: 'Visionary Karuka', tier: 'lesser', tierLabel: 'Lesser World Boss', zone: 'altgard', zoneLabel: 'Altgard (Asmodian)', level: 45, location: 'Black Claw Village', defaultMinutes: 120, icon: '🔮', color: '#8b5cf6', type: 'cooldown' }
];

// 5. Regional Open World Bosses (6 Bosses)
const REGIONAL_OPEN_BOSSES = [
  { id: 'wb_queen_ant', name: 'Queen Ant', tier: 'lesser', tierLabel: 'Regional Boss', zone: 'world', zoneLabel: 'The Hive', level: 45, location: 'The Hive', defaultMinutes: 240, icon: '🐜', color: '#a855f7', type: 'cooldown' },
  { id: 'wb_king_chiton', name: 'King Chiton', tier: 'lesser', tierLabel: 'Regional Boss', zone: 'world', zoneLabel: 'Salintus Shore', level: 45, location: 'Salintus Shore', defaultMinutes: 120, icon: '🦀', color: '#14b8a6', type: 'cooldown' },
  { id: 'wb_colossus', name: 'Desert Colossus', tier: 'lesser', tierLabel: 'Regional Boss', zone: 'world', zoneLabel: 'Eracus Plains', level: 45, location: 'Eracus Plains', defaultMinutes: 360, icon: '🗿', color: '#eab308', type: 'cooldown' },
  { id: 'wb_vanguard', name: 'Balaur Vanguard Chief', tier: 'lesser', tierLabel: 'Regional Boss', zone: 'world', zoneLabel: 'Silentera Canyon', level: 45, location: 'Silentera Canyon', defaultMinutes: 180, icon: '🗡️', color: '#f43f5e', type: 'cooldown' },
  { id: 'wb_nuaka', name: 'Chieftain Nuaka', tier: 'lesser', tierLabel: 'Regional Boss', zone: 'world', zoneLabel: 'Morheim Outpost', level: 45, location: 'Morheim Outpost', defaultMinutes: 120, icon: '🏹', color: '#84cc16', type: 'cooldown' },
  { id: 'wb_brohum', name: 'Mutated Brohum Elder', tier: 'lesser', tierLabel: 'Regional Boss', zone: 'world', zoneLabel: 'Red Mane Cavern', level: 45, location: 'Red Mane Cavern', defaultMinutes: 180, icon: '🦌', color: '#6366f1', type: 'cooldown' }
];

// Master Boss Database: Exactly 53 Unique Bosses (No duplicates)
const ALL_WORLD_BOSSES = [
  ...MAJOR_WORLD_BOSSES,
  ...VERTERON_LESSER_BOSSES,
  ...ALTGARD_LESSER_BOSSES,
  ...REGIONAL_OPEN_BOSSES
];

// Presets mapped from master database
const FIELD_BOSS_PRESETS = ALL_WORLD_BOSSES.map(b => ({
  name: b.name,
  defaultMinutes: b.defaultMinutes || 120,
  location: `${b.location} (${b.tierLabel} - Lv ${b.level})`,
  icon: b.icon,
  color: b.color,
  tier: b.tier,
  zone: b.zone
}));

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REGIONS,
    getRegionOffsetHours,
    SCHEDULED_EVENTS,
    MAJOR_WORLD_BOSSES,
    VERTERON_LESSER_BOSSES,
    ALTGARD_LESSER_BOSSES,
    REGIONAL_OPEN_BOSSES,
    ALL_WORLD_BOSSES,
    FIELD_BOSS_PRESETS
  };
}
