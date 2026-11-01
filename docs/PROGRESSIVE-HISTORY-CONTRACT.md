# Timeline progressiva — contrato público v1

Implementa a fatia de apresentação de progressive-history.md. O consumidor
cria uma fonte já autorizada; CCR não recebe URLs, tokens, SQL ou ferramentas.
A autorização atual do EcoServer exclui CMAIL/CVideo. O mensageiro CWH é o
primeiro piloto desta fatia; o piloto de e-mail permanece entrega separada.

## API e fonte

```js
const view = createProgressiveHistory(mount, {
  source: {loadPage}, pageSize: 20, maxPageSize: 100, scrollContainer: mount,
  renderMessage(message, {signal, previousMessage, scope}) {
    return {element, dispose, update, updateMetadata};
  },
  messageKey: message => message.messageId,
  onState(state) {},
});
await view.select({key: hostContextRevision, conversationId});
await view.loadOlder(); // também disponível pelo botão nativo
await view.retry();
view.dispose();
```

- key é uma chave opaca composta pelo host a partir de usuário, workspace,
  conta, fonte, conversa, filtro e revisão aplicáveis. Nunca usar apenas o ID
  da conversa como identidade global. Credenciais não fazem parte dessa chave.
- loadPage recebe {conversationId,olderCursor,limit,signal}. Retorna
  {messages,page:{hasMore,olderCursor}}; mensagens ordenadas da mais antiga à
  mais nova dentro do lote. A primeira chamada pede o lote mais recente.
- messageKey fornece ID estável no escopo. IDs e cursores não são convertidos
  em números. Duplicatas na página são inválidas; sobreposição entre páginas
  conserva os nós anteriores. hasMore=true exige cursor não vazio e diferente
  do pedido; hasMore=false exige olderCursor=null.
- O host limita a consulta na origem. O máximo de página é declarado pelo
  consumidor; não é limite de histórico nem de blocos de uma mensagem. O modo
  Agente combinado continua explicitamente limitado até possuir produtor
  paginado coerente para todas as suas fontes.

## Render e ciclo de vida

- renderMessage retorna um elemento da mesma Document e callbacks do host.
  O corpo rico usa o renderer CCR. A timeline não interpreta o conteúdo.
- updateMetadata({previousMessage,scope}) ajusta somente envelope/separador;
  acrescentar histórico não remonta players, PDFs, gráficos, ações ou rascunho.
- update(message,context) atende atualização nativa explícita; sua ausência
  não autoriza remontar um corpo existente. updateMessage retorna false se a
  mensagem não estiver montada ou o callback estiver ausente.
- appendMessage/removeMessage são projeções de evento confirmado pelo host,
  nunca executores de transporte. Remover visualmente não comprova apagar no
  provedor. Nenhum callback é derivado do conteúdo da mensagem.
- reconcileMessages(messages,scope) recebe somente o conjunto ordenado já
  carregado e autorizado pelo host. Insere eventos atrasados entre nós existentes,
  remove projeções ausentes e recalcula metadados uma vez. O mesmo objeto de
  mensagem indica ausência de alteração; objetos modificados exigem update no
  handle. Não busca dados nem executa exclusão. Retorna false durante carga,
  após descarte, para outro escopo ou sem suporte de atualização. Erro de um
  callback do host não promete rollback de efeitos que esse callback já produziu.
  O terceiro argumento opcional {page} atualiza a fronteira autorizada da fonte,
  inclusive quando uma nova captura descobre anteriores após chegar ao início.
  hasMore/olderCursor seguem o mesmo contrato da página; não inferir cursor no
  navegador nem confundir uma projeção removida com exclusão no provedor.
- dispose é idempotente; aborta requisição/escopo e cada handle, remove somente
  nós próprios. Fonte que ignore AbortSignal ainda tem resposta tardia rejeitada.
- select em novo key/conversationId/fonte cancela e descarta o contexto antigo.
  Nenhum dado, erro ou resultado de outro contexto entra na vista nova.

## Apresentação e erros

CCR mantém controles acessíveis estáveis para loading inicial/anteriores,
vazio, erro, retry explícito e fim. Uma requisição por contexto; sem polling ou
scroll automático para buscar páginas. Retry repete a mesma página sem repetir
efeitos do host. Códigos de erro são limitados; mensagens brutas não entram no DOM.
scrollContainer opcional é o mount ou um ancestral do mesmo Document.
Prepend preserva a âncora pela posição visual do primeiro nó anterior,
sem medir scrollHeight por mensagem. Recursos pesados continuam sob demanda.
Todas as páginas abertas podem permanecer no DOM; não há promessa de memória
constante ou virtualização. Scroll/consulta nunca produzem ACK de leitura.

## Aceite

Fixtures: início/loading imediato, ordem e zero/null; IDs/cursor opacos;
sobreposição sem remontagem; cursor repetido, página inválida e erro/retry;
duas contas/usuários com conversationId igual; fonte que ignora cancelamento;
descarte repetido; âncora, metadados e ações preservados; nenhum endpoint ou
efeito externo no núcleo. Cada host deve testar sua projeção e ACL separadamente.
