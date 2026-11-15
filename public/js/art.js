/* Ilustracoes SVG estaticas: comodos, personagens e armas.
   Constantes globais: ROOM_ART, CHAR_ART, WEAPON_ART. Usadas por lobby.js e game.js. */

const ROOM_ART = {};

ROOM_ART.cozinha = '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">'
+ '<rect x="6" y="4" width="48" height="8" rx="2" fill="#8a8f96"/>'
+ '<rect x="6" y="4" width="48" height="3" rx="2" fill="#b9bec4"/>'
+ '<rect x="8" y="13" width="10" height="7" rx="1" fill="#5d6268"/>'
+ '<circle cx="13" cy="16.5" r="2" fill="#9aa0a6"/>'
+ '<rect x="26" y="12" width="8" height="9" rx="1" fill="#7d5a3c"/>'
+ '<rect x="42" y="13" width="10" height="7" rx="1" fill="#5d6268"/>'
+ '<rect x="44" y="15" width="6" height="1.5" fill="#9aa0a6"/>'
+ '<rect x="14" y="26" width="32" height="9" rx="2" fill="#8a6236"/>'
+ '<rect x="16" y="28" width="28" height="5" rx="1" fill="#a97e55"/>'
+ '<circle cx="22" cy="30.5" r="1.8" fill="#e8dcc0"/>'
+ '<circle cx="38" cy="30.5" r="1.8" fill="#c9503c"/></svg>';

ROOM_ART.musica = '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">'
+ '<rect x="5" y="5" width="28" height="17" rx="2" fill="#5a3d5e"/>'
+ '<rect x="7" y="7" width="24" height="13" rx="1" fill="#7d5580"/>'
+ '<path d="M11 17 q4 -8 8 0" stroke="#e8dcc0" stroke-width="1.4" fill="none"/>'
+ '<path d="M19 17 q4 -8 8 0" stroke="#e8dcc0" stroke-width="1.4" fill="none"/>'
+ '<rect x="7" y="22" width="2" height="13" fill="#3c2a3e"/>'
+ '<rect x="29" y="22" width="2" height="13" fill="#3c2a3e"/>'
+ '<rect x="40" y="7" width="15" height="22" rx="2" fill="#4a3320"/>'
+ '<rect x="42" y="9" width="11" height="18" rx="1" fill="#6e4c2e"/>'
+ '<rect x="42" y="13" width="11" height="1.5" fill="#3a2a18"/>'
+ '<rect x="42" y="18" width="11" height="1.5" fill="#3a2a18"/>'
+ '<rect x="42" y="23" width="11" height="1.5" fill="#3a2a18"/></svg>';

ROOM_ART.jantar = '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">'
+ '<rect x="12" y="12" width="36" height="16" rx="3" fill="#8a5a30"/>'
+ '<rect x="14" y="14" width="32" height="12" rx="2" fill="#a97e55"/>'
+ '<rect x="10" y="28" width="4" height="7" fill="#6e4526"/>'
+ '<rect x="46" y="28" width="4" height="7" fill="#6e4526"/>'
+ '<rect x="24" y="17" width="12" height="6" rx="1" fill="#e8dcc0"/>'
+ '<circle cx="30" cy="15" r="2" fill="#c9503c"/>'
+ '<circle cx="30" cy="25" r="2" fill="#e8dcc0"/>'
+ '<path d="M30 8 l-2 4 h4 z" fill="#d9ab52"/>'
+ '<rect x="29.2" y="8" width="1.6" height="4" fill="#d9ab52"/></svg>';

ROOM_ART.estar = '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">'
+ '<rect x="8" y="10" width="20" height="14" rx="3" fill="#5e7a4a"/>'
+ '<rect x="10" y="12" width="16" height="10" rx="2" fill="#7a9c62"/>'
+ '<rect x="34" y="10" width="20" height="14" rx="3" fill="#5e7a4a"/>'
+ '<rect x="36" y="12" width="16" height="10" rx="2" fill="#7a9c62"/>'
+ '<rect x="24" y="26" width="12" height="8" rx="2" fill="#4a5e3a"/>'
+ '<rect x="28" y="28" width="4" height="4" fill="#e8dcc0"/>'
+ '<circle cx="30" cy="6" r="2.5" fill="#d9ab52"/>'
+ '<path d="M30 8 l0 4" stroke="#d9ab52" stroke-width="1"/></svg>';

