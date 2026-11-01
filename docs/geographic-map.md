# Mapa geográfico do Brasil no CCR

## Procedimento de adoção

Pedido: mostrar cidades reais dentro de estados/regiões, inclusive quando o dado
contiver somente cidade/UF ou nome de estado. A grade de coordenadas anterior
não atende a esse caso. CCR apresenta; hosts conservam autorização e dados.

1. Fixar uma cópia pública e sanitizada das malhas UF do IBGE e das sedes
   municipais IBGE disponibilizadas pela Infra S.A. Registrar URLs, hashes,
   data de obtenção e limites de cobertura. Nenhum dado de cliente entra na base.
2. Resolver nomes localmente: cidade+UF, cidade única sem UF e estado por nome
   ou sigla. Normalizar acentos/caixa; homônimos, desconhecidos ou UF conflitante
   ficam sem ponto, com motivo e linha original preservada. Não fazer fuzzy match.
3. Desenhar malhas reais dos27 estados/DF e pontos das cidades. Estado isolado
   destaca o polígono; GPS válido explícito tem precedência e não é substituído
   por sede municipal. Quantidade é opcional e zero/nulo permanecem distintos.
4. Oferecer zoom, navegação, retorno ao enquadramento e detalhes acessíveis.
   Não consultar geocoder, CDN ou tiles no navegador, nem enviar dados ao IBGE.
   A referência de uma sede municipal não representa GPS de uma máquina.
5. Testar resolução/ambiguidade, projeção, polígonos, quantidade, zero/nulo,
   XSS, limites, interação/teclado e descarte; manter Markdown map e CES map
   com o mesmo comportamento. Atualizar prompt e exemplos da mesma revisão.
6. Publicar CCR fixo; recompilar CAW, CWH e CCI a partir desse SHA, com versões
   próprias e recibos íntegros. Instalar pelo CMonitor no runtime autorizado,
   preservando configuração/bancos/pareamento e uma recuperação anterior.
7. Inspecionar no navegador os três formatos: cidade+UF sem GPS, estado sem GPS
   e pontos explícitos. Usar dados sintéticos na galeria; consulta real somente
   no Assistente próprio autorizado. Nenhum envio WhatsApp é necessário.

## Fontes públicas

- Malhas: https://servicodados.ibge.gov.br/api/docs/malhas?versao=3
- Estados: https://servicodados.ibge.gov.br/api/v1/localidades/estados
- Sedes: https://geo.infrasa.gov.br/server/rest/services/Hosted/Sedes_Municipais/FeatureServer

## Limites do primeiro corte

Brasil é a base nominal/cartográfica incluída. Localidades fora dessa base
continuam na tabela com cobertura explícita; não prometer resolução mundial,
endereços, rotas, imagens de satélite, mapa de ruas ou coordenadas ao vivo.
Dados públicos versionados podem ficar desatualizados; atualização é um build,
não uma chamada durante o render. Pontos enviados pelo host continuam sujeitos
à autorização dele. Não extrair coordenadas de texto operacional arbitrário.
