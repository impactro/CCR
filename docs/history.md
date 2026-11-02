# Histórico

## 26.11.1l — proporção do mapa responsivo

Canvas mantém a proporção40/27 limitando largura conforme altura disponível;
fundo cartográfico cobre o viewport. Evita faixas transparentes e geometrias
fora da área útil quando o host limita altura. Sem alteração de dados/CSV.

## 26.11.1k — prioridade das colunas geográficas

Cidade/UF, Estado, País e Continente explícitos têm precedência sobre outras
colunas textuais como nome de cliente. Descrição não vira localidade.

## 26.11.1j — contornos mundiais limitados no build

Simplificação determinística RDP0,03 grau nas malhas Natural Earth, com
parâmetro registrado. Mantém242 entidades, anéis e coordenadas CSV; reduz
carga de costa desnecessária a mapas agregados. Sem download em render.

## 26.11.1i — mapa geográfico por nomes ou GPS

Três CSV auxiliares:5570 sedes brasileiras,27 UFs/DF e242 países/territórios.
Mapa com malhas IBGE e Natural Earth, países/continentes e recorte regional,
resolução local por cidade/UF e nome/código de estado ou país. Intensidade
por estado/país preenche polígonos; cidade usa ponto colorido.
GPS numérico explícito tem precedência. Zoom, navegação, detalhes e tabela
acessíveis; marcadores por quantidade, zero/nulo e cobertura preservados.
Homônimos sem UF e localidades ausentes ficam na tabela. Sem geocoder/CDN,
mapa de ruas, consulta operacional ou envio de dados a terceiros.
Procedimento e limites em geographic-map.md; adoção exige build dos hosts.

## 26.11.1h — metadados do documento CES sem ambiguidade

Prompt e exemplo colocam source/period/note dentro de data, como exige o
decoder. O exemplo completo passa pelo render real; campos no cabeçalho
continuam recusados, sem relaxar o contrato.

## 26.11.1g — orientação de formatos e mapas por cidade

Prompt canônico escolhe o visual pela pergunta, preserva cidade/UF e quantidade,
exige coordenadas com origem e informa linhas não mapeadas. Explicita que
marcadores nativos têm tamanho fixo e que referência urbana não localiza máquinas.
Exemplo sintético com zero e coordenada ausente passa pelo render real.

## 26.11.1f — viewport explícito da timeline

O host pode fornecer o ancestral que faz a rolagem. A âncora usa posição visual,
mesmo quando envelopes têm offset parents distintos; mount é o padrão.
Nenhuma consulta ou autoridade adicionada ao renderer.

## 26.11.1e — ações contextuais acessíveis por teclado

Mensagens com ações fornecidas pelo host oferecem foco no envelope contextual,
revelando os controles via focus-within no desktop. Mensagens sem ações não
ganham parada de Tab; markup legado continua inalterado. Regressão em DOM real.

## 26.11.1d — envelope legado sem alteração quando a opção está desligada

Preservado o espaçamento exato das classes do envelope sem ações contextuais.
A suíte de compatibilidade do CWH detectou a diferença contra a fixture anterior
à extração; a opção desligada conserva o HTML instalado. Sem alteração do modo
contextual ou de capacidades.


## 26.11.1c — fronteira nativa após nova captura

A reconciliação aceita page opcional validada para atualizar a fronteira de
anteriores sem remontar a conversa. Permite que o host descubra histórico novo
após o fim observado anteriormente. Testes recusam fronteira inválida e provam
retomada da paginação com identidade do nó preservada. Sem consulta ou efeito
no núcleo; o host continua responsável pelo cursor e pela autorização.

## 26.11.1b — reconciliação ordenada para eventos nativos

reconcileMessages recebe o conjunto autorizado já carregado pelo host e
preserva nós ao inserir eventos fora de ordem, atualizar ou retirar projeções.
Metadados recalculados uma vez, retry anterior preservado, contexto e descarte
revalidados. Novos testes cobrem mídia/listeners, ordem/âncora, escopo, carga,
callback ausente, erro, handle compartilhado e reentrada. Cobertura focal:
100% linhas/93,30% ramos/97,37% funções. Adoção por consumidor segue separada.

## 01/11/2026 — revisão unitária e ciclos de vida

Suíte Node/JSDOM organizada em tests/unit, com helpers separados e comando
de cobertura V8/LCOV com gate. Três componentes passaram de98,79% linhas e
82,07% ramos para100% linhas/92,82% ramos. Casos antes falhos reproduziram e
corrigiram callbacks em dispose, dispatch após suspensão, descarte de handle
inválido, reentrada de seleção e descarte repetido. Suíte passa de67 para90 casos.
Procedimento, baseline e limites em tests/README.md. Não comprova instalação
ou integração da candidata nos consumidores, que continuam com SHA próprio.

## 26.11.1a — timeline progressiva e envelope contextual

