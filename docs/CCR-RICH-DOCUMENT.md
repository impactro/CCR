# CCR — documentos ricos CES

Direção de Fábio em29/10/2026. **CCR = Crânio Chat Render**, nome curto do
módulo técnico CChatRender (`@crania/chat-render`). Caminhos/imports permanecem.
CWH, seu Assistente, CCI e CAW são consumidores com adaptadores próprios.

Estado da fonte: **contrato v1 mantido no CCR26.11.2g**, com extensões opt-in de
texto, imagem lógica e report, além de dados/HTML. Cada consumidor fixa e testa
sua revisão; publicação deste contrato não instala nem autoriza os hosts.

## Resultado esperado

O mesmo arquivo viaja como documento JSON/HTML. No WhatsApp comum, permanece
anexo. Num host compatível, o adaptador reconhece o marcador, valida o documento
e fornece partes ao CCR para tabela, gráfico ou HTML isolado. O original continua
disponível para visualizar/baixar/encaminhar, sem criar mensagens artificiais.
O ALP fornece o mesmo objeto diretamente, sem simular transporte WhatsApp.

## Documento JSON v1

```json
{
  "owner": "CES",
  "format": "ccr.document",
  "version": 1,
  "renderer": {"name": "CCR", "version": 1},
  "type": "data",
  "view": "table",
  "title": "Resumo por região",
  "data": {
    "columns": [
      {"label": "Região", "type": "string"},
      {"label": "Total", "type": "number"}
    ],
    "rows": [["Norte", 12], ["Sul", null]]
  }
}
```

| Campo | Significado |
| --- | --- |
| owner/format | Marcador exato CES/ccr.document; não tratar qualquer JSON como apresentação. |
| version | Versão do esquema do arquivo, inicialmente1. |
| renderer.name/version | CCR e versão do contrato de apresentação requerido, inicialmente1; independente da versão npm/data de publicação. |
| type | data, html, text, image ou report, com campos estritos por família. |
| view | table ou gráfico suportado para data; não é código a executar. |
| title/data | Título visível e dados tipados; linhas em ordem, null preservado. |

A primeira release é26.10.29-c, contrato de arquivo e renderer versão1.
Versão desconhecida/tipo inválido conserva o anexo, sem adivinhar migração.
Campos desconhecidos são rejeitados. Em data, view é obrigatório e aceita
table/bar/column/line/area/map/heatmap; title tem até180 caracteres. Reports e
exportação têm limites próprios em [document-export.md](document-export.md).
Não é novo SEND_JSON.

"Assinatura" significa marcador de formato, **não assinatura criptográfica**.
owner é declarado pelo arquivo e não comprova procedência/autoria/permissão.
Não incluir senha, token de API, sessão ou caminho local no header. Usar format
como identificador; autorização continua no host.

## HTML marcado v1

Arquivo .html marcado pode usar comentário inicial com o mesmo header:

```html
<!-- CES-CCR {"owner":"CES","format":"ccr.document","version":1,"renderer":{"name":"CCR","version":1},"type":"html","title":"Resumo"} -->
<!doctype html>
<html lang="pt-BR"><body><h1>Resumo</h1><p>Conteúdo do documento.</p></body></html>
```

O adaptador lê header limitado e JSON válido, sem executar o arquivo para
identificá-lo. JSON type=html pode transportar data.html como texto com mesma
semântica. Extrair header não libera scripts. Usar sandbox CCR e política do
host; receber anexo não habilita miniapp ativo, rede, ferramentas ou acesso ao
documento pai. HTML sem marcador continua arquivo. HTML inline em célula conserva
somente b/strong/em/i/u/s/br/code/small/span, sem atributos, links ou recursos.

## Inventário e lacunas

| Origem conferida | Forma/capacidade atual | Diferença a tratar |
| --- | --- | --- |
| CCR src/data.js | columns tipadas string/number/boolean/date/datetime/html;16 colunas,1000 linhas, células2000 caracteres | Compatibilidade antiga de colunas string/label mantida. HTML inline limitado, não HTML irrestrito. |
| CCR src/chart.js | Mesmos dados; SVG local bar/column/line/area e tabela; até100 linhas para gráfico | Não cobre todos os gráficos CAW. |
| CCR src/renderer.js | Markdown com blocos e plugins; message.documents aceita o documento v1 | Host identifica candidatos e autoriza o recurso; um decoder comum. |
| CCR src/sandbox.js | HTML isolado; scripts desligados por padrão;120000 caracteres | Scripts dependem do host, nunca do header. |
| CA ca/json_format.py | data com title, columns[{label,type}], rows; string/html/number/boolean/date/datetime/null | Mais tipos que o núcleo CCR. Fonte apenas lida, sem alterar CA. |
| CAW showdata.js | Tabela e pizza/rosca/empilhados/dispersão/timeline/indicadores/outros | Não declarar paridade porque há um gráfico de barras no CCR. |
| ALP26.10.29e | Markdown, data/table/chart, views/dashboards, HTML/SPA, SVG/Mermaid, mapas, relacionais, demos/candidatos, mídia e artefatos por hash | Inventário docs/CCR-TIPOS-RICOS.md confirmado pelo chat PC-IA ALP, commit9d93d42; mapas/base eleitoral permanecem plugins. |

Preservar ordem, tipos, unidades e null; não converter ausência em zero, boolean
em número ou data em número para encaixar no menor denominador. HTML em célula
exige sanitização/política própria; type=html não autoriza injeção no DOM.
Tipos sem suporte conservam alternativa legível e arquivo original.

