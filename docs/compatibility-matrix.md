# Matriz de compatibilidade dos renders de chat

Direção atual30/10/2026: três superfícies ativas (CWH WhatsApp, CWH Assistente,
CCI Explorador) e CAW como quarta futura. ALP é laboratório/referência. A matriz
histórica abaixo não declara paridade atual; consultar também
[RICH-CONTENT-CONSUMERS.md](RICH-CONTENT-CONSUMERS.md) para tipos, capacidades
geográficas, prompt canônico planejado e integração futura de email.

Inventário original de25/10/2026 do [plano compartilhado](shared-render-plan.md). CAW significa a
fonte local de referência; ALP significa o pacote 26.10.25-a com os plugins do
produto. next é a linha candidata ainda não implementada. Presença no código
não equivale a homologação em outro consumidor ou em todos os clientes CAW.

Estado por célula: identificado, parcial, ausente, em teste ou validado. Registrar
validado somente com referência de teste/revisão/consumidor. Nesta matriz inicial,
os testes descritos são critérios futuros e não resultados já produzidos.

| ID | Capacidade | CAW atual | ALP atual | Pareamento e aceite do candidato |
| --- | --- | --- | --- | --- |
| R01 | Casca de conversa | Identificada na aplicação chat.js | Identificada na UI do produto, fora do núcleo CM | Transcript/composer/estados desacoplados, com ações do host. |
| R02 | Envelope e ordem | textResult e responses[] projetados pelo CA | Texto, blocos visuais e anexos adaptados pelo ALP | Preservar ordem e semântica, sem novo protocolo público ou parser de execução no render. |
| R03 | Texto e código | Markdown sanitizado pelo servidor, conteúdo técnico separado | Markdown sanitizado no cliente, plugins para blocos | Fixtures de listas/tabelas/código, Unicode e conteúdo inválido; confiança em HTML explícita. |
| R04 | Dados tipados | Contrato com string/html/number/boolean/date/datetime | Núcleo genérico mais restrito; grades via plugins | Preservar tipos, null e unidades; não converter ausência em zero. |
| R05 | Gráficos | showdata com múltiplos tipos e dependências próprias | Gráficos locais no núcleo e apresentação avançada nos plugins | Tabela acessível, escolha coerente e alternativa quando recurso não estiver disponível. |
| R06 | Interação e exportação | Ações do CAW e capacidades de showdata | Grade e exportações do produto | Inventariar filtros, ordenação e formatos separadamente; não declarar exportação genérica por existir em um plugin. |
| R07 | HTML e SPA | Referência de arquivo autorizado e iframe do CA | Conteúdo autocontido isolado e política do host | Adaptar arquivo/conteúdo e permissões, preservar isolamento, navegação e alternativa legível. |
| R08 | Links externos | Tipo link e incorporação conforme políticas do provedor | Links de fonte; não há paridade genérica de embeds no núcleo | Política explícita de incorporação; Abrir disponível quando o destino recusar frame. |
| R09 | Imagem e arquivo | Registro de arquivos e URLs próprias protegidas | Artefatos da sessão e ações de download | Resolver por host, sem expor caminho físico ou aceitar URL arbitrária do modelo. |
| R10 | PDF | Visualizador de arquivo com verificação do recurso | PDF.js sob demanda, com limites próprios | Comparar estratégias e documentos, manter acesso autorizado e download; não copiar endpoint fixo. |
| R11 | Áudio e voz | Reprodução e ações ligadas aos serviços de voz do CA | Apresentação de áudio/voz gravada no módulo | Reproduzir áudio; geração, gravação, transcrição e Ouvir são capacidades do host, não presumidas. |
| R12 | Vídeo e YouTube | Mídia no chat/visualizador; levantar os casos concretos de embed | Vídeo e YouTube sob demanda no núcleo; plugins do ALP | Codec/controles, política de origem e parada ao sair; sem autoplay implícito. |
| R13 | Mermaid e SVG | Mermaid no visualizador; inventariar SVG por canal | Mermaid e SVG via plugins do produto | Extrair somente capacidades genéricas, mantendo CSP e descarte; tipos não suportados têm alternativa. |
| R14 | Mapas e bairros | Não identificado como capacidade genérica CAW | Plugin eleitoral e dados próprios do ALP | Permanecer plugin ALP; render comum não consulta nem interpreta a base eleitoral. |
| R15 | Temas e clientes | Tokens CA e extensões locais de clientes | Estilos do módulo e customização do ALP | Mapear tokens e hooks, testar claro/escuro/customizado sem importar identidade de outro cliente. |
| R16 | Workspace e usuário | Escopo autenticado fornecido/verificado pelo backend | Sessão pública e visitorId pseudônimo; não é workspace CA | IDs opacos, nulos quando ausentes; host continua autorizador. |
| R17 | Conversa, mensagem e execução | Histórico/lista de conversas e execuções do CA | Histórico da sessão, questionId e attemptId próprios | Separar IDs; correlacionar partes, atualização e cancelamento sem confundir sessão SDK com conversa. |
| R18 | Carregamento e atualização | Fluxos próprios de chat/modo agente e consultas de estado | Polling e apresentação final com estados do produto | Adaptadores de eventos; uma conversa não recebe atualização tardia de outra. |
| R19 | Ciclo de vida | Cleanup distribuído na aplicação e serviços | dispose/AbortSignal no núcleo e ações/plugins do ALP | Parar mídia, cancelar fetch, descartar frames, timers e URLs ao substituir ou sair. |
| R20 | Ações visuais | Copiar, Ouvir e ações contextuais do CAW | Copiar/exportar e ações do produto | Callbacks de capacidades; ocultar/desabilitar ações ausentes, sem invocar serviço errado. |
| R21 | Acessibilidade e desempenho | Comparar telas/temas atuais dos clientes | Tabelas acessíveis e limites do núcleo; conferir plugins | Teclado/foco/contraste/móvel, DOM/listeners e recursos sob demanda; separar tempos de modelo e UI. |
| R22 | CWH mínimo | Nova demanda, não capacidade instalada por este plano | CChatRender reutilizável como dependência | Um usuário/conversa, resultado rico e erro/cancelamento local; nenhuma entrega WhatsApp por efeito do teste. |
| R23 | CAW local e múltiplos escopos | Fonte disponível; instalação de teste é etapa posterior | Não é uma função do ALP | Dois usuários/workspaces e duas conversas, arquivos cruzados negados e troca durante carregamento. |
| R24 | Seleção e retorno | Atual apresentação integrada ao CA | Pacote fixado pelo consumidor | Seleção explícita por instância/versão; testar retorno sem mudar banco, perfil ou motor. |

