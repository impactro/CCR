# Histórico progressivo comum

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
seus plugins ou regras. Composição visual do shell continua em frente separada.

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
do shell. A inspeção futura verifica a candidata; não inicia desenvolvimento
silencioso neste chat. Recuperação desta publicação documental é pelo Git;
eventual implantação terá procedimento e evidências próprios.
