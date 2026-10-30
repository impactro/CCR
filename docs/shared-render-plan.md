# CCR — evolução gradual do render de chat compartilhado

CCR significa **Crânio Chat Render**, nome curto humano do CChatRender. Nome do
pacote `@crania/chat-render` e caminhos permanecem estáveis. O próximo conteúdo
rico em documentos CES está mapeado em [CCR-RICH-DOCUMENT.md](CCR-RICH-DOCUMENT.md).

## Objetivo e direção

CAW, ALP e CWH devem terminar usando o mesmo render de chat, com adaptadores e
configuração próprios. A evolução começa com implementações paralelas, preserva
os clientes atuais e aproveita as melhorias do laboratório político. A adoção e
a padronização completa acontecem por etapas, depois de uso e validação nos três
consumidores.

Fábio definiu essa direção em 25/10/2026. Esta entrega formaliza o planejamento e
os próximos ciclos; não extrai arquivos, altera serviços ou troca renders ativos.
O plano e a [matriz de compatibilidade](compatibility-matrix.md) são a referência
durável. O estado de execução pertence à fila local do projeto responsável.

## Decisões que devem sobreviver aos ciclos

| Decisão | Aplicação |
| --- | --- |
| Preservar o que funciona | CAW atual e ALP atual continuam disponíveis durante a evolução. |
| Um módulo compartilhado | CChatRender é o nome de trabalho do módulo; não criar um fork permanente por consumidor. |
| Três linhas paralelas | CAW atual, ALP atual e um candidato comum substituível, identificado inicialmente como next. next não é nome de produto ou versão pública. |
| Três consumidores finais | Pergunte Aí/ALP, chat mínimo do CWH e CAW do CrânIA Agent. CAW é uma interface do CA, não um quarto consumidor. |
| Laboratório primeiro | Usar ALP e chat mínimo do CWH para experimentar, sem substituir interfaces de clientes CAW. |
| Compatibilidade incremental | Trabalhar item a item, com correspondência de comportamento, testes e pequenas melhorias transferidas entre os lados. |
| Customização preservada | Manter temas, estilos, classes e pontos de extensão utilizados por cada cliente até uma migração explícita. |
| Troca por instância | Cada consumidor seleciona uma versão e um driver; não existe promoção global implícita. |
| Migração separada | A migração e ativação do agente AIstein pertencem à tarefa de Migração AIstein; este plano não a substitui. |
| Padronização ao final | Um contrato mínimo permite conectar os componentes; protocolo, comunicação, tipagem e dados são consolidados após os três consumidores funcionarem. Preservar os protocolos públicos existentes durante a transição. |

## Referências históricas de25/10/2026

| Fonte observada | Referência | Interpretação |
| --- | --- | --- |
| CraniaAgent local | commit 71d5a61 | Código de referência do CAW, não prova da revisão instalada em todos os clientes. |
| CChatRender inicial | commit 8bcaaf6, pacote 26.10.25-a | Render extraído do ALP e efetivamente consumido pelo Pergunte Aí. |
| Fonte local do módulo | alterações visuais26.10.25-b ainda não commitadas | Trabalho preservado; não tratar como release instalada nem absorver na documentação como funcionalidade publicada. |
| ALP operacional | commit 0b52b58, interface26.10.25c | Referência do consumidor atual; mantém seus plugins, transporte e bases próprios. |
| CWH local | commit 4b913d7 na fonte consultada | A migração deve conferir novamente a instalação e o código efetivos antes de implementar. |

No CAW, a apresentação está distribuída em chat.js, content-viewer.js,
showdata.js, estilos e projeção de respostas do backend. No ALP, CChatRender
apresenta conteúdo e os adaptadores/plugins do produto completam mapas, ações e
grades. Nenhuma das duas linhas representa hoje a paridade integral da outra.

## Organização proposta do módulo

Esta árvore é o destino planejado. As pastas não são criadas vazias, e a
distribuição atual permanece intacta até o ciclo de extração e empacotamento.

