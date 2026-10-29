# CChatRender

Versão CES `26.10.29a`; distribuição npm `26.10.29-a`. Componente local, sem publicação em registry.

Leitura de dados: gráficos locais usam rótulos e valores maiores, números em
negrito e linhas de barras mais altas. Em telas estreitas, a figura mantém uma
largura mínima com rolagem interna para preservar a leitura; o documento do host
continua responsivo. Cores, mapas e largura da conversa são políticas do host.

Renderizador de respostas ricas, independente de motor de IA, servidor, dados e
identidade do produto. Primeiro consumidor: Pergunte Aí. Biblioteca JavaScript,
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
O consumidor fixa versão e integridade do tarball. Código canônico em CM/;
o tarball versionado no consumidor é distribuição imutável, não um fork.

Origem: extração e generalização do render do Pergunte Aí, inspirado nos
conceitos content-viewer/showdata do CrânIA Agent. Não importa seu runtime.

DOMPurify3.4.17 sanitiza o Markdown; marked18.1.0 faz o parsing; PDF.js6.4.299
é a dependência opcional de execução da prévia. Todas as versões são fixadas no
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
