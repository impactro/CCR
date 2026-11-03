# Render rico de dados compartilhado

`createRichDataRenderer`, exportado pelo CCR e pelo subpath `data-view`, é o
componente de listagens para conversas, miniapps e outros produtos. Tabelas,
filtro, ordenação, paginação, redimensionamento e as20 visualizações Google
pertencem ao CCR. O CAW mantém somente seu adaptador de sessão e exportação.

```js
import {createRichDataRenderer} from '@crania/chat-render/data-view';
import '@crania/chat-render/data-view.css';

const renderer = createRichDataRenderer({
  document,
  google: true, // decisão explícita do host de carregar o SDK público Google
  exportData: (payload, {signal}) => app.exportData(payload, {signal}),
});
const view = renderer.render({
  title: 'Resultados',
  columns: [{label: 'Código', type: 'string'}, {label: 'Valor', type: 'number'}],
  rows: [['001', 120]],
}, mount, null, {
  layout: 'bare', title: false, count: true, search: true,
  views: true, allowedViews: ['table', 'bar', 'column'],
  exports: true, exportFormats: ['pdf', 'xlsx'],
  pageSize: 20, rowNumbers: false,
  rowKey: row => row[0],
  actionColumns: [{label: 'Ações', actions: info => [{
    label: 'Abrir', invoke: () => app.open(info.key),
  }]}],
});
await view.ready;
// Ao trocar o contexto ou remover a listagem:
view.dispose();
```

## Apresentação e composição

- `layout`: `bubble` é a superfície padrão; `panel` e `bare` permitem painel
  e conteúdo sem moldura. Tema, fontes e cores herdam os tokens do consumidor.
- `title`, `count`, `search`, `views` e `exports` podem ser desabilitados
  independentemente. `allowedViews` restringe o menu às opções úteis da tela;
  visualizações incompatíveis com as colunas não são oferecidas.
- `pagination:false` desativa paginação; `pageSize` aceita1–500 e padrão10.
  O componente aceita até50 colunas,10000 linhas e2000 caracteres por célula.
  Cada host pode aplicar limites inferiores, como o contrato CAW5000 linhas.
- Ações são colunas extras de apresentação, separadas das colunas dos dados.
  Não entram nos gráficos nem nas exportações. Cada coluna recebe `actions`;
  cada botão tem `label`, `invoke`, `disabled` e `title` opcionais. Funções vêm
  do código confiável do host, nunca de JSON, HTML ou mensagem de usuário.
- `message` opcional envolve os dados com o mesmo `renderChatMessage` do CCR.
  Identidade, timestamp e métricas são fatos do host. `messageOptions` reutiliza
  as opções desse envelope. `messageVisibility` pode ocultar `time`, `date`,
  `author`, `metrics` e `tooltips` sem criar outro render de mensagem.
  Em `bare`/`panel`, nenhum envelope de conversa é acrescentado.

`createChatRenderer` já usa a listagem compartilhada para Markdown e blocos
`data`/`table`. Sua opção `richData` repassa configuração ao componente; por
exemplo `richData:{google:true, exportData}` habilita os recursos Google.
`richData:false` mantém a apresentação estática. Gráficos locais e geografia
continuam disponíveis sem Google. O host habilita o SDK explicitamente; a
existência do componente não autoriza novos recursos externos em outro produto.

## Dados, exportação e segurança

O CCR não consulta bancos, chama ferramentas fiscais, autentica usuários, envia
mensagens ou registra arquivos. O callback `exportData(payload,{signal})`
recebe `format`, `view`, `data` e `chartImage`; o host valida e publica o arquivo.
Sem callback, os controles de exportação ficam ocultos. `exportScope:'filtered'`
exporta as linhas filtradas; o padrão preserva o conjunto original.

`google:true` usa Google Charts no navegador. Como já ocorria no CAW, são
permitidas somente as visualizações compatíveis; nenhuma credencial de cliente
é enviada pelo componente. Um host com política de rede restrita pode fornecer
`loadCharts` próprio ou manter Google desligado. Falha no SDK preserva tabela
acessível com filtro, ordenação, paginação e ações; não autoriza outro endpoint.

`render` retorna handle com `ready`, `signal`, `dispose`, `refresh` e `update`.
Novo render no mesmo mount descarta o anterior. Cancelamento impede pintura e
ações tardias. Filtro, ordenação e paginação mantêm a identidade da linha
original nos callbacks. Colunas HTML passam pelo sanitizador; atributos de
controle dos botões não podem ser introduzidos pelos dados.

As20 visões: table, pie, donut, bar, column, stacked-bar, stacked-column,
line, area, combo, scatter, histogram, org, timeline, calendar, gauge,
candlestick, sankey, treemap e bubble. Compatibilidade depende dos tipos e
da estrutura real dos dados, sem inferir resultados inexistentes.