```text
CChatRender/
  src/
    contracts/             # interfaces mínimas e capacidades de apresentação
    drivers/
      caw/                 # apresentação existente extraída e adaptada do CAW
      alp/                 # apresentação existente preservada do ALP
      next/                # implementação comum candidata
    adapters/
      ca/                  # respostas, recursos e ações autorizadas pelo CA
      alp/                 # respostas e recursos do Pergunte Aí
      cwh/                 # sessão e respostas do chat mínimo
    chat-view/             # transcript, mensagem, composer e estados neutros
    plugins/               # capacidades genéricas opcionais
  tests/
    fixtures/              # casos sintéticos equivalentes entre drivers
  docs/
    shared-render-plan.md
    compatibility-matrix.md
```

Inicialmente, caw significa uma origem identificada no CA, ainda não um pacote
portável pronto. O ciclo de extração deve listar arquivos, dependências e
comportamentos preservados. Não copiar chat.js inteiro nem mover autenticação,
rotas, agendas ou gestão de usuários para a biblioteca. Renomear pastas ou o
pacote somente com mapa de imports/exports, testes e atualização do consumidor.

Driver é a implementação de apresentação; adaptador é a ligação com o
consumidor. O driver caw não pertence necessariamente ao host CA depois de
extraído, e o candidato next não pode presumir o transporte do ALP.

## Fronteiras técnicas

O módulo contém a interface de conversa desacoplada: lista de mensagens,
bolhas, partes ricas, composer mínimo, estados de carregamento/erro, ações
visuais e ciclo de vida. A extração dessa casca é gradual; o CChatRender atual
ainda não fornece toda a aplicação de conversa.

O host conserva identidade, autorização, workspace, conversas persistidas,
execução do agente, transporte, banco, perfis, credenciais, quotas e navegação
dos outros painéis. Uma ação visual chama um callback do host, que verifica
permissões. Renderizar um botão não habilita uma ferramenta do agente.

Mapas eleitorais, bairros, snapshots, vínculo geográfico e interpretação dos
dados continuam no ALP. Plugins genéricos podem ser promovidos ao módulo após
ficarem independentes das fontes e regras do produto. Nenhum renderer executa
SQL, consulta o acervo ou chama modelos para apresentar um resultado pronto.

O contrato mínimo de conexão identifica instância/agente, workspace opcional,
conversa, mensagem, solicitação e tentativa, quando fornecidos pelo host. IDs
são opacos e não concedem acesso. O visitorId de sessão do ALP não vira conta ou
workspace do CA. Não expor cookies, owner interno, caminho físico ou threads SDK.

Preservar SEND_JSON e os protocolos de entrega CA/CWH, incluindo V4 onde já
aplicável. O adaptador recebe a resposta validada/projetada pelo host; o módulo
não se torna um novo parser do protocolo de execução. A representação interna
de partes precisa preservar ordem, tipos, null, fontes e metadados. Tipos não
suportados mantêm alternativa legível e diagnóstico, sem descarte silencioso.

As políticas de HTML/SPA, arquivos e mídia são explicitamente fornecidas pelo
host. Não copiar URLs autenticadas ou confiança em HTML sanitizado de um lado
para outro sem adaptar. Isolamento, descarte, bloqueio de rede e alternativas
seguras do ALP são candidatos a melhoria compartilhada. O tratamento efetivo
de cada recurso deve ser comprovado na matriz.

## Chat mínimo no CWH

Nova modalidade de uso solicitada como quinta opção do CWH: conversa direta
para testar agentes, com um usuário local e uma conversa inicialmente. Não é
uma nova interface de gestão do WhatsApp nem exige ligar AutoReply/sincronização.
Rótulo de trabalho: Conversar. Preservar os painéis existentes; a posição visual
e sua relação com a composição de quatro/cinco menus já discutida ficam com o
responsável do CWH, sem remover Mensagens por efeito deste plano.

O mínimo inclui enviar texto, mostrar resposta rica, indicar execução/erro,
cancelar quando o executor oferecer essa capacidade e apresentar artefatos
autorizados. O usuário/conversa vêm da composição do host, sem atalhos que
desabilitem sua autenticação ou permitam acesso externo indiscriminado.

