# Renderização comum, histórico progressivo e serviços desacoplados

## Pedido consolidado para desenvolvimento em outra máquina — revisão 2

Esta revisão concilia a composição visual CAW/CWH/CCI e o histórico progressivo
numa única iniciativa. Fábio desenvolverá em outra máquina para obter uma
implementação independente; a candidata voltará a este chat para inspeção.
Este documento é o pedido de desenvolvimento, não uma declaração de entrega.
Os contratos abaixo complementam as especificações técnicas das seções seguintes.

**Resultado:** CCR renderiza conteúdo rico, balões, metadados, ações e estados
de histórico. CAW fornece a moldura e a navegação; CAW, CWH e CCI fornecem dados,
ações e identidade autorizados. O mesmo frontend pode consumir um backend
hospedado ou independente, inclusive em outra porta ou máquina, por JSON.

### Frentes da mesma entrega

| Frente | Entrega e responsabilidade |
| --- | --- |
| CCR | Núcleo comum de apresentação, modo conteúdo isolado, timeline progressiva, ações flutuantes, tooltip e ciclo de vida. Sem SQL, autenticação ou regras de negócio. |
| CA/CAW | Hospedeiro, navegação contextual, adaptação de mensagens/metadados e resolução segura de serviços. Preservar paginação e loading já entregues até a substituição validada. |
| CCI e CWH | Adaptadores próprios por produto/instância, páginas JSON e ações autorizadas. CCI conserva curadoria/Explorador; CWH conserva transporte, captura, recibos e mensageria. Não são um backend único. |

As issues existentes CCR#1, CraniaAgent#1, CWH#1 e CWWA#1 são entregas vinculadas,
não quatro pedidos independentes. O [mapa do hospedeiro](../../../Platform/CraniaAgent/docs/composicao-visual.md)
detalha navegação, áreas e instâncias desta mesma iniciativa. Cada dono conserva
somente sua referência e próximo passo na fila local; não duplicar requisitos.

### Apresentação desktop e ações por mensagem

Priorizar desktop. O estado de repouso mostra conteúdo, horário e reações
existentes. Remover barras de botões permanentes e a linha técnica de consumo.
Ao passar o mouse sobre o balão, revelar uma barra flutuante contextual:

- Balão do próprio usuário, alinhado à direita: ações no espaço à esquerda.
- Balão recebido/agente, alinhado à esquerda: ações no espaço à direita.
- Manter o grupo na mesma altura do balão, sem deslocar texto ou mensagens.
  Ajustar colisões com bordas/rolagem; não cobrir o conteúdo nem sair da viewport.
- Só mostrar ações fornecidas e autorizadas pelo host: copiar, responder,
  encaminhar, baixar ou colar quando fizer sentido. Não executar ao hover.
  Colar exige gesto explícito e capacidade de clipboard; não ler clipboard
  automaticamente. Copiar/baixar preservam as políticas do recurso.
- A barra permanece utilizável ao mover o ponteiro do balão para seus botões.
  Foco por teclado também a revela; Escape fecha menus/tooltip; nomes acessíveis
  e foco visível. Em dispositivos sem hover, usar acionador explícito por toque,
  sem depender de gesto secreto. Mobile pode ter composição diferente.
- Tooltip somente quando houver metadados adicionais: tokens, créditos/custo,
  modelo ou duração fornecidos pelo host. Distinguir custo estimado e real,
  unidade/moeda e ausência de valor; não inventar números nem revelar detalhes
  internos não autorizados. Não confundir tooltip do balão com menus das ações.
- O host passa horário/identidade/alinhamento, reações, ações e metadados em
  dados estruturados. CCR apresenta; callbacks/adaptadores do host executam.
  Reação clicável também é ação explícita e autorizada.

Reaproveitar [CCR-ACTIONS](CCR-ACTIONS.md) para callbacks, estados e descarte;
não criar outro protocolo de ações. Fechar o contrato público versionado antes do código: envelopes e partes ricas
existentes, IDs estáveis, descritores de ação, estados pending/error/disabled,
metadados e callbacks. Não criar HTML arbitrário ou JavaScript executável vindo
do JSON para implementar uma ação. A mensagem/modelo não concede capacidades.

