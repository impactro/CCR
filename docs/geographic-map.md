# Mapas geográficos do mundo ao bairro

O CCR distribui receitas e tools, não um atlas pronto no Git. Bases são
cache público permanente por consumidor, criado somente quando solicitado.
[Contrato aprovado](geographic-recipes.md),
[fontes e licença](../python/ccr/recipes/geography.json),
[skill canônico](../python/ccr/skills/geographic-map/SKILL.md).

## Seleção interativa (candidata 26.11.3c)

Na distribuição de entidades, as linhas representam somente localidades com
entidades no recorte autorizado. Outras fronteiras podem aparecer como contexto;
a malha não fornece a lista de clientes. Zero entidades só entra quando a
pergunta pede ausência/cobertura de um universo definido. Conferir outras UFs
antes de escolher o foco, preservar IDs e explicar os não localizados.

O JavaScript aceita `mapOptions` nos renderizadores de documento e chat, ou as
mesmas opções diretamente em `createGeoMap`. A tabela pode ser `visible`
(padrão) ou `collapsed`. Callbacks são código confiável do host, nunca JSON.

```js
const renderer = createDocumentRenderer({mapOptions: {
  table: 'collapsed',
  rowKey: (row, index) => index,
  onSelect: selection => {
    if (selection.type === 'area') showAuthorizedList(selection.code);
  }
}});
```

`onSelect` recebe snapshot congelado com `type` (`area`/`point`), `kind`,
`code`, `uf`, `label`, `coordinates` e `rows:[{index,key}]`. Índices são das
linhas originais; `rowKey` opcional devolve string ou número finito. Área sem
linha recebe `rows:[]`, preservando o código. Os tipos distinguem
`municipality`, `state`, `country`, `neighborhood`, `coordinate` e
`municipal-reference`. GPS fornecido e referência municipal são identificados
separadamente; nenhum comprova endereço por inferência do renderizador.
Clique e Enter/Espaço compartilham o contrato. Dispose remove os listeners.
O evento não contém sessão, ticket, endpoint nem permissão. O host valida o
código e consulta sua fonte autorizada. SVG exportado não carrega esse backend.

Colunas `Código município`, `IBGE município`, `municipality code` e `IBGE`
resolvem pelo código exato de sete dígitos. UF conflitante/código fora da base
permanece não localizado. Nomes não corrigem código fornecido silenciosamente.
GPS explícito continua tendo precedência na apresentação de pontos. O
enquadramento municipal usa os polígonos presentes nos dados.

## Intenção e ferramentas

“Onde estão meus clientes?”, “Cadê as máquinas?”, “Mapa de instalações”, lojas,
distribuição por cidade/UF/país/bairro ou GPS pedem mapa geográfico. Escolher o
menor recorte útil e preservar nível, unidade de contagem e cobertura. Grupo
nomeado por cidade sugere localidade, sem provar cliente. Calor só quando pedido.

`crania-ccr` contém as mesmas receitas usadas pelo host web. O entry point
`crania_agent.components:ccr` distribui skill e operações pelo contrato CM v3.
O host seleciona operações/autorização; instalar biblioteca não libera banco,
rede privada, outro workspace ou envio. Consumidores Python usam
`ccr.GeographyCache` diretamente, sem copiar motor para CA/CWH/CCI.

Na manutenção, instalar `python -m pip install ".[png]"` a partir do checkout
CCR validado, ou o wheel correspondente e seu extra PNG. O pacote registra
`ccr.cm:describe` no grupo `crania_agent.components`. Selecionar o componente
`ccr` no manifesto CM do consumidor para descobrir operações e skill; não
copiar scripts para cada agente. Hosts web configuram também o callback abaixo.
Fixar a revisão oficial da biblioteca JavaScript e conferir a proveniência dos
assets; instalar somente Python não atualiza um bundle web já compilado.

```sh
python -s -m ccr prepare-map --agent-root . --key brazil
python -s -m ccr prepare-map --agent-root . --key state-SP --png
python -s -m ccr prepare-map --agent-root . --key municipality-3547809 --png
python -s -m ccr prepare-map --agent-root . --key neighborhoods-3547809 --png
python -s -m ccr prepare-map --agent-root . --key neighborhood-3547809-centro --png
python -s -m ccr prepare-map --agent-root . --key world
python -s -m ccr prepare-map --agent-root . --key continent-europa
python -s -m ccr prepare-map --agent-root . --key country-FRA
python -s -m ccr lookup-place --agent-root . --kind city --state SP --name "Santo André"
python -s -m ccr render-map --agent-root . --key state-SP --data temp/valores.json --output outputs/AAAA-MM/mapa.png
```