Contrato público registrado antes do código em eaaab39. Novo entry point
progressive-history recebe fonte paginada e callbacks do host: loading antes
da consulta, erro/retry, cursores opacos, deduplicação, cancelamento por
contexto e prepend conservando os corpos e a âncora existentes. Não consulta
banco, autentica, envia, confirma leitura nem executa ferramentas.

Envelope contextual opt-in com ações externas ao balão e metadados factuais
em tooltip; teclado, Escape e acionador explícito em dispositivos sem hover.
Apagar é somente um tipo opcional de descritor autorizado pelo host. Nenhuma
mensagem real foi apagada. A autorização local de 01/11 exclui CMAIL/CVideo;
a sequência global de e-mail da revisão 2 permanece como demanda separada.
As integrações dos consumidores têm evidência e promoção próprias.

Preparação adicional: createContextualViewHost gerencia loading/cancelamento,
retry e descarte separados para lateral e conteúdo. Testes sintéticos incluem
troca de conta/pasta e callback antigo. Contrato em CONTEXTUAL-VIEWS-CONTRACT.md;
nenhum conector, conta ou integração CMAIL foi habilitado por essa composição.

## 01/11/2026 — capacidades por mensagem e exclusão CWH

Pedido consolidado complementado com apagar mensagem no CWH, apresentado
somente quando a conversa/mensagem suportar a ação. Mantida a fronteira entre
descritor/callback CCR e autorização/execução do host. Aceite inclui alcance,
permissão revogada e resultado incerto; nenhuma mensagem real foi apagada.

## 01/11/2026 — pedido integrado de renderização, revisão 2

Timeline progressiva, composição do hospedeiro, ações flutuantes desktop e
metadados em tooltip conciliados numa iniciativa com entregas por dono.
Inclui modo conteúdo isolado, serviços JSON autenticados e inspeção após
implementação em outra máquina. Loading CAW e migração CMAIL são antecedentes
concluídos. DEV CCI confirmou limites da paginação atual, registrados no contrato.
Nenhum código, pacote, dado ou serviço foi alterado nesta conciliação.

## 01/11/2026 — registro da demanda de histórico progressivo comum

Fábio pediu CCR mais padronizado, com funções comuns de timeline e páginas
entregues sob demanda por cada backend. Registrados contrato proposto, divisão
de responsabilidades, limites e aceite em progressive-history.md; CCR#1 é a
demanda principal, com integrações próprias CAW/CWH/CCI. Avisos versionados
seguem o padrão CES; a fila local guarda somente referências. Execução fica
fora do chat solicitante, que inspecionará a candidata depois. Esta publicação
é documental: não adiciona export, muda versão funcional, instala ou reinicia.

## 26.10.31b — catálogo completo de plugins ALP

A inspeção do registro real productPlugins encontrou12 formatos existentes.
O teto inicial de8 descritores foi substituído por32, sem remover capacidades
do ALP. Limites de composição agora constam no JSON canônico compositionLimits;
mantidos32KiB por descritor e65536 caracteres no texto final. Novo teste cobre
catálogo maior que8, teto32 e estouro agregado. Nenhuma mudança nos drivers
anteriores de render ou no contrato CES1. Esta é a revisão para a integração ALP.

## 26.10.31a — prompt canônico e capacidades do host

O CCR publica config/prompts/render.prompt.json e MD de mesmo nome-base. O JSON
é fonte única dos formatos, limites, exemplos e instrução; MD explica sua gestão.
Novo entry point puro /prompt compõe só as capacidades declaradas e plugins
confiáveis versionados do host, com schema/exemplos, conflitos explícitos e
tetos reduzíveis. Exports /prompt.json e /prompt.md fecham o pacote para outros
consumidores. O entry point principal e o código anterior de render não mudam.

Fábio confirmou a adoção no ALP com uso real no contexto do motor e restringiu
a coordenação desta rodada a CCR+ALP. O responsável pelo ALP integra/publica
o produto; não houve edição de ALP/CWH nem sincronização de outros serviços
no trabalho do CCR. Exemplos do prompt, versões, descritores, isolamento de
capacidades e compatibilidade são verificados por testes sintéticos sem IA paga.

## 31/10/2026 — pasta física CCR e fonte Git dos compilados

Por orientação posterior de Fábio, o clone local CM/CChatRender foi renomeado
para CM/CCR, igual a impactro/CCR, preservando histórico, árvore limpa e arquivos
locais. README, AGENTS e guia Git documentam clonagem real e revisão fixada.
Os próximos commits dos consumidores devem apontar a essa origem e registrar
o build dos compilados vendor; não criar implementação ou origem virtual.
Pacote/imports @crania/chat-render e código funcional permanecem iguais.

## 31/10/2026 — origem pública oficial impactro/CCR

