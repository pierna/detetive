// Tabuleiro em grade. Salas = blocos retangulares, corredores = casas individuais.
// Coordenadas: {x, y} com x coluna, y linha. Grade 25x24.

const W = 25, H = 24;

const ROOMS = {
  cozinha:    { name: 'Cozinha',         rect: { x: 0,  y: 0,  w: 6, h: 5 }, color: '#e8a13c' },
  musica:     { name: 'Salao de Musica', rect: { x: 10, y: 0,  w: 5, h: 6 }, color: '#b76ec7' },
  jantar:     { name: 'Sala de Jantar',  rect: { x: 18, y: 0,  w: 7, h: 7 }, color: '#d95f4b' },
  estar:      { name: 'Sala de Estar',   rect: { x: 0,  y: 10, w: 6, h: 6 }, color: '#5cb87a' },
  biblioteca: { name: 'Biblioteca',      rect: { x: 0,  y: 19, w: 6, h: 5 }, color: '#7d8fd4' },
  escritorio: { name: 'Escritorio',      rect: { x: 7,  y: 19, w: 5, h: 5 }, color: '#c9a35e' },
  hall:       { name: 'Hall',            rect: { x: 15, y: 19, w: 5, h: 5 }, color: '#6fb3c9' },
  lounge:     { name: 'Hall de Entrada', rect: { x: 19, y: 12, w: 6, h: 5 }, color: '#c96f9a' },
  adega:      { name: 'Adega',           rect: { x: 19, y: 19, w: 6, h: 5 }, color: '#8a6f5c' }
};

// Portas: casa de corredor adjacente a uma célula da sala.
const DOORS = [
  { x: 3,  y: 5,  room: 'cozinha' },
  { x: 6,  y: 2,  room: 'cozinha' },
  { x: 11, y: 6,  room: 'musica' },
  { x: 15, y: 3,  room: 'musica' },
  { x: 17, y: 3,  room: 'jantar' },
  { x: 20, y: 7,  room: 'jantar' },
  { x: 2,  y: 9,  room: 'estar' },
  { x: 6,  y: 12, room: 'estar' },
  { x: 3,  y: 18, room: 'biblioteca' },
  { x: 6,  y: 21, room: 'biblioteca' },
  { x: 8,  y: 18, room: 'escritorio' },
  { x: 12, y: 21, room: 'escritorio' },
  { x: 14, y: 21, room: 'hall' },
  { x: 16, y: 18, room: 'hall' },
  { x: 18, y: 14, room: 'lounge' },
  { x: 22, y: 17, room: 'lounge' },
  { x: 21, y: 18, room: 'adega' }
];

// Salas de mesmo grupo são tratadas como uma sala só? Não — cada sala é independente.
// Corredores: todas as casas fora das salas são andáveis (corredor).

function inRoom(x, y) {
  for (const [id, r] of Object.entries(ROOMS)) {
    const { rect } = r;
    if (x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h) {
      return id;
    }
  }
  return null;
}

function isHallway(x, y) {
  return x >= 0 && y >= 0 && x < W && y < H && inRoom(x, y) === null;
}

// casas de corredor vizinhas à porta (os pontos de entrada)
function doorCells() {
  return DOORS.map(d => ({ ...d }));
}

// Passagens secretas: pares de salas conectadas diretamente (cantos opostos)
const SECRET_PASSAGES = [
  { a: 'cozinha',    b: 'jantar' },     // canto noroeste <-> nordeste
  { a: 'estar',      b: 'adega' },      // canto oeste <-> sudeste
  { a: 'musica',     b: 'hall' },       // norte <-> sul
  { a: 'biblioteca', b: 'lounge' }      // sudoeste <-> leste
];

// Retorna as células alcançáveis a partir de uma posição, com até `steps` passos.
// Regras: anda por corredores; entra em sala apenas por porta (a porta custa 1 passo);
// sair de sala sai pela porta (custa 1 passo). Passagem secreta custa 1 passo.
// Não pode atravessar (parar em) célula ocupada por outro jogador (mas pode atravessar corredor? clássico: não pode parar; simplificação: não pode parar nem atravessar ficha).
function reachableCells(from, steps, occupiedCells) {
  const start = typeof from === 'string' ? { room: from } : { ...from };
  const occupied = new Set(occupiedCells.map(c => `${c.x},${c.y}`));
  const key = p => p.room ? `r:${p.room}` : `c:${p.x},${p.y}`;
  const visited = new Set([key(start)]);
  let frontier = [start];
  const results = new Set();

  for (let step = 0; step < steps; step++) {
    const next = [];
    for (const p of frontier) {
      const neighbors = neighborsOf(p);
      for (const n of neighbors) {
        const k = key(n);
        if (visited.has(k)) continue;
        visited.add(k);
        const nRoom = n.room || inRoom(n.x, n.y);
        if (nRoom) {
          results.add(`r:${nRoom}`); // entrou numa sala: parada possível
        } else {
          if (occupied.has(`${n.x},${n.y}`)) continue; // não pode parar nem atravessar ficha
          next.push(n);
          results.add(k);
        }
      }
    }
    frontier = next;
  }
  // converte para objetos
  return [...results].filter(k => k !== key(start)).map(k => {
    if (k.startsWith('r:')) return { room: k.slice(2) };
    const [x, y] = k.slice(2).split(',').map(Number);
    return { x, y };
  });
}

function neighborsOf(p) {
  // se está numa sala: sair por cada porta da sala + passagens secretas
  if (p.room) {
    const out = [];
    for (const d of DOORS) {
      if (d.room === p.room) out.push({ x: d.x, y: d.y });
    }
    for (const sp of SECRET_PASSAGES) {
      if (sp.a === p.room) out.push({ room: sp.b });
      if (sp.b === p.room) out.push({ room: sp.a });
    }
    return out;
  }
  // corredor: 4 direções
  const out = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of dirs) {
    const nx = p.x + dx, ny = p.y + dy;
    const r = inRoom(nx, ny);
    if (r) {
      // vizinho e sala: entra so se esta casa de corredor for porta dessa sala
      const isDoor = DOORS.some(d => d.x === p.x && d.y === p.y && d.room === r);
      if (isDoor) out.push({ room: r });
    } else if (isHallway(nx, ny)) {
      out.push({ x: nx, y: ny });
    }
  }
  return out;
}

module.exports = { W, H, ROOMS, DOORS, SECRET_PASSAGES, inRoom, isHallway, reachableCells, neighborsOf };
