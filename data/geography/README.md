# Bases geográficas auxiliares

Fontes canônicas públicas, UTF-8 e cabeçalho. Não contêm dados de clientes.

| Arquivo | Identidade e coordenadas |
| --- | --- |
| `cities-br.csv` |5570 sedes: `ibge_code,name,state,country,latitude,longitude,reference`. |
| `states-br.csv` |27 UFs/DF: `ibge_code,name,state,country,region,latitude,longitude,reference`. |
| `countries.csv` |242 países/territórios cartográficos: `natural_earth_code,iso2,iso3,name,name_en,continent,latitude,longitude,reference`. |

`sources.json` registra URLs/hashes e hashes dos três CSV. Cidades vêm da base
IBGE de sedes disponibilizada pela Infra S.A.; uma sede não é GPS de cliente.
UF usa referência geométrica derivada da malha IBGE, não coordenada da capital.
País usa o ponto de rótulo da Natural Earth50m, obtido do commit fixado na fonte.
Campos ISO não disponíveis ficam vazios, sem inventar código para preencher.
Continente é a classificação cartográfica do país/território; não é cadastro
mundial de cidades nem divisão de um país transcontinental em partes.

Consulte somente as linhas relevantes por nome/código/UF. Não carregar os CSV
inteiros no contexto do modelo. Uma associação sugerida por nome de grupo
precisa preservar a evidência; não prova cadastro ou localização de cliente.
“São Paulo” exige o nível cidade/estado no campo; homônimos de cidade sem UF
permanecem ambíguos. Não há aproximação por similaridade de nome.

O build `python tools/build-geography.py` atualiza fontes públicas, valida CSV
e compila `src/geography-brazil.json` e `src/geography-world.json`. Os JSON são
distribuição para o navegador, não uma segunda fonte para edição manual.
Malhas reais são necessárias além dos CSV para preencher estados/países.
Não há download de base, geocoder ou envio de dados durante a renderização.

Limites, atualização e adoção: [procedimento](../../docs/geographic-map.md).

## Autocriação e origem do acervo

O acervo é público e pertence ao CCR. Cliente, máquina, quantidade e histórico
operacional nunca entram nestes arquivos. As origens ficam em `sources.json`,
com URL completa, SHA256, obtenção, licença e transformação geométrica.

- UFs e metadados: [IBGE Malhas](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3)
  e [IBGE Localidades](https://servicodados.ibge.gov.br/api/v1/localidades/estados).
- Sedes municipais IBGE disponibilizadas pela
  [Infra S.A.](https://geo.infrasa.gov.br/server/rest/services/Hosted/Sedes_Municipais/FeatureServer).
- Países/territórios: Natural Earth50m, revisão fixa declarada no script e no
  manifesto; [domínio público](https://www.naturalearthdata.com/about/terms-of-use/).

Comandos a partir da raiz do CCR, com Python padrão:

```sh
# Mostra as origens e o processo, sem rede nem escrita.
python tools/manage-geography.py plan
# Baixa fontes e gera CSV, JSON/index e desenhos em uma candidata nova/isolada.
python tools/manage-geography.py refresh --output .agents/temp/geography-candidate
# Recria índice e desenhos usando exclusivamente as bases locais do checkout.
python tools/manage-geography.py rebuild
# Confere CSV/JSON, cobertura, origem e hashes dos desenhos.
python -m unittest discover -s tests -p "test_geography*.py"
```

`refresh` exige destino novo/vazio, diferente do checkout; não instala pacotes,
não troca runtime nem limpa acervo anterior. Uma falha de download deixa apenas
a candidata incompleta, preservando a fonte atual. Para adotar uma atualização,
revisar a candidata, integrar os arquivos públicos no CCR e seguir o build
normal dos consumidores com SHA fixo. `build-geography.py --root <destino>` é
o downloader/compilador; `build-geography-atlas.py` gera índice/atlas offline.

## Imagens e consulta prontas

- `geography-index.json`: registros e índices de nomes, UF e IBGE; carregar uma
  vez por processo e retornar só as correspondências da consulta.
- `atlas/index.json`: catálogo de279 imagens SVG, com hashes e transformação
  Mercator/enquadramento. SVG é imagem vetorial pronta e continua escalável.
- `atlas/br-states.svg`: Brasil com27 UFs/DF.
- `atlas/br-<UF>-cities.svg`: cada UF com todos os pontos das sedes municipais;
  cobertura total5.570, incluindo645 em SP. O nome/IBGE está no título do ponto.
- `atlas/world-countries.svg`, `atlas/country-<código Natural Earth>.svg` e
  `atlas/continent-<nome normalizado>.svg`: mundo,242 países/territórios e os
  oito agrupamentos da classificação da fonte, incluindo Ilhas oceânicas.

Ainda não há polígonos de municípios/bairros. Os pontos são sedes, não GPS de
cliente. País individual enquadra a parte principal, com nota explícita;
geometrias completas permanecem nas bases originais. Não inventar fronteiras
nem interpretar recortes como posicionamento de máquinas.

No host CA compatível, `ca.geography.lookup` consulta o índice em memória e
`ca.geography.base_png` rasteriza uma base verificada, sem navegador/rede.
PNG usa PyMuPDF do perfil de artefatos. Dados/quantidades operacionais são
sobrepostos pelo chamador; uma base vazia não é um mapa de clientes concluído.
Não precisa banco ou API HTTP adicional para esse acesso dentro do processo.
