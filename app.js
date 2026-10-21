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
        renderEventsList();
      });
    });

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

  // Update clock & all events every second
  function updateAll() {
    const now = new Date();
    localTimeClock.textContent = now.toLocaleTimeString();

    // Calculate status for all scheduled events
    const processedEvents = SCHEDULED_EVENTS.map(ev => {
      const occ = getNextOccurrence(ev, now);
      if (occ) {
        checkAlerts(ev, occ);
      }
      return {
        ...ev,
        occurrence: occ
      };
    }).filter(e => e.occurrence !== null);

    // Add custom field timers
    const processedCustom = customTimers.map(ct => {
      const msRemaining = Math.max(0, ct.respawnAt - now.getTime());
      const isActive = msRemaining === 0;
      return {
        id: ct.id,
        name: ct.name,
        category: 'custom',
        categoryLabel: 'Custom Boss',
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

    const allCombined = [...processedEvents, ...processedCustom];

    // Sort by soonest occurrence (active events first, then lowest msRemaining)
    allCombined.sort((a, b) => {
      if (a.occurrence.isActive && !b.occurrence.isActive) return -1;
      if (!a.occurrence.isActive && b.occurrence.isActive) return 1;
      return a.occurrence.msRemaining - b.occurrence.msRemaining;
    });

    // Update Hero "Next Up" card
    if (allCombined.length > 0) {
      const nextOne = allCombined[0];
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

        // Progress bar (fills as event gets closer, base scale 2 hours)
        const totalCycle = (nextOne.durationMinutes || 30) * 60 * 1000 * 4;
        const progress = Math.max(0, Math.min(100, 100 - (occ.msRemaining / totalCycle * 100)));
        nextUpProgressFill.style.width = `${progress}%`;
        nextUpProgressFill.className = occ.msRemaining < 900000 ? 'progress-bar-fill urgent' : 'progress-bar-fill';
      }
    }

    renderEventsList(allCombined);
  }

  function renderEventsList(events = null) {
    if (!events) {
      const now = new Date();
      events = SCHEDULED_EVENTS.map(ev => ({
        ...ev,
        occurrence: getNextOccurrence(ev, now)
      })).filter(e => e.occurrence !== null);

      const custom = customTimers.map(ct => {
        const msRemaining = Math.max(0, ct.respawnAt - now.getTime());
        return {
          id: ct.id,
          name: ct.name,
          category: 'custom',
          categoryLabel: 'Custom Boss',
          location: ct.location || 'Custom Field Boss',
          icon: '💀',
          color: '#f87171',
          isCustom: true,
          respawnAt: ct.respawnAt,
          occurrence: {
            targetDate: new Date(ct.respawnAt),
            targetMs: ct.respawnAt,
            msRemaining,
            isActive: msRemaining === 0,
            activeRemainingMs: 0
          }
        };
      });

      events = [...events, ...custom].sort((a, b) => {
        if (a.occurrence.isActive && !b.occurrence.isActive) return -1;
        if (!a.occurrence.isActive && b.occurrence.isActive) return 1;
        return a.occurrence.msRemaining - b.occurrence.msRemaining;
      });
    }

    // Filter by tab
    let filtered = events;
    if (activeTab !== 'all') {
      filtered = filtered.filter(e => e.category === activeTab);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchQuery) ||
        (e.location && e.location.toLowerCase().includes(searchQuery)) ||
        (e.categoryLabel && e.categoryLabel.toLowerCase().includes(searchQuery))
      );
    }

    eventsList.innerHTML = '';

    if (filtered.length === 0) {
      eventsList.innerHTML = `
        <div style="text-align:center; padding: 20px; color: var(--text-dim); font-size: 12px;">
          No events found matching your filter.
        </div>
      `;
      return;
    }

    filtered.forEach(ev => {
      const occ = ev.occurrence;
      const card = document.createElement('div');
      card.className = `event-card ${occ.isActive ? 'active-now' : ''}`;

      const isUrgent = !occ.isActive && occ.msRemaining < 900000; // < 15 mins
      const countdownClass = occ.isActive ? 'active' : (isUrgent ? 'urgent' : '');
      const countdownText = occ.isActive ? 'ACTIVE NOW' : formatTimeRemaining(occ.msRemaining);
      const localTimeText = occ.isActive ? `Ends in ${formatTimeRemaining(occ.activeRemainingMs)}` : formatLocalTargetTime(occ.targetDate);

      // Progress bar calc
      let progressPct = 0;
      if (occ.isActive) {
        progressPct = 100;
      } else {
        const totalCycle = (ev.durationMinutes || 30) * 60 * 1000 * 4;
        progressPct = Math.max(0, Math.min(100, 100 - (occ.msRemaining / totalCycle * 100)));
      }

      card.innerHTML = `
        <div class="card-top">
          <div class="card-title-group">
            <span class="card-icon">${ev.icon || '⚔️'}</span>
            <div class="card-heading">
              <div class="card-title">${ev.name}</div>
              <span class="card-category-badge" style="border-left: 2px solid ${ev.color};">${ev.categoryLabel}</span>
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
          <div class="progress-bar-fill ${occ.isActive ? 'active' : (isUrgent ? 'urgent' : '')}" style="width: ${progressPct}%;"></div>
        </div>

        <div class="card-actions">
          ${ev.isCustom ? `
            <div class="card-schedule-info">Custom Field Stopwatch</div>
            <div style="display:flex; align-items:center; gap:6px;">
              <button class="btn-kill-boss" data-id="${ev.id}" title="Reset timer when killed">🔄 Reset Cooldown</button>
              <button class="icon-btn btn-delete-custom" data-id="${ev.id}" title="Delete Timer">🗑️</button>
            </div>
          ` : `
            <div class="card-schedule-info">
              ${ev.recurrence.type === 'fixed_hours' ? '🔁 Every 3 Hours (' + ev.recurrence.hours.map(h => (h < 10 ? '0' + h : h) + ':00').join(', ') + ')' : (ev.recurrence.type === 'hourly' ? '🔁 Hourly at :' + (ev.recurrence.minute < 10 ? '0' + ev.recurrence.minute : ev.recurrence.minute) : '📅 Weekly')}
            </div>
          `}
        </div>
      `;

      eventsList.appendChild(card);
    });

    // Attach listeners to custom boss buttons
    document.querySelectorAll('.btn-kill-boss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        resetCustomBoss(id);
      });
    });

    document.querySelectorAll('.btn-delete-custom').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        deleteCustomBoss(id);
      });
    });
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

    const newTimer = {
      id: 'custom_' + Date.now(),
      name,
      location,
      cooldownMs,
      respawnAt: Date.now() + cooldownMs
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

  let activeZone = localStorage.getItem('aion2_cube_zone') || 'verteron';
  let cubesDisplayMode = 'map'; // 'map' | 'list'
  let foundCubes = JSON.parse(localStorage.getItem('aion2_found_cubes') || '{}');
  let cubeStatusFilter = 'all'; // 'all' | 'unfound' | 'found'
  let cubeSearchQuery = '';
  let isRadarActive = false;
  let activeRadarPing = null; // { x, y } in percent
  let activeSelectedPin = null;

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

  function initCubesHunter() {
    if (!window.CUBE_DATA) return;

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
        const zoneName = CUBE_DATA.zones[activeZone]?.name || activeZone;
        if (confirm(`Reset all marked cubes for ${zoneName}?`)) {
          const zoneGroups = CUBE_DATA.zones[activeZone]?.groups || [];
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
        triggerRadarPing(activeSelectedPin.x, activeSelectedPin.y);
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
      btnZoomFit.addEventListener('click', fitMapToViewport);
    }

    // Map Pan, Zoom & Interaction events
    setupMapInteractions();

    // Set initial zone and render
    switchZone(activeZone, true);
  }

  function switchZone(zoneKey, isInitial = false) {
    if (!CUBE_DATA.zones[zoneKey]) zoneKey = 'verteron';
    activeZone = zoneKey;
    localStorage.setItem('aion2_cube_zone', activeZone);

    document.querySelectorAll('.zone-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-zone') === activeZone);
    });

    const zoneData = CUBE_DATA.zones[activeZone];
    if (cubesZoneLabel) cubesZoneLabel.textContent = zoneData.name;
    if (mapImg) mapImg.src = zoneData.mapImage;

    clearRadarPing();
    closeInspector();

    updateCubesProgress();
    fitMapToViewport();
    renderMapPins();
    renderChecklist();
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
    if (!window.CUBE_DATA) return;

    const vGroups = CUBE_DATA.zones.verteron?.groups || [];
    const aGroups = CUBE_DATA.zones.altgard?.groups || [];

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
      // Ignore clicks on inspectors, banners, zoom controls, or pins
      if (e.target.closest('#cube-pin-inspector') ||
          e.target.closest('#cube-radar-banner') ||
          e.target.closest('.map-zoom-controls') ||
          e.target.closest('.cube-pin')) {
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
        if (target.closest('#cube-pin-inspector') || target.closest('#cube-radar-banner') || target.closest('.map-zoom-controls')) {
          return;
        }

        if (isRadarActive) {
          const coords = getPlaneCoordinatesFromEvent(e);
          if (coords) {
            triggerRadarPing(coords.pctX, coords.pctY);
          }
        } else {
          // Click on map empty background closes inspector
          if (!target.closest('.cube-pin')) {
            closeInspector();
          }
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

    // Wheel zoom around mouse pointer
    mapViewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = mapViewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.min(4.0, Math.max(0.35, mapScale * zoomFactor));

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

    const planeX = (clickXViewport - mapTranslateX) / mapScale;
    const planeY = (clickYViewport - mapTranslateY) / mapScale;

    if (planeX >= 0 && planeX <= 1000 && planeY >= 0 && planeY <= 1000) {
      return {
        pctX: (planeX / 1000) * 100,
        pctY: (planeY / 1000) * 100
      };
    }
    return null;
  }

  function applyMapTransform() {
    if (mapPlane) {
      mapPlane.style.transform = `translate(${mapTranslateX}px, ${mapTranslateY}px) scale(${mapScale})`;
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

    const newScale = Math.min(4.0, Math.max(0.35, mapScale * factor));
    mapTranslateX = vw - (vw - mapTranslateX) * (newScale / mapScale);
    mapTranslateY = vh - (vh - mapTranslateY) * (newScale / mapScale);
    mapScale = newScale;
    applyMapTransform();
  }

  function focusOnPin(pin) {
    if (!mapViewport) return;
    setCubesDisplayMode('map');

    const vw = mapViewport.clientWidth || 460;
    const vh = mapViewport.clientHeight || 480;

    mapScale = 1.85; // Close-up view
    const pinPxX = (pin.x / 100) * 1000;
    const pinPxY = (pin.y / 100) * 1000;

    mapTranslateX = (vw / 2) - (pinPxX * mapScale);
    mapTranslateY = (vh / 2) - (pinPxY * mapScale);
    applyMapTransform();

    openInspector(pin);
  }

  // Render Map Pins
  function renderMapPins() {
    if (!mapPinsLayer || !window.CUBE_DATA) return;
    mapPinsLayer.innerHTML = '';

    const zoneData = CUBE_DATA.zones[activeZone];
    if (!zoneData) return;

    const groups = zoneData.groups || [];

    groups.forEach(pin => {
      const isFound = !!foundCubes[pin.id];
      const matchesSearch = !cubeSearchQuery ||
        pin.group.toLowerCase().includes(cubeSearchQuery) ||
        pin.area.toLowerCase().includes(cubeSearchQuery);

      let matchesFilter = true;
      if (cubeStatusFilter === 'found') matchesFilter = isFound;
      if (cubeStatusFilter === 'unfound') matchesFilter = !isFound;

      if (!matchesSearch || !matchesFilter) return;

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
        openInspector(pin);
      });

      mapPinsLayer.appendChild(pinEl);
    });
  }

  // Acoustic Radar / Sound Detection Guide
  function triggerRadarPing(rxPct, ryPct) {
    activeRadarPing = { x: rxPct, y: ryPct };

    playRadarSonarChime();

    const zoneData = CUBE_DATA.zones[activeZone];
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

  // Pin Inspector Popover
  function openInspector(pin) {
    activeSelectedPin = pin;
    if (!cubePinInspector) return;

    if (inspectorGroupCode) inspectorGroupCode.textContent = pin.group;
    if (inspectorAreaName) inspectorAreaName.textContent = pin.area;
    if (inspectorSpawnCount) inspectorSpawnCount.textContent = `${pin.count} possible spawn spots`;
    if (inspectorCoordsVal) inspectorCoordsVal.textContent = `${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%`;

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
    if (cubePinInspector) cubePinInspector.classList.add('hidden');
  }

  // Checklist View Renderer
  function renderChecklist() {
    if (!cubesChecklistContainer || !window.CUBE_DATA) return;
    cubesChecklistContainer.innerHTML = '';

    const zoneData = CUBE_DATA.zones[activeZone];
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
      const card = document.createElement('div');
      card.className = `checklist-card ${isFound ? 'is-found' : ''}`;
      card.setAttribute('data-id', pin.id);

      card.innerHTML = `
        <div class="checklist-left">
          <input type="checkbox" class="checklist-checkbox" ${isFound ? 'checked' : ''} title="Mark Found">
          <div class="checklist-group-badge">${pin.group}</div>
          <div class="checklist-info">
            <span class="checklist-area">${pin.area}</span>
            <span class="checklist-meta"><strong>${pin.count} spots</strong> • (${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%)</span>
          </div>
        </div>
        <div class="checklist-actions">
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
