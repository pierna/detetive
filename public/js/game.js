let socket = io();
/* art.js carregado antes: ROOM_ART, CHAR_ART, WEAPON_ART, CHAR_PIECE_BG */

const params = new URLSearchParams(window.location.search);
const code = params.get('room');

let playerId = localStorage.getItem('playerId');
if (!playerId) {
  playerId = window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : 'p-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem('playerId', playerId);
}
const myName = localStorage.getItem('playerName') || 'Jogador';

let state = null;
let myCards = [];
let CHARS = [], WEPS = [], ROOMS = {}, DOORS = [], SECRETS = [];
let myChar = null;
let canSuggestNow = false;
let currentRoom = null;

// ---------- setup ----------
function doJoin(sock) {
  sock.emit('join-room', { code, name: myName, playerId }, (res) => {
    if (res && res.error) {
      showResult('Nao foi possivel entrar', res.error + '. Use o menu para tentar de novo ou saia da sala.');
      document.getElementById('modal-result').classList.remove('hidden');
    }
  });
}

function wireSocket(sock) {
  sock.on('game-start', (data) => {
    CHARS = data.characters;
    WEPS = data.weapons;
    ROOMS = data.rooms;
    DOORS = data.doors;
    SECRETS = data.secrets;
    myCards = data.yourCards || [];
    state = data.state;
    const me = state.players.find(p => p.playerId === playerId || p.name === myName);
    if (me) playerId = me.playerId;
    myChar = me ? me.character : null;
    buildBoard();
    buildNotebook();
    renderCards();
    renderState();
    document.getElementById('modal-result').classList.add('hidden');
  });

  sock.on('disconnect', () => {
    showResult('Conexao perdida', 'Use o menu e clique em Reconectar.');
    document.getElementById('modal-result').classList.remove('hidden');
  });

  sock.on('room-state', (s) => {
    state = s;
    renderState();
  });

  sock.on('game-started', () => {
    sock.emit('join-room', { code, name: myName, playerId }, () => {});
  });

  sock.io.on('reconnect', () => {
    doJoin(sock);
  });

  sock.on('dice-rolled', (d) => {
    renderDice(d.dice);
    if (state) {
      state.movableCells = d.movableCells;
      state.dice = d.dice;
      state.phase = 'move';
    }
    highlightMovable();
    addLog(`${nameOfPlayer(d.playerId)} rolou ${d.dice}`);
  });

  sock.on('player-moved', (d) => {
    if (state) {
      const p = state.players.find(p => p.playerId === d.playerId);
      if (p) p.position = d.position;
      state.phase = 'turn';
    }
    renderPieces();
    renderState();
  });

  sock.on('can-suggest', (d) => {
    if (d.playerId === playerId) {
      canSuggestNow = true;
      currentRoom = d.room;
      // sem rolar o dado: tambem libera "Passar Vez"
      if (d.noRoll) {
        document.getElementById('btn-endturn').classList.remove('hidden');
      }
      document.getElementById('btn-suggest').classList.remove('hidden');
    }
  });

  sock.on('turn-changed', (s) => {
    state = s;
    renderDice(null);
    document.getElementById('btn-suggest').classList.add('hidden');
    canSuggestNow = false;
    renderState();
  });

  sock.on('suggestion-result', (r) => {
    const shownTxt = r.shown ? `${r.refuterName} refutou (carta oculta)` : 'ninguem pode refutar!';
    addLog(`${r.suggester} sugeriu: ${nameOf('suspeito', r.suspect)}, ${nameOf('arma', r.weapon)}, em ${nameOf('sala', r.room)} -> ${shownTxt}`);
  });

  sock.on('refute-reveal', (d) => {
    showReveal(d);
  });

  sock.on('card-shown', (r) => {
    if (r.cardId) {
      addLog(`Voce viu a carta: ${r.cardName} (de ${r.from})`);
    }
    autoMark(r.cardId);
  });

  sock.on('refute-request', (r) => {
    if (r.to !== playerId) return;
    const s = r.suggestion;
    document.getElementById('refute-text').textContent =
      `${s.suggesterName} sugeriu ${nameOf('suspeito', s.suspect)} com ${nameOf('arma', s.weapon)}, em ${nameOf('sala', s.room)}. Escolha uma carta para mostrar:`;
    const box = document.getElementById('refute-cards');
    box.innerHTML = '';
    const matches = myCards.filter(c => c.id === s.suspect || c.id === s.weapon || c.id === s.room);
    matches.forEach((c) => {
      const btn = document.createElement('div');
      btn.className = 'playing-card type-' + c.type + ' clickable';
      btn.innerHTML =
        `<div class="pc-inner">` +
          `<div class="pc-type">${TYPE_LABEL[c.type] || ''}</div>` +
          `<div class="pc-art">${cardFaceArt(c)}</div>` +
          `<div class="pc-name">${c.name}</div>` +
        `</div>`;
      btn.addEventListener('click', () => {
        document.getElementById('modal-refute').classList.add('hidden');
        socket.emit('refute-submit', { code, playerId, cardId: c.id });
      });
      box.appendChild(btn);
    });
    document.getElementById('btn-refute-none').style.display = matches.length ? 'none' : 'inline-block';
    document.getElementById('modal-refute').classList.remove('hidden');
  });

  sock.on('accusation-result', (r) => {
    if (r.correct && r.lastStanding) {
      addLog(`${r.player} foi o unico que restou e venceu!`, 'log-win');
      showResult(`${r.player} venceu!`,
        `Todos os outros erraram a acusacao. O caso era: ${r.solution.suspeito.name}, com ${r.solution.arma.name}, em ${r.solution.sala.name}.`);
    } else if (r.correct) {
      addLog(`${r.player} acusou corretamente e VENCEU!`, 'log-win');
      showResult(`${r.player} venceu!`, 'Caso resolvido!');
    } else {
      addLog(`${r.player} errou a acusacao e foi eliminado.`, 'log-fail');
      showResult('Acusacao errada!', `${r.player} errou e nao pode mais acusar.`);
      renderCards();
    }
  });

  sock.on('back-to-lobby', () => {
    window.location.href = '/lobby.html?room=' + code;
  });

  sock.on('game-over', (r) => {
    const sol = r.solution;
    addLog('Todos erraram. O caso fica em aberto.', 'log-fail');
    showResult('Ninguem acertou!', 
      `Era ${sol.suspeito.name}, com ${sol.arma.name}, em ${sol.sala.name}.`);
  });
}

