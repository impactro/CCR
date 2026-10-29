# CCR — documentos ricos CES

Direção de Fábio em29/10/2026. **CCR = Crânio Chat Render**, nome curto do
módulo técnico CChatRender (`@crania/chat-render`). Caminhos/imports permanecem.
CWH é referência prioritária; ALP se adapta; CA/CAW vêm posteriormente.

Estado: **mapeamento e proposta**, sem detector/decoder de anexos instalado.
CCR26.10.29-b implementa envelope de conversa/citação, não este documento.

## Resultado esperado

O mesmo arquivo viaja como documento JSON/HTML. No WhatsApp comum, permanece
anexo. Num host compatível, o adaptador reconhece o marcador, valida o documento
e fornece partes ao CCR para tabela, gráfico ou HTML isolado. O original continua
disponível para visualizar/baixar/encaminhar, sem criar mensagens artificiais.
O ALP fornece o mesmo objeto diretamente, sem simular transporte WhatsApp.

## Documento JSON proposto

```json
{
  "owner": "CES",
  "format": "ccr.document",
  "version": 1,
  "renderer": {"name": "CCR", "version": 1},
  "type": "data",
  "view": "table",
  "title": "Resumo por região",
  "data": {
    "columns": [
      {"label": "Região", "type": "string"},
      {"label": "Total", "type": "number"}
    ],
    "rows": [["Norte", 12], ["Sul", null]]
  }
}
```

| Campo | Significado proposto |
| --- | --- |
| owner/format | Marcador exato CES/ccr.document; não tratar qualquer JSON como apresentação. |
| version | Versão do esquema do arquivo, inicialmente1. |
| renderer.name/version | CCR e versão do contrato de apresentação requerido, inicialmente1; independente da versão npm/data de publicação. |
| type | Família data ou html na primeira fatia proposta. |
| view | table ou gráfico suportado para data; não é código a executar. |
| title/data | Título visível e dados tipados; linhas em ordem, null preservado. |

A implementação publicará versões/capacidades aceitas e a primeira release CCR
com esse suporte. Não definir26.10.29-b como mínimo: ainda não decodifica o
documento. Versão desconhecida/tipo inválido conserva o anexo e informa limitação,
sem adivinhar migração. Campos acima são proposta a fechar com fixtures comuns.

"Assinatura" significa marcador de formato, **não assinatura criptográfica**.
owner é declarado pelo arquivo e não comprova procedência/autoria/permissão.
Não incluir senha, token de API, sessão ou caminho local no header. Usar format
como identificador; autorização continua no host.

## HTML proposto

Arquivo .html marcado pode usar comentário inicial com o mesmo header:

```html
<!-- CES-CCR {"owner":"CES","format":"ccr.document","version":1,"renderer":{"name":"CCR","version":1},"type":"html","title":"Resumo"} -->
<!doctype html>
<html lang="pt-BR"><body><h1>Resumo</h1><p>Conteúdo do documento.</p></body></html>
```

O adaptador lê header limitado e JSON válido, sem executar o arquivo para
identificá-lo. JSON type=html pode transportar data.html como texto com mesma
semântica. Extrair header não libera scripts. Usar sandbox CCR e política do
host; receber anexo não habilita miniapp ativo, rede, ferramentas ou acesso ao
documento pai. HTML sem marcador continua arquivo. Ainda não implementado.

## Inventário e lacunas

| Origem conferida | Forma/capacidade atual | Diferença a tratar |
| --- | --- | --- |
| CCR src/data.js | columns com string/label, rows em arrays; texto/número finito/null;16 colunas,1000 linhas, células2000 caracteres | boolean/date/html tipados não implementados. |
| CCR src/chart.js | Mesmos dados; SVG local bar/column/line/area e tabela; até100 linhas para gráfico | Não cobre todos os gráficos CAW. |
| CCR src/renderer.js | Markdown com blocos data/table/chart/html/spa e plugins | Não detecta documentos JSON anexados. |
| CCR src/sandbox.js | HTML isolado; scripts desligados por padrão;120000 caracteres | Scripts dependem do host, nunca do header. |
| CA ca/json_format.py | data com title, columns[{label,type}], rows; string/html/number/boolean/date/datetime/null | Mais tipos que o núcleo CCR. Fonte apenas lida, sem alterar CA. |
| CAW showdata.js | Tabela e pizza/rosca/empilhados/dispersão/timeline/indicadores/outros | Não declarar paridade porque há um gráfico de barras no CCR. |
| ALP26.10.29e | Markdown, data/table/chart, views/dashboards, HTML/SPA, SVG/Mermaid, mapas, relacionais, demos/candidatos, mídia e artefatos por hash | Inventário docs/CCR-TIPOS-RICOS.md confirmado pelo chat PC-IA ALP, commit9d93d42; mapas/base eleitoral permanecem plugins. |

