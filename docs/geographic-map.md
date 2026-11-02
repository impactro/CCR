# Bases auxiliares e mapas geográficos no CCR

## Intenção geográfica e entrega por canal

A skill e o prompt canônicos devem reconhecer perguntas como “onde estão meus
clientes?”, “cadê as máquinas?”, “mapa de instalações” e distribuição por
cidade/estado/país/GPS, mesmo sem a palavra mapa. Perguntas sobre arquivos ou
posição de elementos de tela não acionam essa interpretação por si só.

O agente usa as ferramentas autorizadas do host para obter os fatos, distingue
cliente/instalação/máquina, cruza GPS ou localidades com os CSV auxiliares,
deduplica por identificador e agrupa no nível adequado. Explica concentração,
quantidades, fonte e cobertura; preserva registros não resolvidos. O CCR não
executa consultas nem transforma nome de grupo em prova de cliente.

Mapa significa geográfico por padrão; calor exige pedido explícito. Calor por
localidade permanece geográfico, distinto da matriz numérica heatmap. A entrega
usa mapa interativo em superfícies CCR habilitadas e PNG no CAX/WhatsApp quando
o host disponibiliza geração e entrega de imagem. HTML pode ser intermediário
de captura; o CCR não oferece exportação automática PNG nem concede ferramentas.

Atualizar skill, JSON do prompt e contrato documental na mesma revisão. Fixar
essa revisão nos consumidores e validar o contexto efetivo: CAW já incorpora
o texto em turnos novos/retomados; Assistente CWH deve incorporá-lo diretamente,
além de disponibilizar protocolo e skill no workspace. Manter personalizações
do usuário e registrar a revisão realmente instalada.

## Procedimento de adoção

Pedido: mostrar cidades reais dentro de estados/regiões, inclusive quando o dado
contiver somente cidade/UF ou nome de estado. A grade de coordenadas anterior
não atende a esse caso. CCR apresenta; hosts conservam autorização e dados.

1. Fixar uma cópia pública e sanitizada das malhas UF do IBGE e das sedes
   municipais IBGE disponibilizadas pela Infra S.A. Registrar URLs, hashes,
   data de obtenção e limites de cobertura. Nenhum dado de cliente entra na base.
2. Resolver nomes localmente: cidade+UF, cidade única sem UF e estado por nome
   ou sigla. Normalizar acentos/caixa; homônimos, desconhecidos ou UF conflitante
   ficam sem ponto, com motivo e linha original preservada. Não fazer fuzzy match.
3. Desenhar malhas reais dos27 estados/DF e pontos das cidades. Estado isolado
   destaca o polígono; GPS válido explícito tem precedência e não é substituído
   por sede municipal. Quantidade é opcional e zero/nulo permanecem distintos.
4. Oferecer zoom, navegação, retorno ao enquadramento e detalhes acessíveis.
   Não consultar geocoder, CDN ou tiles no navegador, nem enviar dados ao IBGE.
   A referência de uma sede municipal não representa GPS de uma máquina.
5. Testar resolução/ambiguidade, projeção, polígonos, quantidade, zero/nulo,
   XSS, limites, interação/teclado e descarte; manter Markdown map e CES map
   com o mesmo comportamento. Atualizar prompt e exemplos da mesma revisão.
6. Publicar CCR fixo; recompilar CAW, CWH e CCI a partir desse SHA, com versões
   próprias e recibos íntegros. Instalar pelo CMonitor no runtime autorizado,
   preservando configuração/bancos/pareamento e uma recuperação anterior.
7. Inspecionar no navegador os três formatos: cidade+UF sem GPS, estado sem GPS
   e pontos explícitos. Usar dados sintéticos na galeria; consulta real somente
   no Assistente próprio autorizado. Nenhum envio WhatsApp é necessário.

## Fontes públicas

- Malhas: https://servicodados.ibge.gov.br/api/docs/malhas?versao=3
- Estados: https://servicodados.ibge.gov.br/api/v1/localidades/estados
- Sedes: https://geo.infrasa.gov.br/server/rest/services/Hosted/Sedes_Municipais/FeatureServer

## Ampliação aprovada — CSV consultável e recortes globais

Três fontes CSV públicas e versionadas em `data/geography/` são a fonte
consultável: `cities-br.csv` (código IBGE, cidade, UF, país, latitude/longitude
sede), `states-br.csv` (código IBGE, nome, UF, país, latitude/longitude de
referência geométrica) e `countries.csv` (códigos ISO, nome, continente e
latitude/longitude de referência). Referência geográfica não é GPS de cliente.

O build valida as três tabelas e gera dados compilados a partir delas, junto
com malhas UF/países públicas e identificadas. Não manter catálogo de nomes
independente no JavaScript. Os consumidores distribuem os CSV com o pacote,
expondo somente os próprios dados públicos pela capacidade autorizada do host;
a IA consulta o arquivo pertinente, sem carregar milhares de linhas no prompt.
Prompt do CCR indica nomes, campos, seleção por nível e desambiguação.

Adotar mapas de pontos por cidade/GPS e mapas de intensidade por estado/país,
com legenda numérica e zero/nulo distintos. Continente deriva do campo do CSV
de países, sem inventar uma quarta fonte concorrente. Recorte automático deve
abranger a região dos dados; manter opção de retorno ao mapa completo.
Não somar linhas repetidas silenciosamente: a IA/consulta fornece o agregado
no nível pedido. Homônimos, ausência de UF e lugar fora da base ficam explícitos.

Código e testes seguem a ordem: bases/contratos → resolução e render comum →
prompts e distribuição nos hosts → instalação/inspeção. Cada consumidor fixa
um SHA publicado e conserva configuração, dados e permissões. A consulta ao
CSV público é independente do banco do cliente; os fatos e totais continuam
vindo da fonte operacional autorizada. Inferência de cidade a partir de nome
de grupo é uma associação com evidência e incerteza, nunca prova de cliente.

## Limites

Cidades/estados brasileiros e países/continentes são as bases nominais
planejadas. Cidades estrangeiras ou localidades fora dessa base
continuam na tabela com cobertura explícita; não prometer catálogo mundial de cidades,
endereços, rotas, imagens de satélite, mapa de ruas ou coordenadas ao vivo.
Dados públicos versionados podem ficar desatualizados; atualização é um build,
não uma chamada durante o render. Pontos enviados pelo host continuam sujeitos
à autorização dele. Não extrair coordenadas de texto operacional arbitrário.

## Candidata26.11.1i

Três CSV implementados:5570 sedes,27 UFs/DF e242 países/territórios. Malhas
UF do IBGE e países Natural Earth50m. CSV e JSON compilado têm teste de
igualdade de nomes/coordenadas e hashes. Mapa aceita Cidade/UF, Estado, País,
Continente ou GPS numérico; intensidade por país/estado colore polígonos e
por cidade usa pontos coloridos, sem alegar contorno municipal ou densidade.
Referência geométrica UF e ponto cartográfico país não são GPS de cliente.
Contagem ainda vem da fonte operacional; mapas não conciliam cadastro.

País usa recorte principal no enquadramento automático; Mundo mostra a base
completa. Continente segue a classificação dos países da Natural Earth, sem
cortar um país transcontinental. Homônimos e nomes fora do catálogo ficam
explícitos. Fontes/obtenção e hashes em data/geography/sources.json.