wireSocket(socket);
doJoin(socket);

// ---------- menu / reconexao ----------
document.getElementById('btn-menu').addEventListener('click', () => {
  document.getElementById('menu-room-code').textContent = code;
  document.getElementById('modal-menu').classList.remove('hidden');
});

document.getElementById('btn-menu-close').addEventListener('click', () => {
  document.getElementById('modal-menu').classList.add('hidden');
});

document.getElementById('btn-menu-reconnect').addEventListener('click', () => {
  document.getElementById('modal-menu').classList.add('hidden');
  // recria a conexao do zero e refaz o join — sem refresh da pagina
  try { socket.disconnect(); } catch (e) {}
  socket = io();
  wireSocket(socket);
  doJoin(socket);
});

document.getElementById('btn-menu-leave').addEventListener('click', () => {
  try { socket.disconnect(); } catch (e) {}
  window.location.href = '/index.html';
});

// ---------- tabuleiro ----------
function buildBoard() {
  const el = document.getElementById('board');
  el.innerHTML = '';
  const W = 25, H = 24;
  el.style.setProperty('--w', W);
  el.style.setProperty('--h', H);

  // salas
  for (const [id, r] of Object.entries(ROOMS)) {
    const d = document.createElement('div');
    d.className = 'room-block';
    d.style.gridArea = `${r.rect.y + 1} / ${r.rect.x + 1} / span ${r.rect.h} / span ${r.rect.w}`;
    d.style.background = `linear-gradient(180deg, ${r.color}55, ${r.color}22)`;
    d.style.borderColor = r.color;
    d.dataset.room = id;
    const art = ROOM_ART[id] || '';
    d.innerHTML = art + `<span class="room-label">${r.name}</span>`;
    d.addEventListener('click', () => cellClicked({ room: id }));
    el.appendChild(d);
  }

  // portas
  DOORS.forEach((d) => {
    const door = document.createElement('div');
    door.className = 'door';
    door.style.gridArea = `${d.y + 1} / ${d.x + 1}`;
    door.dataset.doorRoom = d.room;
    el.appendChild(door);
  });

  // corredores
  const doorSet = new Set(DOORS.map(d => `${d.x},${d.y}`));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (roomAt(x, y)) continue;
      const c = document.createElement('div');
      c.className = 'hall';
      if (doorSet.has(`${x},${y}`)) c.classList.add('hall-door');
      c.style.gridArea = `${y + 1} / ${x + 1}`;
      c.dataset.x = x;
      c.dataset.y = y;
      c.addEventListener('click', () => cellClicked({ x, y }));
      el.appendChild(c);
    }
  }

  renderPieces();
}

