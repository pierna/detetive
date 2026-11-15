const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const board = require('./src/board');
const game = require('./src/game');


const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

function broadcastRoomState(room) {
  io.to(room.code).emit('room-state', game.publicState(room));
}

function sendFullState(socket, room, playerId) {
  const p = room.players.find(pl => pl.playerId === playerId);
  if (!socket || !socket.connected) {
    // socket guardado morreu (host recarregou a pagina): procura o socket vivo
    const vivo = [...io.sockets.sockets.values()].find(s => s.data && s.data.playerId === playerId);
    if (vivo) socket = vivo;
  }
  if (!socket) return;
  socket.emit('game-start', {
    yourCards: p ? p.cards : [],
    state: game.publicState(room),
    characters: game.CHARACTERS,
    weapons: game.WEAPONS,
    rooms: board.ROOMS,
    doors: board.DOORS,
    secrets: board.SECRET_PASSAGES
  });
}

// ---------- motor dos bots (roda dentro do servidor) ----------
const BOT_SUSPECTS = ['scarlet', 'mustard', 'white', 'peacock', 'plum', 'green'];
const BOT_WEAPONS = ['corda', 'faca', 'castical', 'revolver', 'cano', 'chave'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// cartas que o bot sabe que NAO estao no envelope: as dele + as que viu em refutacoes
function botKnown(bot) {
  if (!bot.known) bot.known = new Set();
  return bot.known;
}

// tenta deduzir a solucao: em cada categoria, se so sobra 1 carta desconhecida, e ela
function botDeduce(room, bot) {
  const known = botKnown(bot);
  const all = {
    suspeito: game.CHARACTERS.map(c => c.id),
    arma: game.WEAPONS.map(w => w.id),
    sala: Object.keys(board.ROOMS)
  };
  const out = {};
  for (const [cat, ids] of Object.entries(all)) {
    const rest = ids.filter(id => !known.has(id));
    if (rest.length !== 1) return null; // ainda nao sabe
    out[cat] = rest[0];
  }
  return out;
}

// executa a jogada completa do bot da vez
function runBotTurn(room) {
  if (!room.started || room.winner) return;
  const bot = room.players[room.turnIndex];
  if (!bot || !bot.isBot || bot.eliminated) return;
  if (room.phase !== 'turn' || room.dice !== null) return;

  // 0) acusar: deducao exata quando possivel; senao, chance crescente (garante fim de jogo)
  room.botTurns = (room.botTurns || 0) + 1;
  const deduced = botDeduce(room, bot);
  const known = botKnown(bot);
  const pool = {
    suspeito: game.CHARACTERS.map(c => c.id).filter(id => !known.has(id)),
    arma: game.WEAPONS.map(w => w.id).filter(id => !known.has(id)),
    sala: Object.keys(board.ROOMS).filter(id => !known.has(id))
  };
  const chance = Math.min(0.4, 0.06 + room.botTurns * 0.025);
  const shouldAccuse = deduced
    || (pool.suspeito.length && pool.arma.length && pool.sala.length && Math.random() < chance);

  if (shouldAccuse) {
    const guess = deduced || {
      suspeito: pick(pool.suspeito),
      arma: pick(pool.arma),
      sala: pick(pool.sala)
    };
    const correct = game.checkAccusation(room, guess.suspeito, guess.arma, guess.sala);
    io.to(room.code).emit('accusation-result', {
      player: bot.name,
      suspect: guess.suspeito, weapon: guess.arma, room: guess.sala,
      correct, winner: correct ? bot.name : null,
      solution: correct ? room.solution : undefined
    });
    if (correct) {
      room.winner = bot.name;
      room.phase = 'win';
      return;
    }
    bot.eliminated = true;
    if (checkLastStanding(room)) return;
    const alive = room.players.filter(p => !p.eliminated);
    if (!alive.length) {
      room.winner = null;
      room.phase = 'win';
      io.to(room.code).emit('game-over', { solution: room.solution });
      return;
    }
    game.nextTurn(room);
    io.to(room.code).emit('turn-changed', game.publicState(room));
    scheduleBot(room);
    notifyRoomStart(room);
    return;
  }

  // 1) rolar
  const dice = Math.floor(Math.random() * 6) + 1;
  room.dice = dice;
  const occupied = room.players
    .filter(o => o.playerId !== bot.playerId && o.position && !o.position.room)
    .map(o => o.position);
  room.currentMovable = board.reachableCells(bot.position, dice, occupied, true);
  room.phase = 'move';
  io.to(room.code).emit('dice-rolled', { playerId: bot.playerId, dice, movableCells: room.currentMovable });

  // 2) mover
  setTimeout(() => {
    if (room.winner) return;
    const cells = room.currentMovable || [];
    if (!cells.length) { game.nextTurn(room); io.to(room.code).emit('turn-changed', game.publicState(room)); scheduleBot(room); return; }
    const rooms = cells.filter(c => c.room);
    const target = rooms.length ? pick(rooms) : pick(cells);
    bot.position = target;
    room.currentMovable = null;
    room.phase = 'turn';
    io.to(room.code).emit('player-moved', { playerId: bot.playerId, position: target });

    if (target.room) {
      io.to(room.code).emit('can-suggest', { playerId: bot.playerId, room: target.room });
      // 3) palpitar
      setTimeout(() => {
        if (room.winner) return;
        const free = (arr) => { const f = arr.filter(x => !bot.cards.some(c => c.id === x)); return f.length ? f : arr; };
        const suspect = pick(free(BOT_SUSPECTS));
        const weapon = pick(free(BOT_WEAPONS));
        room.pendingSuggestion = { suggesterId: bot.playerId, suggesterName: bot.name, suspect, weapon, room: target.room };
        moveSuspectToRoom(room, suspect, target.room);
        const hit = game.findRefuter(room, room.turnIndex, suspect, weapon, target.room);
        if (hit) {
          askRefute(room, hit, room.pendingSuggestion);
        } else {
          io.to(room.code).emit('suggestion-result', {
            suggester: bot.name, suspect, weapon, room: target.room, shown: null, shownTo: null
          });
          room.pendingSuggestion = null;
          game.nextTurn(room);
          io.to(room.code).emit('turn-changed', game.publicState(room));
          scheduleBot(room);
          notifyRoomStart(room);
        }
      }, 1200);
    } else {
      game.nextTurn(room);
      io.to(room.code).emit('turn-changed', game.publicState(room));
      scheduleBot(room);
      notifyRoomStart(room);
    }
  }, 1000);
}

// se so sobrou um jogador vivo, ele vence por desistencia dos demais
function checkLastStanding(room) {
  const alive = room.players.filter(p => !p.eliminated);
  if (alive.length === 1 && room.players.length > 1) {
    room.winner = alive[0].name;
    room.phase = 'win';
    io.to(room.code).emit('accusation-result', {
      player: alive[0].name, correct: true, winner: alive[0].name,
      solution: room.solution, lastStanding: true
    });
    return true;
  }
  return false;
}

// quem comeca o turno dentro de uma sala pode palpitar sem rolar o dado
function notifyRoomStart(room) {
  const p = room.players[room.turnIndex];
  if (!p || !p.position || !p.position.room) return;
  io.to(room.code).emit('can-suggest', { playerId: p.playerId, room: p.position.room, noRoll: true });
  // bots tambem aproveitam
  if (p.isBot && room.phase === 'turn' && room.dice === null) {
    setTimeout(() => {
      if (room.phase !== 'turn' || room.dice !== null || room.winner) return;
      const cur = room.players[room.turnIndex];
      if (!cur || cur.playerId !== p.playerId) return;
      const free = (arr) => { const f = arr.filter(x => !cur.cards.some(c => c.id === x)); return f.length ? f : arr; };
      const suspect = pick(free(BOT_SUSPECTS));
      const weapon = pick(free(BOT_WEAPONS));
      room.pendingSuggestion = { suggesterId: cur.playerId, suggesterName: cur.name, suspect, weapon, room: cur.position.room };
      moveSuspectToRoom(room, suspect, cur.position.room);
      const hit = game.findRefuter(room, room.turnIndex, suspect, weapon, cur.position.room);
      if (hit) askRefute(room, hit, room.pendingSuggestion);
      else {
        io.to(room.code).emit('suggestion-result', { suggester: cur.name, suspect, weapon, room: cur.position.room, shown: null, shownTo: null });
        room.pendingSuggestion = null;
        game.nextTurn(room);
        io.to(room.code).emit('turn-changed', game.publicState(room));
        scheduleBot(room);
        notifyRoomStart(room);
      }
    }, 1500);
  }
}

// o suspeito citado no palpite vai para a sala do palpite (regra do Clue)
function moveSuspectToRoom(room, suspectId, roomId) {
  const alvo = room.players.find(p => p.character === suspectId);
  if (!alvo) return null;
  const antes = alvo.position;
  alvo.position = { room: roomId };
  if (antes) io.to(room.code).emit('player-moved', { playerId: alvo.playerId, position: alvo.position });
  return alvo;
}

// pede refutacao a um jogador; bots respondem sozinhos, humanos tem tempo limite
function askRefute(room, hit, suggestion) {
  room.refuteQueue = [hit.player.playerId];
  room.phase = 'refute';
  io.to(room.code).emit('refute-request', { to: hit.player.playerId, suggestion });

  const pid = hit.player.playerId;
  if (room.refuteTimer) clearTimeout(room.refuteTimer);
  room.refuteTimer = setTimeout(() => {
    // ninguem respondeu: resolve como "nao tem a carta" para o jogo nao travar
    if (room.phase !== 'refute' || !room.refuteQueue.includes(pid)) return;
    finishRefute(room, hit.player, null);
  }, hit.player.isBot ? 1300 : 45000);

  if (hit.player.isBot) {
    setTimeout(() => {
      if (room.phase !== 'refute' || !room.refuteQueue.includes(pid)) return;
      const card = hit.player.cards.find(c => c.id === suggestion.suspect || c.id === suggestion.weapon) || null;
      if (room.refuteTimer) clearTimeout(room.refuteTimer);
      finishRefute(room, hit.player, card);
    }, 1200);
  }
}

// finaliza uma refutacao (usado por bots e pelo handler de socket)
function finishRefute(room, refuter, card) {
  const s = room.pendingSuggestion;
  if (!s) return;
  const suggester = room.players.find(p => p.playerId === s.suggesterId);
  io.to(room.code).emit('suggestion-result', {
    suggester: s.suggesterName, suspect: s.suspect, weapon: s.weapon, room: s.room,
    shown: card ? card.name : null,
    shownCardId: card ? card.id : null,
    shownTo: card ? s.suggesterId : null,
    refuterName: card ? refuter.name : null
  });

  // revelacao publica: quem tem direito ve a carta; os demais veem uma carta oculta
  room.players.forEach(p => {
    if (!p.socket || p.isBot) return;
    const canSee = card && (p.playerId === s.suggesterId || p.playerId === refuter.playerId);
    p.socket.emit('refute-reveal', {
      refuterName: card ? refuter.name : null,
      refuted: !!card,
      suggesterName: s.suggesterName,
      suspect: s.suspect,
      weapon: s.weapon,
      room: s.room,
      card: canSee ? { id: card.id, name: card.name, type: card.type } : null,
      isMine: card ? p.playerId === refuter.playerId : false
    });
  });
  room.pendingSuggestion = null;
  room.refuteQueue = [];
  if (room.refuteTimer) { clearTimeout(room.refuteTimer); room.refuteTimer = null; }
  if (card && suggester && suggester.isBot) botKnown(suggester).add(card.id);
  if (suggester && suggester.socket && !suggester.isBot) {
    suggester.socket.emit('card-shown', {
      cardId: card ? card.id : null,
      cardName: card ? card.name : null,
      from: refuter.name
    });
  }
  game.nextTurn(room);
  io.to(room.code).emit('turn-changed', game.publicState(room));
  scheduleBot(room);
  notifyRoomStart(room);
}

// agenda a jogada do bot da vez (se houver)
function scheduleBot(room) {
  if (!room.started || room.winner) return;
  const p = room.players[room.turnIndex];
  if (process.env.BOT_DEBUG) console.log('[sched]', room.code, 'turno:', room.turnIndex, 'jogador:', p && p.name, 'isBot:', p && p.isBot, 'fase:', room.phase, 'dado:', room.dice);
  if (!p || !p.isBot) return;
  if (room.phase !== 'turn' || room.dice !== null) return;
  if (room.botTimer) clearTimeout(room.botTimer);
  room.botTimer = setTimeout(() => runBotTurn(room), 1400);
}

io.on('connection', (socket) => {
  socket.on('create-room', (cb) => {
    const room = game.createRoom();
    cb({ code: room.code });
  });

  // remove um jogador da sala (usado pelo painel de teste e por futuros controles de host)
  socket.on('kick-player', ({ code, targetId }, cb) => {
    const room = game.getRoom(code);
    if (!room) return cb && cb({ error: 'Sala nao encontrada' });
    const idx = room.players.findIndex(p => p.playerId === targetId);
    if (idx === -1) return cb && cb({ error: 'Jogador nao encontrado' });
    room.players.splice(idx, 1);
    if (room.host === targetId) {
      const human = room.players.find(p => !p.playerId.startsWith('bot-'));
      room.host = human ? human.playerId : null;
    }
    broadcastRoomState(room);
    cb && cb({ ok: true });
  });

  // diagnostico: estado cru da sala (so para testes)
  socket.on('debug-room', ({ code }, cb) => {
    const room = game.getRoom(code);
    if (!room) return cb && cb({ error: 'Sala nao encontrada' });
    cb && cb({
      started: room.started,
      host: room.host,
      phase: room.phase,
      players: room.players.map(p => ({ id: p.playerId, name: p.name, char: p.character, connected: !!p.socket }))
    });
  });

  socket.on('join-room', ({ code, name, playerId }, cb) => {
    const room = game.getRoom((code || '').toUpperCase().trim());
    if (!room) return cb({ error: 'Sala nao encontrada' });
    if (room.started) {
      // reconexao: por playerId ou, se nao achar, por nome (mesma pessoa que reabriu a aba)
      const p = room.players.find(pl => pl.playerId === playerId)
        || room.players.find(pl => pl.name === name);
      if (p) {
        p.socket = socket;
        socket.data.playerId = p.playerId;
        socket.join(room.code);
        cb({ ok: true, playerId: p.playerId, started: true });
        sendFullState(socket, room, p.playerId);
        return;
      }
      return cb({ error: 'O jogo ja comecou' });
    }
    if (room.players.length >= 6) return cb({ error: 'Sala cheia (max 6)' });
    let p = room.players.find(pl => pl.playerId === playerId);
    if (!p) {
      p = {
        playerId: playerId || crypto.randomUUID(),
        name: name || 'Jogador',
        character: null,
        cards: [],
        eliminated: false,
        position: null
      };
      room.players.push(p);
    }
    p.name = name || p.name;
    p.socket = socket;
    socket.data.playerId = p.playerId;
    // bots nunca viram host: o primeiro humano que entrar comanda
    const isBot = p.playerId.startsWith('bot-');
    if (!room.host && !isBot) room.host = p.playerId;
    socket.join(room.code);
    cb({ ok: true, playerId: p.playerId });
    broadcastRoomState(room);
  });

  socket.on('pick-character', ({ code, playerId, charId }, cb) => {
    const room = game.getRoom(code);
    if (!room || room.started) return;
    if (room.players.some(p => p.character === charId && p.playerId !== playerId)) {
      return cb && cb({ error: 'Personagem ja escolhido' });
    }
    const p = room.players.find(pl => pl.playerId === playerId);
    if (p) {
      p.character = charId;
      broadcastRoomState(room);
      cb && cb({ ok: true });
    }
  });

  socket.on('start-game', ({ code, playerId }, cb) => {
    const room = game.getRoom(code);
    if (!room || room.started) return;
    if (room.host !== playerId) return cb && cb({ error: 'Somente o host pode iniciar' });

    // completa a sala com bots ate 3 jogadores
    const usedChars = new Set(room.players.map(p => p.character).filter(Boolean));
    const freeChars = game.CHARACTERS.map(c => c.id).filter(id => !usedChars.has(id));
    let botIndex = 0;
    while (room.players.length < 3 && freeChars.length) {
      const charId = freeChars.shift();
      const bot = {
        playerId: 'bot-' + botIndex + '-' + Date.now(),
        name: 'Bot ' + (botIndex + 1),
        character: charId,
        cards: [],
        eliminated: false,
        position: null,
        isBot: true,
        socket: { connected: true, emit: () => {} }
      };
      room.players.push(bot);
      botIndex++;
    }

    const ready = room.players.length >= 3 && room.players.length <= 6 && room.players.every(p => p.character);
    if (!ready) return cb && cb({ error: 'Precisa de 3-6 jogadores com personagens escolhidos' });

    game.startGame(room);
    room.players.forEach(p => {
      if (p.isBot) return;
      sendFullState(p.socket, room, p.playerId);
    });
    io.to(room.code).emit('game-started', {});
    io.to(room.code).emit('turn-changed', game.publicState(room));
    scheduleBot(room);
    notifyRoomStart(room);
  });

  socket.on('roll-dice', ({ code, playerId }, cb) => {
    const room = game.getRoom(code);
    if (!room || room.phase !== 'turn') return;
    const p = room.players[room.turnIndex];
    if (p.playerId !== playerId) return cb && cb({ error: 'Nao e sua vez' });
    if (p.eliminated) return cb && cb({ error: 'Voce errou a acusacao e nao pode mais jogar' });
    if (room.dice !== null) return cb && cb({ error: 'Dado ja rolado' });
    const dice = Math.floor(Math.random() * 6) + 1;
    room.dice = dice;
    const occupied = room.players
      .filter(o => o.playerId !== playerId && o.position && !o.position.room)
      .map(o => o.position);
    room.currentMovable = board.reachableCells(p.position, dice, occupied, true);
    room.phase = 'move';
    io.to(room.code).emit('dice-rolled', {
      playerId, dice,
      movableCells: room.currentMovable
    });
    // sem casa valida: o jogador so pode passar a vez
    if (!room.currentMovable.length) {
      io.to(room.code).emit('no-moves', { playerId });
    }
    cb && cb({ ok: true });
  });

  socket.on('move-to', ({ code, playerId, target }, cb) => {
    const room = game.getRoom(code);
    if (!room || room.phase !== 'move') return;
    const p = room.players[room.turnIndex];
    if (p.playerId !== playerId) return;
    const valid = (room.currentMovable || []).some(c =>
      target.room ? c.room === target.room : (c.x === target.x && c.y === target.y)
    );
    if (!valid) return cb && cb({ error: 'Movimento invalido' });
    p.position = target;
    room.currentMovable = null;
    room.phase = 'turn';
    io.to(room.code).emit('player-moved', { playerId, position: target });
    if (target.room) {
      // caiu numa sala: pode palpitar/acusar antes de encerrar
      io.to(room.code).emit('can-suggest', { playerId, room: target.room });
    } else {
      // corredor: turno acaba automaticamente
      game.nextTurn(room);
      io.to(room.code).emit('turn-changed', game.publicState(room));
      scheduleBot(room);
      notifyRoomStart(room);
    }
    cb && cb({ ok: true });
  });

  socket.on('suggestion', ({ code, playerId, suspect, weapon, room: roomId }, cb) => {
    const gameRoom = game.getRoom(code);
    if (!gameRoom || !gameRoom.started || gameRoom.phase !== 'turn') return;
    const idx = gameRoom.turnIndex;
    const p = gameRoom.players[idx];
    if (p.playerId !== playerId || p.eliminated) return;
    gameRoom.pendingSuggestion = {
      suggesterId: playerId,
      suggesterName: p.name,
      suspect, weapon, room: roomId
    };
    moveSuspectToRoom(gameRoom, suspect, roomId);
    const hit = game.findRefuter(gameRoom, idx, suspect, weapon, roomId);
    if (hit) {
      askRefute(gameRoom, hit, gameRoom.pendingSuggestion);
    } else {
      io.to(gameRoom.code).emit('suggestion-result', {
        suggester: p.name,
        suspect, weapon, room: roomId,
        shown: null, shownTo: null
      });
      gameRoom.pendingSuggestion = null;
      game.nextTurn(gameRoom);
      io.to(gameRoom.code).emit('turn-changed', game.publicState(gameRoom));
      scheduleBot(gameRoom);
    }
    cb && cb({ ok: true });
  });

  socket.on('refute-submit', ({ code, playerId, cardId }, cb) => {
    const room = game.getRoom(code);
    if (!room || room.phase !== 'refute') return;
    const s = room.pendingSuggestion;
    if (!s || !room.refuteQueue.includes(playerId)) return;
    const refuter = room.players.find(p => p.playerId === playerId);
    const card = refuter.cards.find(c => c.id === cardId) || null;
    finishRefute(room, refuter, card);
    cb && cb({ ok: true });
  });

  socket.on('accusation', ({ code, playerId, suspect, weapon, room: roomId }, cb) => {
    const room = game.getRoom(code);
    if (!room || !room.started || room.phase === 'win') return;
    const p = room.players[room.turnIndex];
    if (p.playerId !== playerId || p.eliminated) return;
    const correct = game.checkAccusation(room, suspect, weapon, roomId);
    if (correct) {
      room.winner = p.name;
      room.phase = 'win';
      io.to(room.code).emit('accusation-result', {
        player: p.name, suspect, weapon, room: roomId,
        correct: true, winner: p.name,
        solution: room.solution
      });
    } else {
      p.eliminated = true;
      io.to(room.code).emit('accusation-result', {
        player: p.name, suspect, weapon, room: roomId,
        correct: false
      });
      if (checkLastStanding(room)) { cb && cb({ ok: true }); return; }
      const alive = room.players.filter(pl => !pl.eliminated);
      if (alive.length === 0) {
        io.to(room.code).emit('game-over', { solution: room.solution });
      } else {
        game.nextTurn(room);
        io.to(room.code).emit('turn-changed', game.publicState(room));
        scheduleBot(room);
        notifyRoomStart(room);
      }
    }
    cb && cb({ ok: true });
  });

  socket.on('back-to-lobby', ({ code, playerId }, cb) => {
    const room = game.getRoom(code);
    if (!room) return cb && cb({ error: 'Sala nao encontrada' });
    if (room.phase !== 'win') return cb && cb({ error: 'A partida ainda nao terminou' });
    game.resetToLobby(room);
    io.to(room.code).emit('back-to-lobby', {});
    broadcastRoomState(room);
    cb && cb({ ok: true });
  });

  socket.on('end-turn', ({ code, playerId }, cb) => {
    const room = game.getRoom(code);
    if (!room) return;
    const p = room.players[room.turnIndex];
    if (p.playerId !== playerId) return;
    game.nextTurn(room);
    io.to(room.code).emit('turn-changed', game.publicState(room));
    scheduleBot(room);
    notifyRoomStart(room);
    cb && cb({ ok: true });
  });

  socket.on('disconnect', () => {
    // reconexao tratada no join-room via playerId
  });
});

const PORT = process.env.PORT || 3000;

// limpeza periodica: salas vazias e jogadores desconectados (antes do inicio do jogo)
const gameModule = require('./src/game');
setInterval(() => {
  const all = gameModule.allRooms ? gameModule.allRooms() : [];
  for (const room of all) {
    if (room.started) continue; // em jogo: fantasmas viram reconexao por nome
    // so limpa se algum jogador REAL chegou a estar conectado (evita apagar sala recem-criada
    // enquanto o host navega da tela inicial para o lobby)
    if (room.players.length === 0 && !room.host) continue; // sala recem-criada: mantem por 5min
    if (room.players.length === 0) {
      if (Date.now() - room.createdAt < 5 * 60 * 1000) continue;
      gameModule.removeRoom(room.code);
      continue;
    }
    room.players = room.players.filter(p => p.isBot || (p.socket && p.socket.connected));
    if (room.players.length === 0) {
      if (Date.now() - room.createdAt < 5 * 60 * 1000) continue;
      gameModule.removeRoom(room.code);
    } else if (room.host && !room.players.some(p => p.playerId === room.host)) {
      // host saiu: promove o primeiro HUMANO (bots nunca comandam)
      const human = room.players.find(p => !p.playerId.startsWith('bot-'));
      room.host = human ? human.playerId : null;
    }
  }
}, 30000);

server.listen(PORT, () => {
  console.log('Servidor rodando em http://localhost:' + PORT);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log('Rede local (celular): http://' + net.address + ':' + PORT);
      }
    }
  }

  // abre o navegador sem criar outra janela de prompt
  if (process.env.OPEN_BROWSER === '1') {
    const url = 'http://localhost:' + PORT;
    const cmd = process.platform === 'win32' ? 'start "" "' + url + '"'
      : process.platform === 'darwin' ? 'open "' + url + '"'
      : 'xdg-open "' + url + '"';
    require('child_process').exec(cmd, () => {});
  }
});
