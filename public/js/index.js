const socket = io();

function makeId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'p-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

function getPlayerId() {
  let id = localStorage.getItem('playerId');
  if (!id) {
    id = makeId();
    localStorage.setItem('playerId', id);
  }
  return id;
}

const nameInput = document.getElementById('input-name');
nameInput.value = localStorage.getItem('playerName') || '';

// preenche codigo se veio de link compartilhado (?join=CODE)
const joinParam = new URLSearchParams(window.location.search).get('join');
if (joinParam) document.getElementById('input-code').value = joinParam.toUpperCase();

document.getElementById('btn-create').addEventListener('click', () => {
  socket.emit('create-room', ({ code }) => {
    localStorage.setItem('playerName', nameInput.value || 'Host');
    window.location.href = `/lobby.html?room=${code}&create=1`;
  });
});

document.getElementById('btn-join').addEventListener('click', () => {
  const code = document.getElementById('input-code').value.trim().toUpperCase();
  const name = nameInput.value.trim();
  if (code.length !== 4) return showError('Digite o codigo de 4 letras');
  if (!name) return showError('Digite seu nome');
  localStorage.setItem('playerName', name);
  window.location.href = `/lobby.html?room=${code}`;
});

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

document.getElementById('btn-howto').addEventListener('click', () => {
  document.getElementById('modal-howto').classList.remove('hidden');
});

document.getElementById('btn-howto-close').addEventListener('click', () => {
  document.getElementById('modal-howto').classList.add('hidden');
});