O chat mínimo usa o módulo compartilhado e o adaptador CWH. Começa com o driver
compatível disponível; depois valida next. Não implementar uma quarta base
independente de render. Não simular um agente ou copiar o perfil do Pergunte Aí.
Seleção de executor e a eventual dependência atual do CA pertencem à migração,
sem reversão silenciosa das decisões tratadas naquele chat.

Reutilizar LAB-CHAT-001 e a tarefa ativa MIG-LAB-001 conforme o responsável da
migração. Registrar a nova direção no plano existente do CWH, sem abrir uma fila
paralela com o mesmo escopo. Migração operacional primeiro; evolução de render
não deve atrasar a ativação já autorizada do agente com recursos existentes.

## Etapas e critérios de avanço — ordem revista em29/10/2026

Esta ordem substitui a sequência inicial que antecipava extração do CAW.
Primeiro CWH/CChatRender; ALP se adapta depois, sem bloquear o produto.
Depois agentes/testes; CAW por último e fora desta rodada.

| Etapa | Entrega pequena | Critério de avanço |
| --- | --- | --- |
| E0 Inventário | Fontes, versões e diferenças dos dois consumidores | ComparaçãoCWH e confirmaçãoPC-IA ALP; não presumir produção pelo checkout. Concluído no escopo inicial. |
| E1 Primeira base | PDF nativo, apresentação de data/agrupamento, lifecycle e state por conversa | Pacote26.10.29-a consumido pelos dois; testes sintéticos. Entregue a fatia; ainda não é casca comum completa nem diff incremental. |
| E2 Autoria e citação | Descritor do autor, cor fornecida pelo host, envelope e quadro de citação | Pacote26.10.29-b integrado primeiro no CWH, com HTML idêntico e CSS preservado. ALP adapta na sequência; não é gate do CWH. Paleta/persistência ficam no host. |
| E3 Ações e reações | Trilho de ações por capacidade, seletor8/81, indicação de reação própria, feedback imediato | Sem botão sem callback; UI não espera rede; erro tardio não desfaz escolha mais recente; host conserva autorização/recibo. |
| E4 Atualização e mídia | Atualização por mensagem/parte estável e visualizador na conversa | Alterar texto/recibo/reação sem remontar mídias inalteradas; troca de conversa e descarte corretos. Parear CWH e ALP antes de retirar cópias. |
| E5 Agentes e testes no CWH | Conversar com executor existente e projeção comum | Duas conversas sintéticas, cancelamento quando oferecido e nenhum envio WhatsApp pelo teste Web. Executor/filas fora do render. |
| E6 CAW posterior | Inventário específico e integração em ambiente de teste | Só após a base dos dois produtos; dois usuários/workspaces/conversas, temas e recursos isolados. Nenhuma alteração CA/CAW autorizada nesta rodada. |
| E7 Consolidação | Retirar adaptações temporárias e promover por instância | Revisões identificadas, matriz com evidências e teste dos consumidores; nenhum upgrade global implícito. |

Cada etapa fecha uma capacidade útil, com pacote fixado e consumidor testado.
Não criar diretórios/drivers vazios nem copiar a aplicação inteira para o módulo.
A extração usa os protótipos CWH e a adaptação ALP; não transforma um protótipo
local em terceira implementação permanente. A fila local do dono registra execução.

## Pareamento de uma capacidade por vez

Usar a matriz como inventário funcional, não como segunda fila de tarefas.
Cada fatia liga o comportamento de origem a um caso sintético do destino:
texto e ações; dados tipados; gráficos; arquivos; PDF; áudio; vídeo; miniapps;
temas; atualização e descarte. O teste deve preservar protocolo, ordem e
semântica do conteúdo, e registrar limitações em vez de chamar tudo de paridade.

Melhorias já existentes no ALP podem chegar ao CAW em pequenas fatias, pelo
mesmo pacote ou por adaptação temporária rastreada. Toda adaptação temporária
tem referência de origem e condição de retirada. Evitar duas implementações
indefinidas da mesma melhoria em pastas de produtos diferentes.

## Validação e retorno à versão anterior

