# Detetive — jogo multiplayer

Jogo de dedução estilo tabuleiro (inspirado em Clue) para 3 a 6 jogadores, jogável no navegador e otimizado para celular na horizontal.

## Como jogar

1. Crie uma sala na tela inicial e compartilhe o código de 4 letras
2. Cada jogador entra com o código e escolhe um personagem
3. O criador da sala inicia a partida — se houver menos de 3 jogadores, bots completam a mesa
4. Role o dado, ande pelo tabuleiro, entre nos cômodos e dê palpites
5. Quando tiver certeza, faça a acusação final: suspeito + arma + sala

## Rodando localmente

```bash
npm install
node server.js
```

Abra `http://localhost:3000`. Para jogar pelo celular, use o endereço de rede que aparece no console (mesmo Wi-Fi).

No Windows, basta dar dois cliques em `JOGAR.bat`.

## Tecnologia

- **Node.js + Express** servindo os arquivos estáticos
- **Socket.IO** para sincronização em tempo real (salas, turnos, palpites)
- Frontend em HTML/CSS/JS puro, ilustrações em SVG
- Estado do jogo inteiramente no servidor

## Estrutura

```
server.js          servidor Express + Socket.IO e regras de turno
src/board.js       tabuleiro, portas, passagens secretas, cálculo de movimentos
src/game.js        baralho, distribuição, refutação, acusação, reinício
public/            telas (início, lobby, jogo), estilos e ilustrações
```

## Deploy

O projeto usa WebSocket persistente, então precisa de um host com processo sempre ativo (Render, Railway, Fly.io). A Vercel não serve para este caso porque funções serverless não mantêm conexões WebSocket nem estado em memória.

No Render: conecte o repositório, o `render.yaml` já define build e start.
