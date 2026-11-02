# Composições e exportação reutilizável

Procedimento aprovado em02/11/2026, itens5–8 do mapa de componentes. Evoluir
o CCR comum, preservando consumidores e documentos anteriores. Receitas,
contratos, código e testes sintéticos pertencem ao Git; dados e imagens reais
permanecem no consumidor. O host conserva identidade, autorização e entrega.

## Interface e responsabilidades

- Tabela tipada permanece a evidência de cada gráfico. Configuração opcional
  `data.chart.series` seleciona coluna, tipo de série e eixo; ausência conserva
  o comportamento existente. Quantidades, unidades e períodos vêm do chamador.
- Séries podem combinar coluna/linha e eixos de unidades distintas, com legenda
  e rótulos explícitos. Zero não é nulo; valores ausentes quebram a linha.
- Documento CES/CCR pode representar texto, recurso de imagem e composição de
  seções, além dos tipos existentes. A composição limita profundidade, número
  de painéis e tamanho total. Recursos são IDs lógicos resolvidos pelo host,
  nunca caminhos ou URLs remotas escolhidos pelo conteúdo.
- A exportação usa a mesma especificação/modelo visual do render Web, com
  runtime fechado incluído no pacote. Nenhum npm, CDN, navegador ou instalação
  de dependência é iniciado durante a consulta. Backend indisponível é erro
  explícito; não substituir gráfico/imagem por PDF textual silenciosamente.
- Tool `export-document` recebe raiz, JSON do documento, recursos locais
  opcionais e destino PNG/PDF. Entradas/saídas do cliente ficam em temp/outputs.
  Retorna manifesto dos arquivos produzidos, formato, dimensões/páginas e hash.
- Imagens fornecidas são locais e explícitas, com limites de tamanho/formato.
  Render não consulta banco, não acessa rede e não envia mensagem.
- Mapas reutilizam prepare-map/lookup-place/render-map e o cache público
  permanente. Não fixar diretórios UUID de geração em exemplos/receitas.

## Sequência e aceite

1. Congelar schemas e implementar modelo/render compartilhado com regressões
   dos documentos antigos, XSS, tipos, limites, zero/nulo e eixos/unidades.
2. Implementar runtime de exportação fechado e verificar sua proveniência no
   build. Conferir PNG real e PDF multipágina com texto, gráficos e imagens.
3. Publicar tool/skill CM e prompt apenas para capacidades existentes. Provar
   chamada por consumidor sintético sem permissão de banco ou envio.
4. Testar as mesmas fixtures em Web e exportação, incluindo seis painéis e
   linha/coluna. Conferir legibilidade e atributos de acessibilidade.
5. Fixar a revisão oficial nos adaptadores e validar assets/prompt juntos.
   Publicação do código não representa instalação automática de consumidores.

Dados inválidos, recurso externo, caminho fora do workspace, imagem ausente,
backend ausente e saída existente falham explicitamente. Não alterar dados
operacionais, configurações privadas ou o transporte nos testes do módulo.


## Contrato entregue na fonte26.11.2g

Não implica instalação nos consumidores. Versões: CES26.11.2g,
npm26.11.2-g, Python26.11.2.post7. Teto anterior de10.000 linhas/pontos
mantido; a travessia estrutural admite200.000 nós, sempre dentro de1MiB.

### Schema fechado (v1, campos desconhecidos são erro)

Todo documento tem exatamente `owner:"CES"`, `format:"ccr.document"`,
`version:1`, `renderer:{name:"CCR",version:1}`, `type`, `title`, `data`,
e `view` somente para type=data. Título não vazio, até180 caracteres.
Tipos antigos, marcador HTML, tipagem e estados do decoder permanecem.

- **data**: `data={columns,rows,source?,period?,note?,chart?}`. Colunas são
  `{label,type}`,1–16, rótulos únicos (case insensitive), até120 caracteres;
  tipos string/number/boolean/date/datetime/html. Linhas posicionais até10.000;
  strings até2.000 caracteres, number finito, null preservado. Metadados até800.