ROOM_ART.biblioteca = '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">'
+ '<rect x="5" y="4" width="50" height="10" rx="1" fill="#4a3320"/>'
+ '<rect x="5" y="14" width="50" height="10" rx="1" fill="#4a3320"/>'
+ '<rect x="5" y="24" width="50" height="10" rx="1" fill="#4a3320"/>'
+ '<rect x="8" y="6" width="3" height="6" fill="#a83c32"/>'
+ '<rect x="12" y="6" width="3" height="6" fill="#46617f"/>'
+ '<rect x="16" y="6" width="3" height="6" fill="#5e8c4a"/>'
+ '<rect x="21" y="6" width="3" height="6" fill="#d9ab52"/>'
+ '<rect x="27" y="6" width="3" height="6" fill="#7d5580"/>'
+ '<rect x="32" y="6" width="3" height="6" fill="#c9503c"/>'
+ '<rect x="37" y="6" width="3" height="6" fill="#e0b83c"/>'
+ '<rect x="44" y="6" width="3" height="6" fill="#4a6a8a"/>'
+ '<rect x="8" y="16" width="3" height="6" fill="#46617f"/>'
+ '<rect x="12" y="16" width="3" height="6" fill="#a83c32"/>'
+ '<rect x="18" y="16" width="3" height="6" fill="#e0b83c"/>'
+ '<rect x="24" y="16" width="3" height="6" fill="#5e8c4a"/>'
+ '<rect x="30" y="16" width="3" height="6" fill="#4a6a8a"/>'
+ '<rect x="36" y="16" width="3" height="6" fill="#7d5580"/>'
+ '<rect x="42" y="16" width="3" height="6" fill="#c9503c"/>'
+ '<rect x="10" y="26" width="14" height="6" rx="1" fill="#6e4c2e"/>'
+ '<rect x="30" y="26" width="18" height="6" rx="1" fill="#5d6268"/>'
+ '<rect x="32" y="28" width="4" height="2" fill="#e8dcc0"/></svg>';

ROOM_ART.escritorio = '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">'
+ '<rect x="20" y="6" width="20" height="12" rx="2" fill="#4a3320"/>'
+ '<rect x="22" y="8" width="16" height="8" rx="1" fill="#6e4c2e"/>'
+ '<rect x="24" y="10" width="12" height="4" rx="1" fill="#e8dcc0" opacity=".7"/>'
+ '<rect x="26" y="20" width="8" height="10" rx="1" fill="#8a5a30"/>'
+ '<circle cx="30" cy="25" r="3" fill="#d9ab52"/>'
+ '<rect x="10" y="8" width="7" height="9" rx="1" fill="#5d6268"/>'
+ '<rect x="11" y="9" width="5" height="2" fill="#9aa0a6"/>'
+ '<rect x="43" y="8" width="7" height="9" rx="1" fill="#5d6268"/>'
+ '<rect x="44" y="10" width="5" height="1.5" fill="#9aa0a6"/>'
+ '<rect x="12" y="26" width="5" height="8" rx="1" fill="#7d5a3c"/>'
+ '<rect x="44" y="26" width="5" height="8" rx="1" fill="#7d5a3c"/></svg>';

ROOM_ART.hall = '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">'
+ '<circle cx="30" cy="16" r="9" fill="none" stroke="#d9ab52" stroke-width="2"/>'
+ '<path d="M30 7 l2.2 4.5 5 .5 -3.7 3.4 1 4.9 -4.5-2.4 -4.5 2.4 1-4.9 -3.7-3.4 5-.5 z" fill="#d9ab52"/>'
+ '<rect x="8" y="28" width="10" height="7" rx="1" fill="#4a3320"/>'
+ '<rect x="42" y="28" width="10" height="7" rx="1" fill="#4a3320"/>'
+ '<rect x="26" y="30" width="8" height="5" rx="1" fill="#8a5a30"/>'
+ '<rect x="28" y="32" width="4" height="1.5" fill="#e8dcc0"/></svg>';

