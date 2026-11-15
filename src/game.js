// Lógica do jogo: salas, baralho, distribuição, turnos, palpite, acusação.

const { reachableCells } = require('./board');

const CHARACTERS = [
  { id: 'scarlet',  name: 'Srta. Scarlet',  color: '#d64545', start: { x: 24, y: 7 }  },
  { id: 'mustard',  name: 'Coronel Mustard', color: '#e0b83c', start: { x: 17, y: 0 }  },
  { id: 'white',    name: 'Srta. Branco',   color: '#e8e8e8', start: { x: 14, y: 23 } },
  { id: 'peacock',  name: 'Sra. Peacock',   color: '#5aa8d6', start: { x: 6,  y: 23 }  },
  { id: 'plum',     name: 'Professor Plum', color: '#9b59b6', start: { x: 0,  y: 5 }  },
  { id: 'green',    name: 'Reverendo Verde', color: '#4caf50', start: { x: 0,  y: 15 } }
];

const WEAPONS = [
  { id: 'corda',      name: 'Corda' },
  { id: 'faca',       name: 'Faca' },
  { id: 'castical',   name: 'Castical' },
  { id: 'revolver',   name: 'Revólver' },
  { id: 'cano',       name: 'Cano' },
  { id: 'chave',      name: 'Chave Inglesa' }
];

const rooms = {}; // code -> room state

function genCode() {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
  return rooms[code] ? genCode() : code;
}

function createRoom() {
  const code = genCode();
  rooms[code] = {
    code,
    host: null,
    createdAt: Date.now(),
    players: [],       // {socketId, playerId, name, character, cards[], eliminated, position, socket}
    started: false,
    turnIndex: 0,
    dice: null,
    phase: 'lobby',    // lobby | turn | refute | win
    pendingSuggestion: null,
    refuteQueue: [],   // playerIds a perguntar
    currentMovable: null,
    suggestionCount: 0,
    winner: null
  };
  return rooms[code];
}

function getRoom(code) {
  return rooms[code] || null;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame(room) {
  const all = [
    ...CHARACTERS.map(c => ({ type: 'suspeito', id: c.id, name: c.name })),
    ...WEAPONS.map(w => ({ type: 'arma', id: w.id, name: w.name })),
    ...Object.entries(require('./board').ROOMS).map(([id, r]) => ({ type: 'sala', id, name: r.name }))
  ];
  const shuffled = shuffle(all);
  const solution = {
    suspeito: shuffled.find(c => c.type === 'suspeito'),
    arma: shuffled.find(c => c.type === 'arma'),
    sala: shuffled.find(c => c.type === 'sala')
  };
  const rest = shuffled.filter(c => !Object.values(solution).includes(c));
  // distribui em rodadas
  room.players.forEach((p, i) => { p.cards = []; });
  rest.forEach((card, i) => {
    room.players[i % room.players.length].cards.push(card);
  });
  room.solution = solution;
  room.started = true;
  room.phase = 'turn';
  room.turnIndex = 0;
  // posiciona fichas nos pontos de partida
  room.players.forEach((p, i) => {
    const ch = CHARACTERS.find(c => c.id === p.character);
    p.position = { ...ch.start };
    p.eliminated = false;
    // cada bot ja sabe que as cartas da mao dele nao estao no envelope
    if (p.isBot) p.known = new Set(room.players[i].cards.map(c => c.id));
  });
}

function publicState(room, forPlayerId) {
  return {
    code: room.code,
    host: room.host,
    started: room.started,
    phase: room.phase,
    turnIndex: room.turnIndex,
    dice: room.dice,
    winner: room.winner,
    players: room.players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      character: p.character,
      cardCount: p.cards ? p.cards.length : 0,
      eliminated: p.eliminated || false,
      position: p.position,
      isBot: !!p.isBot
    })),
    movableCells: room.currentMovable,
    pendingSuggestion: room.pendingSuggestion ? {
      suggester: room.pendingSuggestion.suggesterName,
      suspect: room.pendingSuggestion.suspect,
      weapon: room.pendingSuggestion.weapon
    } : null
  };
}

function cardsFor(room, playerId) {
  const p = room.players.find(pl => pl.playerId === playerId);
  return p ? p.cards : [];
}

// retorna o primeiro jogador (em ordem de turno após o sugeridor) que tem uma das cartas
function findRefuter(room, fromIndex, suspect, weapon, roomId) {
  const n = room.players.length;
  // i < n: nunca volta ao proprio sugeridor (i === n seria ele mesmo)
  for (let i = 1; i < n; i++) {
    const p = room.players[(fromIndex + i) % n];
    if (p.eliminated) continue;
    // o palpite nomeia tres cartas: suspeito, arma e a sala
    const card = p.cards.find(c =>
      (c.type === 'suspeito' && c.id === suspect) ||
      (c.type === 'arma' && c.id === weapon) ||
      (c.type === 'sala' && c.id === roomId)
    );
    if (card) return { player: p, card };
  }
  return null;
}

function nextTurn(room) {
  const n = room.players.length;
  let idx = room.turnIndex;
  for (let i = 0; i < n; i++) {
    idx = (idx + 1) % n;
    if (!room.players[idx].eliminated) break;
  }
  room.turnIndex = idx;
  room.dice = null;
  room.currentMovable = null;
  room.phase = 'turn';
}

// volta a sala para o lobby, mantendo os jogadores humanos e limpando o estado da partida
function resetToLobby(room) {
  room.started = false;
  room.phase = 'lobby';
  room.turnIndex = 0;
  room.dice = null;
  room.winner = null;
  room.solution = null;
  room.pendingSuggestion = null;
  room.refuteQueue = [];
  room.currentMovable = null;
  room.botTurns = 0;
  if (room.botTimer) { clearTimeout(room.botTimer); room.botTimer = null; }
  if (room.refuteTimer) { clearTimeout(room.refuteTimer); room.refuteTimer = null; }
  // remove bots e limpa estado dos humanos
  room.players = room.players.filter(p => !p.isBot);
  room.players.forEach(p => {
    p.cards = [];
    p.eliminated = false;
    p.position = null;
    p.known = null;
  });
  if (!room.players.some(p => p.playerId === room.host)) {
    room.host = room.players.length ? room.players[0].playerId : null;
  }
}

function checkAccusation(room, suspeito, arma, sala) {
  const s = room.solution;
  return s.suspeito.id === suspeito && s.arma.id === arma && s.sala.id === sala;
}

module.exports = {
  CHARACTERS, WEAPONS,
  createRoom, getRoom, startGame, publicState,
  cardsFor, findRefuter, nextTurn, checkAccusation, resetToLobby,
  allRooms: () => Object.values(rooms),
  removeRoom: (code) => { delete rooms[code]; }
};
