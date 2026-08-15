/* ==========================================================================
   BIRTHDAY VAULT & TIME-LOCKED LINK - JAVASCRIPT LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- Default Configuration ---
  const DEFAULT_NAME = "Chiku";
  const DEFAULT_SURPRISE_URL = "https://jatin2102786.github.io/chikuuuuu-birthday/";
  const DEFAULT_MESSAGE = "Wishing you a happy birthday filled with love, magic, and unforgettable memories!";
  
  // Calculate target date: August 16 at 00:00:00 (12:00 AM Midnight)
  function getDefaultTargetDate() {
    const now = new Date();
    let year = now.getFullYear();
    // August is Month 7 (0-indexed: Jan=0, Aug=7)
    let target = new Date(year, 7, 16, 0, 0, 0);
    
    // If Aug 16 of current year has passed by more than 30 days, default to next year
    if (now.getTime() > target.getTime() + (30 * 24 * 60 * 60 * 1000)) {
      target = new Date(year + 1, 7, 16, 0, 0, 0);
    }
    return target;
  }

  // --- State & LocalStorage Management ---
  let settings = {
    recipientName: DEFAULT_NAME,
    surpriseUrl: DEFAULT_SURPRISE_URL,
    customMessage: DEFAULT_MESSAGE,
    unlockDateISO: getDefaultTargetDate().toISOString(),
    testMode: true
  };

  // Load saved settings
  const savedSettings = localStorage.getItem('birthday_vault_settings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      settings = { ...settings, ...parsed };
      // Always update surpriseUrl to the target link
      settings.surpriseUrl = DEFAULT_SURPRISE_URL;
      settings.testMode = true; // Ensure vault is unlocked by default
    } catch (e) {
      console.warn("Could not parse saved settings:", e);
    }
  }

  // --- DOM Elements ---
  const elDisplayName = document.getElementById('display-name');
  const elDisplaySubtitle = document.getElementById('display-subtitle');
  const elDisplayCustomMessage = document.getElementById('display-custom-message');
  const elSurpriseLink = document.getElementById('surprise-link');
  const elLinkBtnText = document.getElementById('link-btn-text');

  const elDays = document.getElementById('days');
  const elHours = document.getElementById('hours');
  const elMinutes = document.getElementById('minutes');
  const elSeconds = document.getElementById('seconds');

  const elProgressFill = document.getElementById('progress-fill');
  const elLockPercentage = document.getElementById('lock-percentage');
  const elLockStatusLabel = document.getElementById('lock-status-label');

  const elLockedCard = document.getElementById('locked-card');
  const elUnlockedCard = document.getElementById('unlocked-card');
  const elLockedLinkBtn = document.getElementById('locked-link-btn');

  const elStatusPill = document.getElementById('status-pill');
  const elPillText = document.getElementById('pill-text');

  // Controls & Modal
  const elSoundBtn = document.getElementById('sound-btn');
  const elSoundIcon = document.getElementById('sound-icon');
  const elPreviewToggleBtn = document.getElementById('preview-toggle-btn');
  const elSettingsBtn = document.getElementById('settings-btn');
  const elSettingsModal = document.getElementById('settings-modal');
  const elCloseModalBtn = document.getElementById('close-modal-btn');
  const elSaveSettingsBtn = document.getElementById('save-settings-btn');
  const elResetSettingsBtn = document.getElementById('reset-settings-btn');

  // Inputs
  const inputName = document.getElementById('input-name');
  const inputUrl = document.getElementById('input-url');
  const inputDate = document.getElementById('input-date');
  const inputMessage = document.getElementById('input-message');
  const inputTestMode = document.getElementById('input-test-mode');

  // Audio State (Web Audio API)
  let soundEnabled = false;
  let audioCtx = null;
  let hasTriggeredUnlockCelebration = false;

  // --- Sound Effects via Web Audio API ---
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.2, gainVal = 0.1) {
    if (!soundEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playFanfare() {
    if (!soundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => playTone(freq, 'triangle', 0.4, 0.2), idx * 150);
    });
  }

  // --- Update UI with Settings ---
  function applySettingsUI() {
    elDisplayName.textContent = settings.recipientName || DEFAULT_NAME;
    elDisplayCustomMessage.textContent = `"${settings.customMessage || DEFAULT_MESSAGE}"`;
    
    if (elSurpriseLink) {
      elSurpriseLink.href = settings.surpriseUrl || DEFAULT_SURPRISE_URL;
    }

    const unlockDateObj = new Date(settings.unlockDateISO);
    const dateFormatted = unlockDateObj.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const unlockTexts = document.querySelectorAll('.unlock-date-text');
    unlockTexts.forEach(el => el.textContent = dateFormatted);
  }

  // --- Countdown & Time Lock Logic ---
  function updateCountdown() {
    const now = new Date().getTime();
    const target = new Date(settings.unlockDateISO).getTime();
    const diff = target - now;

    const isUnlocked = diff <= 0 || settings.testMode;

    if (isUnlocked) {
      // UNLOCKED STATE
      elDays.textContent = "00";
      elHours.textContent = "00";
      elMinutes.textContent = "00";
      elSeconds.textContent = "00";

      elProgressFill.style.width = "100%";
      elLockPercentage.textContent = "100%";
      elLockStatusLabel.innerHTML = '<i class="fa-solid fa-lock-open" style="color: #ffd700;"></i> Vault Unlocked!';

      elLockedCard.classList.add('hidden');
      elUnlockedCard.classList.remove('hidden');

      elStatusPill.style.borderColor = "var(--accent-gold)";
      elPillText.textContent = "SURPRISE UNLOCKED! 🎁";
      elPillText.style.color = "var(--accent-gold)";

      // Trigger Celebration Fireworks on unlock event
      if (!hasTriggeredUnlockCelebration) {
        hasTriggeredUnlockCelebration = true;
        triggerFireworks();
        playFanfare();
        showToast("🎉 IT'S TIME! Birthday Surprise Unlocked!", 6000);
      }

    } else {
      // LOCKED STATE
      hasTriggeredUnlockCelebration = false;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      elDays.textContent = String(days).padStart(2, '0');
      elHours.textContent = String(hours).padStart(2, '0');
      elMinutes.textContent = String(minutes).padStart(2, '0');
      elSeconds.textContent = String(seconds).padStart(2, '0');

      // Progress Calculation (Assume 30-day countdown cycle)
      const totalDuration = 30 * 24 * 60 * 60 * 1000;
      const elapsed = totalDuration - diff;
      let pct = Math.max(0, Math.min(100, Math.floor((elapsed / totalDuration) * 100)));
      if (isNaN(pct)) pct = 0;

      elProgressFill.style.width = `${pct}%`;
      elLockPercentage.textContent = `${pct}%`;
      elLockStatusLabel.innerHTML = '<i class="fa-solid fa-lock"></i> Vault Locked';

      elLockedCard.classList.remove('hidden');
      elUnlockedCard.classList.add('hidden');

      elStatusPill.style.borderColor = "rgba(157, 78, 221, 0.4)";
      elPillText.textContent = "TIME-LOCKED SURPRISE";
      elPillText.style.color = "#d8b4fe";
    }
  }

  // --- Confetti & Fireworks Effect ---
  function triggerFireworks() {
    if (typeof confetti !== 'function') return;

    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }

  // --- Toast Notifications ---
  function showToast(message, duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-bell"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  // --- Locked Button Click Handler ---
  elLockedLinkBtn.addEventListener('click', (e) => {
    e.preventDefault();

    const now = new Date().getTime();
    const target = new Date(settings.unlockDateISO).getTime();
    const diff = target - now;

    if (settings.testMode || diff <= 0) {
      window.open(settings.surpriseUrl || DEFAULT_SURPRISE_URL, '_blank');
      return;
    }

    playTone(300, 'sawtooth', 0.2);

    elLockedCard.classList.remove('wobble');
    void elLockedCard.offsetWidth; // Trigger reflow
    elLockedCard.classList.add('wobble');

    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    showToast(`🔒 Magic link is locked! Come back in ${days} day(s) on August 16 at 12:00 AM 🎂`);
  });

  // --- Preview / Test Mode Toggle Button ---
  elPreviewToggleBtn.addEventListener('click', () => {
    settings.testMode = !settings.testMode;
    saveSettingsToStorage();
    applySettingsUI();
    updateCountdown();
    playTone(600, 'sine', 0.15);

    if (settings.testMode) {
      const url = settings.surpriseUrl || DEFAULT_SURPRISE_URL;
      showToast(`✨ Test Mode ON: Surprise Unlocked! <a href="${url}" target="_blank" style="color:#ffd700; font-weight:bold; text-decoration:underline; margin-left:6px;">Click to Open Link 🎁</a>`, 8000);
    } else {
      showToast("🔒 Test Mode OFF: Link is locked until target date.", 3500);
    }
  });

  // --- Sound Toggle Button ---
  elSoundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      elSoundIcon.className = "fa-solid fa-volume-high";
      initAudio();
      playTone(880, 'sine', 0.1);
      showToast("🔊 Audio Effects Enabled");
    } else {
      elSoundIcon.className = "fa-solid fa-volume-xmark";
      showToast("🔇 Audio Effects Muted");
    }
  });

  // --- Settings Modal Handlers ---
  elSettingsBtn.addEventListener('click', () => {
    inputName.value = settings.recipientName;
    inputUrl.value = settings.surpriseUrl;
    
    // Format ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
    const dt = new Date(settings.unlockDateISO);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    inputDate.value = dt.toISOString().slice(0, 16);

    inputMessage.value = settings.customMessage;
    inputTestMode.checked = settings.testMode;

    elSettingsModal.classList.remove('hidden');
  });

  elCloseModalBtn.addEventListener('click', () => {
    elSettingsModal.classList.add('hidden');
  });

  function saveSettingsToStorage() {
    localStorage.setItem('birthday_vault_settings', JSON.stringify(settings));
  }

  elSaveSettingsBtn.addEventListener('click', () => {
    settings.recipientName = inputName.value.trim() || DEFAULT_NAME;
    settings.surpriseUrl = inputUrl.value.trim() || DEFAULT_SURPRISE_URL;
    settings.customMessage = inputMessage.value.trim() || DEFAULT_MESSAGE;
    settings.testMode = inputTestMode.checked;

    if (inputDate.value) {
      settings.unlockDateISO = new Date(inputDate.value).toISOString();
    }

    saveSettingsToStorage();
    applySettingsUI();
    updateCountdown();

    elSettingsModal.classList.add('hidden');
    showToast("✅ Settings saved successfully!");
  });

  elResetSettingsBtn.addEventListener('click', () => {
    settings = {
      recipientName: DEFAULT_NAME,
      surpriseUrl: DEFAULT_SURPRISE_URL,
      customMessage: DEFAULT_MESSAGE,
      unlockDateISO: getDefaultTargetDate().toISOString(),
      testMode: false
    };
    saveSettingsToStorage();
    applySettingsUI();
    updateCountdown();

    elSettingsModal.classList.add('hidden');
    showToast("🔄 Settings reset to defaults.");
  });

  // --- Interactive Birthday Cake Candles ---
  const flames = document.querySelectorAll('.flame');
  const relightBtn = document.getElementById('relight-btn');

  flames.forEach(flame => {
    flame.addEventListener('click', () => {
      flame.classList.add('extinguished');
      playTone(500, 'sine', 0.2);

      // Check if all candles are blown out
      const allBlown = Array.from(flames).every(f => f.classList.contains('extinguished'));
      if (allBlown) {
        relightBtn.classList.remove('hidden');
        triggerFireworks();
        playFanfare();
        showToast("🎂 Make a wish! Your candles are blown out ✨", 4000);
      }
    });
  });

  relightBtn.addEventListener('click', () => {
    flames.forEach(f => f.classList.remove('extinguished'));
    relightBtn.classList.add('hidden');
    playTone(700, 'sine', 0.15);
  });

  // --- Canvas Starfield & Floating Balloons ---
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');

  let width, height;
  let stars = [];
  let balloons = [];

  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Create Star objects
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random(),
      speed: Math.random() * 0.02 + 0.005
    });
  }

  // Balloon colors
  const balloonColors = ['#ff007f', '#9d4edd', '#ffd700', '#00f5d4', '#ff70a6'];

  for (let i = 0; i < 12; i++) {
    balloons.push({
      x: Math.random() * width,
      y: height + Math.random() * 400,
      radius: Math.random() * 18 + 14,
      color: balloonColors[Math.floor(Math.random() * balloonColors.length)],
      speed: Math.random() * 0.8 + 0.3,
      swing: Math.random() * 2 + 1,
      swingSpeed: Math.random() * 0.02 + 0.01,
      angle: Math.random() * Math.PI * 2
    });
  }

  function renderCanvas() {
    ctx.clearRect(0, 0, width, height);

    // Draw stars
    stars.forEach(star => {
      star.alpha += star.speed;
      if (star.alpha > 1 || star.alpha < 0) {
        star.speed = -star.speed;
      }
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(star.alpha)})`;
      ctx.fill();
    });

    // Draw balloons
    balloons.forEach(b => {
      b.y -= b.speed;
      b.angle += b.swingSpeed;
      const currentX = b.x + Math.sin(b.angle) * b.swing;

      if (b.y < -50) {
        b.y = height + 50;
        b.x = Math.random() * width;
      }

      // Balloon body
      ctx.beginPath();
      ctx.ellipse(currentX, b.y, b.radius, b.radius * 1.25, 0, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Balloon string
      ctx.beginPath();
      ctx.moveTo(currentX, b.y + b.radius * 1.25);
      ctx.lineTo(currentX + Math.sin(b.angle) * 5, b.y + b.radius * 1.25 + 25);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    requestAnimationFrame(renderCanvas);
  }

  renderCanvas();

  // --- Initial Setup Execution ---
  applySettingsUI();
  updateCountdown();
  setInterval(updateCountdown, 1000);

});
