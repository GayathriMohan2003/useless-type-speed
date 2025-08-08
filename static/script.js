const SAMPLE_TEXTS = [
  "Typing quickly is a useful skill.",
  "Flask makes backend work easy.",
  "Practice daily for better results.",
  "Consistent practice improves your typing speed and accuracy.",
  "Challenge yourself and keep improving every day."
];

const inputEl = document.getElementById('input');
const textEl = document.getElementById('text');
const timerEl = document.getElementById('timer');
const wpmEl = document.getElementById('wpm');
const accuracyEl = document.getElementById('accuracy');
const restartBtn = document.getElementById('restart');
const usernameEl = document.getElementById('username');
const toggleSoundBtn = document.getElementById('toggle-sound');

const TEST_DURATION = 60;  // seconds
const SPEED_THRESHOLD = 20; // WPM threshold for success sound

let timer = TEST_DURATION;
let timerId = null;
let started = false;
let startTime = null;
let targetText = "";

const keypressSound = new Audio('/static/sound/keypress.wav');
const errorSound = new Audio('/static/sound/error.wav');
const successSound = new Audio('/static/sound/success.wav');

keypressSound.volume = 0.5;
errorSound.volume = 0.5;
successSound.volume = 0.5;

let soundEnabled = true;

function playSound(sound) {
  if (!soundEnabled) return;
  sound.play().catch(() => {});
}

function pickRandomText() {
  return SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
}

function startTimer() {
  if (started) return;
  started = true;
  startTime = Date.now();

  timerId = setInterval(() => {
    timer--;
    timerEl.textContent = timer;

    if (timer <= 0) {
      clearInterval(timerId);
      inputEl.disabled = true;
      finalizeTest();
    }
  }, 1000);
}

function updateStats() {
  const typed = inputEl.value;
  const elapsedMinutes = (Date.now() - startTime) / 1000 / 60 || 1/60;

  const wordsTyped = typed.trim().split(/\s+/).filter(w => w.length > 0).length;
  const wpm = Math.round(wordsTyped / elapsedMinutes);
  wpmEl.textContent = isNaN(wpm) || !isFinite(wpm) ? 0 : wpm;

  let correctChars = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === targetText[i]) correctChars++;
  }
  const accuracy = typed.length > 0 ? Math.round((correctChars / typed.length) * 100) : 100;
  accuracyEl.textContent = accuracy + "%";
}

function finalizeTest() {
  updateStats();
  playSound(successSound);
  alert("Time's up! Your test is finished.");
  sendScore();
}

function sendScore() {
  const name = usernameEl.value.trim() || "Anonymous";
  const wpm = parseInt(wpmEl.textContent) || 0;
  const accuracy = parseInt(accuracyEl.textContent) || 0;

  fetch('/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, wpm, accuracy })
  })
  .then(response => response.json())
  .then(data => {
    alert(data.message);
    loadLeaderboard();
    // Optionally reset test or disable input here
  });
}

function newTest() {
  timer = TEST_DURATION;
  timerEl.textContent = timer;
  started = false;
  startTime = null;
  targetText = pickRandomText();
  textEl.textContent = targetText;
  inputEl.value = "";
  inputEl.disabled = false;
  wpmEl.textContent = "0";
  accuracyEl.textContent = "100%";
  inputEl.focus();
  if (timerId) clearInterval(timerId);
}

let lastSpeedSoundTime = 0;

inputEl.addEventListener('input', () => {
  playSound(keypressSound);

  const now = Date.now();
  const typed = inputEl.value;
  if (typed.length === 0) return;

  if (!started) startTimer();
  const elapsedMinutes = (Date.now() - startTime) / 1000 / 60 || 1/60;

  const wordsTyped = typed.trim().split(/\s+/).filter(w => w.length > 0).length;
  const currentWpm = wordsTyped / elapsedMinutes;

  if (now - lastSpeedSoundTime > 500) {  // debounce 500ms
    if (currentWpm >= SPEED_THRESHOLD) {
      playSound(successSound);
    } else {
      playSound(errorSound);
    }
    lastSpeedSoundTime = now;
  }

  updateStats();
});

restartBtn.addEventListener('click', () => {
  newTest();
});

toggleSoundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  toggleSoundBtn.textContent = soundEnabled ? 'Mute 🔊' : 'Unmute 🔈';
});

function loadLeaderboard() {
  fetch('/leaderboard')
    .then(response => response.json())
    .then(data => {
      const tbody = document.getElementById('leaderboard-body');
      tbody.innerHTML = '';
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 10px;">No scores yet</td></tr>';
        return;
      }
      data.forEach((row, index) => {
        const tr = document.createElement('tr');
        if (index % 2 === 0) tr.style.background = '#f0f8ff';  // alternate row color
        tr.innerHTML = `
          <td style="padding: 8px; border: 1px solid #ccc; text-align:center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${row[0]}</td>
          <td style="padding: 8px; border: 1px solid #ccc; text-align:center;">${row[1]}</td>
          <td style="padding: 8px; border: 1px solid #ccc; text-align:center;">${row[2]}%</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      const tbody = document.getElementById('leaderboard-body');
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 10px; color:red;">Failed to load leaderboard</td></tr>';
      console.error('Leaderboard load error:', err);
    });
}

// On page load start test and load leaderboard
window.onload = function() {
  newTest();
  loadLeaderboard();
};