function roomAt(x, y) {
  for (const [id, r] of Object.entries(ROOMS)) {
    const rc = r.rect;
    if (x >= rc.x && x < rc.x + rc.w && y >= rc.y && y < rc.y + rc.h) return id;
  }
  return null;
}

const CHAR_COLORS = {
  scarlet: '#d64545', mustard: '#e0b83c', white: '#e8e8e8',
  peacock: '#5aa8d6', plum: '#9b59b6', green: '#4caf50'
};

// reaproveita os elementos das fichas entre renders (evita recriar SVG a cada evento)
function renderPieces() {
  if (!state) return;
  const boardEl = document.getElementById('board');
  const vistos = new Set();

  state.players.forEach((p) => {
    if (!p.position) return;
    vistos.add(p.playerId);

    let piece = boardEl.querySelector(`.piece[data-pid="${p.playerId}"]`);
    if (!piece) {
      piece = document.createElement('div');
      piece.className = 'piece';
      piece.dataset.pid = p.playerId;
      piece.style.background = CHAR_PIECE_BG[p.character] || '#777';
      piece.innerHTML = (CHAR_ART[p.character] || '') +
        `<span class="piece-tag">${p.name}</span>`;
      piece.title = p.name;
      boardEl.appendChild(piece);
    }

    let area;
    if (p.position.room) {
      const room = ROOMS[p.position.room];
      const idx = state.players.filter(o => o.position && o.position.room === p.position.room).indexOf(p);
      const cx = room.rect.x + room.rect.w / 2 - 0.5;
      const cy = room.rect.y + 1 + idx * 0.9;
      area = `${Math.floor(cy) + 1} / ${Math.floor(cx) + 1}`;
    } else {
      area = `${p.position.y + 1} / ${p.position.x + 1}`;
    }
    if (piece.style.gridArea !== area) piece.style.gridArea = area;
  });

  // remove fichas de quem saiu
  boardEl.querySelectorAll('.piece').forEach(el => {
    if (!vistos.has(el.dataset.pid)) el.remove();
  });

  // destaca quem esta na vez (dentro do render, senao se perde ao recriar)
  const tp = state.players[state.turnIndex];
  if (tp) {
    const cur = boardEl.querySelector(`.piece[data-pid="${tp.playerId}"]`);
    if (cur) cur.classList.add('piece-turn');
  }

  highlightMovable();
}

function highlightMovable() {
  document.querySelectorAll('.hall').forEach(h => h.classList.remove('movable'));
  document.querySelectorAll('.room-block').forEach(r => r.classList.remove('movable-room'));
  if (!state || !state.movableCells) return;
  const isMyTurn = state.players[state.turnIndex] && state.players[state.turnIndex].playerId === playerId;
  if (!isMyTurn) return;
  state.movableCells.forEach(c => {
    if (c.room) {
      const el = document.querySelector(`.room-block[data-room="${c.room}"]`);
      if (el) el.classList.add('movable-room');
    } else {
      const el = document.querySelector(`.hall[data-x="${c.x}"][data-y="${c.y}"]`);
      if (el) el.classList.add('movable');
    }
  });
}

function cellClicked(target) {
  if (!state || !state.movableCells) return;
  const isMyTurn = state.players[state.turnIndex] && state.players[state.turnIndex].playerId === playerId;
  if (!isMyTurn) return;
  const valid = state.movableCells.some(c =>
    target.room ? c.room === target.room : (c.x === target.x && c.y === target.y)
  );
  if (!valid) return;
  socket.emit('move-to', { code, playerId, target }, (res) => {
    if (res && res.error) alert(res.error);
  });
}

// ---------- eventos de jogo ----------
// (handlers em wireSocket)