### Apagar mensagem no CWH — complemento de 01/11/2026

Implementar a ação de apagar mensagem no CWH, integrada à barra flutuante do
CCR. Capacidades variam por produto, conversa e mensagem: só exibir apagar
quando o host informar suporte e permissão naquele contexto. Ausência da
capacidade significa botão ausente, inclusive ao hover/foco; não oferecer uma
ação genérica de delete em todos os consumidores. A mesma regra vale para
encaminhar, responder e demais ações opcionais.

CCR apresenta o descritor e chama o callback autorizado. CWH determina a
elegibilidade e executa pelo contrato oficial do transporte CWB/WhatsApp,
revalidando conta, conversa, mensagem e permissões no servidor. Não implementar
apagamento como remoção direta de linha do banco nem como simples ocultação
no DOM. Não presumir suporte de transporte a partir da existência do botão.

Distinguir os alcances realmente suportados, como apagar para mim e apagar
para todos, com rótulo claro antes da execução e confirmação proporcional à
ação destrutiva. Não escolher outro alcance como fallback. Restrições reais
do WhatsApp, autoria, papel no grupo e elegibilidade da mensagem são resolvidas
pelo provedor; não inventar prazo ou regra universal no CCR.

Exibir execução pendente/erro e reconciliar a interface somente com resultado
confirmado; timeout ou resultado incerto não autoriza repetição automática.
Preservar os recibos/auditoria necessários sem anunciar sucesso antecipado.
Testar ação ausente, permitida, permissão revogada após render, isolamento entre
contas, alcance escolhido, erro/incerteza e atualização da mensagem sem remontar
toda a timeline. Usar fixtures; esta especificação não autoriza apagar mensagens
reais durante desenvolvimento, inspeção ou SYNC.

### Navegação contextual e piloto de e-mail — complemento da revisão 2

Primeiro piloto: **CMAIL integrado ao CWH**. Depois adaptar ao CAW e demais
áreas pelo mesmo contrato. A instrução anterior de começar chat ↔ WhatsApp
fica substituída por esta sequência definida por Fábio.

O host oferece duas regiões independentes: navegação lateral e conteúdo.
Cada região tem loading imediato, vazio, erro/retry e descarte por contexto.
A lateral não deve esperar o conteúdo, nem manter nomes da conta anterior
durante a troca. Buscar somente páginas necessárias no backend, inclusive na
lista de chats; indicador visual não resolve consulta integral lenta.

Fábio relata cerca de 15 segundos para carregar a lista de chats do LIA.
É observação humana a reproduzir, não benchmark ou causa comprovada. Medir
banco, projeção, rede, montagem e quantidade de itens antes/depois. Preservar
o loading de conteúdo já implementado no CAW; o trabalho novo inclui a lateral
e a generalização das fontes, sem recriar a entrega anterior como tarefa.

No e-mail, a lateral que mostrava chats passa a listar mensagens da pasta
selecionada. Conteúdo mostra a mensagem escolhida e suas ações autorizadas.
Caixa de entrada é a seleção inicial; pastas aparecem em dropdown/menu flutuante
no topo, acessível também sem mensagem selecionada. Trocar pasta limpa seleção
incompatível e carrega sua lista, preservando conta e permissões. Não criar uma
terceira lateral permanente de pastas. Lista de mensagens não pode interpretar
HTML de e-mail como markup confiável; a leitura mantém sanitização/isolamento.

No WhatsApp, reutilizar a lateral para conversas pessoais, contatos ou grupos;
na CCI/Explorador, pessoas e conversas da fonte selecionada. A barra de navegação
não tem limite fixo de atalhos: adicionar conforme a necessidade e viabilidade
de cada área, com apresentação compacta e sem bordas laterais desnecessárias.
Não comprimir alvos clicáveis a ponto de perder usabilidade; prever foco,
tooltip e overflow quando o espaço real não comportar os atalhos. Ícones e ações mudam conforme
produto, seleção e capabilities fornecidas pelo dono.

