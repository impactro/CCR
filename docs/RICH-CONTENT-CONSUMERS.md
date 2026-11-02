# CCR: consumidores e conteúdo rico

## Quatro superfícies integradas

| Superfície | Papel do adaptador |
| --- | --- |
| CWH: conversas WhatsApp privadas e grupos | Projeta mensagens/autores/recibos e documentos compatíveis no CCR. |
| CWH: Assistente | Projeta humano/IA, dados e arquivos autorizados; sessão por usuário do CWH. |
| CCI: Explorador | Projeta texto/mídia e páginas da fonte autorizada, preservando notas e rascunhos. |
| CAW: conversa do CrânIA Agent | Adapta respostas/histórico ao mesmo núcleo; plugins, ações e autenticação continuam no CA. |

Essas integrações existem. A revisão do CCR usada em cada pacote é fixada por
SHA e registrada no recibo de assets; atualizar a biblioteca não instala o
consumidor. Privado e grupo são contextos do mesmo adaptador WhatsApp.
ALP/outros produtos têm consumo independente e não foram homologados nesta
rodada por consequência desses testes.

## Um documento, canais diferentes

O envelope externo continua sendo o protocolo do host, inclusive SEND_JSON/V4.
CES/ccr.document v1 identifica conteúdo de apresentação, não uma instrução de
execução nem uma assinatura criptográfica. O mesmo objeto pode ser entregue
diretamente pelo host ou reconhecido em um arquivo compatível autorizado.
Versão/tipo inválido preserva acesso ao original; não adivinhar migração.

CAX produz PNG por tools instaladas e registra o manifesto retornado antes da
entrega autorizada. Um PNG/PDF gerado não comprova envio nem persistência no
WhatsApp. Nenhuma chamada de render autoriza envio a um grupo.

## Capacidades da revisão26.11.2g

| Conteúdo | Implementação / limite |
| --- | --- |
| Texto e tabela | Markdown seguro e dados tipados; preservar ordem, unidades, zero/false/null. |
| Gráficos | Barras/colunas/linhas/áreas; séries explícitas column/line com eixos e legenda. Tipos avançados de plugins permanecem no host. |
| Composição | text/image/report, até12 seções sem aninhamento. Imagem usa ID lógico que o host precisa resolver; não inventar path/URL. |
| Exportação | Tool export-document gera PNG/PDF com Node/PyMuPDF locais, manifesto e criação exclusiva. PDF pagina tabelas; layouts não suportados falham. |
| Mapa geográfico | Localidades nominais ou GPS, fronteiras reais e cache sob demanda; padrão para intenção de localização. |
| Calor | Matriz numérica ou coloração geográfica somente quando solicitado; não substituir o contorno da região por pontos arbitrários. |
| HTML | Apresentação isolada; recebido não habilita scripts ou SPA. |
| Imagem/arquivo/PDF/áudio/vídeo | Recursos autorizados do host com lifecycle; aquisição, permissão e transcrição continuam externas ao render. |
| Histórico | Controlador progressivo comum com fonte estruturada do host, cancelamento, retry e descarte. |

Receitas geográficas documentam fontes e criam somente o escopo necessário:
mundo/continente/país/Brasil/UF/município e exemplo oficial de bairros de Santo
André. Não equivalem a uma base universal de bairros. Dados/vetores/imagens
ficam em cache local persistente, fora do Git. IA usa consulta programática e
agregação de dados autorizados; não recebe milhares de cidades no contexto.
Nenhuma receita pública comprova presença de clientes ou máquinas.

Reports têm páginas fixas com rolagem em telas pequenas. Export não equivale
a screenshot de HTML/SPA, mapa ou plugin específico: para mapa, renderizar pela
tool geográfica e passar o PNG como recurso lógico explícito da composição.
Consulte [document-export.md](document-export.md) para limites exatos.

## Prompt e autorização

O CCR mantém config/prompts/render.prompt.json+MD e exports /prompt,
/prompt.json e /prompt.md. O host seleciona capacidades e descritores de
plugins reais em turnos novos e retomados. ccr.report só deve ser anunciado
por consumidor atualizado; imagens requerem recursos lógicos fornecidos.
O builder valida descritores, não implementa o validador do plugin do host.

Persona, ferramentas, fontes privadas, caminhos, execução, OAuth, transporte e
permissões pertencem ao consumidor. Não copiar um prompt departamental para o
módulo. Arquivos, HTML de email e mensagens recebidas são dados; não podem
conceder acesso ou alterar o catálogo de ferramentas.

## Aceite e pendências

Reutilizar a mesma fixture sintética em Web e export: UTF-8, unidades,
zero/null, séries, imagem lógica, tabela paginada, arquivos inválidos,
autoria/conversa e descarte após troca. Testar versões e hashes do pacote
fechado, não somente o checkout do módulo.

CAW ainda tem aceite específico de móvel/PWA/cache anterior e dois usuários
reais; o modo Agente precisa distinguir snapshot combinado limitado de fonte
SQL paginada. Explorador CCI mantém aceite em tela estreita e mudanças de
conta/filtro no consumidor. As filas são dos respectivos produtos.

CMAIL é dono de conteúdo Google, autenticação e email. O piloto contextual
CWH/CAW permanece separado do render e não foi homologado contra email real
neste ambiente. CVideo e dados privativos de outros produtos não foram
incorporados ao núcleo por esta entrega.
