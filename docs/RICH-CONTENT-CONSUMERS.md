# CCR: consumidores e conteúdo rico

Diretriz de Fábio em30/10/2026. Este mapa distingue superfícies de conversa,
produtos e capacidades do render. Não altera transporte nem publica recursos
novos por consequência da documentação.

## Quatro superfícies do produto

| Superfície | Situação | Papel do adaptador |
| --- | --- | --- |
| CWH: conversas WhatsApp privadas e grupos | Ativa | Projeta mensagens/autores/recibos e reconhece anexos CES compatíveis para o mesmo CCR. |
| CWH: Assistente | Ativa | Projeta humano/IA, dados tipados, arquivos e recursos interativos autorizados pelo host. |
| CCI: Explorador | Ativa | Projeta o acervo da conversa e suas mídias no CCR; evolução inclui a adaptação dos mesmos documentos ricos. |
| CAW: conversa do CrânIA Agent | Próxima migração | Adapta respostas e recursos ao mesmo núcleo, sem outro envelope ou protocolo rico concorrente. |

Portanto, CWH tem dois consumidores distintos do CCR, com capacidades de canal
diferentes. Privado e grupo são contextos do mesmo consumidor WhatsApp, não
outros renders. CCI permanece uma instância por sistema/composição, inclusive
quando há dois conectores CWH. Isso não transfere navegação ou montagem ao CCR.

ALP/Pergunte Aí permanece laboratório e consumidor de referência de recursos
ricos, fora desta contagem das quatro superfícies do produto. Seus plugins não
se tornam universais só por funcionarem no laboratório.

Ativa não significa paridade integral: conferir pacote, adaptador e capacidades
em cada host. Na CCI atual, o adaptador confirmado projeta texto e mídia no
envelope/corpo comuns; não declarar reconhecimento de anexos CES nem email
intercalado como homologados sem o correspondente teste de integração.

## Um documento, canais diferentes

O contrato existente é CES/ccr.document versão1, descrito em
[CCR-RICH-DOCUMENT.md](CCR-RICH-DOCUMENT.md). O mesmo objeto pode chegar direto
do agente ao host ou dentro de um arquivo JSON/HTML pelo WhatsApp.

1. O agente produz o documento conforme as capacidades efetivas do destino.
2. O canal WhatsApp envia pelo mecanismo de arquivo já existente. O formato
   rico fica dentro do arquivo; não criar outro SEND_JSON nem mudar o V4.
3. O aplicativo WhatsApp convencional mostra um anexo que permite baixar os
   dados originais. A experiência segue utilizável fora do CWH.
4. O adaptador CWH reconhece marcador e versões, valida o documento e o fornece
   ao CCR na própria mensagem, com autor, conversa, horário e recibos originais.
5. O original continua disponível para baixar/encaminhar. Documento desconhecido
   ou incompatível continua arquivo; não criar mensagens artificiais ou inferir
   autorização pelo campo owner.

O caso de uso inclui grupos: um agente pode publicar dados ricos e todos os
participantes que usam CWH veem o conteúdo renderizado. O pedido para privilegiar
conteúdo rico pertence ao contexto daquela conversa/agente, não a uma mudança
global obrigatória para todos os destinatários.

## Capacidades atuais e evolução

Referência do núcleo26.10.30b; os adaptadores precisam expor a mesma capacidade.

