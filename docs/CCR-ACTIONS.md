# Faixa de ações CCR

Entrada `@crania/chat-render/actions`, CSS opcional `@crania/chat-render/actions.css`.
Descritores são código confiável do host; nunca aceitar callbacks, permissões ou
URLs diretamente de JSON CES, conteúdo do agente ou anexos.

`renderMessageActions(actions,{escape?,icon?})` produz somente controles, para o
dispatcher delegado do CWH. Não cria uma bolha nem um wrapper adicional. O host
mantém transporte e autorização e deve bloquear cliques desabilitados.

`createMessageActionRail(container,{scope,actions,signal?,onError?,onFeedback?,icon?})`
oferece `update({scope,actions})` e `dispose()`. Scope obrigatório contém
`conversationId` e `messageId` opacos. Atualizar ações não toca no corpo, player,
PDF ou rascunho. Trocar mensagem, remover ação ou descartar aborta operações;
resultados atrasados não produzem feedback. O host deve propagar o AbortSignal
ao fetch, não apenas ignorar seu resultado. Não há retentativa automática.

```js
const actions=[{
 actionId:'copy-text',kind:'copy',label:'Copiar texto',enabled:true,
 invoke:({scope,signal,event})=>copyText(textoVisivel)
}];
const rail=createMessageActionRail(container,{scope:{conversationId,messageId},actions});
rail.update({scope:{conversationId,messageId},actions});
// Ao sair da conversa:
rail.dispose();
```

Cada descritor: `actionId` único e estável, `kind`, `label`, `visible?`,
`enabled?`, `pending?`, `resourceId?`, `scope?` (inclui `partId?`), `invoke?`,
`dispose?`. Ordem comum: reply, react, copy, preview, open, download, export,
forward. Ausente/visible=false omite; enabled=false/pending=true desabilita.
Vários exports usam IDs distintos. Copiar local pode continuar disponível sem
conexão. `invoke({scope,actionId,resourceId,signal,event})` começa dentro do clique;
pending impede duplicação até terminar. Erro recebe somente action_failed;
feedback recebe status e texto limitado, sem impor interface ou duração ao host.

`resolveLink()` é concessão síncrona do host: retorna `{href,download?}` autorizado
ou null. Somente HTTP, HTTPS e Blob, sem credenciais na URL. O host valida origem,
recurso e expiração; CCR não busca arquivos. Links mantêm gesto nativo e rel.
`element` adota o controle original do host sem clonar seus eventos, útil para
exports PDF/Excel/PNG com filtros e disponibilidade dinâmica. O host conserva
hidden/disabled quando não fornece override. Conteúdo rico interativo permanece
no corpo. `data`, `className` e `icon` são adaptadores de código do produto.

CWH usa apresentação pura com callbacks delegados existentes. ALP pode usar a
faixa com lifecycle, conservando os controles nativos. Não é extração completa
do diff de partes: o corpo rico e seus plugins ainda possuem lifecycle próprio.
38 testes do núcleo, incluindo 7 da faixa; sem modelos ou envios WhatsApp.