`render-map` recebe `title`, `values:[{code,value}]` agregados por código de
região e/ou `points:[{latitude,longitude,label}]`. Exige códigos pertencentes
ao recorte, quantidades não negativas sem duplicatas e saída PNG/SVG nova em
temp/outputs. A base pública não recebe valores privados. Fonte, período/critério
e cobertura pertencem à resposta. PNG usa o extra `png`/PyMuPDF já instalado,
sem instalar dependência durante o uso. No checkout, o mesmo comando está em
`python tools/manage-geography.py ...`.

## Fronteiras e fontes

Mundo/continentes desenham países; Brasil desenha UFs; UF desenha municípios;
município desenha seu limite; bairros desenham polígonos oficiais municipais.
Ponto de sede não substitui fronteira. GPS operacional sobreposto exige evidência
própria. Malha simplificada é cartográfica, não levantamento cadastral/engenharia;
Mercator é limitado a85°. Natural Earth fornece países/territórios e seus
agrupamentos, sem dividir artificialmente países transcontinentais.

IBGE fornece malhas/identidade. A revisão Natural Earth50m é fixada por SHA.
Sua fonte é global: o primeiro download recebe esse arquivo, mas somente o
subconjunto solicitado é persistido no cache de um recorte continental/país.
Santo André/SP IBGE3547809 demonstra bairros por SIGA oficial: camada
`siga:L_3D82645A`,112 polígonos, campos `NOME`/`CODIGO_BAIRRO`, GeoJSON EPSG4326.
URLs, páginas oficiais, crédito e termos ficam no registro de receitas.
Outro município sem provedor retorna indisponibilidade; não substituir bairro
por distrito, setor censitário ou rótulo OSM.

## Cache, atualização e falhas

`data/ccr/geography/<chave>/<geração>` guarda JSON público, SVG e manifesto com
origem, data, crédito/licença e hashes. Um ponteiro atômico escolhe a geração
válida; PNG é derivado opcional. Parâmetros são restritos, sem URL livre do
modelo. Requests concorrentes da mesma chave compartilham a criação. Índice
de nomes é cache em memória, devolvendo só correspondências ao modelo.

Mudança de versão apenas do desenho reutiliza vetores/tabelas válidos sem
rede e publica a nova imagem atomicamente. `--refresh` valida substituta completa antes de trocar o ponteiro; a anterior
fica preservada. Não expira/apaga automaticamente e não entra na limpeza de temp.
Lock remanescente por queda de processo exige inspeção operacional. Falha de
rede/fonte/estrutura é explícita, sem inventar geometria ou retry infinito.

## Render web e verificação

`configureGeography({load: async key => publicData})` injeta callback autorizado
do host. O render não escolhe URL pública nem baixa dataset externo. Durante
primeira carga/erro conserva tabela acessível e respeita dispose. O endpoint
autenticado do host executa a mesma receita fora do event loop. Prompt canônico
entra também no resume, anunciando apenas tools/capacidades reais.

Testes sintéticos usam rede bloqueada, sem datasets reais no Git: fronteiras,
cache frio/quente, concorrência, falha/refresh atômico, hashes, recortes separados,
CLI/CM, sobreposição, carga/erro/dispose web e prompt. Smoke real e inspeção de
PNG ficam no inventário privado do host; conferência própria não é aceite
independente do operador.

### Validação instalada em02/11/2026

CCR26.11.2e e Python26.11.2.post5 adotados em CAW, CWH e CCI. Os quatro
perfis de validação foram executados novamente na revisão e:738 testes e53
subtestes aprovados. CCR teve105 testes Node e10 Python, incluindo pixels PNG
no backend real e projeção de polígonos menores que um grau. Não representa
cobertura global de todos os módulos de todos os produtos.

Navegador na revisão e: CAW com dois mapas/269 polígonos, Assistente CWH com
oito mapas/9.336 polígonos e fixture transitória CCI com112 bairros oficiais,
zero preservado e nenhum rótulo undefined/erro. Os bairros ocupam619×492 no
canvas800×540; o piso antigo de um grau que reduzia recortes locais foi removido.
Fixture removida sem persistir mensagem. Runner instalado gerou PNG sintético
em1,704s; cache quente SP foi consultado em29,205ms. São amostras locais, sem
modelo nem envio WhatsApp. Oito bases PNG/SVG e suas origens foram preparadas
fora do Git para inspeção.
