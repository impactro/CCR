# CCR render prompt — contrato e integração

Fonte canônica: `render.prompt.json` neste mesmo diretório. Este Markdown explica
o contrato e a configuração; não é uma segunda cópia da instrução para o modelo.
Release CES26.11.1n, npm26.11.1-n, prompt schema1, documento CES/renderer1.

O JSON incorpora a interpretação de intenção geográfica: localizar clientes,
instalações e máquinas, cruzar dados autorizados com os CSV, deduplicar,
agrupar/quantificar e explicar a cobertura. Mapa é geográfico; calor exige
pedido explícito. A skill `skills/geographic-map/SKILL.md` detalha o fluxo.
Entrega interativa ou PNG depende do canal e das ferramentas reais do host;
este contrato não instala capturador nem concede consulta/envio.

## Campos do JSON

| Campo | Significado |
| --- | --- |
| schemaVersion | Estrutura deste arquivo; o consumidor recusa uma versão desconhecida. |
| id/version/packageVersion | Identidade ccr.render e versões exatas do prompt/pacote distribuído. |
| renderer | Nome CCR e versão do documento CES, independente da versão de release. |
| limits | Tetos do núcleo. O host pode reduzir; aumentar requer outro contrato/teste. |
| compositionLimits | Limites de composição de plugins/contexto; comporta o catálogo ALP sem remover formatos existentes. |
| instructions | Instrução comum de formato, envelope, dados e recursos. |
| capabilities | Catálogo fechado de formatos do núcleo. Presença no catálogo não habilita o formato no host. |
| capabilities[].id/fences | Nome da capacidade e linguagens de bloco reconhecidas. |
| capabilities[].instructions | Regras de produção daquele formato, incluídas só quando selecionado. |
| capabilities[].examples | Exemplos sintéticos com fence/content, conferidos contra o render/decoder real. |

As capacidades são `data`, `chart`, `heatmap`, `map`, `ccr.data`, `ccr.html`,
`html`, `spa`, `image`, `pdf`, `audio`, `voice`, `video`, `youtube` e `file`.
Markdown é o padrão, mesmo sem selecionar nenhuma. `spa` só deve ser selecionado
quando o host configurou o sandbox com scripts inline e runtime isolado; isso
não é inferido de uma solicitação do modelo ou do tipo de um anexo.

## JavaScript e build de outros consumidores

```js
import {buildRenderPrompt, getRenderPromptContract} from '@crania/chat-render/prompt';

const contract = getRenderPromptContract(); // cópia; não muta a fonte canônica
const text = buildRenderPrompt({
  capabilities: ['data', 'chart', 'heatmap', 'map', 'ccr.data', 'ccr.html', 'html'],
  plugins: [],
  limits: {visuals: 3}
});
```

O export é puro: importa somente o JSON do pacote, sem DOM, filesystem, rede ou
execução de ferramentas. Em Node24 usa import de JSON com `with {type:'json'}`;
bundlers compatíveis incorporam o JSON. O entry point principal antigo não foi
alterado: a adoção desta instrução é explícita pelo export `/prompt`.

O host acrescenta o texto retornado às instruções reais do motor, inclusive nos
turnos retomados, e conserva persona, fontes, ferramentas e permissões próprias.
Não duplicar os formatos em um literal local concorrente. Validar o contexto
efetivo enviado ao motor com um fake de execução, sem pagar um turno para isso.

Python pode ler o JSON instalado por UTF-8 e conferir schema/versão, mas a forma
recomendada de compor o mesmo texto é executar este builder no build do produto
e gravar um artefato de instruções/procedência fechado que o backend consome.
Registrar SHA Git, versão do pacote/prompt e seleção de capacidades/plugins.
Não chamar Node/npm/Git a cada pergunta nem usar arquivos do clone em produção.

Exports de recurso: `@crania/chat-render/prompt.json` e `/prompt.md`. O original
fica em `config/prompts/render.prompt.json`; o JSON e o MD entram no npm pack.
Esses exports não são serviço MCP, prompt de persona ou configuração de sessão.

## Plugins declarados pelo host

`plugins` é uma lista de descritores locais confiáveis dos plugins efetivamente
instalados/habilitados. O CCR não descobre, baixa, instala ou autoriza plugins.

```json
{
  "id": "example.summary",
  "version": "1.0.0",
  "fence": "summary",
  "schema": {
    "type": "object",
    "properties": {"title": {"type": "string"}},
    "required": ["title"],
    "additionalProperties": false
  },
  "instructions": ["Use a short title supplied by the host."],
  "examples": [{"content": {"title": "Synthetic example"}}]
}
```

`id`, `version` SemVer, `fence`, schema JSON inline, 1..8 instruções e 1..4
exemplos são obrigatórios. São aceitos schemas raiz object/array/string, sem
`$ref`/`$dynamicRef`; o builder não resolve rede. Limites:32 plugins, descritor
32KiB UTF-8, profundidade16 e10000 nós; texto final até65536 caracteres.

`validateRenderPromptPlugin` valida o descritor, não executa JSON Schema sobre
o payload nem instala o renderer. O host deve fornecer o validador real e os
testes dos exemplos junto do plugin. Uma instrução não implementa capacidade.
Descriptors não podem vir de anexos, visitantes ou resultado arbitrário da IA.

IDs/fences de plugins devem ser únicos. Uma fence de núcleo, como chart ou video,
pode ser documentada por um plugin substituto somente se sua capacidade de núcleo
não estiver selecionada: evita dois schemas contraditórios no mesmo prompt.
O host deve instalar esse mesmo override no renderer, não só na instrução.
`ccr.data`/`ccr.html` podem compartilhar a fence ccr por serem do mesmo contrato.

O builder rejeita capacidade desconhecida, descritor conflitante e teto aumentado.
Com `visuals:0`, nenhuma capacidade rica/plugin pode ser selecionada. Ordenação
de capacidades é canônica e plugins seguem o ID, tornando o resultado estável.

## Fronteiras e publicação

O documento CES permanece versão1 e as APIs anteriores de render continuam
iguais. Este prompt não adiciona geocoding, mapa-base, pizza/rosca universais,
geração de PDF/vídeo, leitura de email ou autorização de scripts recebidos.
O host só anuncia suas capacidades validadas, e preserva formatos próprios
compatíveis por descritores de plugins. Artefatos desconhecidos mantêm fallback.

Pedido mais recente de Fábio: coordenação desta adoção entre CCR e ALP nesta
máquina. Outros módulos continuam em suas revisões fixadas até adoção própria;
publicar um prompt no CCR não injeta texto automaticamente em versões antigas.

## Escolha do visual e mapas por cidade

O prompt orienta escolher formatos disponíveis pela pergunta, preservar a
granularidade pedida e explorar recursos somente quando fizer sentido.
Mapa por cidade combina rótulo cidade/UF + quantidade, métrica numérica e
coordenadas verificadas. Centro/referência da cidade deve ser identificado;
não representa cada máquina. Marcadores nativos têm tamanho fixo.
Geocodificação/agregação são capacidades do host, não do render. Sem coordenada
ou identidade inequívoca, conservar a linha na tabela e informar a cobertura.
