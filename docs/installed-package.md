# CCR instalado — guia para agentes

Há duas entregas: `@crania/chat-render` (JavaScript, incorporado no host) e
`crania-ccr` (Python, import `ccr`, CLI `python -s -m ccr`). Instalar Python
não atualiza o bundle Web do CAW/CWH/CCI. O renderer não autentica, consulta
banco ou envia mensagens; o host fornece dados, recursos e ações autorizados.

O pacote JavaScript também entrega este guia em `docs/installed-package.md`,
com os contratos referenciados. Consulte a revisão do pacote incorporado pelo
host; atualizar apenas o npm ou apenas o wheel não recompõe outros hosts.

## Uso Python sem checkout

Instale o wheel aprovado e o extra `png` quando precisar rasterizar/exportar.
Node e PyMuPDF devem estar provisionados para exportação; o uso não instala
dependências, navegador ou npm. Trabalhe na raiz de dados do consumidor:

```powershell
python -s -m ccr --help
python -s -m ccr lookup-place --agent-root . --kind city --state SP --name "Santo André"
python -s -m ccr prepare-map --agent-root . --key state-SP --png
python -s -m ccr render-map --agent-root . --key state-SP --data temp/valores.json --output outputs/mapa.png
python -s -m ccr export-document --help
python -s -m ccr render-positions --agent-root . --data temp/posicoes.json --output outputs/clientes.png
```

`prepare-map` pode baixar bases públicas das receitas aprovadas. O cache
permanente fica em `data/ccr/geography/`; não tratá-lo como temporário. Dados
privados e imagens resultantes ficam no workspace, nunca no cache público.
`render-map` usa valores agregados por código ou GPS explícito, sem inferir
localização de pessoas pelo nome. Fonte, período, unidade e cobertura são
responsabilidade do chamador.

## Render e documentos

O host importa `createChatRenderer`, injeta `allowResource` e plugins
confiáveis, e chama `dispose` ao remover a resposta. Conteúdo recebido não
registra plugins nem concede acesso. HTML executável usa sandbox próprio,
desligado por padrão; não relaxar CSP para recuperar conteúdo inválido.

Documento `ccr.document` v1 tem schema fechado. `export-document` gera
PNG/PDF local e manifesto com hashes, sem entrega externa; saída existente,
recurso fora da raiz, backend ausente ou schema inválido falham explicitamente.
Limites de gráficos compostos são menores que o teto geral de linhas.

## Referências e diagnóstico

- [Documento rico](CCR-RICH-DOCUMENT.md), [exportação e limites](document-export.md).
- [Mapas, cache e fontes](geographic-map.md), [receitas](geographic-recipes.md).
- [Timeline progressiva](PROGRESSIVE-HISTORY-CONTRACT.md), [ações](CCR-ACTIONS.md).
- [Contrato de apresentação](CHAT-PRESENTATION-CONTRACT.md), [histórico](history.md).

Em erro, conferir versão do renderer do host e do Python separadamente,
capabilities reais, callbacks de recurso, autorização e estado do cache.
Tabela acessível ou arquivo comum são resultados distintos do visual esperado;
não afirmar que o mapa/exportação funcionou somente por não haver exceção.
