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
  // Support legacy 'NA' key
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

const SCHEDULED_EVENTS = [
  {
    id: 'kaira',
    name: 'Watcher Kaira',
    category: 'boss',
    categoryLabel: 'World Boss',
    location: 'Chaotic Lower Reshanta (Abandoned Island)',
    icon: '⚔️',
    color: '#f59e0b',
    durationMinutes: 30,
    timeBasis: 'utc',
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
    location: 'Chaotic Lower Reshanta (Reshanta\'s Root)',
    icon: '👑',
    color: '#ef4444',
    durationMinutes: 45,
    timeBasis: 'server',
    // Fridays (5) and Sundays (0) at 21:00 server time
    recurrence: {
      type: 'weekly_days',
      days: [0, 5], // 0 = Sunday, 5 = Friday
      hour: 21,
      minute: 0
    },
    description: 'Legendary world raid boss requiring alliance coordination.'
  },
  {
    id: 'executors',
    name: 'Executors (Tamasa & Argo)',
    category: 'boss',
    categoryLabel: 'World Boss',
    location: 'Reshanta\'s Root & Siel\'s Heart',
    icon: '🗡️',
    color: '#ec4899',
    durationMinutes: 30,
    timeBasis: 'server',
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
    id: 'spacetime_rift',
    name: 'Spacetime Rift',
    category: 'rift',
    categoryLabel: 'Rift & PvP',
    location: 'Contested Zones & Enemy Territory',
    icon: '🌀',
    color: '#8b5cf6',
    durationMinutes: 10, // 10 min portal opening window
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
    // Mondays (1), Thursdays (4), Saturdays (6) at 21:00 server time
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
    // Every hour at :30 past the hour
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
    // Hourly at :00 (on the hour)
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
    // Every day at 09:00 server time
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
    // Wednesdays (3) at 09:00 server time
    recurrence: {
      type: 'weekly_days',
      days: [3],
      hour: 9,
      minute: 0
    },
    description: 'Abyss rank tally, raid locks reset, and Ascension Trials reset.'
  }
];

const FIELD_BOSS_PRESETS = [
  { name: 'Queen Ant', defaultMinutes: 240, location: 'The Hive' },
  { name: 'King Chiton', defaultMinutes: 120, location: 'Salintus Shore' },
  { name: 'Desert Colossus', defaultMinutes: 360, location: 'Eracus Plains' },
  { name: 'Balaur Vanguard Chief', defaultMinutes: 180, location: 'Silentera Canyon' }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { REGIONS, getRegionOffsetHours, SCHEDULED_EVENTS, FIELD_BOSS_PRESETS };
}