- **chart** opcional: exatamente `{series:[...]}`,1–6 séries distintas.
  Cada série é `{column,type,axis,unit,color?}`. `column` é índice inteiro1+
  apontando para coluna declarada number; coluna0 é a categoria. `type` é
  line ou column; `axis` left ou right; `unit` não vazia até24 caracteres;
  `color`, se presente, é #RRGGBB. Unidade deve ser idêntica no mesmo eixo.
  Séries selecionadas: label até32 e comprimento label+unit até42.
  Exige view=line/column,1–24 linhas, categoria até24 caracteres.
  Séries podem misturar tipos/eixos; escala inclui zero, null quebra a linha,
  zero tem marca explícita e categoria toda nula não desaparece. A legenda
  conserva coluna/unidade. Ausente chart: primeiro indicador, bar/column/line/
  area e fallback para tabela acima de100 linhas, como antes.
- **text**: `data={text}` plain text até12.000 caracteres; sem HTML/Markdown.
- **image**: `data={resourceId,alt}`. ID corresponde a
  `^[a-zA-Z][a-zA-Z0-9_-]{0,63}$`; alt não vazio até300. Nenhum URL/path
  pertence ao documento, nem base64 escolhido pelo conteúdo.
- **report**: `data={columns,sections}`; columns inteiro1,2 ou3;
  sections1–12 **documentos CES completos**, somente text/image/data.
  Sem relatórios aninhados, HTML, mapa ou heatmap dentro do relatório.
  Views de data nas seções: table/bar/column/line/area. Limite total1MiB,
  não1MiB por seção. Profundidade estrutural16, sem ciclos/getters/protótipos.

### API Web e scene compartilhado

`createDocumentRenderer({locale?,resolveResource?})` mantém update/dispose.
`resolveResource(id)` é callback **síncrono confiável do host**, não fetch.
Retorna `{mime:"image/png"|"image/jpeg",base64,width,height}` ou ausência.
O host deve validar bytes/dimensões reais antes de conceder o recurso; o scene
verifica forma, MIME, tamanho do base64 (8MB), dimensões positivas e16M pixels.
Não aceita URL/path no resultado. Recursos são injetados como data URI apenas;
dispose limpa hrefs. Para chat: opção `resolveDocumentResource` encaminha o
mesmo callback. Mudança de autorização requer dispose/update do host; o chat
continua usando resourceRevision para invalidar o snapshot existente.

`documentPages(input,{resolveResource?})` (export de `/document`) retorna
SVGs1200×1600, ou lança erro. `PAGE_WIDTH`, `PAGE_HEIGHT`, `MAX_PAGES` também
são exports. O browser mostra esses mesmos SVGs nos tipos novos, com tabelas
acessíveis adicionais no report. `richDocumentText` inclui texto/alt/seções.
`chartScene` interno é o mesmo motor de séries para DOM e páginas exportadas;
nenhum motor de gráfico Python paralelo. SVG usa escape XML, sem scripts,
fontes externas, CSS remoto ou recursos externos. Layout do report é fixo,
escalado com rolagem; não é um dashboard com reflow por breakpoint.

### Tool pública e manifesto

```sh
python -m ccr export-document --agent-root . --data temp/report.json --output outputs/report.pdf
python -m ccr export-document --agent-root . --data temp/report.json --resources temp/resources.json --output outputs/report.png
```