Primeiro usar fixtures sintéticas e testes sem modelos ou dados privados.
Conferência visual cobre tema claro/escuro/customizado, teclado, telas estreitas,
conversas longas, scroll e rascunho. Conferência funcional cobre troca de conversa,
carregamento tardio, dispose, cancelamento, arquivo não autorizado, tipo não
suportado, conteúdo inválido e indisponibilidade de bibliotecas externas.

Cada consumidor fixa pacote, integridade, driver e suas capacidades. Um driver
não muda automaticamente quando uma nova versão é instalada em outro host.
Uma configuração desconhecida falha de forma explícita, sem escolher outro
renderer silenciosamente. Dependências pesadas carregam sob demanda.

O retorno consiste em selecionar o pacote/driver anterior com configuração e
assets compatíveis, preservando histórico e autorização. Não alternar backend,
modelo, sessão, workspace ou dados como parte de uma troca visual. A retirada
de um driver legado exige inventário de consumidores e aceite posterior.

Medir montagem/atualização da tela, uso de memória/listeners e recursos antes
de atribuir ganho à extração. Latência do modelo, consulta e fila é separada.
Uma arquitetura compartilhada melhora organização, mas não comprova por si
só que a resposta do agente ficou mais rápida.

## Responsáveis e coordenação

| Dono | Responsabilidade |
| --- | --- |
| CChatRender | Plano, matriz, contratos internos mínimos, drivers, casca compartilhada, plugins genéricos e distribuição identificada. |
| ALP nesta conversa | Consumidor de laboratório, plugins de dados, testes de uso e evolução do módulo dentro do escopo autorizado. |
| CraniaAgent | Extração/injeção CAW, contratos e autorização do host, temas e compatibilidade dos clientes existentes. |
| Migração AIstein e CWH | Migração ativa, composição/executor, chat mínimo e seu adaptador; atualizar LAB-CHAT-001 sem duplicar a demanda. |

Há um único responsável por arquivo e pacote em cada ciclo. Passagens entre
chats devem registrar escopo, referências de fonte, arquivos sob responsabilidade,
testes, revisão instalada e próximo passo. Comunicação não autoriza implantação
automática em clientes. As tarefas locais referenciam este plano e descrevem
somente a ação de seu dono.

## Registro de decisões

| Data | Direção |
| --- | --- |
| 25/10/2026 | Preservar CAW e ALP como linhas paralelas; preparar terceiro render substituível no módulo comum. |
| 25/10/2026 | Validar primeiro no laboratório e no chat mínimo CWH; instalar CAW local depois para compatibilidade. |
| 25/10/2026 | Convergir ALP, CWH e CAW no mesmo render; consolidar contratos finais após os três funcionarem. |
| 25/10/2026 | Formalizar e manter decisões, matriz, responsabilidades e pendências para não perder contexto entre ciclos. |

Ao abrir cada ciclo, reler este plano e a matriz. Ao fechar, atualizar evidências
e decisões no lugar, registrar o resultado no histórico e encerrar apenas a
tarefa efetivamente entregue. Não sobrescrever a direção por um resumo de chat.


## Primeira passada aprovada em 29/10/2026

Escopo imediato: PergunteAI, CWH e CChatRender. CA/CAW ficam fora desta rodada.
O usuário aprovou contratos mínimos de apresentação, PDF nativo, agrupamento,
data/hora igualmente no ALP e preparação de múltiplas conversas. PDF.js foi
explicitamente removido, sem manter driver legado. Nomes CSS seguem kebab-case,
classes chat-* delimitadas e tokens --ca-ui-* como nos componentes CA/CCI/CMAIL;
nenhum desses três produtos de referência é alterado por esta padronização.
Contrato e limites da fatia estão no README e src/presentation.mjs.
A referência local25-b já estava commitada em bac0062; a célula histórica acima
é fotografia do plano25/10, não o estado vigente. Pacote candidato26.10.29-a.


## Mapa funcional revisto após o uso diário —29/10/2026

Referências: CChatRender código4483ea1/pacote26.10.29-a; CWH fontee6c106a/
26.10.29-r; última publicação ALP confirmada nesta frente b6c507f/26.10.29d/
Sites96. Ler a comparação do CWH para instalação e testes. A presente revisão
muda planejamento/documentação, não o pacote nem a versão instalada do módulo.