Preservar ordem, tipos, unidades e null; não converter ausência em zero, boolean
em número ou data em número para encaixar no menor denominador. HTML em célula
exige sanitização/política própria; type=html não autoriza injeção no DOM.
Tipos sem suporte conservam alternativa legível e arquivo original.

Reaproveitar renderizadores existentes com **um decoder comum** produzindo partes
tipadas, sem parsers independentes no ALP/CWH. Não transformar tabela em imagem
para esconder lacuna. Limites atuais são referência; decoder também limita bytes,
profundidade e partes. Só fechar limites/schema após fixtures equivalentes.

## Transporte, identidade e recursos

Isto é **conteúdo de arquivo**, não protocolo de entrega novo nem V5. SEND_JSON
continua CA/CAX; saída V4 do conector permanece fechada. WhatsApp pode transportar
o documento por type=file existente, com owner/format/version/type/data dentro
do arquivo. Não adicionar campos ao topo do SEND_JSON nem enviar response V4
type=data que o contrato não aceita. Canal Web adapta seu data ao mesmo conteúdo.

Conta/conversa/mensagem/autor, recibos, caminhos e permissões vêm do host. O anexo
não reatribui autor WhatsApp, seleciona conversa ou envia algo. Recurso externo
ou Blob depende da autorização/lifecycle já existentes do host.

Fluxo futuro: anexo autorizado → download pelo CWH → marcador/versões/dados
validados → decoder CCR → partes/tabela/gráfico/sandbox. Extensão/MIME selecionam
candidato, não bastam para reconhecer formato. Sem marcador, inválido, incompleto
ou incompatível permanece arquivo. Falha local não derruba a mensagem restante.

## Fatias e aceite futuro

1. ALP adota envelope CCR26.10.29-b e confirma tipos ricos; autorização já enviada
   ao chat PC-IA ALP. Não confundir esta adaptação com o novo decoder.
2. Fechar esquema/decoder comum com fixtures data/table/chart e HTML passivo,
   cobrindo diferenças de tipos/capacidades; publicar nova versão identificada.
3. Integrar detecção no CWH preservando arquivo/download, ações nativas,
   histórico e players durante atualizações.
4. Adaptar produção pelos agentes/CAW em rodada posterior, sem mudar transporte
   por consequência desta documentação.

Aceite: mesmo JSON no ALP/CWH produz mesmos dados/ordem; compatível vira rico;
JSON/HTML comum continua arquivo; incompatível/quebrado conserva download;
autor/conversa não vêm do anexo; scripts/campos não concedem efeitos; troca de
conversa libera recursos. Documentação não equivale a funcionalidade publicada.
Execução fica na fila do projeto dono, sem segunda fila de tarefas aqui.

## Confirmação da primeira adaptação ALP

PC-IA ALP confirmou26.10.29e, Sites97, commit9d93d42, CCR26.10.29-b com hash
628fa90270b05486883caf58aae1dc8bdb7a7e592ac3f47160f1a41e83fd20e8.
105 testes, build, conteúdo rico/ESM/UTF-8 e assets públicos conferidos pelo dono;
worker PCIA permanece parado. Sem screenshot de navegador. O inventário acima
é capacidade encontrada no ALP, não prova de export comum de todos esses plugins.
Decoder de documentos ricos não foi instalado. A cópia de proposta ada9fd7 no
vendor CWH permanece snapshot daquela revisão; este inventário é confirmação
posterior, sem alterar o pacote CCR26.10.29-b já distribuído.