`--data` é path de JSON CES, não JSON inline. `--resources` é path opcional de
JSON `{amostra:"temp/amostra.png"}`. Todos os paths de entrada, mapeamento,
imagens e saída devem resolver dentro de temp/outputs da raiz explícita;
relativos à raiz, absolutos dentro dela também aceitos. Traversal e symlink
para fora são recusados. Não usar filesystem mutável por adversário durante
a operação (não é uma sandbox contra corrida de troca de links do SO).
Saída somente PNG/PDF nova; criação exclusiva, sem overwrite. Input JSON1MiB,
mapping64KiB, até12 recursos,6MB cada,18MB totais, PNG/JPEG por assinatura e
cabeçalho antes de decodificar,16M pixels por imagem/página. PNG1 página;
PDF até32 páginas. Arquivo até64MB. Node30s/128MiB de heap, stdin32MB,
stdout SVG64MB. Backend ausente/inválido falha, nunca instala dependência.
Processo filho recebe apenas bootstrap Windows, não NODE_OPTIONS/credenciais.

Saída stdout: `{ok:true,result:{artifacts:[{path,sha256,bytes,format,width,
height,pages,pageDimensions:[{width,height}]}],runtimeVersion}}`. Exatamente
um arquivo, path absoluto resolvido e SHA256 dos bytes produzidos; width/height
são pixels do PNG ou pontos PDF, pages e pageDimensions são exatos. Não há
sidecar implícito. Erros retornam exit1, `{ok:false,status,error}`; sem
substituição textual silenciosa. O manifesto não é prova de envio/publicação.

### Paginação e rejeições explícitas

Tabelas standalone paginam sem cortar linhas, repetindo título/cabeçalho e
metadados; células quebram por caracteres e preservam todo conteúdo. Célula
com altura>600 ou linha maior que página é erro. Reports paginam **linhas de
painéis inteiras**; painel maior que página é erro, não tabela parcial.
Texto standalone maior que página também falha (não rola conteúdo no PNG).
Chart export: até24 linhas, categorias até24 caracteres e colunas até32;
largura do painel mínimo500 (usar1–2 colunas para gráficos). Sem reduzir fonte
indefinidamente. Até32 páginas totais; PNG multipágina é recusado.
HTML/SPA, map/heatmap e células HTML não têm export nesta tool; documentos
antigos continuam renderizáveis Web. Para mapas, usar APIs canônicas de cache
prepare-map/lookup-place/render-map e fornecer PNG retornado como recurso
lógico explícito. Nunca fixar geração UUID em receita.

### Build e proveniência

`node tools/build-export-runtime.mjs` usa esbuild0.28.2 local, escreve
`python/ccr/runtime/export.mjs` fechado e provenance.json determinístico
(versão, hashes das fontes, builder e hash do bundle), sem timestamp/path
absoluto. `node tools/build-export-runtime.mjs --check` recompila em memória
e recusa divergência de fonte/build. Rodar antes de empacotar; o Python
confere versão e hash do runtime a cada export. Hash não é assinatura de
segurança: publicação/autorização do pacote continua do integrador.

Wheel inclui runtime/*.mjs, runtime/*.json, skills e prompts por package-data.
Runtime precisa de Node22+ (host atual24) e PyMuPDF1.24+ provisionados;
não precisa de node_modules, npm, navegador, CDN ou pip em execução.
Dependências de build existentes são suficientes. Build offline reproduzível:
`python -m pip wheel --no-deps --no-build-isolation --wheel-dir .agents/temp/wheels .`
(somente quando essa pasta estiver gravável). Em 02/11/2026, o integrador
construiu o wheel offline, extraiu em pasta privada sem node_modules e gerou
PNG/PDF reais pelo pacote extraído. Criação exclusiva recusou sobrescrita;
manifestos tiveram formato, dimensões, quantidade de páginas, bytes e hashes
conferidos. Os exemplos de seis painéis foram inspecionados visualmente.

Fixtures públicas exclusivamente sintéticas: mixed-series.json,
six-panel-report.json, image-report.json. Nenhuma imagem binária real no Git.
Testes geram retângulos PNG/JPEG em memória. Procedimentos e contagens em
[tests/README.md](../tests/README.md). CM describe inclui a operação e skill;
prompt de tool em python/ccr/prompts/document-export.md; formato opt-in em
ccr.report, sem alterar capacidades escolhidas por consumidores antigos.