### Autoria, conversas e contratos

Manter conversationId, messageId, authorId, role, direction e createdAt já
acordados. role não identifica uma pessoa e direction depende de quem está
vendo a conversa. Dois agentes com role assistant precisam de authorIds
diferentes; não agrupar por papel, nome ou posição do balão.

O contexto do host deverá resolver authorId para um descritor {id, displayName,
avatar?, color?}; as propriedades atuais authorName/authorColor nos DTOs CWH
são adaptação do produto, não novo protocolo público de transporte. Identidades
e preferências são escopadas ao host/conta/workspace. visitorId ALP não vira
contato WhatsApp; igualdade de nomes/números não estabelece equivalência.
PN/LID só compartilham preferência após vínculo nativo verificado pelo host.

A cor pertence ao autor e atravessa conversas. O núcleo recebe a cor validada;
não lê SQLite/localStorage nem consulta contatos para decidir identidade. O
CWH já persiste auto/manual/reset e resolve aliases; isso continua no host.
O módulo compartilha marcação, tokens e apresentação da paleta/callback.
Cabeçalho/avatares devem ser configuráveis: CWH usa foto apenas no início de
sequências recebidas e omite avatar próprio, sem universalizar essa decisão.

Citação é referência separada: replyTo {conversationId,messageId,authorId,
preview}. preview preserva tipo/ordem e é texto/recurso autorizado, não HTML
confiável. Nome/cor/barra são do autor citado, não de quem responde. Conteúdo
original indisponível conserva alternativa legível. Abrir a mensagem original
é callback do host, não consulta ao banco pelo núcleo. Citar conteúdo numa
conversa com IA não o transforma em instrução privilegiada.

### Componentes e capacidades seguintes

| Componente | Origem concreta | Destino comum | Responsabilidade que fica no host |
| --- | --- | --- | --- |
| Identidade/cabeçalho | CWH message-presentation + author-colors; ALP adapter | Nome/foto/cor, sequência e configuração do avatar próprio | Resolver identidade, persistir cor e permissões. |
| Quadro de citação | CWH renderQuote/quoteMarkup | Referência, prévia, autor correto e barra quadrada | Recuperar original e produzir payload de resposta nativo. |
| Reações | CWH reaction-feedback/message-actions | Emojis, contagem e reação própria;8 atalhos/+81 simples | Próprio autor e autorização de remover; operação real. |
| Trilho de ações | CWH mensagem | responder, reagir, visualizar, baixar, encaminhar; só disponíveis | Capacidade por mensagem, tipo/recurso e callbacks autorizados. |
| Resposta visual imediata | CWH reaction-feedback | Fechar painel antes da rede, projeção local e erro não bloqueante | UUID/recibo, confirmação real e política de retry. Não inventar entrega. |
| Lista de destinatários | CWH recipient-list | Busca, foto/nome e seleção reutilizáveis | Carregar destinos e aplicar a política do canal. Sem Status por padrão. |
| Visualizador | PDF nativo comum e viewer CWH | Uma área na conversa, baixar/fechar, imagem/vídeo/PDF nativos | Autorização, origem, MIME, propriedade e revogação de Blob. |
| Progresso na testeira | CWH fila de encaminhamento; ALP jobs | Slot/estado visual com callbacks de controle | Dispatcher, ritmo, pausa real, persistência e trabalho do agente. |

Capacidades precisam de ações separadas: canReply/canReact/canRemoveOwnReaction/
canPreview/canDownload/canForward. São nomes propostos para o contrato da
próxima fatia; não descrever como exports já existentes. Ausência de callback
oculta a ação. Somente ter uma imagem no corpo não autoriza download/encaminhar.
A presença de reação de terceiro não habilita a lixeira da própria reação.

Reação é estado por actorId/emoji e mensagem; a contagem é projeção. O host
fornece autoria própria/aliases verificados. Uma resposta antiga de rede não
pode desfazer um clique posterior. Feedback otimista fica em memória, é
limitado e limpo por escopo; não substitui recibos ou histórico canônico.
A perda de rede não deve aprisionar o usuário num diálogo de confirmação.

