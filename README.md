# CCR — Crânio Chat Render

**26.11.1b — candidata:** reconciliação ordenada de eventos nativos sem
remontar nós existentes, preservando cursores e retry. O host continua dono
dos dados e efeitos; fonte e testes não declaram adoção instalada.

**26.11.1a — candidata:** timeline progressiva por fonte injetada, escopo
composto, cancelamento, retry e prepend sem remontagem. Envelope contextual e
metadados opcionais são apresentação do núcleo; ações dependem do host.
Contrato em [PROGRESSIVE-HISTORY-CONTRACT.md](docs/PROGRESSIVE-HISTORY-CONTRACT.md).
CAW, CWH e CCI mantêm backends e autorização. Integração/homologação de cada
consumidor continuam separadas; CMAIL/CVideo fora desta fatia autorizada.
Preparação de lateral/conteúdo por callbacks confiáveis em
[CONTEXTUAL-VIEWS-CONTRACT.md](docs/CONTEXTUAL-VIEWS-CONTRACT.md), sem conector
de e-mail implícito. Organização, comandos e cobertura em [tests/README.md](tests/README.md).

**26.10.31b:** prompts canônicos de formato no próprio CCR, selecionados pelas
capacidades e plugins reais do host. Exports `/prompt`, `/prompt.json` e
`/prompt.md`; fonte única em [render.prompt.json](config/prompts/render.prompt.json)
e [contrato de integração](config/prompts/render.prompt.md). O render anterior
permanece compatível. A adoção desta rodada é coordenada com o ALP.
O compositor comporta o catálogo completo de plugins do ALP, sem reduzir os
formatos existentes; a revisão31a anterior tinha um limite inicial menor.

```js
import {buildRenderPrompt} from '@crania/chat-render/prompt';
const instructions = buildRenderPrompt({capabilities: ['data', 'chart', 'ccr.data']});
// O host inclui instructions no contexto efetivo do seu motor, também no resume.
```

