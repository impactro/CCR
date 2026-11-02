# Mapas geográficos do mundo ao bairro

O CCR distribui receitas e tools, não um atlas pronto no Git. Bases são
cache público permanente por consumidor, criado somente quando solicitado.
[Contrato aprovado](geographic-recipes.md),
[fontes e licença](../python/ccr/recipes/geography.json),
[skill canônico](../python/ccr/skills/geographic-map/SKILL.md).

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

`--refresh` valida substituta completa antes de trocar o ponteiro; a anterior
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
