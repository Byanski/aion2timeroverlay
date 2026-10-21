// AION 2 In-Game Overlay Controller
(function() {
  // State
  let currentRegion = localStorage.getItem('aion2_region') || 'NA_EAST';
  if (currentRegion === 'NA') currentRegion = 'NA_EAST';
  let activeTab = 'all';
  let searchQuery = '';
  let isCompact = false;
  let isGhostMode = false;
  let ghostOpacity = parseInt(localStorage.getItem('aion2_ghost_opacity') || '40', 10);
  let customTimers = JSON.parse(localStorage.getItem('aion2_custom_timers') || '[]');
  let soundSettings = {
    enabled: localStorage.getItem('aion2_sound_enabled') !== 'false',
    volume: parseInt(localStorage.getItem('aion2_sound_volume') || '70', 10),
    alert5m: localStorage.getItem('aion2_alert_5m') !== 'false',
    alert1m: localStorage.getItem('aion2_alert_1m') !== 'false',
    alertSpawn: localStorage.getItem('aion2_alert_spawn') !== 'false'
  };

  // Track triggered alerts to prevent duplicate sound triggers
  // Key format: `${eventId}_${targetTimestamp}_${stage}`
  const triggeredAlerts = new Set();

  // DOM Elements
  const localTimeClock = document.getElementById('local-time-clock');
  const serverRegionSelect = document.getElementById('server-region-select');
  const nextUpCard = document.getElementById('next-up-card');
  const nextUpCountdown = document.getElementById('next-up-countdown');
  const nextUpName = document.getElementById('next-up-name');
  const nextUpIcon = document.getElementById('next-up-icon');
  const nextUpMeta = document.getElementById('next-up-meta');
  const nextUpLocation = document.getElementById('next-up-location');
  const nextUpProgressFill = document.getElementById('next-up-progress-fill');
  const eventsList = document.getElementById('events-list');
  const searchInput = document.getElementById('search-input');
  const btnGhostToggle = document.getElementById('btn-ghost-toggle');
  const ghostIcon = document.getElementById('ghost-icon');
  const ghostModeBanner = document.getElementById('ghost-mode-banner');
  const btnCompactToggle = document.getElementById('btn-compact-toggle');
  const btnSettingsToggle = document.getElementById('btn-settings-toggle');
  const settingsDrawer = document.getElementById('settings-drawer');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnMinimize = document.getElementById('btn-minimize');
  const btnClose = document.getElementById('btn-close');
  const overlayContainer = document.getElementById('overlay-container');
  const sliderOpacity = document.getElementById('slider-opacity');
  const sliderGhostOpacity = document.getElementById('slider-ghost-opacity');
  const sliderVolume = document.getElementById('slider-volume');
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const btnTestSound = document.getElementById('btn-test-sound');
  const chkAlert5m = document.getElementById('chk-alert-5m');
  const chkAlert1m = document.getElementById('chk-alert-1m');
  const chkAlertSpawn = document.getElementById('chk-alert-spawn');
  const chkAlwaysOnTop = document.getElementById('chk-always-on-top');
  const btnAddCustomTimer = document.getElementById('btn-add-custom-timer');
  const modalCustomBoss = document.getElementById('modal-custom-boss');
  const btnCancelCustom = document.getElementById('btn-cancel-custom');
  const btnSaveCustom = document.getElementById('btn-save-custom');
  const customBossName = document.getElementById('custom-boss-name');
  const customBossLoc = document.getElementById('custom-boss-loc');
  const customBossHours = document.getElementById('custom-boss-hours');
  const customBossMins = document.getElementById('custom-boss-mins');
  const btnQuickAddAllBosses = document.getElementById('btn-quick-add-all-bosses');
  const customBossPresetSelect = document.getElementById('custom-boss-preset-select');
  const btnAddAllPresets = document.getElementById('btn-add-all-presets');
  const bossSubfilters = document.getElementById('boss-subfilters');
  const btnMarkAllAlive = document.getElementById('btn-mark-all-alive');

  let activeBossFilter = 'all';
  let bossCooldowns = JSON.parse(localStorage.getItem('aion2_boss_cooldowns') || '{}');

  // Initialize
  function init() {
    serverRegionSelect.value = currentRegion;
    serverRegionSelect.addEventListener('change', (e) => {
      currentRegion = e.target.value;
      localStorage.setItem('aion2_region', currentRegion);
      updateAll();
    });

    // Sound configuration
    if (window.soundSynth) {
      window.soundSynth.setVolume(soundSettings.volume / 100);
      window.soundSynth.setMuted(!soundSettings.enabled);
    }
    sliderVolume.value = soundSettings.volume;
    updateSoundBtnState();

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab === 'cubes') {
          switchAppMode('cubes');
          return;
        }
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = tab;

        if (bossSubfilters) {
          if (activeTab === 'boss' || activeTab === 'lesser_boss') {
            bossSubfilters.classList.remove('hidden');
          } else {
            bossSubfilters.classList.add('hidden');
          }
        }

        renderEventsList();
      });
    });

    // Boss Sub-Filter Buttons
    document.querySelectorAll('.boss-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.boss-subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeBossFilter = btn.getAttribute('data-boss-filter') || 'all';
        renderEventsList();
      });
    });

    // Mark All Alive Button
    if (btnMarkAllAlive) {
      btnMarkAllAlive.addEventListener('click', () => {
        bossCooldowns = {};
        localStorage.setItem('aion2_boss_cooldowns', JSON.stringify(bossCooldowns));
        customTimers.forEach(ct => {
          ct.respawnAt = Date.now();
        });
        localStorage.setItem('aion2_custom_timers', JSON.stringify(customTimers));
        updateAll();
      });
    }

    // Search input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderEventsList();
    });

    // Window controls
    if (window.electronAPI) {
      btnMinimize.addEventListener('click', () => window.electronAPI.minimizeWindow());
      btnClose.addEventListener('click', () => window.electronAPI.closeWindow());

      btnGhostToggle.addEventListener('click', toggleGhostMode);

      window.electronAPI.onGhostModeChanged((ghost) => {
        setGhostModeUI(ghost);
      });

      chkAlwaysOnTop.addEventListener('change', (e) => {
        window.electronAPI.setAlwaysOnTop(e.target.checked);
      });
    }

    // Compact toggle
    btnCompactToggle.addEventListener('click', toggleCompactMode);

    // Settings drawer
    btnSettingsToggle.addEventListener('click', () => {
      settingsDrawer.classList.toggle('open');
    });
    btnCloseSettings.addEventListener('click', () => {
      settingsDrawer.classList.remove('open');
    });

    // Opacity sliders
    const savedOpacity = localStorage.getItem('aion2_opacity') || '90';
    sliderOpacity.value = savedOpacity;
    overlayContainer.style.background = `rgba(13, 17, 23, ${savedOpacity / 100})`;
    sliderOpacity.addEventListener('input', (e) => {
      const val = e.target.value;
      localStorage.setItem('aion2_opacity', val);
      overlayContainer.style.background = `rgba(13, 17, 23, ${val / 100})`;
      if (!isGhostMode) {
        overlayContainer.style.opacity = (val / 100).toString();
      }
    });

    if (sliderGhostOpacity) {
      sliderGhostOpacity.value = ghostOpacity;
      sliderGhostOpacity.addEventListener('input', (e) => {
        ghostOpacity = parseInt(e.target.value, 10);
        localStorage.setItem('aion2_ghost_opacity', ghostOpacity);
        if (isGhostMode) {
          overlayContainer.style.opacity = (ghostOpacity / 100).toString();
        }
      });
    }

    // Volume slider
    sliderVolume.addEventListener('input', (e) => {
      soundSettings.volume = parseInt(e.target.value, 10);
      localStorage.setItem('aion2_sound_volume', soundSettings.volume);
      if (window.soundSynth) {
        window.soundSynth.setVolume(soundSettings.volume / 100);
      }
    });

    btnToggleSound.addEventListener('click', () => {
      soundSettings.enabled = !soundSettings.enabled;
      localStorage.setItem('aion2_sound_enabled', soundSettings.enabled);
      if (window.soundSynth) {
        window.soundSynth.setMuted(!soundSettings.enabled);
      }
      updateSoundBtnState();
    });

    btnTestSound.addEventListener('click', () => {
      if (window.soundSynth) {
        window.soundSynth.playSpawnAlert();
      }
    });

    chkAlert5m.checked = soundSettings.alert5m;
    chkAlert5m.addEventListener('change', (e) => {
      soundSettings.alert5m = e.target.checked;
      localStorage.setItem('aion2_alert_5m', e.target.checked);
    });

    chkAlert1m.checked = soundSettings.alert1m;
    chkAlert1m.addEventListener('change', (e) => {
      soundSettings.alert1m = e.target.checked;
      localStorage.setItem('aion2_alert_1m', e.target.checked);
    });

    chkAlertSpawn.checked = soundSettings.alertSpawn;
    chkAlertSpawn.addEventListener('change', (e) => {
      soundSettings.alertSpawn = e.target.checked;
      localStorage.setItem('aion2_alert_spawn', e.target.checked);
    });

    // Custom boss modal
    btnAddCustomTimer.addEventListener('click', () => {
      modalCustomBoss.classList.remove('hidden');
      customBossName.focus();
    });
    btnCancelCustom.addEventListener('click', () => {
      modalCustomBoss.classList.add('hidden');
    });
    btnSaveCustom.addEventListener('click', saveCustomBossTimer);

    // Initial render & heartbeat
    updateAll();
    setInterval(updateAll, 1000);

    // Initialize Mode Navigation & Hidden Cubes Hunter
    initModeNavigation();
    initCubesHunter();
    initBossPresets();
  }

  function updateSoundBtnState() {
    if (soundSettings.enabled) {
      btnToggleSound.className = 'hud-btn active';
      btnToggleSound.textContent = '🔊 Enabled';
    } else {
      btnToggleSound.className = 'hud-btn';
      btnToggleSound.textContent = '🔇 Muted';
    }
  }

  function toggleGhostMode() {
    isGhostMode = !isGhostMode;
    if (window.electronAPI) {
      window.electronAPI.setClickThrough(isGhostMode);
    }
    setGhostModeUI(isGhostMode);
  }

  function setGhostModeUI(ghost) {
    isGhostMode = ghost;
    document.body.classList.toggle('ghost-active', ghost);
    if (ghost) {
      btnGhostToggle.classList.add('ghost-active');
      ghostIcon.textContent = '🔒';
      ghostModeBanner.classList.add('show');
      overlayContainer.style.opacity = (ghostOpacity / 100).toString();
    } else {
      btnGhostToggle.classList.remove('ghost-active');
      ghostIcon.textContent = '🔓';
      ghostModeBanner.classList.remove('show');
      const savedOpacity = localStorage.getItem('aion2_opacity') || '90';
      overlayContainer.style.opacity = (savedOpacity / 100).toString();
    }
  }

  function toggleCompactMode() {
    isCompact = !isCompact;
    document.body.classList.toggle('compact-mode', isCompact);
    btnCompactToggle.classList.toggle('active', isCompact);
    if (window.electronAPI) {
      window.electronAPI.setCompact(isCompact);
    }
  }

  // Calculate next spawn timestamp (in local machine UTC time)
  function getNextOccurrence(event, now = new Date()) {
    const isUtc = event.timeBasis === 'utc';
    const offsetHours = (typeof getRegionOffsetHours === 'function')
      ? getRegionOffsetHours(currentRegion, now)
      : (REGIONS[currentRegion] && REGIONS[currentRegion].offsetHours !== undefined ? REGIONS[currentRegion].offsetHours : 0);
    const serverOffsetMs = offsetHours * 3600 * 1000;

    const nowUtcMs = now.getTime();
    const refMs = isUtc ? nowUtcMs : (nowUtcMs + serverOffsetMs);
    const refDate = new Date(refMs);

    const rec = event.recurrence;
    const portalDurationMs = (event.durationMinutes || 15) * 60 * 1000;

    const candidates = [];
    if (rec.type === 'fixed_hours') {
      for (let d = -1; d <= 2; d++) {
        for (const h of rec.hours) {
          const candMs = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate() + d, h, rec.minute || 0, 0, 0);
          const candLocalMs = isUtc ? candMs : (candMs - serverOffsetMs);
          candidates.push(candLocalMs);
        }
      }
    } else if (rec.type === 'hourly') {
      for (let hOffset = -1; hOffset <= 3; hOffset++) {
        const candMs = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate(), refDate.getUTCHours() + hOffset, rec.minute || 0, 0, 0);
        const candLocalMs = isUtc ? candMs : (candMs - serverOffsetMs);
        candidates.push(candLocalMs);
      }
    } else if (rec.type === 'weekly_days') {
      for (let d = -7; d <= 8; d++) {
        const testDate = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate() + d, rec.hour || 0, rec.minute || 0, 0, 0));
        if (rec.days.includes(testDate.getUTCDay())) {
          const candMs = testDate.getTime();
          const candLocalMs = isUtc ? candMs : (candMs - serverOffsetMs);
          candidates.push(candLocalMs);
        }
      }
    } else if (rec.type === 'daily') {
      for (let d = -1; d <= 2; d++) {
        const candMs = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate() + d, rec.hour || 0, rec.minute || 0, 0, 0);
        const candLocalMs = isUtc ? candMs : (candMs - serverOffsetMs);
        candidates.push(candLocalMs);
      }
    }

    candidates.sort((a, b) => a - b);

    // Check if active right now
    let activeCand = null;
    for (const c of candidates) {
      if (nowUtcMs >= c && nowUtcMs < c + portalDurationMs) {
        activeCand = c;
        break;
      }
    }

    // Find next future spawn
    const nextCand = candidates.find(c => c > nowUtcMs);
    if (!nextCand && !activeCand) return null;

    const targetMs = activeCand ? activeCand : nextCand;
    const targetDate = new Date(targetMs);
    const isActive = activeCand !== null;
    const msRemaining = isActive ? (activeCand + portalDurationMs - nowUtcMs) : (nextCand - nowUtcMs);

    return {
      targetDate,
      targetMs,
      msRemaining,
      isActive,
      activeRemainingMs: isActive ? msRemaining : 0
    };
  }

  function formatTimeRemaining(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}d ${pad(remHours)}h ${pad(mins)}m`;
    }
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }

  function formatLocalTargetTime(date) {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;
    const weekday = date.toLocaleDateString([], { weekday: 'short' });
    return `${weekday} at ${timeStr}`;
  }

  // Check and trigger audio warnings
  function checkAlerts(event, occurrence) {
    if (!soundSettings.enabled || occurrence.isActive) return;

    const ms = occurrence.msRemaining;
    const targetMs = occurrence.targetMs;

    // 5-minute warning (between 4m 58s and 5m 02s)
    if (soundSettings.alert5m && ms <= 300000 && ms > 297000) {
      const key = `${event.id}_${targetMs}_5m`;
      if (!triggeredAlerts.has(key)) {
        triggeredAlerts.add(key);
        if (window.soundSynth) window.soundSynth.play5MinAlert();
      }
    }

    // 1-minute warning (between 58s and 62s)
    if (soundSettings.alert1m && ms <= 60000 && ms > 57000) {
      const key = `${event.id}_${targetMs}_1m`;
      if (!triggeredAlerts.has(key)) {
        triggeredAlerts.add(key);
        if (window.soundSynth) window.soundSynth.play1MinAlert();
      }
    }

    // Spawn / Start alert (between 0s and 2s)
    if (soundSettings.alertSpawn && ms <= 2000 && ms >= 0) {
      const key = `${event.id}_${targetMs}_spawn`;
      if (!triggeredAlerts.has(key)) {
        triggeredAlerts.add(key);
        if (window.soundSynth) window.soundSynth.playSpawnAlert();
      }
    }
  }

  // Process all Major and Lesser World Bosses
  function getProcessedBosses(now) {
    if (typeof ALL_WORLD_BOSSES === 'undefined') return [];
    return ALL_WORLD_BOSSES.map(boss => {
      if (boss.type === 'scheduled') {
        const occ = getNextOccurrence(boss, now);
        if (occ) checkAlerts(boss, occ);
        return {
          ...boss,
          category: 'boss',
          isWorldBoss: true,
          occurrence: occ
        };
      }

      // Cooldown-based Major & Lesser World Bosses
      const respawnAt = bossCooldowns[boss.id];
      let msRemaining = 0;
      let isActive = true;
      let targetDate = now;

      if (respawnAt && respawnAt > now.getTime()) {
        msRemaining = respawnAt - now.getTime();
        isActive = false;
        targetDate = new Date(respawnAt);
        checkAlerts(boss, { targetDate, targetMs: respawnAt, msRemaining, isActive: false });
      }

      return {
        ...boss,
        category: 'boss',
        isWorldBoss: true,
        isBossCooldown: true,
        respawnAt: respawnAt || 0,
        occurrence: {
          targetDate,
          targetMs: targetDate.getTime(),
          msRemaining,
          isActive,
          activeRemainingMs: 0
        }
      };
    });
  }

  // Helper to deduplicate array by item id
  function deduplicateById(items) {
    const seen = new Set();
    return items.filter(item => {
      if (!item || !item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  // Update clock & all events every second
  function updateAll() {
    const now = new Date();
    localTimeClock.textContent = now.toLocaleTimeString();

    // Process all 53 Major and Lesser World Bosses (single source of truth for bosses)
    const processedBosses = getProcessedBosses(now);

    // Process scheduled non-boss events (Rifts, Sieges, Invasions, Resets)
    const processedScheduled = SCHEDULED_EVENTS
      .filter(ev => ev.category !== 'boss')
      .map(ev => {
        const occ = getNextOccurrence(ev, now);
        if (occ) checkAlerts(ev, occ);
        return { ...ev, occurrence: occ };
      }).filter(e => e.occurrence !== null);

    // Add custom field timers
    const processedCustom = customTimers.map(ct => {
      const msRemaining = Math.max(0, ct.respawnAt - now.getTime());
      const isActive = msRemaining === 0;
      return {
        id: ct.id,
        name: ct.name,
        category: 'custom',
        categoryLabel: isActive ? 'SPAWNED / READY' : 'Custom Boss',
        location: ct.location || 'Custom Field Boss',
        icon: '💀',
        color: '#f87171',
        isCustom: true,
        respawnAt: ct.respawnAt,
        occurrence: {
          targetDate: new Date(ct.respawnAt),
          targetMs: ct.respawnAt,
          msRemaining,
          isActive,
          activeRemainingMs: 0
        }
      };
    });

    // Determine upcoming event for Hero "Next Up" card:
    // Considers upcoming scheduled events and bosses currently on cooldown
    const nextCandidates = deduplicateById([
      ...processedScheduled,
      ...processedBosses.filter(b => b.type === 'scheduled' || !b.occurrence.isActive),
      ...processedCustom.filter(c => !c.occurrence.isActive)
    ]);

    nextCandidates.sort((a, b) => {
      if (a.occurrence.isActive && !b.occurrence.isActive) return -1;
      if (!a.occurrence.isActive && b.occurrence.isActive) return 1;
      return a.occurrence.msRemaining - b.occurrence.msRemaining;
    });

    // Update Hero "Next Up" card
    if (nextCandidates.length > 0) {
      const nextOne = nextCandidates[0];
      const occ = nextOne.occurrence;
      nextUpIcon.textContent = nextOne.icon || '⏳';
      nextUpName.textContent = nextOne.name;
      nextUpLocation.textContent = nextOne.location;

      if (occ.isActive) {
        nextUpCountdown.textContent = 'ACTIVE NOW!';
        nextUpCountdown.style.color = '#34d399';
        nextUpMeta.textContent = `Ends in ${formatTimeRemaining(occ.activeRemainingMs)}`;
        nextUpProgressFill.style.width = '100%';
        nextUpProgressFill.className = 'progress-bar-fill active';
      } else {
        nextUpCountdown.textContent = formatTimeRemaining(occ.msRemaining);
        nextUpCountdown.style.color = 'var(--accent-gold)';
        nextUpMeta.textContent = formatLocalTargetTime(occ.targetDate);

        const totalCycle = (nextOne.durationMinutes || (nextOne.defaultMinutes ? nextOne.defaultMinutes : 30)) * 60 * 1000;
        const progress = Math.max(0, Math.min(100, 100 - (occ.msRemaining / totalCycle * 100)));
        nextUpProgressFill.style.width = `${progress}%`;
        nextUpProgressFill.className = occ.msRemaining < 900000 ? 'progress-bar-fill urgent' : 'progress-bar-fill';
      }
    }

    renderEventsList();
  }

  function renderEventsList() {
    const now = new Date();
    const scheduled = SCHEDULED_EVENTS.map(ev => ({
      ...ev,
      occurrence: getNextOccurrence(ev, now)
    })).filter(e => e.occurrence !== null);

    const bosses = getProcessedBosses(now);

    const custom = customTimers.map(ct => {
      const msRemaining = Math.max(0, ct.respawnAt - now.getTime());
      const isReady = msRemaining === 0;
      return {
        id: ct.id,
        name: ct.name,
        category: 'custom',
        categoryLabel: isReady ? 'SPAWNED / READY' : 'Custom Boss',
        location: ct.location || 'Custom Field Boss',
        icon: ct.icon || '⚔️',
        color: ct.color || '#f87171',
        isCustom: true,
        respawnAt: ct.respawnAt,
        occurrence: {
          targetDate: new Date(ct.respawnAt),
          targetMs: ct.respawnAt,
          msRemaining,
          isActive: isReady,
          activeRemainingMs: 0
        }
      };
    });

    let displayList = [];

    if (activeTab === 'all') {
      // Show all scheduled events + all bosses + custom timers (strictly deduplicated)
      displayList = deduplicateById([...scheduled, ...bosses, ...custom]);

      // Sort: Active/Alive first, Major bosses prioritized, then soonest upcoming
      displayList.sort((a, b) => {
        if (a.tier === 'major' && b.tier !== 'major') return -1;
        if (a.tier !== 'major' && b.tier === 'major') return 1;
        if (a.occurrence.isActive && !b.occurrence.isActive) return -1;
        if (!a.occurrence.isActive && b.occurrence.isActive) return 1;
        return a.occurrence.msRemaining - b.occurrence.msRemaining;
      });
    } else if (activeTab === 'major_boss') {
      // Show ONLY the 4 Major World Bosses
      displayList = bosses.filter(b => b.tier === 'major');
      displayList.sort((a, b) => {
        if (a.occurrence.isActive && !b.occurrence.isActive) return -1;
        if (!a.occurrence.isActive && b.occurrence.isActive) return 1;
        return a.occurrence.msRemaining - b.occurrence.msRemaining;
      });
    } else if (activeTab === 'lesser_boss') {
      // Show ONLY the 49 Lesser World Bosses
      displayList = bosses.filter(b => b.tier === 'lesser');

      // Allow subfiltering by zone or status
      if (activeBossFilter === 'verteron') {
        displayList = displayList.filter(b => b.zone === 'verteron');
      } else if (activeBossFilter === 'altgard') {
        displayList = displayList.filter(b => b.zone === 'altgard');
      } else if (activeBossFilter === 'alive') {
        displayList = displayList.filter(b => b.occurrence.isActive);
      } else if (activeBossFilter === 'cooldown') {
        displayList = displayList.filter(b => !b.occurrence.isActive);
      }

      displayList.sort((a, b) => {
        if (activeBossFilter === 'cooldown') return a.occurrence.msRemaining - b.occurrence.msRemaining;
        if (a.occurrence.isActive && !b.occurrence.isActive) return -1;
        if (!a.occurrence.isActive && b.occurrence.isActive) return 1;
        return a.name.localeCompare(b.name);
      });
    } else if (activeTab === 'boss') {
      // Show ALL 53 World Bosses + custom timers
      displayList = deduplicateById([...bosses, ...custom]);

      if (activeBossFilter === 'major') {
        displayList = displayList.filter(b => b.tier === 'major');
      } else if (activeBossFilter === 'verteron') {
        displayList = displayList.filter(b => b.zone === 'verteron');
      } else if (activeBossFilter === 'altgard') {
        displayList = displayList.filter(b => b.zone === 'altgard');
      } else if (activeBossFilter === 'alive') {
        displayList = displayList.filter(b => b.occurrence.isActive);
      } else if (activeBossFilter === 'cooldown') {
        displayList = displayList.filter(b => !b.occurrence.isActive);
      }

      displayList.sort((a, b) => {
        if (activeBossFilter === 'cooldown') return a.occurrence.msRemaining - b.occurrence.msRemaining;
        if (a.tier === 'major' && b.tier !== 'major') return -1;
        if (a.tier !== 'major' && b.tier === 'major') return 1;
        if (a.occurrence.isActive && !b.occurrence.isActive) return -1;
        if (!a.occurrence.isActive && b.occurrence.isActive) return 1;
        return a.occurrence.msRemaining - b.occurrence.msRemaining;
      });
    } else if (activeTab === 'custom') {
      displayList = deduplicateById([...custom, ...bosses.filter(b => !b.occurrence.isActive)]);
      displayList.sort((a, b) => a.occurrence.msRemaining - b.occurrence.msRemaining);
    } else {
      displayList = scheduled.filter(e => e.category === activeTab);
      displayList.sort((a, b) => a.occurrence.msRemaining - b.occurrence.msRemaining);
    }

    // Filter by search query
    if (searchQuery) {
      displayList = displayList.filter(e =>
        e.name.toLowerCase().includes(searchQuery) ||
        (e.location && e.location.toLowerCase().includes(searchQuery)) ||
        (e.categoryLabel && e.categoryLabel.toLowerCase().includes(searchQuery)) ||
        (e.zone && e.zone.toLowerCase().includes(searchQuery)) ||
        (e.tier && e.tier.toLowerCase().includes(searchQuery))
      );
    }

    eventsList.innerHTML = '';

    if (displayList.length === 0) {
      eventsList.innerHTML = `
        <div style="text-align:center; padding: 25px 20px; color: var(--text-dim); font-size: 12px;">
          No bosses or events match the selected filter.
        </div>
      `;
      return;
    }

    displayList.forEach(ev => {
      const occ = ev.occurrence;
      const isCooldownTarget = ev.isBossCooldown || ev.isCustom || ev.type === 'cooldown';
      const isAlive = occ.isActive;

      const card = document.createElement('div');
      card.className = `event-card ${isAlive ? 'active-now' : ''}`;

      const isUrgent = !isAlive && occ.msRemaining < 900000; // < 15 mins
      const countdownClass = isAlive ? 'active' : (isUrgent ? 'urgent' : '');
      const countdownText = isAlive ? 'READY / ALIVE' : formatTimeRemaining(occ.msRemaining);
      const localTimeText = isAlive ? (ev.type === 'scheduled' ? `Ends in ${formatTimeRemaining(occ.activeRemainingMs)}` : 'Spawned in Open World') : formatLocalTargetTime(occ.targetDate);

      // Progress bar calc
      let progressPct = 0;
      if (isAlive) {
        progressPct = 100;
      } else {
        const totalCycle = (ev.defaultMinutes ? ev.defaultMinutes : (ev.durationMinutes || 30)) * 60 * 1000;
        progressPct = Math.max(0, Math.min(100, 100 - (occ.msRemaining / totalCycle * 100)));
      }

      card.innerHTML = `
        <div class="card-top">
          <div class="card-title-group">
            <span class="card-icon">${ev.icon || '⚔️'}</span>
            <div class="card-heading">
              <div class="card-title">${ev.name}</div>
              <span class="card-category-badge" style="border-left: 2px solid ${ev.color};">${ev.categoryLabel || ev.tierLabel || 'World Boss'}</span>
            </div>
          </div>
          <div class="card-countdown-box">
            <div class="card-countdown ${countdownClass}">${countdownText}</div>
          </div>
        </div>

        <div class="card-details">
          <div class="card-info-row">
            <span class="card-info-icon">🕒</span>
            <span class="card-localtime-text">${localTimeText}</span>
          </div>
          <div class="card-info-row">
            <span class="card-info-icon">📍</span>
            <span class="card-location-text">${ev.location}</span>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill ${isAlive ? 'active' : (isUrgent ? 'urgent' : '')}" style="width: ${progressPct}%;"></div>
        </div>

        <div class="card-actions">
          <div class="card-schedule-info">
            ${isCooldownTarget ? (isAlive ? '<span style="color:#34d399; font-weight:700;">🟢 Boss Spawned / Ready to Hunt</span>' : `⏱️ Respawn in ${formatTimeRemaining(occ.msRemaining)} (CD: ${Math.floor((ev.defaultMinutes || 120)/60)}h)`) : (ev.recurrence ? (ev.recurrence.type === 'fixed_hours' ? '🔁 Every 3 Hours' : (ev.recurrence.type === 'hourly' ? '🔁 Hourly' : '📅 Scheduled')) : '🌐 Global Event')}
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${isCooldownTarget ? `
              <button class="btn-kill-boss" data-id="${ev.id}" data-type="${ev.isCustom ? 'custom' : 'boss'}" title="Reset cooldown when boss is defeated">🔄 Just Killed</button>
              ${!isAlive ? `<button class="btn-mark-alive" data-id="${ev.id}" data-type="${ev.isCustom ? 'custom' : 'boss'}" title="Mark boss as spawned / ready now">🟢 Mark Alive</button>` : ''}
            ` : ''}
            ${ev.isCustom ? `
              <button class="icon-btn btn-delete-custom" data-id="${ev.id}" title="Delete Custom Timer">🗑️</button>
            ` : ''}
          </div>
        </div>
      `;

      eventsList.appendChild(card);
    });

    // Attach listeners to boss buttons
    document.querySelectorAll('.btn-kill-boss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const type = e.currentTarget.getAttribute('data-type');
        if (type === 'custom') {
          resetCustomBoss(id);
        } else {
          const boss = (typeof ALL_WORLD_BOSSES !== 'undefined') ? ALL_WORLD_BOSSES.find(b => b.id === id) : null;
          const mins = boss ? (boss.defaultMinutes || 120) : 120;
          bossCooldowns[id] = Date.now() + (mins * 60 * 1000);
          localStorage.setItem('aion2_boss_cooldowns', JSON.stringify(bossCooldowns));
          updateAll();
        }
      });
    });

    document.querySelectorAll('.btn-mark-alive').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const type = e.currentTarget.getAttribute('data-type');
        if (type === 'custom') {
          const item = customTimers.find(t => t.id === id);
          if (item) {
            item.respawnAt = Date.now();
            localStorage.setItem('aion2_custom_timers', JSON.stringify(customTimers));
            updateAll();
          }
        } else {
          delete bossCooldowns[id];
          localStorage.setItem('aion2_boss_cooldowns', JSON.stringify(bossCooldowns));
          updateAll();
        }
      });
    });

    document.querySelectorAll('.btn-delete-custom').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        deleteCustomBoss(id);
      });
    });
  }

  function initBossPresets() {
    if (customBossPresetSelect && typeof FIELD_BOSS_PRESETS !== 'undefined') {
      customBossPresetSelect.innerHTML = '<option value="">-- Choose a Preset Boss (or type custom below) --</option>';
      FIELD_BOSS_PRESETS.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        const hrs = Math.floor(p.defaultMinutes / 60);
        const mins = p.defaultMinutes % 60;
        const timeStr = `${hrs}h${mins > 0 ? ` ${mins}m` : ''}`;
        opt.textContent = `${p.icon || '⚔️'} ${p.name} (${timeStr}) - ${p.location}`;
        customBossPresetSelect.appendChild(opt);
      });

      customBossPresetSelect.addEventListener('change', (e) => {
        const idx = e.target.value;
        if (idx !== '') {
          const p = FIELD_BOSS_PRESETS[parseInt(idx, 10)];
          if (p) {
            customBossName.value = p.name;
            customBossLoc.value = p.location;
            customBossHours.value = Math.floor(p.defaultMinutes / 60);
            customBossMins.value = p.defaultMinutes % 60;
          }
        }
      });
    }

    if (btnQuickAddAllBosses) {
      btnQuickAddAllBosses.addEventListener('click', addAllFieldBosses);
    }

    if (btnAddAllPresets) {
      btnAddAllPresets.addEventListener('click', () => {
        addAllFieldBosses();
        modalCustomBoss.classList.add('hidden');
      });
    }
  }

  function addAllFieldBosses() {
    if (typeof FIELD_BOSS_PRESETS === 'undefined') return;
    const now = Date.now();
    let count = 0;
    FIELD_BOSS_PRESETS.forEach(p => {
      const exists = customTimers.some(t => t.name.toLowerCase() === p.name.toLowerCase());
      if (!exists) {
        const cooldownMs = p.defaultMinutes * 60 * 1000;
        customTimers.push({
          id: 'boss_' + p.name.replace(/\s+/g, '_').toLowerCase(),
          name: p.name,
          location: p.location,
          cooldownMs,
          respawnAt: now + cooldownMs,
          icon: p.icon || '⚔️',
          color: p.color || '#f87171'
        });
        count++;
      }
    });
    localStorage.setItem('aion2_custom_timers', JSON.stringify(customTimers));
    updateAll();
  }

  function saveCustomBossTimer() {
    const name = customBossName.value.trim() || 'Field Boss';
    const location = customBossLoc.value.trim() || 'Open World';
    const hours = parseInt(customBossHours.value, 10) || 0;
    const mins = parseInt(customBossMins.value, 10) || 0;
    const cooldownMs = (hours * 3600 + mins * 60) * 1000;

    if (cooldownMs <= 0) {
      alert('Please enter a cooldown duration greater than 0 minutes.');
      return;
    }

    const matchedPreset = (typeof FIELD_BOSS_PRESETS !== 'undefined') ?
      FIELD_BOSS_PRESETS.find(p => p.name.toLowerCase() === name.toLowerCase()) : null;

    const newTimer = {
      id: 'custom_' + Date.now(),
      name,
      location,
      cooldownMs,
      respawnAt: Date.now() + cooldownMs,
      icon: matchedPreset ? matchedPreset.icon : '⚔️',
      color: matchedPreset ? matchedPreset.color : '#f87171'
    };

    customTimers.push(newTimer);
    localStorage.setItem('aion2_custom_timers', JSON.stringify(customTimers));

    modalCustomBoss.classList.add('hidden');
    customBossName.value = '';
    customBossLoc.value = '';

    updateAll();
  }

  function resetCustomBoss(id) {
    const item = customTimers.find(t => t.id === id);
    if (item) {
      item.respawnAt = Date.now() + (item.cooldownMs || 7200000);
      localStorage.setItem('aion2_custom_timers', JSON.stringify(customTimers));
      updateAll();
    }
  }

  function deleteCustomBoss(id) {
    customTimers = customTimers.filter(t => t.id !== id);
    localStorage.setItem('aion2_custom_timers', JSON.stringify(customTimers));
    updateAll();
  }

  // =========================================================================
  // Multi-Tab Mode Navigation (World Timers vs Hidden Cubes)
  // =========================================================================
  let activeAppMode = localStorage.getItem('aion2_app_mode') || 'timers';

  const btnModeTimers = document.getElementById('btn-mode-timers');
  const btnModeCubes = document.getElementById('btn-mode-cubes');
  const navCubesBadge = document.getElementById('nav-cubes-badge');
  const viewTimers = document.getElementById('view-timers');
  const viewCubes = document.getElementById('view-cubes');

  function initModeNavigation() {
    if (btnModeTimers && btnModeCubes) {
      btnModeTimers.addEventListener('click', () => switchAppMode('timers'));
      btnModeCubes.addEventListener('click', () => switchAppMode('cubes'));
      switchAppMode(activeAppMode, true);
    }
  }

  function switchAppMode(mode, isInitial = false) {
    activeAppMode = mode;
    localStorage.setItem('aion2_app_mode', mode);

    if (mode === 'timers') {
      if (btnModeTimers) btnModeTimers.classList.add('active');
      if (btnModeCubes) btnModeCubes.classList.remove('active');
      if (viewTimers) viewTimers.classList.remove('hidden');
      if (viewCubes) viewCubes.classList.add('hidden');
    } else {
      if (btnModeCubes) btnModeCubes.classList.add('active');
      if (btnModeTimers) btnModeTimers.classList.remove('active');
      if (viewCubes) viewCubes.classList.remove('hidden');
      if (viewTimers) viewTimers.classList.add('hidden');

      // Refresh map plane geometry when becoming visible
      setTimeout(() => {
        fitMapToViewport();
        renderMapPins();
      }, 60);
    }
  }

  // =========================================================================
  // Hidden Cubes Hunter Controller
  // =========================================================================
  const RADAR_RADIUS_PCT = 7.2; // ~54 meters in-game listening radius

  function getCubeData() {
    if (typeof window !== 'undefined' && window.CUBE_DATA) return window.CUBE_DATA;
    if (typeof CUBE_DATA !== 'undefined') return CUBE_DATA;
    return null;
  }

  let activeZone = localStorage.getItem('aion2_cube_zone') || 'verteron';
  let cubesDisplayMode = 'map'; // 'map' | 'list'
  let foundCubes = JSON.parse(localStorage.getItem('aion2_found_cubes') || '{}');
  let cubeStatusFilter = 'all'; // 'all' | 'unfound' | 'found'
  let cubeSearchQuery = '';
  let isRadarActive = false;
  let activeRadarPing = null; // { x, y } in percent
  let activeSelectedPin = null;
  let activeSelectedSpot = null;

  // Pan & Zoom state
  let mapScale = 0.5;
  let mapTranslateX = 0;
  let mapTranslateY = 0;
  let isMapDragging = false;
  let mapDragStartX = 0;
  let mapDragStartY = 0;
  let mapDragOrigTranslateX = 0;
  let mapDragOrigTranslateY = 0;
  let mapHasDragged = false;

  // Hidden Cubes DOM Elements
  const cubesZoneLabel = document.getElementById('cubes-zone-label');
  const cubesFoundCount = document.getElementById('cubes-found-count');
  const cubesTotalCount = document.getElementById('cubes-total-count');
  const cubesPercentage = document.getElementById('cubes-percentage');
  const cubesProgressFill = document.getElementById('cubes-progress-fill');
  const btnResetZoneCubes = document.getElementById('btn-reset-zone-cubes');

  const btnCubesViewMap = document.getElementById('btn-cubes-view-map');
  const btnCubesViewList = document.getElementById('btn-cubes-view-list');
  const cubesMapSection = document.getElementById('cubes-map-section');
  const cubesChecklistSection = document.getElementById('cubes-checklist-section');

  const btnRadarToggle = document.getElementById('btn-radar-toggle');
  const cubeMapSearch = document.getElementById('cube-map-search');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomFit = document.getElementById('btn-zoom-fit');
  const btnClearRadar = document.getElementById('btn-clear-radar');

  const mapViewport = document.getElementById('cube-map-viewport');
  const mapPlane = document.getElementById('cube-map-plane');
  const mapTilesContainer = document.getElementById('cube-map-tiles');
  const mapImg = document.getElementById('cube-map-img');
  const mapRadarSvg = document.getElementById('cube-radar-svg');
  const mapPinsLayer = document.getElementById('cube-pins-layer');

  const cubeRadarBanner = document.getElementById('cube-radar-banner');
  const radarBannerTitle = document.getElementById('radar-banner-title');
  const radarBannerList = document.getElementById('radar-banner-list');
  const btnCloseRadarBanner = document.getElementById('btn-close-radar-banner');

  const cubePinInspector = document.getElementById('cube-pin-inspector');
  const inspectorGroupCode = document.getElementById('inspector-group-code');
  const inspectorAreaName = document.getElementById('inspector-area-name');
  const inspectorSpawnCount = document.getElementById('inspector-spawn-count');
  const inspectorCoordsVal = document.getElementById('inspector-coords-val');
  const btnInspectorToggleFound = document.getElementById('btn-inspector-toggle-found');
  const inspectorFoundIcon = document.getElementById('inspector-found-icon');
  const inspectorFoundLabel = document.getElementById('inspector-found-label');
  const btnInspectorRadarHere = document.getElementById('btn-inspector-radar-here');
  const btnCloseInspector = document.getElementById('btn-close-inspector');

  const checklistSearchInput = document.getElementById('checklist-search-input');
  const cubesChecklistContainer = document.getElementById('cubes-checklist-container');

  // Group expansion state
  let expandedGroupId = null;
  const cubeExpandedBar = document.getElementById('cube-expanded-bar');
  const btnCollapseGroup = document.getElementById('btn-collapse-group');
  const expandedGroupBadge = document.getElementById('expanded-group-badge');
  const expandedGroupTitle = document.getElementById('expanded-group-title');
  const expandedGroupSpotsCount = document.getElementById('expanded-group-spots-count');

  function initCubesHunter() {
    const cubeData = getCubeData();
    if (!cubeData) {
      console.warn('CUBE_DATA not yet ready, waiting...');
      setTimeout(initCubesHunter, 100);
      return;
    }

    // Collapse expanded group button
    if (btnCollapseGroup) {
      btnCollapseGroup.addEventListener('click', collapseGroup);
    }

    // Zone selector buttons
    document.querySelectorAll('.zone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const zone = btn.getAttribute('data-zone');
        switchZone(zone);
      });
    });

    // Subtab display toggles (Map vs Checklist)
    if (btnCubesViewMap && btnCubesViewList) {
      btnCubesViewMap.addEventListener('click', () => setCubesDisplayMode('map'));
      btnCubesViewList.addEventListener('click', () => setCubesDisplayMode('list'));
    }

    // Map filter buttons
    document.querySelectorAll('.cube-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cube-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cubeStatusFilter = btn.getAttribute('data-filter');
        // Synchronize checklist filter buttons
        document.querySelectorAll('.checklist-filter-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-filter') === cubeStatusFilter);
        });
        renderMapPins();
        renderChecklist();
      });
    });

    // Checklist filter buttons
    document.querySelectorAll('.checklist-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.checklist-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cubeStatusFilter = btn.getAttribute('data-filter');
        // Synchronize map filter buttons
        document.querySelectorAll('.cube-filter-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-filter') === cubeStatusFilter);
        });
        renderMapPins();
        renderChecklist();
      });
    });

    // Search inputs synchronization
    if (cubeMapSearch) {
      cubeMapSearch.addEventListener('input', (e) => {
        cubeSearchQuery = e.target.value.toLowerCase().trim();
        if (checklistSearchInput) checklistSearchInput.value = e.target.value;
        renderMapPins();
        renderChecklist();
      });
    }

    if (checklistSearchInput) {
      checklistSearchInput.addEventListener('input', (e) => {
        cubeSearchQuery = e.target.value.toLowerCase().trim();
        if (cubeMapSearch) cubeMapSearch.value = e.target.value;
        renderMapPins();
        renderChecklist();
      });
    }

    // Reset zone progress
    if (btnResetZoneCubes) {
      btnResetZoneCubes.addEventListener('click', () => {
        const cubeData = getCubeData();
        const zoneName = cubeData?.zones[activeZone]?.name || activeZone;
        if (confirm(`Reset all marked cubes for ${zoneName}?`)) {
          const zoneGroups = cubeData?.zones[activeZone]?.groups || [];
          zoneGroups.forEach(g => {
            delete foundCubes[g.id];
          });
          saveFoundCubes();
          updateCubesProgress();
          renderMapPins();
          renderChecklist();
          if (activeSelectedPin) updateInspectorState(activeSelectedPin);
        }
      });
    }

    // Radar toggle
    if (btnRadarToggle) {
      btnRadarToggle.addEventListener('click', () => {
        isRadarActive = !isRadarActive;
        btnRadarToggle.classList.toggle('active', isRadarActive);
        if (mapViewport) mapViewport.classList.toggle('radar-mode', isRadarActive);
      });
    }

    // Clear radar button
    if (btnClearRadar) {
      btnClearRadar.addEventListener('click', clearRadarPing);
    }

    if (btnCloseRadarBanner) {
      btnCloseRadarBanner.addEventListener('click', () => {
        cubeRadarBanner.classList.add('hidden');
      });
    }

    // Inspector buttons
    if (btnCloseInspector) {
      btnCloseInspector.addEventListener('click', closeInspector);
    }

    if (btnInspectorToggleFound) {
      btnInspectorToggleFound.addEventListener('click', () => {
        if (!activeSelectedPin) return;
        const isFound = !foundCubes[activeSelectedPin.id];
        foundCubes[activeSelectedPin.id] = isFound;
        if (!isFound) delete foundCubes[activeSelectedPin.id];
        saveFoundCubes();
        updateCubesProgress();
        renderMapPins();
        renderChecklist();
        updateInspectorState(activeSelectedPin);
      });
    }

    if (btnInspectorRadarHere) {
      btnInspectorRadarHere.addEventListener('click', () => {
        if (!activeSelectedPin) return;
        const targetX = activeSelectedSpot ? activeSelectedSpot.x : activeSelectedPin.x;
        const targetY = activeSelectedSpot ? activeSelectedSpot.y : activeSelectedPin.y;
        triggerRadarPing(targetX, targetY);
      });
    }

    // Zoom buttons
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => zoomBy(1.25));
    }
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => zoomBy(0.8));
    }
    if (btnZoomFit) {
      btnZoomFit.addEventListener('click', () => {
        if (expandedGroupId) {
          collapseGroup();
        }
        fitMapToViewport();
      });
    }

    // Map Pan, Zoom & Interaction events
    setupMapInteractions();

    // Set initial zone and render
    switchZone(activeZone, true);
  }

  function switchZone(zoneKey, isInitial = false) {
    const cubeData = getCubeData();
    if (!cubeData) return;
    if (!cubeData.zones[zoneKey]) zoneKey = 'verteron';
    activeZone = zoneKey;
    localStorage.setItem('aion2_cube_zone', activeZone);

    document.querySelectorAll('.zone-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-zone') === activeZone);
    });

    const zoneData = cubeData.zones[activeZone];
    if (cubesZoneLabel) cubesZoneLabel.textContent = zoneData.name;
    if (mapImg) mapImg.src = zoneData.mapImage;

    // Render 64 high-resolution map tiles (16,384 x 16,384 detail)
    renderMapTiles(activeZone);

    expandedGroupId = null;
    if (cubeExpandedBar) cubeExpandedBar.classList.add('hidden');
    clearRadarPing();
    closeInspector();

    updateCubesProgress();
    fitMapToViewport();
    renderMapPins();
    renderChecklist();
  }

  function renderMapTiles(zoneKey) {
    if (!mapTilesContainer) return;
    mapTilesContainer.innerHTML = '';
    const dir = `assets/maps/tiles/${zoneKey}`;
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const tileImg = document.createElement('img');
        tileImg.className = 'map-tile';
        tileImg.src = `${dir}/tile_${row}_${col}.webp`;
        tileImg.style.left = `${col * 12.5}%`;
        tileImg.style.top = `${row * 12.5}%`;
        tileImg.draggable = false;
        fragment.appendChild(tileImg);
      }
    }
    mapTilesContainer.appendChild(fragment);
  }

  function setCubesDisplayMode(mode) {
    cubesDisplayMode = mode;
    if (mode === 'map') {
      btnCubesViewMap.classList.add('active');
      btnCubesViewList.classList.remove('active');
      cubesMapSection.classList.remove('hidden');
      cubesChecklistSection.classList.add('hidden');
      setTimeout(() => {
        fitMapToViewport();
        renderMapPins();
      }, 50);
    } else {
      btnCubesViewList.classList.add('active');
      btnCubesViewMap.classList.remove('active');
      cubesChecklistSection.classList.remove('hidden');
      cubesMapSection.classList.add('hidden');
      renderChecklist();
    }
  }

  function saveFoundCubes() {
    localStorage.setItem('aion2_found_cubes', JSON.stringify(foundCubes));
  }

  function updateCubesProgress() {
    const cubeData = getCubeData();
    if (!cubeData) return;

    const vGroups = cubeData.zones.verteron?.groups || [];
    const aGroups = cubeData.zones.altgard?.groups || [];

    const vFound = vGroups.filter(g => foundCubes[g.id]).length;
    const aFound = aGroups.filter(g => foundCubes[g.id]).length;
    const totalFound = vFound + aFound;
    const grandTotal = vGroups.length + aGroups.length;

    if (navCubesBadge) {
      navCubesBadge.textContent = `${totalFound}/${grandTotal}`;
    }

    const currentGroups = activeZone === 'verteron' ? vGroups : aGroups;
    const currentFound = activeZone === 'verteron' ? vFound : aFound;
    const pct = currentGroups.length > 0 ? Math.round((currentFound / currentGroups.length) * 100) : 0;

    if (cubesFoundCount) cubesFoundCount.textContent = currentFound;
    if (cubesTotalCount) cubesTotalCount.textContent = currentGroups.length;
    if (cubesPercentage) cubesPercentage.textContent = `${pct}%`;
    if (cubesProgressFill) cubesProgressFill.style.width = `${pct}%`;
  }

  // Map Pan, Zoom & Interaction
  function setupMapInteractions() {
    if (!mapViewport) return;

    mapViewport.addEventListener('mousedown', (e) => {
      // Ignore clicks on inspectors, banners, expanded bar, zoom controls, or pins
      if (e.target.closest('#cube-pin-inspector') ||
          e.target.closest('#cube-radar-banner') ||
          e.target.closest('#cube-expanded-bar') ||
          e.target.closest('.map-zoom-controls') ||
          e.target.closest('.cube-pin') ||
          e.target.closest('.cube-spot-pin')) {
        return;
      }

      isMapDragging = true;
      mapHasDragged = false;
      mapDragStartX = e.clientX;
      mapDragStartY = e.clientY;
      mapDragOrigTranslateX = mapTranslateX;
      mapDragOrigTranslateY = mapTranslateY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMapDragging) return;
      const dx = e.clientX - mapDragStartX;
      const dy = e.clientY - mapDragStartY;

      if (!mapHasDragged && Math.hypot(dx, dy) > 4) {
        mapHasDragged = true;
        mapViewport.classList.add('is-panning');
      }

      if (mapHasDragged) {
        mapTranslateX = mapDragOrigTranslateX + dx;
        mapTranslateY = mapDragOrigTranslateY + dy;
        applyMapTransform();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!isMapDragging) return;
      isMapDragging = false;
      mapViewport.classList.remove('is-panning');

      // If it wasn't a drag, handle map click
      if (!mapHasDragged) {
        const target = e.target;
        if (target.closest('#cube-pin-inspector') ||
            target.closest('#cube-radar-banner') ||
            target.closest('#cube-expanded-bar') ||
            target.closest('.map-zoom-controls') ||
            target.closest('.cube-pin') ||
            target.closest('.cube-spot-pin')) {
          return;
        }

        if (isRadarActive) {
          const coords = getPlaneCoordinatesFromEvent(e);
          if (coords) {
            triggerRadarPing(coords.pctX, coords.pctY);
          }
        } else {
          // Click on map empty background closes inspector
          closeInspector();
        }
      }
    });

    // Right-click on map to drop radar ping immediately
    mapViewport.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const coords = getPlaneCoordinatesFromEvent(e);
      if (coords) {
        triggerRadarPing(coords.pctX, coords.pctY);
      }
    });

    // Wheel zoom around mouse pointer (supports deep zoom up to 30.0x)
    mapViewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = mapViewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
      const newScale = Math.min(30.0, Math.max(0.35, mapScale * zoomFactor));

      // Zoom centered on cursor
      mapTranslateX = mouseX - (mouseX - mapTranslateX) * (newScale / mapScale);
      mapTranslateY = mouseY - (mouseY - mapTranslateY) * (newScale / mapScale);
      mapScale = newScale;

      applyMapTransform();
    }, { passive: false });

    // Window resize
    window.addEventListener('resize', () => {
      if (activeAppMode === 'cubes' && cubesDisplayMode === 'map') {
        fitMapToViewport();
      }
    });
  }

  function getPlaneCoordinatesFromEvent(e) {
    if (!mapViewport) return null;
    const rect = mapViewport.getBoundingClientRect();
    const clickXViewport = e.clientX - rect.left;
    const clickYViewport = e.clientY - rect.top;

    const planeDim = 1000 * mapScale;
    const planeX = clickXViewport - mapTranslateX;
    const planeY = clickYViewport - mapTranslateY;

    if (planeX >= 0 && planeX <= planeDim && planeY >= 0 && planeY <= planeDim) {
      return {
        pctX: (planeX / planeDim) * 100,
        pctY: (planeY / planeDim) * 100
      };
    }
    return null;
  }

  function applyMapTransform() {
    if (mapPlane) {
      // Set actual layout dimensions (NO scale() in CSS transform!)
      // This forces Chromium to render the 16,384x16,384 tiles and DOM text at 100% native monitor resolution,
      // completely eliminating the blur-when-idle bug!
      const planeDim = Math.round(1000 * mapScale);
      mapPlane.style.width = `${planeDim}px`;
      mapPlane.style.height = `${planeDim}px`;
      mapPlane.style.transform = `translate(${mapTranslateX}px, ${mapTranslateY}px)`;
    }
  }

  function fitMapToViewport() {
    if (!mapViewport) return;
    const vw = mapViewport.clientWidth || 460;
    const vh = mapViewport.clientHeight || 480;

    mapScale = Math.max(0.35, Math.min(1.2, Math.min(vw / 1000, vh / 1000) * 0.96));
    mapTranslateX = (vw - 1000 * mapScale) / 2;
    mapTranslateY = (vh - 1000 * mapScale) / 2;
    applyMapTransform();
  }

  function zoomBy(factor) {
    if (!mapViewport) return;
    const vw = mapViewport.clientWidth / 2;
    const vh = mapViewport.clientHeight / 2;

    const newScale = Math.min(30.0, Math.max(0.35, mapScale * factor));
    mapTranslateX = vw - (vw - mapTranslateX) * (newScale / mapScale);
    mapTranslateY = vh - (vh - mapTranslateY) * (newScale / mapScale);
    mapScale = newScale;
    applyMapTransform();
  }

  function focusOnPin(pin) {
    if (!mapViewport) return;
    setCubesDisplayMode('map');
    expandGroup(pin);
  }

  function expandGroup(pin) {
    if (!pin) return;
    expandedGroupId = pin.id;

    if (cubeExpandedBar) {
      if (expandedGroupBadge) expandedGroupBadge.textContent = pin.group;
      if (expandedGroupTitle) expandedGroupTitle.textContent = pin.area;
      const count = pin.spots ? pin.spots.length : pin.count;
      if (expandedGroupSpotsCount) expandedGroupSpotsCount.textContent = `(${count} Possible Spawn Locations)`;
      cubeExpandedBar.classList.remove('hidden');
    }

    if (mapViewport) {
      const vw = mapViewport.clientWidth || 460;
      const vh = mapViewport.clientHeight || 480;

      // Calculate bounding box of spots to choose optimal close-up zoom scale
      let targetScale = 6.5;
      if (pin.spots && pin.spots.length > 0) {
        let minX = 100, maxX = 0, minY = 100, maxY = 0;
        pin.spots.forEach(s => {
          if (s.x < minX) minX = s.x;
          if (s.x > maxX) maxX = s.x;
          if (s.y < minY) minY = s.y;
          if (s.y > maxY) maxY = s.y;
        });
        const spanX = Math.max(0.3, maxX - minX);
        const spanY = Math.max(0.3, maxY - minY);
        const maxSpan = Math.max(spanX, spanY);
        targetScale = Math.min(16.0, Math.max(5.5, 30.0 / maxSpan));
      }

      mapScale = targetScale;
      const planeDim = 1000 * mapScale;
      const pinPlanePxX = (pin.x / 100) * planeDim;
      const pinPlanePxY = (pin.y / 100) * planeDim;

      mapTranslateX = (vw / 2) - pinPlanePxX;
      mapTranslateY = (vh / 2) - pinPlanePxY;
      applyMapTransform();
    }

    renderMapPins();
    openInspector(pin);
  }

  function collapseGroup() {
    expandedGroupId = null;
    if (cubeExpandedBar) cubeExpandedBar.classList.add('hidden');
    closeInspector();
    renderMapPins();
  }

  // Render Map Pins
  function renderMapPins() {
    const cubeData = getCubeData();
    if (!mapPinsLayer || !cubeData) return;
    mapPinsLayer.innerHTML = '';

    const zoneData = cubeData.zones[activeZone];
    if (!zoneData) return;

    const groups = zoneData.groups || [];
    const expandedGroup = expandedGroupId ? groups.find(g => g.id === expandedGroupId) : null;

    groups.forEach(pin => {
      const isFound = !!foundCubes[pin.id];
      const matchesSearch = !cubeSearchQuery ||
        pin.group.toLowerCase().includes(cubeSearchQuery) ||
        pin.area.toLowerCase().includes(cubeSearchQuery);

      let matchesFilter = true;
      if (cubeStatusFilter === 'found') matchesFilter = isFound;
      if (cubeStatusFilter === 'unfound') matchesFilter = !isFound;

      if (!matchesSearch || !matchesFilter) return;

      // When an area group is expanded
      if (expandedGroup) {
        if (pin.id === expandedGroup.id) {
          // Render individual spots
          const spots = pin.spots || [];
          spots.forEach((spot, idx) => {
            const spotEl = document.createElement('div');
            spotEl.className = 'cube-spot-pin';
            if (isFound) spotEl.classList.add('found');
            spotEl.style.left = `${spot.x}%`;
            spotEl.style.top = `${spot.y}%`;

            const terrainClass = (spot.terrain && spot.terrain.toLowerCase().includes('water')) ? 'water' : 'ground';
            const keyBadge = spot.keyRequired ? '<span class="spot-key-icon" title="Key Required">🔑</span>' : '';
            const spotNum = spot.num || (spot.id ? (spot.id.split('_spot_')[1] || (idx + 1)) : (idx + 1));

            spotEl.title = `Group ${pin.group} - Spot #${spotNum} (${spot.terrain || 'Ground'}${spot.keyRequired ? ', Key Required' : ''})`;

            spotEl.innerHTML = `
              <div class="spot-badge ${terrainClass}">
                <span>${spotNum}</span>
              </div>
              ${keyBadge}
            `;

            spotEl.addEventListener('click', (e) => {
              e.stopPropagation();
              openSpotInspector(pin, spot, spotNum);
            });

            mapPinsLayer.appendChild(spotEl);
          });
          return;
        } else {
          // Dim other area groups in background
          const pinEl = document.createElement('div');
          pinEl.className = 'cube-pin dimmed';
          pinEl.setAttribute('data-id', pin.id);
          pinEl.style.left = `${pin.x}%`;
          pinEl.style.top = `${pin.y}%`;
          pinEl.innerHTML = `
            <div class="pin-badge">
              <span class="pin-letter">${pin.group}</span>
              <span class="pin-count">${pin.count}</span>
            </div>
          `;
          mapPinsLayer.appendChild(pinEl);
          return;
        }
      }

      // Default Overview Mode: Render group cluster pins
      const pinEl = document.createElement('div');
      pinEl.className = 'cube-pin';
      pinEl.setAttribute('data-id', pin.id);
      pinEl.style.left = `${pin.x}%`;
      pinEl.style.top = `${pin.y}%`;

      if (isFound) pinEl.classList.add('found');

      // Check if within active radar ping
      if (activeRadarPing) {
        const distPct = Math.hypot(pin.x - activeRadarPing.x, pin.y - activeRadarPing.y);
        if (distPct <= RADAR_RADIUS_PCT) {
          pinEl.classList.add('in-radar');
        }
      }

      pinEl.innerHTML = `
        <div class="pin-badge">
          <span class="pin-letter">${pin.group}</span>
          <span class="pin-count">${pin.count}</span>
        </div>
      `;

      pinEl.addEventListener('click', (e) => {
        e.stopPropagation();
        expandGroup(pin);
      });

      mapPinsLayer.appendChild(pinEl);
    });
  }

  // Acoustic Radar / Sound Detection Guide
  function triggerRadarPing(rxPct, ryPct) {
    activeRadarPing = { x: rxPct, y: ryPct };

    playRadarSonarChime();

    const cubeData = getCubeData();
    const zoneData = cubeData?.zones[activeZone];
    const groups = zoneData?.groups || [];

    // Calculate candidate spawns within listening distance
    const inRange = [];
    groups.forEach(pin => {
      const distPct = Math.hypot(pin.x - rxPct, pin.y - ryPct);
      if (distPct <= RADAR_RADIUS_PCT) {
        const distMeters = Math.round(distPct * 7.5);
        inRange.push({ pin, distPct, distMeters });
      }
    });

    inRange.sort((a, b) => a.distPct - b.distPct);

    // Render SVG circles & scan waves
    renderRadarSvg(rxPct, ryPct, inRange.map(item => item.pin));

    // Re-render pins so matching ones pulse with .in-radar
    renderMapPins();

    // Show banner notification with detection summary and jump chips
    if (cubeRadarBanner && radarBannerList && radarBannerTitle) {
      radarBannerTitle.textContent = `🎧 Detection at (${rxPct.toFixed(1)}%, ${ryPct.toFixed(1)}%)`;

      if (inRange.length === 0) {
        radarBannerList.innerHTML = `<span style="font-size:10.5px; color:var(--text-dim);">No candidate cube spawns within hearing distance (~55m). Click closer to rocky outcrops, ruins, or hillsides.</span>`;
      } else {
        radarBannerList.innerHTML = inRange.map(item => `
          <button class="radar-chip" data-id="${item.pin.id}">
            <span class="chip-code">${item.pin.group}</span>
            <span>${item.pin.area}</span>
            <span class="chip-dist">(~${item.distMeters}m)</span>
          </button>
        `).join('');

        radarBannerList.querySelectorAll('.radar-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const pinId = chip.getAttribute('data-id');
            const targetPin = groups.find(g => g.id === pinId);
            if (targetPin) focusOnPin(targetPin);
          });
        });
      }

      cubeRadarBanner.classList.remove('hidden');
    }
  }

  function renderRadarSvg(rxPct, ryPct, inRangePins) {
    if (!mapRadarSvg) return;

    const cx = (rxPct / 100) * 1000;
    const cy = (ryPct / 100) * 1000;
    const r = (RADAR_RADIUS_PCT / 100) * 1000; // ~72px radius

    let svg = `
      <!-- Listening Range Circle -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.85">
        <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      <!-- Expanding Sonar Ping Ring -->
      <circle cx="${cx}" cy="${cy}" r="4" fill="none" stroke="#fbbf24" stroke-width="1.8" opacity="0.9">
        <animate attributeName="r" values="4;${r}" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <!-- Center Listener Point -->
      <circle cx="${cx}" cy="${cy}" r="4.5" fill="#fbbf24" stroke="#0f172a" stroke-width="1.5" />
    `;

    // Detection rays to in-range pins
    inRangePins.forEach(p => {
      const px = (p.x / 100) * 1000;
      const py = (p.y / 100) * 1000;
      svg += `
        <line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="#38bdf8" stroke-width="1.4" stroke-dasharray="3 3">
          <animate attributeName="stroke-opacity" values="0.3;0.95;0.3" dur="1s" repeatCount="indefinite" />
        </line>
      `;
    });

    mapRadarSvg.innerHTML = svg;
  }

  function clearRadarPing() {
    activeRadarPing = null;
    if (mapRadarSvg) mapRadarSvg.innerHTML = '';
    if (cubeRadarBanner) cubeRadarBanner.classList.add('hidden');
    renderMapPins();
  }

  function playRadarSonarChime() {
    if (soundSettings.enabled && window.soundSynth) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime((soundSettings.volume / 100) * 0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch (e) {
        // Fallback
      }
    }
  }

  // Pin & Spot Inspector Popover
  function openInspector(pin) {
    activeSelectedPin = pin;
    activeSelectedSpot = null;
    if (!cubePinInspector) return;

    if (inspectorGroupCode) inspectorGroupCode.textContent = pin.group;
    if (inspectorAreaName) inspectorAreaName.textContent = pin.area;
    const count = pin.spots ? pin.spots.length : pin.count;
    if (inspectorSpawnCount) inspectorSpawnCount.textContent = `${count} possible spawn spots`;
    if (inspectorCoordsVal) inspectorCoordsVal.textContent = `${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%`;

    updateInspectorState(pin);
    cubePinInspector.classList.remove('hidden');
  }

  function openSpotInspector(pin, spot, spotNum) {
    activeSelectedPin = pin;
    activeSelectedSpot = spot;
    if (!cubePinInspector) return;

    const num = spot.num || spotNum || (spot.id ? (spot.id.split('_spot_')[1] || 1) : 1);
    if (inspectorGroupCode) inspectorGroupCode.textContent = `${pin.group} #${num}`;
    if (inspectorAreaName) inspectorAreaName.textContent = pin.area;
    const terrain = spot.terrain || 'Ground';
    const keyText = spot.keyRequired ? ' • 🔑 Key Required' : ' • No Key';
    if (inspectorSpawnCount) inspectorSpawnCount.textContent = `Spot #${num} (${terrain}${keyText})`;
    if (inspectorCoordsVal) inspectorCoordsVal.textContent = `${spot.x.toFixed(1)}%, ${spot.y.toFixed(1)}%`;

    updateInspectorState(pin);
    cubePinInspector.classList.remove('hidden');
  }

  function updateInspectorState(pin) {
    const isFound = !!foundCubes[pin.id];
    if (btnInspectorToggleFound) {
      btnInspectorToggleFound.classList.toggle('is-found', isFound);
    }
    if (inspectorFoundIcon) {
      inspectorFoundIcon.textContent = isFound ? '✓' : '○';
    }
    if (inspectorFoundLabel) {
      inspectorFoundLabel.textContent = isFound ? 'Mark as Unfound' : 'Mark as Found';
    }
  }

  function closeInspector() {
    activeSelectedPin = null;
    activeSelectedSpot = null;
    if (cubePinInspector) cubePinInspector.classList.add('hidden');
  }

  // Checklist View Renderer
  function renderChecklist() {
    const cubeData = getCubeData();
    if (!cubesChecklistContainer || !cubeData) return;
    cubesChecklistContainer.innerHTML = '';

    const zoneData = cubeData.zones[activeZone];
    if (!zoneData) return;

    const groups = zoneData.groups || [];

    const filtered = groups.filter(pin => {
      const isFound = !!foundCubes[pin.id];
      const matchesSearch = !cubeSearchQuery ||
        pin.group.toLowerCase().includes(cubeSearchQuery) ||
        pin.area.toLowerCase().includes(cubeSearchQuery);

      let matchesFilter = true;
      if (cubeStatusFilter === 'found') matchesFilter = isFound;
      if (cubeStatusFilter === 'unfound') matchesFilter = !isFound;

      return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
      cubesChecklistContainer.innerHTML = `
        <div style="text-align:center; padding:30px 10px; color:var(--text-dim); font-size:12px;">
          No cube spawn groups found matching current filter or search.
        </div>
      `;
      return;
    }

    filtered.forEach(pin => {
      const isFound = !!foundCubes[pin.id];
      const count = pin.spots ? pin.spots.length : pin.count;
      const card = document.createElement('div');
      card.className = `checklist-card ${isFound ? 'is-found' : ''}`;
      card.setAttribute('data-id', pin.id);

      card.innerHTML = `
        <div class="checklist-left">
          <input type="checkbox" class="checklist-checkbox" ${isFound ? 'checked' : ''} title="Mark Found">
          <div class="checklist-group-badge">${pin.group}</div>
          <div class="checklist-info">
            <span class="checklist-area">${pin.area}</span>
            <span class="checklist-meta"><strong>${count} spots</strong> • (${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%)</span>
          </div>
        </div>
        <div class="checklist-actions">
          <button class="hud-btn-mini btn-expand-spots" title="Expand all ${count} spawn spots on map">🔍 Spots (${count})</button>
          <button class="hud-btn-mini btn-view-on-map" title="View pin on map">📍 Map</button>
        </div>
      `;

      // Checkbox listener
      const chk = card.querySelector('.checklist-checkbox');
      chk.addEventListener('change', (e) => {
        const checked = e.target.checked;
        if (checked) {
          foundCubes[pin.id] = true;
        } else {
          delete foundCubes[pin.id];
        }
        card.classList.toggle('is-found', checked);
        saveFoundCubes();
        updateCubesProgress();
        renderMapPins();
        if (activeSelectedPin && activeSelectedPin.id === pin.id) {
          updateInspectorState(pin);
        }
      });

      // Expand spots listener
      const btnExpand = card.querySelector('.btn-expand-spots');
      if (btnExpand) {
        btnExpand.addEventListener('click', () => {
          focusOnPin(pin);
        });
      }

      // View on map button listener
      const btnMap = card.querySelector('.btn-view-on-map');
      btnMap.addEventListener('click', () => {
        focusOnPin(pin);
      });

      cubesChecklistContainer.appendChild(card);
    });
  }

  // Start app
  window.addEventListener('DOMContentLoaded', init);
})();