// ---------- render ----------
function renderState() {
  if (!state) return;
  const tp = state.players[state.turnIndex];
  const turnEl = document.getElementById('current-turn');
  turnEl.textContent = tp ? tp.name : '--';
  const isMyTurn = tp && tp.playerId === playerId;
  const me = state.players.find(p => p.playerId === playerId || p.name === myName);

  document.querySelector('.turn-info').classList.toggle('my-turn', !!isMyTurn);

  const iAmOut = !!(me && me.eliminated);
  document.querySelector('.game-container').classList.toggle('i-am-out', iAmOut);
  const outBanner = document.getElementById('out-banner');
  if (outBanner) outBanner.classList.toggle('hidden', !iAmOut);

  document.getElementById('btn-roll').disabled = !(isMyTurn && !iAmOut && state.phase === 'turn' && state.dice === null);
  document.getElementById('btn-accuse').disabled = !(isMyTurn && !me.eliminated);
  document.getElementById('btn-endturn').classList.toggle('hidden', !(isMyTurn && state.phase === 'turn' && state.dice !== null));

  renderPieces();

  if (state.winner) showResult(state.winner + ' venceu!', 'Caso resolvido!');
}

const TYPE_LABEL = { suspeito: 'SUSPEITO', arma: 'ARMA', sala: 'SALA' };

function cardFaceArt(c) {
  if (c.type === 'arma' && WEAPON_ART[c.id]) return WEAPON_ART[c.id];
  if (c.type === 'suspeito' && CHAR_ART[c.id]) return CHAR_ART[c.id];
  if (c.type === 'sala' && ROOM_ART[c.id]) return ROOM_ART[c.id];
  return '';
}

function renderCards() {
  document.getElementById('card-count').textContent = myCards.length;
  const wrap = document.getElementById('my-cards');
  wrap.innerHTML = '';
  myCards.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'playing-card type-' + c.type;
    card.innerHTML =
      `<div class="pc-inner">` +
        `<div class="pc-type">${TYPE_LABEL[c.type] || ''}</div>` +
        `<div class="pc-art">${cardFaceArt(c)}</div>` +
        `<div class="pc-name">${c.name}</div>` +
      `</div>`;
    wrap.appendChild(card);
  });
}

function addLog(msg, cls) {
  const ul = document.getElementById('log');
  const li = document.createElement('li');
  li.textContent = msg;
  if (cls) li.className = cls;
  ul.prepend(li);
}

// dado visual: pontos em vez de numero
const DICE_DOTS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
};

function renderDice(n) {
  const el = document.getElementById('dice');
  if (!n) {
    el.innerHTML = '<span style="font-family:var(--serif);font-size:22px;color:#8a7a5c;">?</span>';
    return;
  }
  const dots = DICE_DOTS[n] || [];
  el.innerHTML = '<span class="dots">' +
    Array.from({length: 9}, (_, i) =>
      `<i class="${dots.includes(i) ? '' : 'off'}"></i>`).join('') + '</span>';
}

// ---------- revelacao da refutacao ----------
let revealCard = null;

