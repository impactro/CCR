---
name: geographic-map
description: Enriquecer mapas CCR por cidade brasileira, estado, país ou continente com bases geográficas públicas auxiliares ao banco do cliente.
---

# Mapas geográficos CCR

Identifique o nível pedido: ponto/GPS, cidade, estado, país ou continente.
Os fatos e quantidades vêm da consulta autorizada do cliente. As bases abaixo
resolvem identidade e referência geográfica; não provam cadastro de cliente.

Consulte somente as linhas necessárias em `data/geography/` do pacote CCR
ou nas cópias públicas identificadas pelo host:

- `cities-br.csv`: `ibge_code,name,state,country,latitude,longitude,reference`.
- `states-br.csv`: `ibge_code,name,state,country,region,latitude,longitude,reference`.
- `countries.csv`: `natural_earth_code,iso2,iso3,name,name_en,continent,latitude,longitude,reference`.

Não carregar os arquivos inteiros no prompt. Filtre por código/nome/UF,
normalizando apenas caixa e acentos. Cidade homônima sem UF permanece ambígua.
“São Paulo” é cidade quando o campo é `Cidade`, estado quando é `Estado`.
Um nome encontrado em grupo de WhatsApp é evidência para associação, não prova
da presença ou endereço de cliente. Informe critério e cobertura dessa associação.

Para mapa nativo, produza um bloco `map` ou CES `view=map` com colunas tipadas:

- `Cidade`, `UF`, `Clientes` para pontos de sedes municipais, sem GPS obrigatório.
- `Estado`, `Clientes` para intensidade nos polígonos das UFs brasileiras.
- `País`, `Clientes` ou `Continente`, `Clientes` para polígonos de países.
- `Nome`, `Latitude`, `Longitude`, `Clientes` para coordenadas reais autorizadas.

Uma referência de sede/centro/rótulo não é GPS exato de máquina. GPS numérico
explícito tem precedência; não retire números de observações como “desativado”.
Preserve zero/nulo. Agregue na consulta no nível pedido antes de gerar o mapa;
o renderer não soma localidades repetidas. Linhas desconhecidas continuam na
tabela com motivo. Não substituir cidade por estado para contornar ausência.

O mapa usa contornos reais, cor por valor não negativo e zoom/enquadramento.
Por cidade há pontos coloridos; por estado/país há preenchimento da área.
Isso não é mapa de ruas, densidade kernel, contorno de bairros ou catálogo
mundial de cidades. Países/territórios e continentes seguem a classificação
da base Natural Earth; fonte, cobertura e data estão em `sources.json`.
