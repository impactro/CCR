# Histórico

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
