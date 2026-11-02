---
name: geographic-map
description: Localizar e mapear clientes, instalações ou máquinas, inclusive onde estão ou cadê, cruzando GPS/localidades com CSV auxiliares; agrupar, quantificar e explicar em mapa CCR ou PNG no CAX/WhatsApp.
---

# Mapas geográficos CCR

## Reconhecer A Intenção

“Onde estão meus clientes?”, “cadê as máquinas?”, “onde temos instalações?”,
“mapa de clientes/instalações/máquinas” e distribuição por cidade, estado, país
ou GPS pedem análise geográfica, mesmo sem a palavra mapa. Não responder com
caminhos de arquivos ou galeria nesses casos. Perguntas sobre arquivos ou
elementos de tela não são, por si só, geográficas. Respeite formato explícito.

Mapa significa geográfico por padrão. Calor somente por pedido explícito;
quantidades não autorizam substituir localidades por uma matriz colorida.
Calor por cidade/estado/país continua geográfico; `heatmap` é matriz numérica,
não densidade geográfica. Não alegue densidade kernel que o render não oferece.

## Obter, Cruzar E Quantificar

Identifique entidade, recorte, fonte e nível pedido: ponto/GPS, cidade, estado,
país ou continente. Use o contexto e pergunte apenas quando uma ambiguidade
mudar o conjunto ou a conclusão. Os fatos e quantidades vêm das ferramentas
autorizadas do host ou de dados fornecidos; a existência desta skill não
concede acesso ao banco, rede ou envio. As bases abaixo resolvem identidade e
referência geográfica; não provam cadastro de cliente.

Distinga clientes, instalações e máquinas; use identificadores e relações
documentadas. Conte entidades distintas e evite inflar totais em cruzamentos
um-para-muitos. Organize GPS/localidades, cruze chaves compatíveis com os CSV
e preserve os registros sem correspondência. Não invente relações ou endereços.

Consulte somente as linhas necessárias em `data/geography/` do pacote CCR
ou nas cópias públicas identificadas pelo host:

- `cities-br.csv`: `ibge_code,name,state,country,latitude,longitude,reference`.
- `states-br.csv`: `ibge_code,name,state,country,region,latitude,longitude,reference`.
- `countries.csv`: `natural_earth_code,iso2,iso3,name,name_en,continent,latitude,longitude,reference`.

Leia e filtre programaticamente as linhas pertinentes, sem carregar os arquivos
inteiros no prompt. Filtre por código/nome/UF,
normalizando apenas caixa e acentos. Cidade homônima sem UF permanece ambígua.
“São Paulo” é cidade quando o campo é `Cidade`, estado quando é `Estado`.
Um nome encontrado em grupo de WhatsApp é evidência para associação, não prova
da presença ou endereço de cliente. Informe critério e cobertura dessa associação.

Priorize GPS operacional válido quando fornecido; na ausência de GPS, use a
referência nominal resolvida. Validade numérica não prova posição atualizada
ou instalação ativa. Agrupe conforme a pergunta; se o nível não foi fixado,
escolha a escala que torna a dispersão e os volumes compreensíveis. Compare
total da fonte, total representado e registros sem localização. Quantidade
de linhas não equivale à quantidade de clientes, instalações ou máquinas.

## Apresentar E Entregar

Enquadre a região dos dados e explique onde estão/concentram-se as entidades,
critério de contagem, fonte e cobertura. Aponte localidades relevantes e
pendências. Use rótulos e quantidades úteis; explique pontos, tamanhos e cores.
Tabela ou ranking pode complementar o mapa; não substitui o mapa solicitado.

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

Nas superfícies CCR habilitadas, prefira o mapa interativo. Na entrega pelo
CAX/WhatsApp, gere PNG com ferramentas de artefato realmente disponíveis no
host; HTML autocontido pode ser intermediário de renderização e captura, ou
uma biblioteca geográfica pode exportar diretamente. Capture o mapa completo,
com nomes, legenda e fonte legíveis; não capture loading ou parte cortada.
O CCR não exporta PNG automaticamente nem instala um capturador. Sem ferramenta
autorizada, informe a limitação real em vez de anunciar imagem inexistente.
Revise o PNG e siga os contratos de arquivo, registro/proveniência e entrega
do host. No WhatsApp, imagem real usa `type=image`; nunca envie por fora do
contrato do canal nem faça mensagem de teste por causa desta skill.
