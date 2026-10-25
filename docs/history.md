# Histórico

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