## Registro de evidência por capacidade

Ao desenvolver uma fatia, registrar nesta seção o ID Rxx, revisão do módulo,
driver, adaptador e consumidor, fixture sintética, teste funcional, conferência
visual, limites e decisão. Não inserir conversas, identificadores reais de
visitantes, credenciais ou arquivos privados de clientes.

A matriz não contém executor ou estado de tarefa; esses dados ficam na fila
única do projeto dono. Uma lacuna vira uma tarefa local referenciada, e não uma
segunda lista de pendências neste documento.


### Candidato26.10.29-a — primeira convergência

R10/R19: PDF nativo sob demanda com contêiner fornecido pelo host, baixar,
fechar e descarte; PDF.js/worker/dependência removidos. Teste sintético DOM em
sandbox-pdf.test.mjs; aparência do plugin nativo depende do navegador.
R15/R17: projection ChatMessage documentada, classes chat-* e tokens --ca-ui-*,
agrupamento por autor/conversa/direção/dia, state por conversa em memória.
R18/R19: update preserva mídia quando snapshot/escopo/revisão não mudam; mudança
de corpo ainda remonta. Testes presentation.test.mjs incluem troca de conversa,
meia-noite local e Blob com origem/autorização explícitas. Não certifica CAW.
Integração e publicação ALP/CWH são evidências próprias dos consumidores.


### Revisão de escopo29/10 — protótipos CWH não equivalem a capacidade instalada no CM

Pacote comum permanece26.10.29-a. CWH fontee6c106a/26.10.29-r;
ALP última confirmação b6c507f/26.10.29d. CA/CAW seguem fora desta rodada.
As células da tabela original acima são históricas; as evidências posteriores
registram evolução. Novas linhas mantêm IDs estáveis, sem virar backlog paralelo.

