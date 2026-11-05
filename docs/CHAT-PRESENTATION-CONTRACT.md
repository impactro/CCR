# CCR: contrato comum de apresentação das conversas

## Posição GPS

`renderChatPosition({latitude,longitude,name?,address?})`, exportado por
`conversation`, apresenta marcador ilustrativo e links Google Maps e
OpenStreetMap. Não baixa mapas nem acompanha localização. Exige coordenadas
finitas, limites geográficos e escape; acesso e DTO pertencem ao host.

CM Python `render-positions` exporta PNG/SVG/HTML e manifesto para cinco a cem
pontos no raio (padrão 5 km). O mapa esquemático mostra norte, centro, distância
em linha reta, marcadores e legenda, sem base viária, rede ou geocodificação.
HTML/SVG têm links por ponto e para o centro no OSM; PNG é imagem estática.
Arquivos somente em temp/outputs da raiz autorizada, sem sobrescrita. Exportar
não comprova envio. Menos de cinco pontos: lista no consumidor. Ver skill
`position-map` do pacote Python. Atualizar o bundle oficial do CCR no CWH antes
de promover a apresentação; consumidor com bundle anterior mantém compatibilidade.

Diretriz explícita de Fábio em 30/10/2026: CAW e todos os consumidores do CCR
seguem o mesmo padrão. O CCR é o núcleo do render de chat completo, incluindo
o envelope da mensagem e suas ações, além do conteúdo rico. Não é apenas uma
biblioteca de gráficos nem um tema opcional.

As superfícies ativas do produto são CWH WhatsApp, CWH Assistente e CCI
Explorador; CAW será a quarta. ALP permanece laboratório e referência de plugins.
O mapa de canais, dados e capacidades está em
[RICH-CONTENT-CONSUMERS.md](RICH-CONTENT-CONSUMERS.md).

## Responsabilidades

| Dono | Responsabilidade |
| --- | --- |
| CCR | Projeção temporal, sequência, envelope, autoria, citação, reações, faixa de ações, corpos ricos e ciclo de vida de apresentação. |
| Tema | Valores semânticos CA, fonte, identidade/ativos permitidos e variantes claro/escuro. |
| Host/adaptador | Conversas e contas autorizadas, DTOs, transporte, persistência, permissões, recursos e callbacks. |
| Shell do produto | Navegação, lista de contas/conversas, configuração, montagem e tamanho disponível para o chat. |

O CAW compõe menus; isso não o autoriza a manter um envelope de mensagens
diferente do padrão CCR. O LP local tem identidade própria, mas deve vestir
o mesmo render. Tema não reimplementa agrupamento, datas, ações ou visualizador.

## Regras comuns

Controles contextuais usam `contextualActions: true`: desktop por hover/foco e
toque pelo botão de ações. O host fornece somente callbacks/capacidades reais.
A ação `listen` tem ícone e ordem comuns entre copiar e visualizar; o CCR não
chama CSay nem contém autenticação. `detailsPlacement: 'time'` posiciona as
métricas fornecidas em um tooltip acessível no horário, preservando data,
valores zero e ausência de dados. Nenhum saldo é inferido de créditos de uso.
O resumo técnico comum é `Total: 1m21s · Tokens 1234 / 56 · gpt-6-luna`:
prefere o tempo acumulado fornecido pelo host e não repete tempos da resposta.
Duração visual arredonda para segundos; contagens ausentes aparecem como `—`,
nunca como zero inventado. Data completa continua no tooltip do horário.

Ações adicionais usam `kind: 'custom'`, `actionId`, rótulo, ícone e callback
fornecidos por código confiável do host; `element` permite adotar um controle
existente sem perder seus handlers/estado. Não aceitar funções, HTML ou nomes
executáveis definidos pela IA. `actionIcon()` expõe o vocabulário fechado de
ícones comuns, incluindo ajuda, PDF e planilha. Conteúdo adicional usa os slots
de corpo existentes, sem introduzir outro envelope de mensagem.

Sequências contíguas respeitam a classe `continuation` calculada por identidade,
conversa, direção e dia. A borda do lado do autor fica reta e sobreposta em 1 px,
inclusive quando o host usa `.chat-message-entry`; reações mantêm sua folga.
Tokens de canto `--ca-chat-bubble-*-radius` permitem que o tema acompanhe o
encaixe, sem reescrever a projeção temporal.

- Uma mensagem possui um único envelope. Texto, citação e partes ricas ficam
  dentro dele; não envolver o CCR em outra bolha com borda/fundo próprios.
- conversationId, messageId e authorId são opacos e distintos. Agrupamento
  usa conversa, autor, direção, dia e quebras explícitas; nome ou papel de IA
  não substituem a identidade. Nunca juntar duas conversas pelo rótulo.
- No grupo, mostrar autor/avatar no início da sequência recebida. Conservar
  os balões individuais; não repetir cabeçalho em cada continuação. Avatar
  próprio permanece desabilitado no padrão comum.