Um decoder comum valida documento de até1MiB UTF-8, profundidade16,25000 nós,
header HTML até8192 caracteres, corpo HTML120000 caracteres. Datas usam YYYY-MM-DD
real; datetime requer ISO com segundos e fuso explícito Z/offset. Boolean é
boolean, número é finito; null permanece null. Objetos inesperados/ciclos/accessors
e chaves de protótipo não entram. O formato não transporta chamadas ou credenciais.

`decodeRichDocument(input)` recebe string JSON/HTML ou objeto e retorna status
ready/unrecognized/unsupported/invalid; ready contém document normalizado.
`createDocumentRenderer().update(element,input)` monta tabela/gráfico ou iframe
passivo; dispose limpa recursos, update idêntico conserva o frame. Entrada
`@crania/chat-render/document`, CSS `@crania/chat-render/document.css`.
O renderer rico principal também aceita `message.documents`, respeitando limite
visual e lifecycle existentes. Não troca parser de mensagem WhatsApp por Markdown.

`richDocumentText(document,{document})` fornece texto/tabulação para cópia,
preservando linhas e células. `@crania/chat-render/clipboard` exporta copyText,
cópia local de texto por clique do host, com fallback que restaura o rascunho.

## Transporte, identidade e recursos

Isto é **conteúdo de arquivo**, não protocolo de entrega novo nem V5. SEND_JSON
continua CA/CAX; saída V4 do conector permanece fechada. WhatsApp pode transportar
o documento por type=file existente, com owner/format/version/type/data dentro
do arquivo. Não adicionar campos ao topo do SEND_JSON nem enviar response V4
type=data que o contrato não aceita. Canal Web adapta seu data ao mesmo conteúdo.

Conta/conversa/mensagem/autor, recibos, caminhos e permissões vêm do host. O anexo
não reatribui autor WhatsApp, seleciona conversa ou envia algo. Recurso externo
ou Blob depende da autorização/lifecycle já existentes do host.

Fluxo futuro: anexo autorizado → download pelo CWH → marcador/versões/dados
validados → decoder CCR → partes/tabela/gráfico/sandbox. Extensão/MIME selecionam
candidato, não bastam para reconhecer formato. Sem marcador, inválido, incompleto
ou incompatível permanece arquivo. Falha local não derruba a mensagem restante.

## Fatias e aceite

1. ALP adota envelope CCR26.10.29-b e confirma tipos ricos; autorização já enviada
   ao chat PC-IA ALP. Não confundir esta adaptação com o novo decoder.
2. Decoder comum, tipos e HTML passivo implementados em26.10.29-c, com fixtures.
3. Adaptador CWH usa cache de mídia autorizado; candidatos JSON/HTML com tamanho
   conhecido até1MiB carregam ao aparecer. Sem tamanho/maiores continuam manuais;
   acima de1MiB não são decodificados. Original/download/encaminhamento conservados.
   Cache de prévias24 entradas/8MiB, limpo por conta/sessão; frames descartados ao sair.
4. Adaptar produção pelos agentes/CAW em rodada posterior, sem mudar transporte
   por consequência desta documentação.

Aceite sintético: objeto/string do mesmo JSON produz mesmos dados/ordem; compatível vira rico;
JSON/HTML comum continua arquivo; incompatível/quebrado conserva download;
autor/conversa não vêm do anexo; scripts/campos não concedem efeitos; troca de
conversa libera recursos. Documentação não equivale a funcionalidade publicada.
Execução fica na fila do projeto dono, sem segunda fila de tarefas aqui.

## Confirmação da primeira adaptação ALP

PC-IA ALP confirmou26.10.29e, Sites97, commit9d93d42, CCR26.10.29-b com hash
628fa90270b05486883caf58aae1dc8bdb7a7e592ac3f47160f1a41e83fd20e8.
105 testes, build, conteúdo rico/ESM/UTF-8 e assets públicos conferidos pelo dono;
worker PCIA permanece parado. Sem screenshot de navegador. O inventário acima
é capacidade encontrada no ALP, não prova de export comum de todos esses plugins.
A confirmação acima refere-se à primeira adaptação26.10.29-b, anterior ao
decoder26.10.29-c. A cópia de proposta ada9fd7 no vendor CWH permanece snapshot
histórico. Cada host confirma separadamente sua adoção da nova versão.

Since26.10.30a, data views also include `heatmap` and `map`. Since26.11.1i, maps resolve Brazilian Cidade/UF or Estado names against bundled public municipal seats and state boundaries, or use explicit numeric Latitude/Longitude. They include zoom/pan/details and preserve unresolved rows; there is no network geocoder or street map. See geographic-map.md. The Markdown rich renderer accepts the same CES document in a fenced `ccr` block. Existing unsupported-view fallbacks remain valid for older consumers.


## Extensão opcional26.11.2g

O contrato v1 conserva documentos anteriores e acrescenta data.chart.series,
type=text/image/report. O schema fechado, restrições de recurso, grid,
paginação e API estão em [document-export.md](document-export.md), seção
Contrato entregue. Consumers antigos não são atualizados automaticamente;
ccr.report é capacidade opt-in. Web continua suportando HTML/map/heatmap;
export-document rejeita esses tipos explicitamente. Tetos data/map10.000
preservados; export de relatório tem limites próprios de layout/páginas.
