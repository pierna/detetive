const socket = io();
/* art.js carregado antes: CHAR_ART */

const params = new URLSearchParams(window.location.search);
const code = params.get('room');
const isHost = params.get('create') === '1';

let playerId = localStorage.getItem('playerId');
if (!playerId) {
  playerId = window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : 'p-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem('playerId', playerId);
}
const playerName = localStorage.getItem('playerName') || 'Jogador';

const CHARACTERS = [
  { id: 'scarlet',  name: 'Srta. Scarlet',   color: '#d64545' },
  { id: 'mustard',  name: 'Coronel Mustard', color: '#e0b83c' },
  { id: 'white',    name: 'Srta. Branco',    color: '#e8e8e8' },
  { id: 'peacock',  name: 'Sra. Peacock',    color: '#5aa8d6' },
  { id: 'plum',     name: 'Professor Plum',  color: '#9b59b6' },
  { id: 'green',    name: 'Reverendo Verde', color: '#4caf50' }
];

let state = null;

document.getElementById('room-code').textContent = code;
document.getElementById('btn-copy').addEventListener('click', () => {
  const link = `${window.location.origin}/index.html?join=${code}`;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.getElementById('btn-copy');
    btn.textContent = 'Copiado!';
    setTimeout(() => (btn.textContent = 'Copiar Link'), 1500);
  });
});

// entrar na sala
socket.emit('join-room', { code, name: playerName, playerId }, (res) => {
  if (res && res.error) {
    document.getElementById('lobby-error').textContent = res.error;
    document.getElementById('lobby-error').classList.remove('hidden');
    return;
  }
  if (res && res.started) {
    // partida em andamento: volta para a mesa
    window.location.href = '/game.html?room=' + code;
  }
});

socket.on('room-state', (s) => {
  state = s;
  render();
});

function render() {
  if (!state) return;
  document.getElementById('player-count').textContent = state.players.length;
  const list = document.getElementById('players-list');
  list.innerHTML = '';
  state.players.forEach((p) => {
    const li = document.createElement('li');
    const ch = CHARACTERS.find(c => c.id === p.character);
    const bg = ch ? ch.color : '#666';
    li.innerHTML = `<span class="player-dot" style="background:${bg}"></span>
      ${p.name}${p.playerId === state.host ? ' (host)' : ''}`;
    list.appendChild(li);
  });

  // grid de personagens
  const grid = document.getElementById('characters-grid');
  grid.innerHTML = '';
  const taken = new Set(state.players.map(p => p.character).filter(Boolean));
  const me = state.players.find(p => p.playerId === playerId);
  CHARACTERS.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'char-card';
    const isMine = me && me.character === c.id;
    if (taken.has(c.id) && !isMine) div.classList.add('taken');
    if (isMine) div.classList.add('mine');
    div.innerHTML = `<div class="char-avatar">${CHAR_ART[c.id] || ''}</div>
      <div class="char-name">${c.name}</div>`;
    if (!taken.has(c.id) || isMine) {
      div.addEventListener('click', () => {
        socket.emit('pick-character', { code, playerId, charId: c.id });
      });
    }
    grid.appendChild(div);
  });

  // botao iniciar: basta o host ter personagem; bots completam a sala
  const btnStart = document.getElementById('btn-start');
  const isHost = state.host === playerId;
  const meReady = !!(me && me.character);
  const missing = Math.max(0, 3 - state.players.length);
  btnStart.disabled = !(isHost && meReady);
  btnStart.textContent = !isHost ? 'Aguardando host...'
    : !meReady ? 'Escolha seu personagem'
    : missing > 0 ? `Iniciar (${missing} bot${missing > 1 ? 's' : ''} completam)`
    : 'Iniciar Jogo';
}

document.getElementById('btn-start').addEventListener('click', () => {
  socket.emit('start-game', { code, playerId });
});

socket.on('game-started', () => {
  window.location.href = `/game.html?room=${code}`;
});