- Horário e recibos ficam fora do corpo da bolha. Data aparece em negrito
  apenas na mudança de dia. Tempos são UTC no DTO e formatados pela mesma
  política de locale/timeZone, não por parsers específicos de cada produto.
- Conteúdo usa a largura comum disponível, com a mesma regra de até 80% e
  espaço para ações externas. Continuação e acabamento seguem o autor/direção,
  sem dupla borda nem padding interno divergente no meio da sequência.
- Reações ficam na borda externa, sem moldura. Citação usa o autor citado e
  sua cor estável, separadamente do autor da resposta.
- A faixa de ações permanece fora do envelope. Ordem e ícones pertencem a
  src/actions.mjs; o host fornece somente as capacidades e callbacks reais.
  Ausência de responder/reagir/encaminhar em um canal não cria botão fictício.
- Preview/download/copiar usam o mesmo padrão quando disponíveis. PDF usa o
  visualizador nativo; player, rascunho e posição não devem ser recriados só
  porque a faixa de ações ou um estado mudou.
- Documentos CES, tabelas, gráficos, mapas e demais conteúdos usam os mesmos
  contratos de partes/recursos. Plugins de domínio acrescentam conteúdo dentro
  dos pontos de extensão, sem outro render de conversa.
- Atualização keyed, cancelamento e dispose pertencem ao ciclo comum. Uma
  resposta tardia não pode atualizar outra conversa ou conta.

Essas regras são o alvo normativo. Algumas já são funções compartilhadas;
outras ainda precisam ter seu CSS retirado dos hosts. Não anunciar conformidade
integral só por importar um pacote ou copiar os nomes das variáveis.

## Identidade visual única, várias paletas

Usar --ca-ui-* e os tokens --ca-chat-* do dicionário
Platform/CraniaAgent/VISUAL-IDENTITY.md. --ca-ui-font é font-family e
--ca-ui-space uma dimensão base. Não criar uma segunda variável por produto
para a mesma semântica. Classes estruturais preservam seu escopo e contratos
de eventos; a migração de tokens não é autorização para trocar IDs à cegas.

O host fornece seu tema, inclusive o tema próprio do LP. Um módulo embutido
herda o provedor acessível de mesma origem conforme o contrato CA. Preservar
valores explícitos; não substituir uma paleta da empresa por derivações locais.
Sem provedor acessível, usar o fallback próprio sem mudar CSP ou identidade.

Cores de séries, escalas de calor, pixels de documentos/PDF e HTML isolado têm
semântica de conteúdo; não devem ser recoloridos por uma substituição global
de cores da marca. Conteúdo não confiável conserva seu isolamento.

## Código existente e próxima consolidação

| Capacidade | Fonte comum existente |
| --- | --- |
| DTO, dia/hora e sequência | src/presentation.mjs |
| Envelope e citação | src/conversation.mjs |
| Ordem, ícones e lifecycle de ações | src/actions.mjs e actions.css |
| Corpo rico, documentos e recursos | renderer.js, document-renderer.mjs e plugins limitados |
| Tokens no corpo rico | styles.css e document.css |

CCR26.10.30b ainda não contém toda a geometria do envelope que o CWH aplica
em seus stylesheets. Extraí-la para uma folha comum e retirar a propriedade
duplicada dos adaptadores é uma próxima fatia do módulo. O CAW ainda precisa
de migração/adaptador comprovados; adoção de tokens não é adoção do CCR.
O inventário do LP local e do PC-IA deve ser separado e identificar pacote,
adaptador, fonte efetiva do envelope e qualquer override restante.

Correção comum entra no CCR e é testada ali. Cada consumidor recebe o mesmo
artefato identificado por versão/hash e adapta somente seus dados/capacidades.
Não editar uma cópia vendor publicada nem criar forks permanentes por tema.

## Aceite dos consumidores

O rail dá a mesma área de 30 × 30 px a botões, controles nativos adotados e
links de download. Todos recebem hover e foco de teclado comuns; ações
desabilitadas não recebem o destaque de hover. O host personaliza somente
`--ca-chat-action-radius`, `--ca-chat-action-frame-radius` e
`--ca-chat-action-hover`. A moldura tem respiro de 4 px vertical/6 px lateral.
Isso não muda title, autorização, callback nem o gesto nativo dos links.

Testar fixtures comuns de privado/grupo, humano/IA, dois autores, duas
conversas/contas, dia novo, sequência, citações/reações, ações disponíveis,
mídia/documentos e troca durante carregamento. Usar claro/escuro e os temas
próprios com foco/contraste, sem perder rascunho/player/scroll.

Registrar versão e resultado por consumidor, incluindo limitações. Testes do
núcleo não comprovam adaptação nem GUI de cliente. Modelos pagos, consultas
privadas ou envios externos não são necessários para testar apresentação.