ROOM_ART.lounge = '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">'
+ '<rect x="14" y="14" width="32" height="14" rx="4" fill="#7a4a5e"/>'
+ '<rect x="17" y="17" width="26" height="8" rx="2" fill="#9a6278"/>'
+ '<rect x="10" y="30" width="8" height="5" rx="1" fill="#5a3644"/>'
+ '<rect x="42" y="30" width="8" height="5" rx="1" fill="#5a3644"/>'
+ '<rect x="26" y="6" width="8" height="5" rx="1" fill="#5a3644"/>'
+ '<circle cx="30" cy="8.5" r="1.5" fill="#e8dcc0"/>'
+ '<path d="M20 24 q4 5 8 0" stroke="#5a3644" stroke-width="1.5" fill="none"/>'
+ '<path d="M34 24 q4 5 8 0" stroke="#5a3644" stroke-width="1.5" fill="none"/></svg>';

ROOM_ART.adega = '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">'
+ '<rect x="8" y="6" width="44" height="6" rx="1" fill="#4a3320"/>'
+ '<rect x="8" y="16" width="44" height="6" rx="1" fill="#4a3320"/>'
+ '<rect x="8" y="26" width="44" height="6" rx="1" fill="#4a3320"/>'
+ '<circle cx="15" cy="9" r="2.5" fill="#5e8c4a"/>'
+ '<circle cx="22" cy="9" r="2.5" fill="#46617f"/>'
+ '<circle cx="30" cy="9" r="2.5" fill="#a83c32"/>'
+ '<circle cx="38" cy="9" r="2.5" fill="#46617f"/>'
+ '<circle cx="15" cy="19" r="2.5" fill="#a83c32"/>'
+ '<circle cx="22" cy="19" r="2.5" fill="#5e8c4a"/>'
+ '<circle cx="30" cy="19" r="2.5" fill="#46617f"/>'
+ '<circle cx="38" cy="19" r="2.5" fill="#a83c32"/>'
+ '<circle cx="18" cy="29" r="2.5" fill="#46617f"/>'
+ '<circle cx="26" cy="29" r="2.5" fill="#a83c32"/>'
+ '<circle cx="34" cy="29" r="2.5" fill="#5e8c4a"/>'
+ '<circle cx="42" cy="29" r="2.5" fill="#46617f"/>'
+ '<rect x="12" y="9" width="6" height="1" fill="#6e4c2e"/>'
+ '<rect x="12" y="19" width="6" height="1" fill="#6e4c2e"/>'
+ '<rect x="15" y="29" width="6" height="1" fill="#6e4c2e"/></svg>';

/* ---------- retratos dos personagens (busto 48x48) ---------- */
const CHAR_ART = {};

function bust(skin, hair, extra) {
  return '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">'
  + '<rect width="48" height="48" fill="#1d1813"/>'
  + '<circle cx="24" cy="26" r="16" fill="' + hair + '"/>'
  + '<circle cx="24" cy="22" r="9" fill="' + skin + '"/>'
  + '<circle cx="20.5" cy="21" r="1.2" fill="#1d1813"/>'
  + '<circle cx="27.5" cy="21" r="1.2" fill="#1d1813"/>'
  + '<path d="M21 26 q3 2.5 6 0" stroke="#1d1813" stroke-width="1.2" fill="none"/>'
  + extra + '</svg>';
}

CHAR_ART.scarlet = bust('#e8b89a', '#8a2c2c',
  '<path d="M15 20 q9 -9 18 0 l0 4 q-9 -6 -18 0 z" fill="#a83c32"/>'
  + '<path d="M13 30 q11 6 22 0 l1 8 q-12 5 -24 0 z" fill="#a83c32"/>');

CHAR_ART.mustard = bust('#e0b184', '#c9a13c',
  '<rect x="12" y="12" width="24" height="4" rx="2" fill="#b8873a"/>'
  + '<rect x="16" y="4" width="16" height="9" rx="2" fill="#d9ab52"/>'
  + '<rect x="14" y="30" width="20" height="12" rx="3" fill="#c9a13c"/>');

CHAR_ART.white = bust('#f0d4bc', '#e8e4dc',
  '<path d="M14 22 q10 -12 20 0 l0 6 q-10 -8 -20 0 z" fill="#ece4d4"/>'
  + '<circle cx="24" cy="10" r="4" fill="#d9ab52"/>'
  + '<path d="M24 6 v8" stroke="#b8873a" stroke-width="1"/>');

CHAR_ART.peacock = bust('#e8c4a8', '#3a6a9a',
  '<path d="M24 4 q10 2 10 12 l-4 2 q0 -8 -6 -9 q-6 1 -6 9 l-4 -2 q0 -10 10 -12z" fill="#3a6a9a"/>'
  + '<circle cx="24" cy="6" r="2" fill="#4a9ad6"/>'
  + '<path d="M14 32 q10 5 20 0 l1 10 q-11 4 -22 0 z" fill="#3a6a9a"/>');

