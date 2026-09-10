const SELECTORS = {
  interfaceTabs: '[data-interface]',
  workspaces: '.interface-workspace',
  navigation: '[data-go]',
  activeNavigation: '.nav-btn,.step-tab',
};

const IDS = {
  operatorWorkspace: 'operatorPanel',
  driverWorkspace: 'driverWorkspace',
  screens: { stations: 'stationsScreen', scan: 'scanScreen', charging: 'chargingScreen', chat: 'chatScreen', call: 'callScreen' },
  controls: { startCharging: 'startChargingBtn', simulateIssue: 'simulateIssueBtn', stopSession: 'stopSessionBtn', sendChat: 'sendChat', chatInput: 'chatInput' },
  charging: { issueBanner: 'issueBanner', liveStatus: 'liveStatus', chargeBadge: 'chargeBadge', energy: 'energyValue', cost: 'costValue', battery: 'batteryLevel', duration: 'timeValue', messages: 'messages' },
};

const CHARGING = {
  initial: { energy: 18.4, cost: 11.96, battery: 67, duration: 24 },
  issue: { energy: 18.9, cost: 12.29, battery: 67, duration: 31 },
  energyPerSecond: 0.04,
  costPerKwh: 0.65,
  maxBattery: 79,
  batteryIncreaseEverySeconds: 3,
  durationIncreaseEverySeconds: 4,
};

const SUPPORT_REPLY = 'Thanks. I have added that to the incident. Your charger, session and payment references remain attached, so I can escalate the same case to the operator without asking you to repeat everything.';

const elements = {
  interfaces: document.querySelectorAll(SELECTORS.interfaceTabs),
  workspaces: document.querySelectorAll(SELECTORS.workspaces),
  navigation: document.querySelectorAll(SELECTORS.navigation),
  activeNavigation: document.querySelectorAll(SELECTORS.activeNavigation),
  screens: Object.fromEntries(Object.entries(IDS.screens).map(([name, id]) => [name, document.getElementById(id)])),
  controls: Object.fromEntries(Object.entries(IDS.controls).map(([name, id]) => [name, document.getElementById(id)])),
  charging: Object.fromEntries(Object.entries(IDS.charging).map(([name, id]) => [name, document.getElementById(id)])),
};

const state = { chargingTimer: null, elapsedSeconds: 0, issueActive: false };

function setActiveInterface(interfaceName) {
  elements.interfaces.forEach((tab) => tab.classList.toggle('active', tab.dataset.interface === interfaceName));
  const workspaceId = interfaceName === 'operator' ? IDS.operatorWorkspace : IDS.driverWorkspace;
  elements.workspaces.forEach((workspace) => workspace.classList.toggle('active', workspace.id === workspaceId));
}

function setActiveNavigation(screenName) {
  elements.activeNavigation.forEach((button) => button.classList.toggle('active', button.dataset.go === screenName));
}

function showScreen(screenName) {
  const screen = elements.screens[screenName === 'issue' ? 'charging' : screenName];
  if (!screen) return;
  Object.values(elements.screens).forEach((item) => item.classList.add('hidden'));
  screen.classList.remove('hidden');
  setActiveNavigation(screenName);
  if (screenName === 'charging' && state.issueActive) showIssueState();
}

function updateChargingMetrics({ energy, cost, battery, duration }) {
  elements.charging.energy.textContent = `${energy.toFixed(1)} kWh`;
  elements.charging.cost.textContent = `$${cost.toFixed(2)}`;
  elements.charging.battery.textContent = `${battery}%`;
  elements.charging.duration.textContent = `${duration} min`;
}

function getChargingMetrics(seconds) {
  const energy = CHARGING.initial.energy + seconds * CHARGING.energyPerSecond;
  return {
    energy,
    cost: energy * CHARGING.costPerKwh,
    battery: Math.min(CHARGING.maxBattery, CHARGING.initial.battery + Math.floor(seconds / CHARGING.batteryIncreaseEverySeconds)),
    duration: CHARGING.initial.duration + Math.floor(seconds / CHARGING.durationIncreaseEverySeconds),
  };
}

function resetChargingDisplay() {
  const { issueBanner, liveStatus, chargeBadge } = elements.charging;
  issueBanner.classList.remove('show');
  elements.controls.simulateIssue.classList.remove('hidden');
  liveStatus.innerHTML = '<span class="live-dot"></span> Charging normally';
  liveStatus.style.background = 'var(--success-bg)';
  liveStatus.style.color = 'var(--success)';
  chargeBadge.textContent = 'Live';
  chargeBadge.className = 'badge ok';
  updateChargingMetrics(CHARGING.initial);
}

function startChargingSimulation() {
  clearInterval(state.chargingTimer);
  state.elapsedSeconds = 0;
  state.issueActive = false;
  resetChargingDisplay();
  state.chargingTimer = setInterval(() => {
    if (state.issueActive) return;
    state.elapsedSeconds += 1;
    updateChargingMetrics(getChargingMetrics(state.elapsedSeconds));
  }, 1000);
}

function showIssueState() {
  state.issueActive = true;
  clearInterval(state.chargingTimer);
  updateChargingMetrics(CHARGING.issue);
  const { issueBanner, liveStatus, chargeBadge } = elements.charging;
  liveStatus.innerHTML = '⚠ Charging interrupted';
  liveStatus.style.background = 'var(--danger-bg)';
  liveStatus.style.color = 'var(--danger)';
  chargeBadge.textContent = 'Interrupted';
  chargeBadge.className = 'badge bad';
  issueBanner.classList.add('show');
  elements.controls.simulateIssue.classList.add('hidden');
}

function appendMessage(message, type) {
  const bubble = document.createElement('div');
  bubble.className = `bubble ${type}`;
  bubble.textContent = message;
  elements.charging.messages.appendChild(bubble);
  elements.charging.messages.scrollTop = elements.charging.messages.scrollHeight;
}

function sendChatMessage() {
  const input = elements.controls.chatInput;
  const message = input.value.trim();
  if (!message) return;
  appendMessage(message, 'user');
  input.value = '';
  window.setTimeout(() => appendMessage(SUPPORT_REPLY, 'agent'), 450);
}

function bindEvents() {
  elements.interfaces.forEach((tab) => tab.addEventListener('click', () => setActiveInterface(tab.dataset.interface)));
  elements.navigation.forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.go)));
  elements.controls.startCharging.addEventListener('click', () => { showScreen('charging'); startChargingSimulation(); });
  elements.controls.simulateIssue.addEventListener('click', () => { showIssueState(); setActiveNavigation('issue'); });
  elements.controls.stopSession.addEventListener('click', () => {
    clearInterval(state.chargingTimer);
    alert('Demo: charging session stopped and final session record requested from the operator.');
  });
  elements.controls.sendChat.addEventListener('click', sendChatMessage);
  elements.controls.chatInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') sendChatMessage(); });
}

bindEvents();