Aceite do piloto: selecionar e-mail, carregar lista lateral, trocar pasta,
abrir mensagem, lidar com lista vazia/erro/retry, trocar conta durante consulta
lenta e voltar à mensageria sem menus cumulativos nem resposta atrasada.
Validar depois o mesmo fluxo no CAW. CMAIL passa a ser dono explícito do
adaptador de pastas/mensagens/ações; host controla áreas e sessão. Nenhum envio
real é necessário ao aceite com fixtures. Inspeção técnica neste chat precede
o teste de Fábio e a decisão de promoção.

### Ordem, carregamento e modo conteúdo

Interpretação registrada da fala: como uma mensagem antiga isolada não deve
dominar a abertura, carregar primeiro **o lote mais recente**, e ordenar cada
lote do mais antigo ao mais novo. Buscar anteriores sob demanda ao retroceder,
preservando a âncora; mensagens novas entram adiante sem puxar a leitura à força.
A expressão “começa dos itens mais antigos” descreve a ordem de leitura, não
uma varredura inicial desde a primeira mensagem do banco. Se Fábio pretender
outra política, reconciliar este ponto antes de implementar paginação.

Loading progressivo não é polling contínuo ou download antecipado ilimitado.
Separar carregamento inicial, anteriores, vazio, erro recuperável e fim.
O modo **somente conteúdo** reutiliza o render rico sem exigir conversa,
backend, toolbar ou paginação. A timeline é composição opcional sobre esse render.

### Frontend separado do backend

O frontend possui componentes locais CCR; recebe blocos/dados JSON do serviço,
sem importar uma tela inteira por iframe para cada produto. Mini Apps/HTML
arbitrário conservam seu sandbox. Host pode servir assets estáticos separados,
inclusive CDN, mas distribuição de assets não concede acesso ao backend.

Desenhar dois adaptadores explícitos: serviço no mesmo processo e serviço
remoto. Fechar contrato REST JSON versionado, capabilities, paginação, limites,
erros, timeout/cancelamento e eventos incrementais, reaproveitando APIs existentes.
Não pressupor que apontar uma URL faça todos os produtos compatíveis.

O padrão preferido é browser → API autenticada do host → serviço autorizado.
Endereço e credencial de serviço ficam na configuração privada do servidor;
o browser recebe IDs lógicos e sessão delegada, nunca um token administrativo
persistente. Se acesso direto browser/serviço for necessário, documentar fluxo
com token curto, audiência/escopo restritos e CORS de origens explícitas.
Em ambos: autorizar usuário/workspace/conta/recurso a cada página e ação;
HTTPS fora do loopback, expiração/revogação, proteção CSRF quando usar cookies,
limites de acesso e auditoria sanitizada. Bloquear destinos arbitrários/SSRF
na resolução do host. Não usar token em URL, logs, JSON de mensagem ou assets.
Validar recursos/anexos com a mesma autorização; não transformar download em
proxy irrestrito. Falha remota nunca muda silenciosamente de conta ou servidor.

### Limites proporcionais, sem números arbitrários

Decisão de Fábio: sem limite fixo de atalhos, CWH ou CCIs apenas por conveniência
de programação. Público prioritário: pequenas e médias empresas. O teto oito
CWH é validação legada explícita em `ca/cwh_instances.py`, não evidência de
limite físico. Remover essa restrição na implementação coordenada, incluindo
validadores duplicados, schemas, UI, testes e documentação dos consumidores.
Descartar a proposta anterior de teto oito CCIs; não trocar por outro número mágico.

Inventariar cada restrição atingida: origem, motivo, recurso protegido e efeito.
Remover a que não tem justificativa; manter limites de protocolo/provedor,
integridade, autorização, tamanho de payload, paginação, filas e concorrência
quando protegem o serviço. Quando for capacidade operacional, permitir política
administrativa explícita e documentada, com medição e falha compreensível.
Ausência de teto comercial não significa consultas, DOM, jobs ou memória sem
controle, nem promessa de suportar 200 sessões sem homologação.

