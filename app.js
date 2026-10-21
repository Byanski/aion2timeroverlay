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
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.getAttribute('data-tab');
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
    const offsetHours = (typeof getRegionOffsetHours === 'function')
      ? getRegionOffsetHours(currentRegion, now)
      : (REGIONS[currentRegion] && REGIONS[currentRegion].offsetHours !== undefined ? REGIONS[currentRegion].offsetHours : 0);
    const serverOffsetMs = offsetHours * 3600 * 1000;
    const rec = event.recurrence;

    // Current time shifted to server time
    const nowUtcMs = now.getTime();
    const serverNowMs = nowUtcMs + serverOffsetMs;
    const serverDate = new Date(serverNowMs);

    let nextServerDate = null;
    let isActive = false;
    let activeRemainingMs = 0;

    const eventDurationMs = (event.durationMinutes || 15) * 60 * 1000;

    if (rec.type === 'fixed_hours') {
      // Find candidate hours today or tomorrow in server time
      const candidates = [];
      for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
        for (const h of rec.hours) {
          const candidate = new Date(Date.UTC(
            serverDate.getUTCFullYear(),
            serverDate.getUTCMonth(),
            serverDate.getUTCDate() + dayOffset,
            h,
            rec.minute || 0,
            0,
            0
          ));
          candidates.push(candidate);
        }
      }

      // Check if one is currently active
      for (const cand of candidates) {
        const candServerMs = cand.getTime();
        if (serverNowMs >= candServerMs && serverNowMs < candServerMs + eventDurationMs) {
          isActive = true;
          activeRemainingMs = (candServerMs + eventDurationMs) - serverNowMs;
          nextServerDate = cand;
          break;
        }
      }

      if (!isActive) {
        // Find first candidate in future
        for (const cand of candidates) {
          if (cand.getTime() > serverNowMs) {
            nextServerDate = cand;
            break;
          }
        }
      }
    } else if (rec.type === 'hourly') {
      const targetMin = rec.minute || 0;
      // Candidate: this hour or next hour
      let cand = new Date(Date.UTC(
        serverDate.getUTCFullYear(),
        serverDate.getUTCMonth(),
        serverDate.getUTCDate(),
        serverDate.getUTCHours(),
        targetMin,
        0,
        0
      ));

      if (serverNowMs >= cand.getTime() && serverNowMs < cand.getTime() + eventDurationMs) {
        isActive = true;
        activeRemainingMs = (cand.getTime() + eventDurationMs) - serverNowMs;
        nextServerDate = cand;
      } else if (cand.getTime() > serverNowMs) {
        nextServerDate = cand;
      } else {
        // Next hour
        nextServerDate = new Date(cand.getTime() + 3600 * 1000);
      }
    } else if (rec.type === 'weekly_days') {
      const candidates = [];
      for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
        const testDate = new Date(Date.UTC(
          serverDate.getUTCFullYear(),
          serverDate.getUTCMonth(),
          serverDate.getUTCDate() + dayOffset,
          rec.hour || 0,
          rec.minute || 0,
          0,
          0
        ));
        const dayOfWeek = testDate.getUTCDay();
        if (rec.days.includes(dayOfWeek)) {
          candidates.push(testDate);
        }
      }

      // Check active
      for (const cand of candidates) {
        const candServerMs = cand.getTime();
        if (serverNowMs >= candServerMs && serverNowMs < candServerMs + eventDurationMs) {
          isActive = true;
          activeRemainingMs = (candServerMs + eventDurationMs) - serverNowMs;
          nextServerDate = cand;
          break;
        }
      }

      if (!isActive) {
        for (const cand of candidates) {
          if (cand.getTime() > serverNowMs) {
            nextServerDate = cand;
            break;
          }
        }
      }
    } else if (rec.type === 'daily') {
      const candidates = [];
      for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
        const cand = new Date(Date.UTC(
          serverDate.getUTCFullYear(),
          serverDate.getUTCMonth(),
          serverDate.getUTCDate() + dayOffset,
          rec.hour || 0,
          rec.minute || 0,
          0,
          0
        ));
        candidates.push(cand);
      }

      for (const cand of candidates) {
        const candServerMs = cand.getTime();
        if (serverNowMs >= candServerMs && serverNowMs < candServerMs + eventDurationMs) {
          isActive = true;
          activeRemainingMs = (candServerMs + eventDurationMs) - serverNowMs;
          nextServerDate = cand;
          break;
        }
      }

      if (!isActive) {
        for (const cand of candidates) {
          if (cand.getTime() > serverNowMs) {
            nextServerDate = cand;
            break;
          }
        }
      }
    }

    if (!nextServerDate) {
      return null;
    }

    // Convert server target back to local machine timestamp
    const nextLocalUtcMs = nextServerDate.getTime() - serverOffsetMs;
    const nextLocalDate = new Date(nextLocalUtcMs);
    const msRemaining = isActive ? activeRemainingMs : (nextLocalUtcMs - nowUtcMs);

    return {
      targetDate: nextLocalDate,
      targetMs: nextLocalUtcMs,
      msRemaining,
      isActive,
      activeRemainingMs
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

  // Start app
  window.addEventListener('DOMContentLoaded', init);
})();
