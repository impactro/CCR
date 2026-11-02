# Matriz atual de compatibilidade do CCR

Referência de fonte: CCR26.11.2g. Presença na biblioteca, build no consumidor e
aceite operacional são estados distintos. Esta matriz substitui a comparação
exploratória de outubro; a procedência histórica permanece no Git.

| Capacidade | Contrato atual | Limite / responsabilidade do host |
| --- | --- | --- |
| Mensagem e texto | Markdown seguro e envelope comum, identidade/ordem fornecidas pelo host | CCR não inventa usuário, conversa ou recibo. |
| Dados | Tipos, unidades, zero/false/null, fonte e período | Consulta e autorização continuam no backend. |
| Gráficos | Núcleo simples; séries line/column explícitas, eixos/unidades e legenda | Plugins avançados não são universais. |
| Report | Texto, imagem lógica e painéis de dados;1–12 seções sem aninhamento | Recursos de imagem exigem resolver autorizado; layout fixo pode rolar. |
| PNG/PDF | export-document no pacote Python com manifesto e escrita exclusiva | Node/PyMuPDF locais; multipágina exige PDF; layouts não suportados falham. |
| Geografia | Mapa geográfico por padrão, limites reais e receitas/cache sob demanda | Heatmap somente quando pedido; resolução ambígua fica explícita. |
| Bairros | Exemplo com fonte oficial de Santo André | Não implica cobertura de todos os bairros do mundo. |
| HTML | Isolamento passivo e descarte | Não habilita scripts/SPA por resposta ou anexo. |
| Imagem/arquivo/PDF/mídia | Recursos autorizados e lifecycle comum | URL, MIME, bytes, acesso e transcrição são do host. |
| Histórico | Controlador progressivo, cancelamento/retry e descarte | Host entrega páginas estáveis; snapshot limitado não é paginação SQL. |
| Ações/tema | Callbacks e tokens do consumidor | Uma ação visual não autoriza efeito externo. |
| Prompt | Capacidade/plugin explicitamente selecionado e versão pareada | Não concede OAuth, SQL, arquivos, rede ou envio. |

## Consumidores

| Superfície | Integração de fonte | Aceite que não pode ser inferido |
| --- | --- | --- |
| CAW | Adaptador CCR, prompt e timeline comuns no pacote CA | Móvel/PWA/cache antigo, dois usuários reais e fonte composta do modo Agente. |
| CWH mensagens | Adaptador CCR; transporte e ações continuam CWH/CWB | Atualização operacional pareada e efeitos de mensageria. |
| CWH Assistente | CCR e contexto do usuário no host | Execução real do agente, propriedade do workspace e entrega de arquivos. |
| CCI Explorador | CCR oficial fixado, timeline comum e páginas20 | Tela estreita, contas/filtros e ausência de resposta tardia no ambiente final. |
| CAX | Tools Python para PNG e manifesto; host registra/entrega | Produzir arquivo não comprova envio nem persistência no destino. |
| ALP/outros | Consumo independente, sem inspeção atual nesta rodada | Não atribuir versão/paridade por referência histórica. |

Na revisão g, a biblioteca passou116 testes Node,11 testes Python de export e10
de receitas geográficas. Wheel extraído e arquivos PNG/PDF reais também foram
verificados. Cada consumidor mantém seus próprios testes de autorização,
procedência, lifecycle e aceites pendentes. Estado instalado pertence ao
inventário do servidor, não a esta matriz de código.

Detalhes: [plano e fronteiras](shared-render-plan.md),
[documentos/exportação](document-export.md),
[consumidores](RICH-CONTENT-CONSUMERS.md) e [testes](../tests/README.md).