### Fronteiras do WhatsApp e ordem de extração

Marcador/contador nativo de encaminhamento, regras de grupos/destinos, parte
imediata, fila1/min, pareamento, leitura, transcrição, agentes e SQLite continuam
no CWH. O núcleo pode mostrar um badge/estado fornecido pelo adaptador; não
interpreta forwardingScore, não cria fila e não contorna limitações de canal.
Preferências de PIN/favorito/etiquetas também são do host; círculos/tooltip e
trilho fixo de navegação são padrões de composição, não gestão do WhatsApp.

A primeira PR/pacote candidato extrai autoria/citação e os respectivos testes.
Integrar primeiro no CWH; depois ALP se adapta. Só depois extrair ações e
feedback. Mostrar no ALP apenas as capacidades efetivamente implementadas,
sem inventar encaminhamento WhatsApp para respostas de IA. Listas, composer e
casca inteira ficam para fatias posteriores quando houver ganho comprovado.

Aceite comum mínimo: dois autores em dois chats mantêm cor; citado de outro
autor conserva a própria cor; papel igual de duas IAs não une identidade;
reação de terceiro não mostra remover; clicar atualiza antes de uma Promise
pendente; resposta tardia/troca de escopo é descartada; player/PDF/rascunho se
mantêm; teclado e tema são verificados com CSS do host completo. A regra
global de input que ampliou checkboxes no CWH é regressão a cobrir por cascade,
não motivo para copiar CSS global do produto para a biblioteca.

## Prioridade de produto e injeção no CWH —29/10/2026

Direção humana posterior substitui a prioridade anterior do laboratório:
Crania Agent/CAW é o produto comercial de referência, mas não será alterado
nesta rodada. CWH é a frente prioritária de implementação agora. PergunteAI/ALP
é laboratório/showroom e se adapta às decisões dos produtos; sua disponibilidade
ou layout não bloqueiam uma integração testada no CWH.

Pacote26.10.29-b adiciona a entrada `conversation` independente do corpo rico.
O CWH consome efetivamente `renderChatMessage` e `renderChatQuote`, sem manter
uma segunda implementação do envelope. `author` é descritor resolvido pelo
host, `replyTo.preview.text` é texto, agrupamento continua por identidade opaca/
conversa/direção/dia. Duas IAs com mesmo role e IDs distintos não se agrupam.
Não há inferência PN/LID na biblioteca. Avatar próprio é configurável, oculto
no CWH. Cores e citação conservam os hooks atuais e CSS instalado do produto.

Aceite desta injeção: fixtures sintéticas capturadas antes da extração comparam
28 balões e5 citações byte a byte; matriz de identidade/escopo do módulo e
suite do CWH, mais DOM com CSS completo e estabilidade de player/PDF/rascunho.
Isso não é homologação visual do plugin PDF em navegador. Texto WhatsApp, mídias,
ações nativas, recibos, filas e preferências continuam no adaptador; extração
do trilho de ações e atualização de partes permanecem etapas seguintes.

## Rodada ALP e próximo conteúdo rico —29/10/2026

Fábio autorizou expressamente o chat PC-IA ALP a adotar o CCR26.10.29-b e
aproximar seu envelope visual ao CWH preservando todo o conteúdo rico interno.
O aviso anterior de apenas documentar foi substituído por essa autorização.
Resultado/commit/publicação devem ser confirmados pelo dono ALP, sem presumir
implantação pelo envio do pedido. CA/CAW continuam fora das alterações.

Anexos JSON/HTML com marcador CES e versões de arquivo/contrato CCR são a próxima
fatia de conteúdo. O [mapa do documento](CCR-RICH-DOCUMENT.md) separa apresentação
de SEND_JSON/V4, preserva download comum e registra tipos/gráficos ainda ausentes.
Não instalar detector nem afirmar paridade de conteúdo rico nesta adaptação visual.

