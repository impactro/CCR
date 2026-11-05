---
name: position-map
description: Exporta mapa de cinco a cem posições conhecidas em um raio, com PNG, SVG e HTML clicável, sem rede, geocodificação ou rastreamento.
---

Use `render-positions --agent-root <raiz> --data <JSON> --output <PNG novo>`.
Dados e saídas pertencem a `temp/` ou `outputs/` do consumidor autorizado.
JSON: `type: position`, `center: {latitude, longitude}`, `radiusMeters` (padrão
5.000) e `points: [{latitude, longitude, label, conversationId}]`. Campos
`ready` e `minimumPoints` da consulta CCI são aceitos. Coordenadas são números
finitos; todos os pontos devem estar no raio. Menos de cinco: manter a lista.

O mapa esquemático tem norte, raio, numeração e legenda. Não usa base viária,
não calcula trajetos nem pesquisa endereços. PNG serve para o canal WhatsApp;
HTML/SVG preservam links dos pontos no Google Maps e do centro no OpenStreetMap.
Não incluir nomes no link externo. Recursos são gerados localmente; abrir um
link é ação explícita do usuário. Manifesto contém hashes e não comprova envio.
