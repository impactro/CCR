# Testes do CCR

Todos os testes JavaScript do módulo ficam em unit/. São unidades de
apresentação com Node/JSDOM; helpers/ contém apenas fixtures e conclusões
assíncronas controladas. Não iniciam navegador, serviço, modelo ou transporte.
A integração visual real pertence ao consumidor CAW/CWH/CCI.

## Executar

Na raiz do CCR, com dependências do lock instaladas e Node24:

```sh
npm test
npm run test:coverage
python -m unittest discover -s tests -p test_geography_recipes.py
```

O primeiro comando descobre toda a suíte unitária. O segundo mede exatamente
contextual-views, progressive-history e conversation, gerando LCOV em
.agents/temp/tests/unit.lcov. Gate:99% linhas,90% ramos e95% funções. Sem
dependência de uma ferramenta externa de cobertura ou acesso de rede no teste.

## Revisão de01/11/2026

A revisão cartográfica de02/11 acrescenta testes Python sintéticos de cache,
polígonos, obtenção concorrente, refresh com falha, integridade, índice e CLI/CM.
Os casos web injetam retângulos sintéticos e verificam carga/erro/descarte e
fronteiras municipais em vez de pontos. Não exigem datasets ou rede no Git.
O smoke real de IBGE/SIGA/Natural Earth e as imagens ficam fora do repositório.

| Medida V8, nos três componentes | Antes | Depois |
| --- | ---: | ---: |
| Linhas |98,79%|100%|
| Ramos |82,07%|92,82%|
| Funções |91,43%|97,18%|
| Casos focais |22|45|
| Suíte unitária completa |67|90|

Baseline:878ad74, antes da reorganização e ampliação. Medições do mesmo
conjunto de fontes, com Node24.21.0; não representam cobertura de todo o CCR.
Arquivos movidos preservam os casos anteriores; imports e discovery foram
atualizados, sem cópia antiga dos testes na raiz.

Novos cenários verificam cancelamento antes do dispatch, troca de contexto
dentro de callback, descarte sem reentrada, erro/retry por região, retorno
inválido do adaptador, rollback de uma página, nó duplicado, métricas ausentes
ou zero e cancelamento dos listeners. Seis falhas de ciclo de vida foram
reproduzidas antes da correção: callbacks durante dispose, consulta depois de
suspensão, limpeza de handle inválido na timeline e nas regiões, navegação
repetida após redirecionamento e descarte repetido por reentrada na suspensão.

JSDOM não comprova geometria, CSP do navegador, reprodução de mídia ou contas
autorizadas. Não ampliar permissões para fazer um teste passar nem substituir
uma dependência oficial por checkout irmão nos builds dos consumidores.


##26.11.2g — documentos, séries e export real

```sh
node tools/build-export-runtime.mjs --check
npm test
python -s -m unittest discover -s tests -p test_document_export.py -v
```

Na integração final: suíte Node completa116/116; Python de export11/11 e
receitas geográficas10/10, sem skip. A suíte cartográfica usa download simulado
e temporários sob a pasta privada de testes, sem consultar serviço externo.

Novos testes Node (10) cobrem schema fechado, séries múltiplas column/line e
combinadas, unidades/eixos/legenda, zero/null com quebra, validação de coluna/
tipo/style, texto/imagem/report, rejeição de URL/path/aninhamento, seis painéis,
igualdade exata do SVG no DOM e runtime, dispose, paginação/rejeição, teto10.000
e proveniência de build recompilada em memória.

Python11 casos: PNG e PDF verdadeiros por Node/PyMuPDF; dimensões/hash/bytes/
páginas do manifesto; texto dos seis painéis; tabela com200 linhas sem perda
em PDF multipágina e rejeição PNG; imagens PNG/JPEG sintéticas realmente
rasterizadas, loader de recursos, cabeçalhos/bytes/pixels, escopo/overwrite,
backend ausente/timeout/limites,32 páginas, hash/versão stale do runtime,
CLI/CM e package-data. Runtime sem imports ou node_modules no bundle.

Os testes unitários de export virtualizam IO de entrada/saída; Node, SVG,
conversão PDF, rasterização, PNG/JPEG e hash são reais. Complementando esses
testes, o integrador construiu o wheel offline e o extraiu sem node_modules:
PNG1200×1600 e PDF foram escritos em pasta privada, com manifesto e rejeição
de sobrescrita conferidos. A importação veio do wheel extraído, não da árvore
de fontes. Inspeção visual do exemplo com seis painéis aprovada pelo integrador;
não substitui teste dos consumidores nem QA editorial independente.
Procedimento em docs/document-export.md. A atualização dos consumidores é uma
etapa separada e não é comprovada pelo build/teste do módulo.

O desenho usa Courier e quebra por caracteres/code points, não layout editorial
por palavras ou fonte remota; a cobertura de glifos depende do backend. Reports
são páginas fixas com rolagem/escalonamento, não reflow responsivo. HTML/mapas/
heatmaps/células HTML são rejeitados na export tool, mas preservados no Web.
