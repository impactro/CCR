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
