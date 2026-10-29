# Matriz de compatibilidade dos renders de chat

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