function showReveal(d) {
  revealCard = d.card || null;
  const markBtn = document.getElementById('btn-reveal-mark');
  // so oferece marcar quando a carta esta visivel e ainda nao foi descartada
  const canMark = !!d.card && notebook[d.card.id] !== 'x';
  markBtn.classList.toggle('hidden', !canMark);
  markBtn.textContent = 'Marcar no caderno';

  const box = document.getElementById('reveal-card');
  const title = document.getElementById('reveal-title');
  const text = document.getElementById('reveal-text');

  if (!d.refuted) {
    title.textContent = 'NINGUEM REFUTOU';
    text.textContent = `${d.suggesterName} sugeriu ${nameOf('suspeito', d.suspect)} com ${nameOf('arma', d.weapon)}, em ${nameOf('sala', d.room)} — e ninguém tinha como desmentir.`;
    box.innerHTML = '';
    box.classList.add('empty');
    document.getElementById('btn-reveal-ok').textContent = 'Entendi';
  } else {
    const who = d.isMine ? 'Você refutou' : `${d.refuterName} refutou`;
    title.textContent = 'REFUTADO';
    text.textContent = d.isMine
      ? `${d.suggesterName} sugeriu ${nameOf('suspeito', d.suspect)} com ${nameOf('arma', d.weapon)}, em ${nameOf('sala', d.room)}. Você mostrou esta carta:`
      : d.card
        ? `${d.suggesterName} sugeriu ${nameOf('suspeito', d.suspect)} com ${nameOf('arma', d.weapon)}, em ${nameOf('sala', d.room)}. ${d.refuterName} mostrou esta carta para você:`
        : `${d.suggesterName} sugeriu ${nameOf('suspeito', d.suspect)} com ${nameOf('arma', d.weapon)}, em ${nameOf('sala', d.room)}. ${d.refuterName} mostrou uma carta — mas só ${d.suggesterName} a viu.`;
    box.classList.remove('empty');

    if (d.card) {
      box.className = 'playing-card type-' + d.card.type + ' reveal-card reveal-visible';
      box.innerHTML =
        `<div class="pc-inner">` +
          `<div class="pc-type">${TYPE_LABEL[d.card.type] || ''}</div>` +
          `<div class="pc-art">${cardFaceArt(d.card)}</div>` +
          `<div class="pc-name">${d.card.name}</div>` +
        `</div>`;
    } else {
      box.className = 'playing-card reveal-card reveal-hidden';
      box.innerHTML =
        `<div class="pc-inner pc-back">` +
          `<div class="pc-back-mark">?</div>` +
        `</div>`;
    }
  }
  document.getElementById('modal-reveal').classList.remove('hidden');
}

document.getElementById('btn-reveal-ok').addEventListener('click', () => {
  document.getElementById('modal-reveal').classList.add('hidden');
});

document.getElementById('btn-reveal-mark').addEventListener('click', () => {
  if (!revealCard) return;
  notebook[revealCard.id] = 'x';
  saveNotebook();
  buildNotebook();
  const btn = document.getElementById('btn-reveal-mark');
  btn.textContent = 'Marcado como descartado';
  btn.disabled = true;
  setTimeout(() => { btn.disabled = false; }, 1200);
});

// ---------- dado ----------
document.getElementById('btn-roll').addEventListener('click', () => {
  socket.emit('roll-dice', { code, playerId });
});

// ---------- palpite ----------
document.getElementById('btn-suggest').addEventListener('click', () => {
  fillSelect('sel-suspect', notDiscarded(CHARS.map(c => ({ id: c.id, name: c.name }))));
  fillSelect('sel-weapon', notDiscarded(WEPS.map(w => ({ id: w.id, name: w.name }))));
  document.getElementById('suggest-room-name').textContent = ROOMS[currentRoom] ? ROOMS[currentRoom].name : '';
  document.getElementById('modal-suggest').classList.remove('hidden');
});

document.getElementById('btn-suggest-cancel').addEventListener('click', () => {
  document.getElementById('modal-suggest').classList.add('hidden');
});

document.getElementById('btn-suggest-send').addEventListener('click', () => {
  const suspect = document.getElementById('sel-suspect').value;
  const weapon = document.getElementById('sel-weapon').value;
  document.getElementById('modal-suggest').classList.add('hidden');
  document.getElementById('btn-suggest').classList.add('hidden');
  canSuggestNow = false;
  socket.emit('suggestion', { code, playerId, suspect, weapon, room: currentRoom });
});

// ---------- refutacao ----------
document.getElementById('btn-refute-none').addEventListener('click', () => {
  document.getElementById('modal-refute').classList.add('hidden');
  socket.emit('refute-submit', { code, playerId, cardId: null });
});

// ---------- acusacao ----------
document.getElementById('btn-accuse').addEventListener('click', () => {
  fillSelect('asel-suspect', notDiscarded(CHARS.map(c => ({ id: c.id, name: c.name }))));
  fillSelect('asel-weapon', notDiscarded(WEPS.map(w => ({ id: w.id, name: w.name }))));
  fillSelect('asel-room', notDiscarded(Object.entries(ROOMS).map(([id, r]) => ({ id, name: r.name }))));
  document.getElementById('modal-accuse').classList.remove('hidden');
});

document.getElementById('btn-accuse-cancel').addEventListener('click', () => {
  document.getElementById('modal-accuse').classList.add('hidden');
});

document.getElementById('btn-accuse-send').addEventListener('click', () => {
  const suspect = document.getElementById('asel-suspect').value;
  const weapon = document.getElementById('asel-weapon').value;
  const room = document.getElementById('asel-room').value;
  document.getElementById('modal-accuse').classList.add('hidden');
  socket.emit('accusation', { code, playerId, suspect, weapon, room });
});