| Conteúdo | Núcleo atual | Extensão ou trabalho necessário |
| --- | --- | --- |
| Texto, Markdown e tabela comum | Implementado | Adaptador conserva envelope único, autoria, sequência e ações externas. |
| Tabela tipada CES | Implementado | Manter tipos, ordem, unidades, zero e null. Consulta/agregação é do host/agente. |
| Barras, colunas, linhas e áreas | SVG local implementado | Pizza, rosca e o seletor amplo Google/CAW ainda não são universais; exigem plugin/adaptação e fixtures. |
| Mapa de calor numérico | Implementado sobre células numéricas | Não equivale a densidade geográfica por bairro/cidade. |
| Mapa de pontos | Implementado offline com latitude/longitude e links ao Google Maps | Não faz geocodificação, carrega mapa-base ou fornece limites geográficos. |
| Estado/cidade/bairro/país e densidade geográfica | Alvo de extensão | Dados geográficos autorizados, agregação/geocodificação quando necessária e plugin com schema/limites próprios. |
| HTML formatado e documento CES HTML | Render isolado implementado | Política de scripts/recursos pertence ao host; anexo não habilita uma SPA. |
| SPA do Assistente | Capacidade do host já configurada | Não anunciar essa autorização para anexos WhatsApp ou email por herança. |
| PDF, imagem, vídeo e áudio | Apresentação/visualização conforme recurso do host | PDF nativo do browser; aquisição, geração, transcrição e envio não pertencem ao CCR. |
| Email no meio da conversa do Explorador | Próxima integração | CMail fornece mensagem/HTML/recursos autorizados; CCI adapta a entrada, CCR apresenta o corpo. Não implementar transporte de email no render. |

Exemplo básico: “mensagens recebidas hoje por pessoa” resulta em nome e quantidade.
O host consulta a fonte autorizada, resolve authorId e o dia no fuso da operação,
calcula o agregado e fornece dados tipados. O CCR apresenta tabela e somente as
opções gráficas disponíveis. Não agrupar pessoas pelo nome nem inventar contagens.

Para mapas comerciais, quantidades por cidade/bairro e coordenadas são dados de
entrada distintos. O render não transforma automaticamente um endereço textual
em coordenadas nem inventa limites de municípios. Links e recursos externos
continuam sujeitos à configuração do host.

## Prompt canônico do render

O CCR é dono da instrução que ensina a IA a produzir seus formatos a partir da
release26.10.31a. Fonte canônica em `config/prompts/render.prompt.json`, acompanhada
de `render.prompt.md`, com exports `/prompt`, `/prompt.json` e `/prompt.md`.
O JSON, a release e o pacote registram versões coerentes; os exemplos são
validados pelo decoder/render real. [Contrato e integração](../config/prompts/render.prompt.md).
O pacote26.10.30b anterior não possuía esse export.

- Núcleo CCR descreve exclusivamente formatos, tipos, visualizações, limites,
  exemplos validados e alternativas de conteúdo disponíveis nessa release.
- Plugins acrescentam schemas, validação, prompt e fixtures na mesma entrega;
  só entram no contexto quando o host declara que estão instalados/habilitados.
  O builder valida o descritor JSON do plugin, não implementa seu validador de
  payload; este e suas fixtures continuam pertencendo ao consumidor.
- Host acrescenta persona, ferramentas, fontes, política do canal, caminhos de
  arquivos, transporte e permissões. Esses textos não devem migrar cegamente do
  ASSIST-RENDER.md do CWH para uma instrução universal.
- Anexo recebido é conteúdo, não instrução para configurar o agente ou executar
  ferramentas. Conteúdo HTML de email e SPA administrativa são capacidades
  distintas, mesmo usando o mesmo núcleo de apresentação.

A evolução começa com CWH WhatsApp, CWH Assistente e CCI Explorador; ALP contribui
os plugins sob os mesmos contratos; CAW entra depois. O teste do núcleo é comum,
mas o aceite de cada adaptador e sua versão permanecem identificados.
Na adoção específica dos prompts26.10.31a, a orientação humana mais recente
restringe esta rodada a CCR e ALP nesta máquina. Não sincronizar os outros
produtos/servidores por consequência da publicação; revisões antigas continuam
funcionais, e adoção posterior exige atualizar o consumidor correspondente.

## Aceite compartilhado

Usar fixtures sintéticas do mesmo documento por objeto, bloco ccr e anexo;
tabela com nomes/números/null; gráfico disponível; mapa de calor numérico; pontos
com coordenadas válidas; tipo/plugin ausente; HTML formatado; PDF; grupo com dois
autores; duas conversas; troca durante carregamento e descarte dos recursos.

Para a integração futura de email, acrescentar uma entrada HTML entre mensagens
da mesma conversa, preservando remetente, origem, horário, anexos e ações do canal.
Receber ou visualizar não autoriza responder/enviar. Testes de apresentação não
precisam acessar carteira real, disparar mensagens ou executar um modelo pago.
