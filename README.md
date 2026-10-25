# CChatRender

Versão CES `26.10.25a`; distribuição npm `26.10.25-a`. Componente local candidato, sem publicação em registry.

Renderizador de respostas ricas, independente de motor de IA, servidor, dados e
identidade do produto. Primeiro consumidor: Pergunte Aí. Biblioteca JavaScript,
sem serviço Windows nem registro de ferramentas de agente.

```js
import {createChatRenderer} from '@crania/chat-render';
import '@crania/chat-render/styles.css'; // ou compilar no CSS do host

const renderer = createChatRenderer({
  allowHtmlScripts: false,
  pdfLoader: () => import('/pdf-runtime.js'), // opcional, bundle separado
  pdfWorkerUrl: '/pdf-worker.mjs',
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

PDF usa PDF.js somente após clicar em Pré-visualizar PDF. O host compila o export
`@crania/chat-render/pdf-runtime` separadamente e serve o worker de
`pdfjs-dist/build/pdf.worker.mjs` da versão fixada. Sem loader configurado,
aparece apenas o link de abertura. O componente não usa o plugin PDF nativo.
O host permite `worker-src 'self'` e `connect-src 'self'` para os seus artefatos;
a CSP isolada dos miniapps continua sem rede. Prévia de uma página por vez,
até30MiB e mil páginas; sem XFA, eval, WASM ou scripts/anotações executáveis.
Canvas não substitui o texto acessível do documento original; preservar o link.

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