// ---------- helpers ----------
function nameOf(type, id) {
  if (type === 'suspeito') return (CHARS.find(c => c.id === id) || {}).name || id;
  if (type === 'arma') return (WEPS.find(w => w.id === id) || {}).name || id;
  return (ROOMS[id] || {}).name || id;
}

function nameOfPlayer(pid) {
  if (!state) return '?';
  const p = state.players.find(p => p.playerId === pid);
  return p ? p.name : '?';
}

// remove do seletor o que o jogador ja descartou no caderno
function notDiscarded(items) {
  return items.filter(it => notebook[it.id] !== 'x');
}

function fillSelect(selId, items) {
  const sel = document.getElementById(selId);
  sel.innerHTML = '';
  items.forEach((it) => {
    const opt = document.createElement('option');
    opt.value = it.id;
    opt.textContent = it.name;
    sel.appendChild(opt);
  });
}

function showResult(title, text) {
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-text').textContent = text;
  document.getElementById('modal-result').classList.remove('hidden');
}

document.getElementById('btn-result-close').addEventListener('click', () => {
  document.getElementById('modal-result').classList.add('hidden');
});

document.getElementById('btn-new-game').addEventListener('click', () => {
  socket.emit('back-to-lobby', { code, playerId });
});

// ---------- caderno ----------
const NOTE_KEY = 'notebook_' + code;
let notebook = {};

try {
  notebook = JSON.parse(localStorage.getItem(NOTE_KEY)) || {};
} catch (e) { notebook = {}; }

function saveNotebook() {
  localStorage.setItem(NOTE_KEY, JSON.stringify(notebook));
}

// marca automaticamente a carta vista (sabemos que NAO esta no envelope)
function autoMark(cardId) {
  if (!cardId) return;
  // marca a coluna do jogador que mostrou? so temos o id da carta —
  // marcamos como conhecida em todas as colunas como "descartada" apenas se unica
  saveNotebook();
}

// Caderno: grade de cartas x jogadores (estilo folha de detetive).
// Cada celula marca: '-' desconhecido | 'X' descartado | '?' duvida
function nbCycle(cur) {
  return cur === '' || cur === undefined ? 'x' : cur === 'x' ? 'q' : '';
}

function buildNotebook() {
  const groups = [
    { el: 'nb-suspeitos', items: CHARS.map(c => ({ id: c.id, name: c.name, type: 'suspeito' })) },
    { el: 'nb-armas', items: WEPS.map(w => ({ id: w.id, name: w.name, type: 'arma' })) },
    { el: 'nb-salas', items: Object.entries(ROOMS).map(([id, r]) => ({ id, name: r.name, type: 'sala' })) }
  ];

  groups.forEach((g) => {
    const wrap = document.getElementById(g.el);
    if (!wrap) return;
    wrap.innerHTML = '';
    g.items.forEach((it) => {
      const st = notebook[it.id] || '';
      const chip = document.createElement('button');
      chip.className = 'nb-chip type-' + it.type + (st ? ' nb-' + st : '');
      chip.dataset.k = it.id;
      chip.innerHTML = `<span class="nb-chip-name">${it.name}</span><span class="nb-chip-mark">${
        st === 'x' ? '✕' : st === 'q' ? '?' : ''
      }</span>`;
      wrap.appendChild(chip);
    });
  });

  document.querySelectorAll('.nb-chip[data-k]').forEach((c) => {
    c.addEventListener('click', () => {
      const k = c.dataset.k;
      notebook[k] = nbCycle(notebook[k] || '');
      saveNotebook();
      buildNotebook();
    });
  });
}

document.getElementById('btn-notebook').addEventListener('click', () => {
  document.getElementById('notebook-drawer').classList.toggle('open');
});
document.getElementById('btn-nb-close').addEventListener('click', () => {
  document.getElementById('notebook-drawer').classList.remove('open');
});

// limpa formato antigo do caderno (chaves sem "|")
(function migrateNotebook() {
  let changed = false;
  Object.keys(notebook).forEach((k) => {
    if (!k.includes('|')) { delete notebook[k]; changed = true; }
  });
  if (changed) saveNotebook();
})();