Aceite: fixtures com 1, 3, 9 e quantidade maior controlada, sem novas sessões
WhatsApp reais; dados/contextos isolados, interface utilizável e recursos sob
controle. Só rejeitar por motivo comprovado. O runtime atual continua com o
limite legado até a candidata ser implementada, inspecionada e promovida.

### Entrega externa e inspeção aqui

1. Desenhar contratos públicos, adaptadores, segurança, ciclo de vida e métricas;
   apresentar matriz de capacidades por consumidor e compatibilidade anterior.
2. Implementar CCR e fixtures comuns; integrar um consumidor de cada vez,
   preservando comportamento anterior até validar a candidata.
3. Entregar commits, versões/SHAs fixados, testes, capturas desktop claro/escuro,
   teclado/toque, medidas comparáveis e instruções de instalação/rollback.
4. Inspecionar aqui código e evidências antes da promoção neste ambiente.
   Não instalar, reiniciar serviços compartilhados, disparar IA, enviar mensagens
   ou migrar dados locais como efeito da publicação desta especificação.

Além dos aceites abaixo, provar ações no lado correto sem salto de layout,
hover→barra sem sumir, foco/tooltip, ausência de metadados e modo conteúdo;
duas instâncias locais/remotas com acesso cruzado negado, token expirado,
serviço indisponível, respostas tardias e anexos protegidos. Medir primeira
carga, páginas anteriores, DOM, memória, CPU, bytes e requisições com fixtures
iguais antes/depois. Não prometer percentuais sem baseline.

### Já concluído: não reabrir como tarefa

O indicador de carregamento/paginação específico do CAW26.11.1c e a migração
CMAIL para security/cmail são entregas anteriores. Permanecem no histórico e
nos guias operacionais. A tarefa nova é integrar o contrato comum, não refazer
essas entregas. Pendência de limpeza de staging tem escopo próprio e não
reabre instalação, migração ou desenvolvimento já aceitos.

## Decisão e estado

