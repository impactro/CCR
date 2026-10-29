# Evolução gradual do render de chat compartilhado

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

## Referências atuais

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

## Etapas e critérios de avanço

| Etapa | Entrega | Critério de avanço |
| --- | --- | --- |
| E0 Referências e inventário | Lista de clientes/versões/customizações, mapa das dependências e matriz inicial | Identificar origem canônica, instalação de teste, responsáveis e extensões de cada consumidor. |
| E1 Paralelismo sem troca | Entradas identificadas para caw/alp/next, seleção explícita por consumidor e comportamento desconhecido recusado | Driver instalado e versão conferida; voltar ao anterior sem trocar motor, dados ou perfis. next não é habilitado por padrão. |
| E2 Extração do CAW atual | Extrair apresentação em fatias e substituir dependências por adaptadores | A fatia extraída se comporta como antes no CAW de teste; preservar hooks/classes e rotas utilizadas pelo host. |
| E3 Chat mínimo CWH | Um usuário, uma conversa, executor existente e render selecionável | Texto, dados e mídia funcionam localmente, com erros/cancelamento coerentes e sem envios WhatsApp decorrentes do teste Web. |
| E4 Evolução pareada no ALP | Enriquecer next e aumentar compatibilidade do driver ALP por capacidades pequenas | Cada item possui fixture, comparação visual/funcional e regressões relevantes. Melhorias genéricas voltam ao módulo; regras eleitorais ficam no ALP. |
| E5 CAW instalado no Lab | Composição própria do CAW para testar o candidato | Validar temas/customizações e pelo menos dois usuários/workspaces e duas conversas, incluindo troca durante carregamento. Um chat CWH de usuário único não certifica isolamento entre usuários. |
| E6 Três consumidores funcionando | ALP, CWH e CAW local usando a mesma revisão candidata | Conferir versões/hashes, protocolos, dados e capacidades por consumidor. Não basta carregar a página ou produzir resposta complete. |
| E7 Consolidação e adoção | Padronizar contratos finais e promover para clientes em ondas autorizadas | Matriz sem lacunas impeditivas no escopo do cliente, retorno comprovado e aceite por instância. Remover legado somente depois, em ciclo específico. |

E1/E2 e o desenho do CWH podem ser planejados em paralelo. A migração ativa do
agente conserva sua prioridade. A publicação em clientes CAW não começa junto
com uma mudança experimental do ALP ou do CWH.

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
