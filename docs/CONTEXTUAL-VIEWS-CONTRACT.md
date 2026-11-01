# Áreas contextuais — contrato de preparação do hospedeiro

`createContextualViewHost` é uma composição opcional de duas regiões DOM
independentes: navegação e conteúdo. Não implementa e-mail, HTTP, OAuth, SQL,
pastas ou política de acesso. Adaptadores são código confiável do hospedeiro;
um JSON recebido não pode registrar funções nem habilitar uma área.

```js
const views = createContextualViewHost({navigation, content, onState});
views.register('mail', {
  loadNavigation({scope, signal}) {},
  renderNavigation(value, {scope, signal, selectItem}) {},
  loadContent({scope, signal}) {},
  renderContent(value, {scope, signal}) {},
});
await views.selectArea('mail', {
  key: JSON.stringify([userScope, workspaceId, accountId, collectionId]),
  workspaceId, accountId, collectionId,
});
await views.selectItem(itemId);
views.retry('navigation');
views.retry('content');
views.suspend();
views.dispose();
```

IDs são opacos. `key` é formado pelo host, sem credenciais; accountId e
collectionId são obrigatórios. No e-mail, collectionId representa a pasta
autorizada; no WhatsApp pode representar a seleção/filtro de conversas.
Trocar pasta/conta usa selectArea com o novo escopo e limpa a seleção. Selecionar
item não cancela a consulta independente da lateral. Trocar conta/pasta, suspender
ou descartar cancela ambas. Fontes que ignorem AbortSignal não podem publicar
respostas atrasadas. Um callback de seleção da lateral antiga perde validade.

Cada load é assíncrono; render é síncrono e retorna um Element da mesma
Document ou `{element,dispose}`. O signal do handle é abortado antes de dispose.
O corpo rico usa createChatRenderer; mensagens podem usar createProgressiveHistory.
Páginas da lista lateral e dropdown de coleções pertencem ao adaptador: não há
consulta integral implícita nem implementação de pastas no CCR. Recursos de
anexo continuam autorizados pelo serviço dono, inclusive no modo conteúdo.

Loading, erro/retry e descarte são por região. Erros brutos não entram no DOM;
onState recebe apenas código limitado, fase e contexto. Contexto contém IDs,
nunca token, caminho físico ou segredo. O host continua responsável por sessão,
ACL, CSRF e autorização de cada página/item/ação no backend. Fechar a vista não
encerra um transporte ou serviço de negócio.

## E-mail preparado versus integrado

Autorização local de 01/11: preparar CWH/CAW e documentar, sem alterar CMAIL ou
CVideo. Fixtures do núcleo comprovam independência das regiões, cancelamento,
troca de conta/pasta e retry; não comprovam integração com um provedor de e-mail.
O adaptador CMAIL real, descoberta de contas/pastas, paginação JSON, sanitização
de HTML recebido e ações autorizadas precisam de homologação integrada posterior.
Não mostrar atalho funcional nem anunciar conta disponível por existir este contrato.

Aceite posterior: caixa inicial autorizada, dropdown sem terceira lateral,
lista paginada, abrir item, vazio, retry independente, conta/pasta trocada durante
consulta lenta, HTML isolado, anexo cruzado negado e retorno ao chat preservado.
Fixture pode validar encaixe; somente instalação com CMAIL permite validar o
conector real. Envio real não é necessário para esse aceite.