Demanda aprovada por Fábio em **01/11/2026**, registrada em
[CCR#1](https://github.com/impactro/CCR/issues/1). **Planejamento, não capacidade
entregue no CCR.** Implementar na frente responsável pelo produto, fora do chat
solicitante. Esse chat inspecionará a candidata e as integrações antes da
homologação; este registro não autoriza instalar ou promover código.

Esta é a especificação única. A issue controla a execução entre máquinas;
`.agents/tasks.md` guarda somente referência e próximo passo local. Não criar
uma fila paralela neste documento ou copiar todo o requisito aos consumidores.

O problema é repetir em cada produto a gestão de histórico, loading, erros,
scroll e descarte, ou carregar uma conversa inteira para exibir somente o final.
O resultado esperado é um CCR reutilizável com dados fornecidos por páginas
realmente limitadas no backend, sem conhecer SQL, endpoints ou credenciais.

## Fronteira de responsabilidades

```text
Backend autorizado de cada produto
  -> adaptador/fonte injetada pelo host
    -> controlador opcional de histórico CCR
      -> render CCR existente + capacidades visuais do host
```

| Dono | Responsabilidade |
| --- | --- |
| CCR | Janela inicial, loading inicial/anteriores, vazio, erro/retry, fim, ordem, deduplicação, prepend, âncora de leitura e ciclo de vida da vista. |
| Host/adaptador | Identidade/contexto confiáveis, seleção de fonte, transporte, tradução do DTO do produto para ChatMessage, recursos e ações autorizados. |
| Backend do produto | Autorizar cada página e seus recursos, consultar/projetar apenas o lote, impor limites e emitir cursor estável. |
| Produto | Tema, navegação, composer, regras, atualizações em tempo real e políticas de negócio. |

Reutilizar os corpos, partes estruturadas, ações e dispose existentes. Não
copiar o chat.js inteiro do CAW nem criar renderizador/parser paralelo.
Conteúdo do modelo não fornece credenciais, caminhos de banco, endpoints ou
autoridade. O host resolve tudo isso fora do CCR.

## Fonte injetada proposta

Ponto de partida já usado pelo CAW; fechar tipos, nomes, versão e semântica
do export comum **antes** de migrar consumidores:

```js
loadPage({ conversationId, olderCursor: null, limit: 20, signal })
// Promise<{
//   messages: ChatMessage[],
//   page: { hasMore: boolean, olderCursor: string | null }
// }>
```

- A fonte é criada/vinculada pelo host ao contexto autorizado. Trocar usuário,
  workspace, instância, conta, fonte, conversa ou filtro descarta a vista antiga.
  Não pressupor que conversationId sozinho é uma identidade global.
- Cursor e IDs são opacos; não converter para Number, calcular offsets ou
  inferir autorização. O backend valida cursor e escopo a cada chamada.
- Página ordenada cronologicamente, com IDs estáveis no escopo. Definir antes
  da implementação a regra de desempate, cursor de anteriores, atualizações
  e deduplicação. Inserções novas não deslocam páginas antigas já referenciadas.
- Quando hasMore for true, o cursor precisa permitir avanço. Cursor repetido
  ou página inválida gera erro limitado, nunca loop de requisições. Ao terminar,
  hasMore=false e olderCursor=null. Preservar zeros, null e ordem das partes.
- ChatMessage é o contrato existente. O adaptador faz a projeção, sem novo
  protocolo SEND_JSON/V4 nem mudança do contexto ou execução da IA.
- Quantidade inicial de referência: 20 mensagens, configurável sob limites do
  host. Isso não significa 20 blocos/elementos DOM nem limite de bytes. Definir
  tratamento de mensagem grande e recursos pesados sem truncar dados em silêncio.
- Nenhum HTTP/URL fixo no CCR. CAW, CWH e CCI podem ter APIs e storages distintos.
  Não criar endpoint universal nem obrigar consulta a SQLite remoto.

## Comportamento comum esperado

Mostrar loading acessível antes de aguardar a primeira Promise. Separar primeira
carga, anteriores, vazio, erro recuperável e fim de histórico; respeitar
movimento reduzido. Não exibir percentual sem denominador mensurável.

Uma carga de anteriores por contexto, retry explícito sem duplicar mensagens,
AbortSignal e descarte idempotente. Cancelar quando possível e, mesmo que a
fonte ignore o cancelamento, rejeitar resposta tardia de um contexto anterior.
Não aplicar erro antigo à seleção atual. Encerrar listeners/timers/recursos
da vista descartada sem interromper recursos de outra instância.

Prepend preserva os nós já montados, players/PDFs, gráficos, ações, seleção,
rascunho e posição de leitura. Atualizar separadores de dia pelo envelope
oficial; não remontar o corpo para acrescentar metadados. Atualizações nativas
do produto continuam possíveis pelo adaptador, sem transformar paginação em
marcação de leitura, envio ou execução de análise.

Botão de anteriores é a referência inicial. Gatilho por scroll, virtualização
e descarte de páginas não são pressupostos desta demanda. Se todas as páginas
forem abertas, todo o histórico ainda pode permanecer no DOM: não anunciar
custo constante sem outra implementação e evidência.

## Backends e isolamento

Inventariar o que cada produto já oferece e reaproveitar APIs/queries. O
backend limita a busca na origem, usa ordenação estável e índice adequado,
e projeta apenas o lote e seus recursos autorizados. Carregar tudo para depois
fatiar em memória ou no navegador não atende ao requisito de backend paginado.

Autorização pertence ao host, inclusive em referências de mídia/anexos e
paginação posterior. Troca de identidade e tentativa de cursor cruzado não
podem vazar itens. Não ampliar ACL, capabilities, sessão, cookies, tokens ou
acesso ao storage para facilitar o render. Testar negação, não só caminho feliz.

Histórico combinado, pesquisa e filtros exigem cursores/escopos coerentes com
o conjunto selecionado. Não reutilizar silenciosamente um cursor de outra
fonte ou chamar janela visual de paginação SQL. Definir o contrato do produtor
combinado ou conservar e declarar a limitação existente.

## Baseline e handoffs de adoção

| Consumidor | Referência e entrega própria |
| --- | --- |
| CAW | [CraniaAgent#1](https://github.com/impactro/CraniaAgent/issues/1): adotar controlador comum, preservando o produtor paginado já implementado. |
| CWH | [CWH#1](https://github.com/impactro/CWH/issues/1): fonte por instância/conta/conversa, preservar eventos e validar incorporado/independente. |
| CCI | [CWWA#1](https://github.com/impactro/CWWA/issues/1): fonte do Explorador, preservar provider, filtros, isolamento e apresentação do host. |

CAW26.11.1c já dispõe de janela inicial, backend paginado e feedback de carga;
referência em [caw-history-loading.md](https://github.com/impactro/CraniaAgent/blob/main/docs/caw-history-loading.md),
commits 4493d44, 72bc27b e 2d2b875. Não existe por isso um controlador comum CCR
homologado nos três produtos. O Modo Agente conserva limitação de feed combinado.
CWH/CCI precisam inventariar suas paginações existentes, não partir da premissa
de que toda a infraestrutura está ausente. A CCI mantém os nomes técnicos
crania-cwwa/cwwa; esta demanda não renomeia repositório, módulo ou namespace.

O plano é export opcional e versionado. Publicar candidata identificada, fixar
SHA/artefato no consumidor e migrar um adaptador por vez. Preservar a linha
CAW funcionando até validar a substituição. Nenhuma atualização global implícita.
ALP pode consumir o contrato depois, em demanda própria, sem incorporar aqui
seus plugins ou regras. Composição do shell é uma camada do host nesta mesma
iniciativa, detalhada no mapa CAW; não transfere roteamento/autorização ao CCR.

Conciliação com DEV CCI: paginação do inventário de conversas não comprova
paginação de mensagens. `manager.py`/`rich.py` ainda materializam o recorte antes
de fatiar; `portal.py` recompõe innerHTML ao trazer anteriores. A nova fonte
precisa limitar mensagens na origem e preservar nós ricos, players e seleção.
Reaproveitar `frontend/cci-messages.mjs`; reações/metadados opcionais não podem
ser inventados quando ausentes. Validar contexto completo, não só conversa.

## Aceite e inspeção posterior

1. Fixture sintética de 62 mensagens: páginas 20/20/20/2, ordem estável, sem
   perda/duplicação; cobrir inserção entre páginas, IDs grandes e partes ricas.
2. Promise inicial pendente mostra loading; cobrir vazio, erro, retry, fim,
   cursor inválido/repetido e navegação por teclado/movimento reduzido.
3. Trocar usuário/workspace/instância/conta/conversa/filtro durante a carga;
   resposta antiga ignorada, requisições canceladas e dispose sem vazamentos.
4. Prepend não remonta nós existentes nem perde mídia/gráfico/ações/seleção,
   rascunho ou âncora de leitura. Conferir temas claro/escuro e telas estreitas.
5. Testes comuns do contrato mais testes do adaptador/backend de cada produto:
   consulta e projeção limitadas, autorização cruzada negada, anexos por lote.
6. Medir separadamente banco, projeção, HTTP, JavaScript/layout, bytes, DOM e
   requisições com fixtures pequenas/grandes equivalentes. Comparar primeira
   carga e anteriores; tempo da automação não é tempo percebido. Não prometer
   ganho universal sem baseline comparável e limitar overhead introduzido.
7. Executor devolve commits, versão/hash CCR e consumidores, tipos/contratos,
   testes, evidência visual e métricas sanitizadas, limites conhecidos e retorno
   por artefato anterior. Sem transcrições, dados de cliente ou segredos no Git.

Sequência: contrato fechado no CCR → controlador/testes comuns → integração
por produto → inspeção no chat solicitante → decisão explícita de promoção
por ambiente. Publicar esta especificação não atende aos aceites de runtime.

## Fora de escopo deste registro

Implementação, instalação, reinício, migração de dados/configuração, alteração
de CWB/Baileys, pareamento, IA/modelos, envio de mensagens e refatoração integral
do shell além do escopo definido no pedido consolidado. A inspeção futura
verifica a candidata; não inicia desenvolvimento
silencioso neste chat. Recuperação desta publicação documental é pelo Git;
eventual implantação terá procedimento e evidências próprios.
