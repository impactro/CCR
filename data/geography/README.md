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