| ID | Capacidade | CWH atual | ALP conferido | CChatRender atual / candidato |
| --- | --- | --- | --- | --- |
| R25 | Autor e cor por identidade | Automática fixa, manual/reset no privado e aliases verificados; SQLite no host | Autor/projeção no produto; cor por autor não conferida nesta revisão | Não fornece cadastro/paleta de autor; candidato recebe descritor do host. |
| R26 | Citação | Referência/direção nativa, prévia, autor/cor do citado e barra quadrada | Comportamento de citação não pareado | Ausente como componente comum; próximo E2. |
| R27 | Reagir e remover própria |8/+81, contagem, própria e feedback imediato | Não pareado | Apresentação/callback/own state candidatos; operação não pertence ao núcleo. |
| R28 | Ações por mensagem | Ordem responder/reagir/visualizar/baixar/encaminhar; mídia condicional | Ações próprias de conteúdo rico | Contrato granular ainda proposto; ausência de ação deve ocultar controle. |
| R29 | UI otimista | Fecha antes da rede; operações por mensagem ordenadas, erro tardio protegido | Polling de execução; feedback de reação não pareado | update conserva snapshot igual; não é framework completo de ações/diff. |
| R30 | Seletor de pessoas | Busca/seleção, nomes/fotos e exclusão de Status | Não pareado | Componente candidato; destinos/regras carregados pelo host. |
| R31 | Progresso de encaminhamento | Fila durável, primeira parte conforme metadados e depois1/min; pausa/retomada/cancelar | Jobs de IA são outro domínio | Slot visual pode ser comum; dispatcher, ritmo e recibos permanecem no host. |
| R32 | Casca e navegação compactas | Toggle X/menu ancorado, labels circulares/tooltip/clear condicional, testeira compacta | Layout específico do produto | Tokens/classes/composição a alinhar; não importar shell inteiro. |

R15/R17/R19/R20/R21 continuam transversais: temas completos, estado por conversa,
identidade, descarte e disponibilidade de ações. Testes de referência CWH:
author-colors.test.mjs, reaction-feedback.test.mjs, message-actions.test.mjs,
message-presentation.test.mjs e bridge/test_author_colors.py. Dados sintéticos;
nenhum teste envia a contato real. Comum ainda precisa executar essas fixtures
no seu próprio adaptador antes de marcar cada célula como validada no CM/ALP.

### Candidato26.10.29-b — produto CWH primeiro

R15/R17/R25/R26: envelope `renderChatMessage`, citação `renderChatQuote` e
validação de cor compartilhados, adotados pelo CWH. Descritor do autor fornecido
pelo host; citado tem identidade/cor própria. Autoria, conversa, direção e dia
determinam sequência, não role. Política de avatar próprio configurável.
R27: somente apresentação da contagem já agregada; seletor/operação ainda no
CWH. R28/R29/R30/R31/R32 não são declarados extraídos por esta entrega.

Fixtures CWH de28 balões/5 citações capturadas na fonte26.10.29-r antes da troca
comparam o HTML completo sem diferença; CSS do host conservado. Casos comuns
incluem dois autores assistant, duas conversas, citação com autor diferente,
entrada desconhecida e escape de texto/cor. ALP permanece26.10.29-a nesta frente,
sem adaptação/publicação presumida. CA/CAW permanecem intocados. CWH dita esta
rodada de integração; ALP é laboratório e se adapta depois.

### Nome CCR e documentos CES —mapeamento29/10

CCR = Crânio Chat Render, mesmo módulo/pacote CChatRender. Adaptação ALP para
26.10.29-b autorizada ao chat dono, ainda sem resultado presumido nesta revisão.

| ID | Capacidade | Situação e aceite futuro |
| --- | --- | --- |
| R33 | Reconhecer documento rico CES | Mapeado em CCR-RICH-DOCUMENT.md; owner/format/version/renderer/type propostos. Decoder não instalado; JSON/HTML comum e incompatíveis continuam arquivo. |
| R34 | Mesmo dado rico por host/canal | Um decoder CCR e adaptadores de recurso; mesmo JSON mantém tipos/ordem no ALP/CWH. CAW tipado e plugins ALP têm diferenças inventariadas; não é paridade entregue. |

Confirmação ALP:26.10.29e/Sites97/9d93d42, CCR26.10.29-b,105 testes e
build/conteúdo rico, envelope único instalado; R15/R17/R25/R26 consumidos,
preservando autores/personagens, cores e citação. API/assets conferidos pelo
dono no PC-IA; nenhum screenshot de navegador. R33/R34 continuam mapeamento.

### CCR26.10.29-c — R33/R34 e copiar

