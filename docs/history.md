# Histórico resumido do CCR

Marcos de contratos e compatibilidade. Registros completos permanecem no Git;
instalação e aceite são específicos de cada consumidor.

## 2026-11-02 — documentação do pacote instalado

Guia distingue renderer JavaScript e tools Python. Histórico consolidado,
sem acrescentar capacidade ou declarar adoção de consumidor.

## 26.11.2a–g — mapas sob demanda e exportação

Receitas substituem atlas embarcado: cache público por consumidor, origem/
licença/hashes, atualização atômica e geração anterior preservada. Recortes
vão de mundo/país a município/bairro com fonte oficial; sede não é polígono.
Corrigidas escala local, rótulos e rasterização. Mudança só de desenho
reutiliza vetores sem download.

26.11.2f mantém teto de 10.000 linhas/pontos. 26.11.2g acrescenta séries
line/column com eixos/unidades, text/image/report CES v1 e export-document
PNG/PDF pelo mesmo scene SVG, com runtime fechado, saída exclusiva,
limites e manifesto. Imagens são recursos autorizados; sem fetch no render.
Fonte/teste não comprova instalação universal.

## 26.11.1a–n — histórico progressivo e geografia

Timeline recebe fonte paginada/callbacks, loading, retry, cancelamento,
deduplicação e prepend preservando âncora. Reconciliação mantém nós/recursos,
ordena eventos e atualiza fronteira de anteriores. Viewport explícito e
ações contextuais por teclado; opção desligada preserva envelope legado.
Falhas de dispose/reentrada cobertas por regressão.

Mapas por GPS/cidade/UF/país, precedência geográfica, proporção responsiva e
simplificação cartográfica. Atlas dessa série substituído por receitas na
26.11.2. Consultas, cursores, identidade, autorização e efeitos ficam no host.

## 26.10.31a–b — prompt e origem

Prompt compõe capabilities/plugins reais, schemas/exemplos e limites. Teto 32
acomoda 12 plugins ALP sem mudar drivers. Origem pública impactro/CCR, pasta
CM/CCR e nome técnico @crania/chat-render preservado. Dependências fixam SHA
e assets têm proveniência; Git não implica publicação npm.

## 26.10.29b–c — apresentação e documentos CES

Envelope comum com autor, sequências, datas/horas, slots, contagens e citação,
sem transporte/banco. ccr.document v1 introduz decoder fechado, tabelas
tipadas, gráficos e HTML passivo; zero/false/null/datas e cópia texto/TSV
preservados. Documento rico é contrato distinto de V4.

## 26.10.25a — extração

Markdown, dados/gráficos, HTML/SPA isolados, mídia, PDF sob demanda, YouTube
após clique, plugins e lifecycle por resposta. Conteúdo não concede acesso;
scripts desligados por padrão. SemVer npm com hífen corresponde à versão CES.
CAW/ALP/CWH/CCI exigem integrações e aceites próprios.