Fechamento ALP confirmado pelo chat dono:26.10.29e/Sites97/9d93d42,
CCR26.10.29-b com hash fixado, montador local antigo removido,105 testes e
build/conteúdo rico/ESM/UTF-8 aprovados; assets/API públicos conferidos no PC-IA.
Autores/personagens distintos, cor do citado e mídia preservados. Sem captura
visual, browser Work desabilitado. Worker PCIA permanece Stopped. E2 tem os dois
consumidores; isso não entrega E3/E4 nem o decoder R33/R34.

## CCR26.10.29-c — documento rico v1 e cópia

Continuidade humana sem prints autorizou a primeira implementação R33/R34:
decoder comum de arquivo CES, tabela tipada, quatro gráficos e HTML passivo,
entrada document sem Markdown e message.documents no renderer rico. Contrato
versionado em CCR-RICH-DOCUMENT.md. Não extrai plugins eleitorais nem implementa
o catálogo completo de gráficos CAW. Não altera SEND_JSON/V4/CA/CAW.

Fábio também apontou a moldura duplicada no ALP e pediu copiar texto como ação
externa. Copiar é utilitário local CCR; consumidores decidem texto/capacidades.
No CWH a ordem é responder/reagir/copiar/visualizar/baixar/encaminhar, com mídia
condicional. ALP remove classes/fundos herdados de bolhas internas e conserva
uma só moldura. Essa correção foi passada ao chat dono, sem concorrência no módulo.

Validação da biblioteca:31 testes, objeto/arquivo equivalentes, limites/versões,
tipos/null/false/zero, sandbox, cópia/rascunho e lifecycle. CWH valida o adaptador
com CSS completo e polling, preservando arquivo e ações nativas. Teste real
autorizado: até2 arquivos sintéticos para self2670, somente por rota existente
autenticada e com destino exato; não criar credencial/contorno para o ensaio.

Fechamento: CWH68881ab/t instalado semrestart,2 documentos sintéticos self
observados porIDnativo na captura local, recuperados na origem com hashigual;
DTOs ebytes correspondentes renderizados emDOM com CSScompleto. Seminspeção
debrowser. ALP83f13fc/26.10.29g/Sites99 adotou CCRc,111testes; transporteALP
aindasemdocuments/upload, adaptador explícito validado porfixtures. CA/CAW
intocados. R34 preserva esse limite; ampliar transporte é fatia posterior.

## CCR26.10.29-d — ações externas

Faixa comum de ações por capacidade, IDs opacos, ordem e callbacks do host;
API em [CCR-ACTIONS.md](CCR-ACTIONS.md). Atualização keyed, AbortSignal/dispose e controles nativos de
export sem clone; corpo/player/PDF/rascunho independentes. CWH integra markup
puro no dispatcher existente; ALP recebe o mesmo pacote para seu adaptador.
38 testes locais. O diff completo do corpo e a área de testes de agentes
continuam próximas fatias; CAW não é alterado.

## Fechamento da faixa comum — 29/10/2026

CWH ec5c3b2 +12ed59c/fe5327c, patch26.10.29-u, consome CCR26.10.29-d
(implementação37c0381). Pacote SHA-256
5192b128d3bd5caefc39af98774229d25a7f5250a1175946e910fafa6bfea47d,
distribuído pelo vendor CWH; sem publicação npm nem remoto próprio do CM.

PC-IA ALP confirmou publicação26.10.29h/Sites100/879d703 com esse mesmo pacote.
121 testes e checks de conteúdo rico/build/ESM/sessão. Controles nativos de
export adotados sem clone; cópia local, downloads com AbortSignal e descarte
impedem arquivos/feedback tardios. Uma bolha e ações externas preservadas.
Transporte ALP continua sem documents/upload; PCIA permanece parado.

Faixa comum consumida nos dois hosts. Diff completo das partes do corpo e a
área de agentes/testes continuam próximas fatias no backlog LAB-CHAT-001 do CWH.
O novo serviço MCP CWH é infraestrutura de host, não responsabilidade do CCR.
CA205636f altera somente delegação de autenticação MCP; nenhum render CAW ou
cliente CA foi promovido. Não declarar E4 completo nem nova geração TTS MCP.

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