R33 implementado: contrato v1, marker CES JSON/HTML, validação estrita e status
unrecognized/unsupported/invalid que conservam arquivo no adaptador. Até1MiB,
table/bar/column/line/area e HTML passivo; versão de formato não é versão npm.
R04 ampliado: string/number/boolean/date/datetime/html inline limitado/null,
com mesmo validador de tabela. Outros gráficos/plugins CAW continuam lacuna.
R34: objeto e arquivo equivalentes testados no núcleo; cada host confirma adoção.
R20: copyText e richDocumentText para cópia local/TSV, sem transporte.31 testes.
E4/diff completo e dispatcher de ações comuns não são declarados entregues.

Evidência CWH68881ab/t:277 testes e DOM com CSS claro/escuro,18 assets instalados
sem restart;2 documentos sintéticos enviados pelo CWH para self, observados na
captura local como file/fromMe/sent. Recuperação nativa na origem com hash dos
bytes igual ao original, sem forçar rede. DTOs capturados +bytes correspondentes
renderizados pelo adaptador real em DOM: tabela3linhas/gráfico3barras/HTMLpassivo,
download e copiar externos, sem segunda moldura. Não é inspeção de navegador.
ALP corrigiu a moldura/cópia em26.10.29f/Sites98/8970092,106 testes; módulo c
adotado posteriormente por versão própria a confirmar. Nenhum envio a terceiro.

Fechamento ALP:26.10.29g/Sites99/83f13fc, CCR26.10.29-c/hash fixado,111 testes
e exemplos equivalentes por objeto/arquivo no adaptador, cópia comum com foco.
Transporte público ALP ainda sem documents/upload; não é E2E público de anexos.
Plugins existentes preservados; não há decoder alternativo. PCIA parado.

## CCR26.10.29-d — ações externas

Faixa comum de ações por capacidade, IDs opacos, ordem e callbacks do host;
API em [CCR-ACTIONS.md](CCR-ACTIONS.md). Atualização keyed, AbortSignal/dispose e controles nativos de
export sem clone; corpo/player/PDF/rascunho independentes. CWH integra markup
puro no dispatcher existente; ALP recebe o mesmo pacote para seu adaptador.
38 testes locais. O diff completo do corpo e a área de testes de agentes
continuam próximas fatias; CAW não é alterado.

Adoção confirmada CCRd: CWH26.10.29-u (ec5c3b2 +12ed59c/fe5327c) instalado
por patch seletivo e ALP26.10.29h/Sites100/879d703 publicado,121 testes. Ambos
consomem a mesma faixa externa por capacidades. ALP preserva callbacks/controles
nativos e cancela fetch/export ao descartar. CWH conserva dispatcher e visual;
277 testes frontend e DOM claro/escuro aprovados. E4/diff completo e área de
testes de agentes continuam futuros. CA somente adapter MCP em fonte, sem CAW.

## 30/10 — Assistant rich protocol (CWH owner)

CCR26.10.30a adds generic coordinate maps, numeric heatmaps and fenced `ccr`
CES documents, reusing the same typed data/null contract. Markdown chart/map
hooks let authorized hosts supply richer providers without provider imports in
the core. Generic coordinates are distinct from ALP electoral layers; no ALP
plugin or CAW code was changed. The native map retains an accessible table,
plots valid lat/lon offline and links explicit points to Google Maps.

The CWH Assistant opts into the existing opaque SPA runtime. WhatsApp rich
attachments remain passive. One bubble, external actions and disposal are
preserved. Native PDF stays the common file viewer. No Google Charts loader,
ALP election basemap or CAW customer parity is claimed by this slice.
Evidence: tests/visuals.test.mjs plus the existing lifecycle/runtime suite.
Product execution/workspace stays in CWH LAB-CHAT-001, not CCR.


## 30/10 — Canonical visual tokens (CCR26.10.30b)

Shared body/table borders, captions and error surfaces consume --ca-ui-* with
neutral standalone fallbacks; the private --line fallback is removed. The host
owns palette/font/spacing and exposes its tokens on the document root. CCR
does not select a theme or discover identity. Structured SVG chart colors,
heatmap scales, document HTML and native PDF retain their content semantics;
a brand migration must not recolor document pixels or change authorization.
CWH CSS-MIGRATION.md and CA VISUAL-IDENTITY.md describe consumer migration.
This CSS-only release preserves renderer APIs and disposal. Immutable earlier
packages remain available; consumers explicitly pin the new artifact hash.