Histórico existente publicado em https://github.com/impactro/CCR, branch main,
incluindo o antigo HEAD local0d0abca. O repositório é público; o pacote técnico
continua @crania/chat-render e private no registry npm. Nome, imports, código
de render e versão funcional26.10.30-b permanecem. Metadados repository,
homepage e bugs agora apontam à origem oficial. Procedência, SHAs das versões
consumidas e regras de migração em [GIT-ORIGIN.md](GIT-ORIGIN.md).

Fábio pediu que os consumidores usem a versão Git real, fixada por SHA completo.
AIstein ALP recebeu a fatia ALP; DEV CWH recebeu a fatia CWH; AIstein CCI recebeu
a fatia CCI. Cada dono altera manifesto/lock/build/docs e devolve evidência.
Não atualizar tarballs históricos, relaxar CSP ou confundir origem publicada
com atualização instalada. Nenhum serviço ou cliente foi alterado nesta publicação.

## 25/10/2026 — planejamento da evolução paralela dos renders

Fábio definiu preservar CAW atual e ALP atual, preparar um terceiro render
substituível no CChatRender e convergir três consumidores: ALP, chat mínimo
CWH e CAW do CrânIA Agent. O plano shared-render-plan.md registra fronteiras,
pastas propostas, etapas, responsáveis, decisões e retorno por instância.
compatibility-matrix.md contém 24 capacidades para correspondência funcional,
com critérios futuros sem declarar paridade já testada.

O CWH recebe a demanda de um usuário e uma conversa, ligada a LAB-CHAT-001 e
à migração ativa. Um CAW próprio no laboratório vem depois para validar temas,
customizações, múltiplos usuários e conversas. A consolidação dos contratos
finais ocorre após os três consumidores funcionarem na candidata. Autorização,
histórico, execução e protocolos de entrega permanecem nos hosts.

Documentação e referências de tarefas nesta rodada; nenhum pacote, pasta de
implementação, versão instalada, serviço ou cliente foi alterado. As mudanças
visuais locais não publicadas permanecem separadas da release 26.10.25-a.

## 26.10.25a — extração inicial do render do Pergunte Aí

Markdown, dados/gráficos SVG locais, HTML/SPA opacos, imagem, áudio/voz gravada,
vídeo, PDF sob demanda, YouTube após clique e arquivos. Plugins e ciclo de vida
por resposta, cancelamento idempotente e limites explícitos. Contratos eleitorais,
marca, exportação e identidade permanecem no consumidor. Origem: conceito de
content-viewer/showdata do CrânIA Agent; implementação independente.

Validação DEV com testes determinísticos e navegador real: tabela, gráfico,
slider/contador dentro da resposta, descarte de recurso e PDF em canvas.
Sem chamada de IA pelo módulo. Prévia somente loopback, dados sintéticos.
PDF.js foi adicionado após comprovar quadro vazio no plugin nativo do navegador.
DOMPurify3.4.16 substituído por3.4.17 após auditoria de dependências; não foi
demonstrada exploração na configuração do consumidor.

Não oferece geração, gravação ou transcrição de mídia. Scripts HTML opcionais
rodam isolados; sandbox de navegador não é garantia de cota rígida de CPU.
Mídia externa exige política explícita do host. PDFs usam prévia visual por página,
sem substituir o arquivo original nem certificar todos os codecs/fontes/documentos.

## 26.10.29b — envelope comum com prioridade CWH

Entrada conversation sem dependências pesadas: autor/cor, sequências, data/hora,
slots do host, contagens agregadas e citação do autor correto. CWH é primeiro
integrador nesta rodada, mantendo HTML/CSS e reconciliação atuais. ALP se adapta
posteriormente; Crania Agent/CAW ficam fora das alterações. Testes sintéticos de
autoria/escopo, escape e avatar configurável; integração usa fixtures anteriores
do produto. Não extrai transporte, banco, parser WhatsApp ou despacho de ações.

## 29/10/2026 — nome CCR e mapa de documentos ricos

Nome curto aprovado: CCR, Crânio Chat Render, preservando nome técnico/pacote.
ALP autorizado a adotar envelope comum já entregue no CWH. Documentado formato
proposto de arquivo CES JSON/HTML, versões e fronteira com SEND_JSON/V4, incluindo
lacunas de tipos CAW/CCR e fallback de arquivo. Não há decoder publicado nem
reempacotamento do26.10.29-b por estas mudanças de documentação.

## 26.10.29c — documentos CES e cópia local

Contrato ccr.document v1: decoder comum, tabelas tipadas preservando null/false/
zero/datas, quatro gráficos locais e HTML passivo marcado. Campos/versões/
limites validados; anexo comum/incompatível não vira conteúdo executável. Entrada
document independente e message.documents no renderer rico, com lifecycle e
orçamento visual. CSS escopado, exemplos de arquivo e cópia em texto/TSV.
Clipboard local com fallback que restaura foco/seleção do rascunho. Envelope
continua único; ações externas são adaptadas pelos consumidores, CA/CAW intocados.