**CCR** é o nome curto de CChatRender, aprovado por Fábio em29/10/2026.
O nome técnico `@crania/chat-render` e os imports continuam estáveis.
Origem oficial pública: **[impactro/CCR](https://github.com/impactro/CCR)**.
O diretório local padronizado é **`CM/CCR`**, igual ao repositório. Dependências Git devem fixar
o SHA completo, conforme [origem e consumo pelo Git](docs/GIT-ORIGIN.md).

Para obter a fonte, executar a partir da pasta de componentes `CM`:

```sh
git clone https://github.com/impactro/CCR.git CCR
```

Quem já tem o antigo clone `CChatRender` deve renomear a pasta para `CCR`,
preservando o Git e o trabalho local; se `CCR` já existir, conferir os dois
checkouts antes de qualquer movimentação. Assets compilados em `vendor/` dos
consumidores devem registrar origem oficial, commit e build; a fonte é este clone.
Artefatos ricos CES JSON/HTML usam o contrato v1 do CCR26.10.29-c, descrito em
[documentos ricos CES](docs/CCR-RICH-DOCUMENT.md). O host fornece recurso autorizado.

As quatro superfícies do produto e os limites de cada tipo rico estão no
[mapa de consumidores e capacidades](docs/RICH-CONTENT-CONSUMERS.md): CWH
WhatsApp, CWH Assistente e CCI Explorador ativos; CAW na próxima migração.
ALP permanece laboratório e referência de extensões.

Versões CES e npm atuais estão em package.json/release.json. Fonte publicada
no Git oficial; pacote sem publicação em registry npm. Artefatos antigos
identificados conservam seus hashes e não são reempacotados nesta publicação.

Leitura de dados: gráficos locais usam rótulos e valores maiores, números em
negrito e linhas de barras mais altas. Em telas estreitas, a figura mantém uma
largura mínima com rolagem interna para preservar a leitura; o documento do host
continua responsivo. Cores, mapas e largura da conversa são políticas do host.

Renderizador de respostas ricas, independente de motor de IA, servidor, dados e
identidade do produto. Origem no Pergunte Aí; a evolução atual prioriza o CWH,
produto em uso diário. ALP é laboratório/showroom e se adapta ao contrato do
produto. Crania Agent é a referência comercial do ecossistema. CAW, LP/ALP,
CWH e os demais consumidores seguem o mesmo
[contrato de apresentação](docs/CHAT-PRESENTATION-CONTRACT.md); o tema fornece
a identidade, e o host adapta dados e capacidades. Adoção integral em cada
produto exige evidência própria. Biblioteca JavaScript,
sem serviço Windows nem registro de ferramentas de agente.

```js
import {createChatRenderer} from '@crania/chat-render';
import '@crania/chat-render/styles.css'; // ou compilar no CSS do host

const renderer = createChatRenderer({
  allowHtmlScripts: false,
  plugins: {custom(source, context) { /* validar; devolver um Node */ }},
  allowResource: url => url.origin === location.origin && url.pathname.startsWith('/files/')
});
const handle = renderer.render(document.querySelector('#answer'), {
  text: '**Resposta** em Markdown',
  attachments: [{type: 'audio', url: '/files/exemplo.wav', title: 'Áudio'}]
});
// Ao substituir ou remover a resposta:
handle.dispose();
```

Tipos nativos: Markdown/conversa, tabelas de dados (`data`, `table`), gráficos
SVG locais de barras/colunas/linhas/área com tabela acessível, HTML e SPA isolados,
imagem, PDF, áudio/voz gravada, vídeo,
YouTube e arquivo. Um plugin pode substituir a tabela de gráfico por outro
renderizador. A biblioteca não grava, transcreve ou gera mídia; apresenta
artefatos autorizados pelo host. O download/export e a marca são do consumidor.

Cada plugin recebe documento, janela, signal, cleanup, onIssue e contexto do
consumidor. Devolve um Node ou `{element, dispose}`. Substituir uma resposta no
mesmo elemento descarta a anterior. O host chama dispose ao remover uma bolha.
Falha de um plugin mantém o restante da resposta e informa código de erro, sem
expor a exceção bruta. Não enviar texto de visitante a onIssue.

HTML comum nunca executa no documento pai. Blocos html/spa usam iframe opaco,
sem mesma origem, formulários, navegação superior, acesso a rede ou objetos.
Scripts são desabilitados por padrão; habilitação é decisão explícita do host,
nunca uma propriedade do conteúdo recebido. Scripts inline permitem miniapps
locais e não concedem acesso ao host. O hospedeiro deve manter CSP frame-src
restritiva. Não existe ponte de postMessage para ferramentas ou credenciais.

Miniapps com scripts exigem `htmlFrameUrl`. Ele aponta para um documento
estático externo que carrega `@crania/chat-render/sandbox-host` e contém um
`<iframe id="app" sandbox="allow-scripts" data-content-url="/rich-content.html">`.
A política desse documento permite apenas `frame-src 'self'`, scripts próprios
e nenhuma conexão. O segundo documento carrega
`@crania/chat-render/sandbox-runtime` como script clássico e um `<main id="content">`.
Apenas esse segundo documento usa
`script-src 'self' 'unsafe-eval'`, junto de `sandbox allow-scripts` e políticas
de rede/objetos/forms bloqueadas. A política da página de chat não é relaxada.
Esse documento interno não aplica frame-ancestors que exclua seu pai opaco.
O wrapper externo conserva frame-ancestors do host. As duas camadas impedem que
o miniapp use a permissão YouTube da página principal para navegar para fora.
O bootstrap recebe um único payload do próprio pai e descarta scripts externos,
event handlers HTML e frames; remove o invólucro dos formulários preservando
controles locais. Código autorizado usa addEventListener. HTML sem scripts pode
usar srcdoc passivo sanitizado, sem links de navegação automática.

PDF usa o visualizador nativo do navegador; não há PDF.js, worker ou canvas. O host fornece `viewerContainer`, uma área posicionada da conversa, para abertura com Baixar/Fechar.

Recursos são negados por padrão, exceto URLs próprias no contrato
`/api/session/artifact/<UUID>`. Origens HTTPS ou paths adicionais exigem opção
do host. Autorização efetiva e Content-Type continuam sendo do servidor. Áudio/vídeo não
fazem autoplay nem preload de conteúdo; YouTube só cria embed após clique.
Não interpretar link HTTPS como fonte confiável ou licença de redistribuição.

Limites padrão: 150 mil caracteres de texto, 120 mil por bloco, quatro visuais,
16 colunas e mil linhas no grid genérico. Adaptadores podem impor limites menores.
Sem uploads, persistência, conta, perfil, busca, dependência de CA/CAW ou acervo.

Instalação: Node24, `npm ci`; testes: `npm test`. Empacotar com `npm pack`.
Prévia sintética independente: `node scripts/preview.mjs`, loopback4271.
Áudio/vídeo de teste opcionais pertencem a `.agents/fixtures/`, fora do pacote.
O consumidor fixa o commit completo do Git oficial no manifesto/lockfile e
compila seus assets a partir dessa dependência. O runtime usa os assets fechados
do produto, sem buscar Git/npm na inicialização. Tarballs já distribuídos são
registros imutáveis das versões anteriores; a migração de origem é documentada
por cada consumidor, sem criar uma cópia independente do render.

Origem: extração e generalização do render do Pergunte Aí, inspirado nos
conceitos content-viewer/showdata do CrânIA Agent. Não importa seu runtime.

DOMPurify3.4.17 sanitiza o Markdown; marked18.1.0 faz o parsing. PDF nativo,
sem PDF.js/worker/dependência opcional. Todas as versões são fixadas no
lock. Uma falha preserva texto/link e não autoriza relaxar CSP. Plugins são código
confiável do host; conteúdo recebido nunca registra um plugin.

O npm rejeitou a instalação de `26.10.25a` como versão de dependência
(`Invalid Version` no comparador SemVer). Exceção técnica de empacotamento:
`package.json.version` usa `26.10.25-a`; `cesVersion` e `release.json.version`
conservam a versão oficial. A correspondência é um para um, sem alias móvel.

## Primeira convergência CWH/PergunteAI — 29/10/2026

`presentation` exporta `sequenceFor`, `messageTime`, `messageDay` e
`createConversationState`. O contrato JSDoc ChatMessage usa conversationId,
messageId, authorId, role, direction, createdAt (milissegundos UTC) e parts
ordenadas. requestId/attemptId são opcionais; sessão/visitante não são conversa.
O host conserva transporte, banco, autorização, ordem e protocolos existentes.
CWH converte segundos/fromMe no adaptador; PergunteAI converte seus registros.

Agrupamento: mesma conversa/autor conhecido/direção/dia no fuso do host
(São Paulo padrão); eventos de sistema e breakBefore/breakAfter interrompem.
A data é separadora em negrito; cada mensagem conserva hora e identidade.
Partes de uma resposta não viram mensagens artificiais. authorId ausente não
agrupa. CSS kebab-case com componentes chat-* e tokens --ca-ui-* fornecidos
pelo host, seguindo a convenção observada em CA, CCI e CMAIL, sem alterá-los.

`renderer.update(element, message, {conversationId,messageId,resourceRevision})`
preserva DOM quando texto/anexos/escopo/revisão de recurso não mudam. Mudança
de conteúdo ainda reconstrói o corpo: não é diff incremental completo.
Recibos/horários ficam fora do corpo. `render()` continua montagem explícita.
O host deve mudar resourceRevision quando a autorização/recurso mudar.
Blob exige origem igual e allowResource explícito para a URL exata concedida;
o proprietário da URL conserva sua revogação. viewerContainer é o contêiner
posicionado da conversa; descarte fecha e descarrega PDF. Metadados/ações de
uma conversa não autorizam acesso a outra. Estado por conversa é memória da
visualização; não cria/migra histórico nem fornece autorização.

## Balões comuns no CWH —26.10.29b

`@crania/chat-render/conversation` é uma entrada ESM independente, sem imports
de Markdown, DOMPurify, banco, transporte ou navegador global. Exporta
`renderChatMessage`, `renderChatQuote` e `isAuthorColor`. A entrada principal
também reexporta essas funções. O CWH fixa o pacote e extrai essa entrada junto
de `presentation`; o ALP continua na versão anterior até sua próxima adaptação.

```js
import {renderChatMessage,renderChatQuote} from '@crania/chat-render/conversation';
const author={id:'author-one',displayName:'Ana',color:'#167e77'}; // host resolve
const message={conversationId:'chat-one',messageId:'m1',authorId:author.id,
 role:'user',direction:'incoming',createdAt:1793280600000};
const html=renderChatMessage(message,{author,layout:'group',previousMessage:null,
 bodyMarkup:'<p>Conteúdo já escapado pelo adaptador</p>'});
```

O envelope comum monta autor/cor, sequência, separador diário, hora externa,
reação agregada e slots de corpo/ações/recibo. Citação recebe `replyTo` com
conversationId/messageId/authorId/preview.text e o descritor do **citado**.
Não resolve equivalência de IDs nem deduz autor por role. Identidade ausente,
conversa diferente, direção ou dia diferente interrompem a sequência.

`layout` private/group e `showAuthor`, `showIncomingAvatar`, `showOutgoingAvatar`
são escolhas do host. Por padrão, grupos mostram identidade apenas no início,
privadas não a repetem e avatar próprio fica oculto. `automated` seleciona a
aparência já existente; não executa agente. `reactions` recebe pares text/count
já resolvidos pelo host. `edited` é metadado de apresentação.

Todos os campos textuais são escapados; somente #RRGGBB entra na variável de
cor. Slots `bodyMarkup`, `actionsMarkup`, `avatarMarkup`, `beforeBodyMarkup` e
`deliveryMarkup` são saída **confiável do adaptador**, nunca HTML de mensagem
ou preview recebido. Não há callback de rede/evento embutido nesta fatia.

Hooks CSS/data do CWH são conservados para compatibilidade com seus temas e
reconciliador. O CSS instalado continua no host, sem importar `styles.css` do
corpo rico sobre o mensageiro. Não há troca de parser WhatsApp por Markdown.
Renderização de mídias, visualizador, ações, persistência de cores, seleção de
reação própria, fila e reciprocidade de transporte continuam no CWH. O corpo
rico `createChatRenderer` continua uma entrada separada para o host que o usa.

## Documentos ricos e copiar —26.10.29c

`@crania/chat-render/document` exporta decodeRichDocument/createDocumentRenderer
e richDocumentText, sem Markdown/DOMPurify. Um arquivo JSON/HTML com marcador
CES e versões1 produz tabela tipada, gráfico bar/column/line/area ou HTML passivo.
Sem marcador/inválido/incompatível continua arquivo no adaptador. Limites e tipos
em [contrato v1](docs/CCR-RICH-DOCUMENT.md), exemplos em examples/rich-documents.

```js
import {decodeRichDocument,createDocumentRenderer} from '@crania/chat-render/document';
import {copyText} from '@crania/chat-render/clipboard';
import '@crania/chat-render/document.css';
const decoded=decodeRichDocument(jsonText); // ou objeto/documento HTML marcado
if(decoded.status==='ready'){
 const renderer=createDocumentRenderer();
 const handle=renderer.update(container,decoded.document);
 // Ao remover a mensagem: renderer.dispose(container).
}
// Em um clique do usuário: await copyText(textoVisivel).
```

O corpo rico existente aceita message.documents com esses mesmos envelopes e
inclui as prévias no limite visual/lifecycle. A faixa de ações permanece FORA
do article.bubble; copiar é ação local do host e não depende da conexão de envio.
Dentro da bolha ficam somente texto, citação e corpo rico; o host deve remover
fundos/bordas antigos de wrappers internos para evitar uma segunda moldura.

## CCR26.10.29-d — ações externas

Faixa comum de ações por capacidade, IDs opacos, ordem e callbacks do host;
API em [CCR-ACTIONS.md](docs/CCR-ACTIONS.md). Atualização keyed, AbortSignal/dispose e controles nativos de
export sem clone; corpo/player/PDF/rascunho independentes. CWH integra markup
puro no dispatcher existente; ALP recebe o mesmo pacote para seu adaptador.
38 testes locais. O diff completo do corpo e a área de testes de agentes
continuam próximas fatias; CAW não é alterado.


## CCR26.10.30b — shared visual vocabulary

Use host --ca-ui-border, --ca-ui-muted, --ca-ui-warning, --ca-ui-text and
--ca-ui-surface for the shared rich body. Font-family and base spacing belong
to --ca-ui-font and --ca-ui-space in the host contract; CCR does not install
a global reset, palette selector or configuration menu. Document pixels and
chart data colors are not corporate theme tokens. APIs remain unchanged.