CHAR_ART.plum = bust('#d4a888', '#5e3a6e',
  '<path d="M13 22 q11 -14 22 0 l0 3 q-11 -9 -22 0 z" fill="#5e3a6e"/>'
  + '<circle cx="18" cy="21" r="2.6" fill="none" stroke="#1d1813" stroke-width="1"/>'
  + '<circle cx="30" cy="21" r="2.6" fill="none" stroke="#1d1813" stroke-width="1"/>'
  + '<path d="M14 30 q10 5 20 0 l1 11 q-11 4 -22 0 z" fill="#5e3a6e"/>');

CHAR_ART.green = bust('#d4a888', '#4a5e3a',
  '<path d="M14 20 q10 -10 20 0 l0 3 q-10 -7 -20 0 z" fill="#4a5e3a"/>'
  + '<rect x="21" y="12" width="6" height="3" fill="#2c3a22"/>'
  + '<path d="M14 30 q10 5 20 0 l1 11 q-11 4 -22 0 z" fill="#4a5e3a"/>'
  + '<path d="M20 32 h8" stroke="#2c3a22" stroke-width="1.4"/>');

const CHAR_PIECE_BG = {
  scarlet: '#a83c32', mustard: '#c9a13c', white: '#ece4d4',
  peacock: '#3a6a9a', plum: '#5e3a6e', green: '#4a5e3a'
};

/* ---------- icones das armas (40x28) ---------- */
const WEAPON_ART = {};

WEAPON_ART.corda = '<svg viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">'
+ '<path d="M8 6 q12 10 24 0 M8 6 q-3 8 4 16 M32 6 q3 8 -4 16" '
+ 'stroke="#c9a13c" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
+ '<path d="M10 12 q10 7 20 0" stroke="#a8823c" stroke-width="1.4" fill="none"/></svg>';

WEAPON_ART.faca = '<svg viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">'
+ '<path d="M6 14 L26 10 L26 18 Z" fill="#c8ccd2"/>'
+ '<path d="M6 14 L26 12 L26 14 Z" fill="#eceff2"/>'
+ '<rect x="26" y="11" width="10" height="5" rx="2" fill="#5a3d26"/>'
+ '<rect x="25" y="10.5" width="2" height="6" fill="#3a2818"/></svg>';

WEAPON_ART.castical = '<svg viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">'
+ '<path d="M20 3 l-1.5 3 h3 z" fill="#f0d060"/>'
+ '<rect x="19.4" y="5" width="1.2" height="4" fill="#e8dcc0"/>'
+ '<rect x="12" y="9" width="16" height="3" rx="1.5" fill="#b8873a"/>'
+ '<rect x="15" y="12" width="10" height="4" rx="1" fill="#9a6e2c"/>'
+ '<rect x="16" y="16" width="8" height="8" rx="2" fill="#7d5a26"/></svg>';

WEAPON_ART.revolver = '<svg viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">'
+ '<path d="M8 10 h18 l-2 5 h-8 l-2 8 h-6 l2-8 h-4 z" fill="#4a4f56"/>'
+ '<circle cx="16" cy="13" r="3" fill="#2c3036"/>'
+ '<circle cx="16" cy="13" r="1.2" fill="#14161a"/>'
+ '<rect x="6" y="9" width="6" height="2" fill="#3a3e44"/></svg>';

WEAPON_ART.cano = '<svg viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">'
+ '<rect x="4" y="11" width="26" height="6" rx="2" fill="#6e747c"/>'
+ '<rect x="4" y="11" width="26" height="2.5" rx="1" fill="#9aa0a6"/>'
+ '<rect x="28" y="8" width="8" height="12" rx="2" fill="#4a4f56"/>'
+ '<rect x="30" y="10" width="4" height="8" rx="1" fill="#2c3036"/></svg>';

WEAPON_ART.chave = '<svg viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">'
+ '<circle cx="11" cy="14" r="6" fill="none" stroke="#9aa0a6" stroke-width="3"/>'
+ '<rect x="16" y="12.5" width="18" height="3" fill="#9aa0a6"/>'
+ '<rect x="30" y="15.5" width="3" height="4" fill="#9aa0a6"/>'
+ '<rect x="25" y="15.5" width="3" height="5" fill="#9aa0a6"/></svg>';




