# CCR — plano e fronteiras da apresentação compartilhada

## Estado da fonte

CCR26.11.2g fornece o render compartilhado e o prompt canônico, incluindo
geografia, histórico progressivo, séries explícitas e composições exportáveis.
O pacote JavaScript e o pacote Python são partes distintas do mesmo módulo.
A revisão fixada em cada consumidor e os recibos do build são a referência;
clonar ou publicar o CCR não atualiza instâncias automaticamente.

Este documento substitui o desenho exploratório de drivers de outubro. O Git
preserva aquela discussão; a implementação atual não contém uma arquitetura
paralela de drivers caw/alp/next nem exige criá-la.

## Responsabilidades implementadas

| Dono | Responsabilidade |
| --- | --- |
| CCR JavaScript | Conteúdo, tabela/dados tipados, gráficos, geografia, envelope visual, ações por callbacks e lifecycle/dispose. |
| CCR histórico progressivo | Estado de páginas, cancelamento, retry e reconciliação do que o host entrega. |
| CCR prompt | Capacidades efetivamente selecionadas, formatos, exemplos sintéticos e limites; não concede ferramentas ou acesso. |
| CCR Python | Receitas e cache público geográfico sob demanda; tools CM e exportação local de documentos com manifesto exato. |
| CAW/CWH/CCI | Identidade, usuário, conversa, backend, paginação da fonte, mídias autorizadas, plugins específicos, ações e permissões. |
| CAX | Execução autorizada das tools, registro dos arquivos e entrega PNG no WhatsApp pelo protocolo do host. |
| CWB | Transporte e identidade nativa; sem responsabilidade pelo render. |

O núcleo não envia mensagens, consulta dados privados, autentica usuários,
interpreta instruções de HTML recebido nem habilita scripts por conteúdo.
Um plugin presente em outro produto não se torna capacidade universal.

## Contratos e validação

- [Conteúdo e consumidores](RICH-CONTENT-CONSUMERS.md).
- [Documento CES](CCR-RICH-DOCUMENT.md): dados, texto, imagem por ID lógico e report.
- [Composições e exportação](document-export.md): scene SVG compartilhado,
  PNG/PDF real, tabelas paginadas, limites e recusa explícita de layout.
- [Geografia sob demanda](geographic-recipes.md): origem, cache e fronteiras;
  não versionar dados ou imagens e não enviar catálogos inteiros ao modelo.
- [Histórico progressivo](progressive-history.md): fonte estruturada do host;
  não confundir paginação visual com paginação do banco.
- [Prompt](../config/prompts/render.prompt.md): selecionar capacidades e plugins
  reais em turnos novos e retomados.

Na revisão g,116 testes Node,11 de exportação Python e10 de receitas
geográficas passaram. O wheel foi construído offline e extraído sem
node_modules; PNG/PDF reais foram gerados com criação exclusiva e manifesto
conferido. Isso comprova o módulo e não o aceite de cada aplicação.

Reports usam páginas de composição fixas e dados acessíveis; em telas pequenas
podem rolar. Exportações não prometem paridade com HTML/SPA ou com plugins
privativos de um host. Mapas usam as tools geográficas; seu PNG pode entrar
como recurso lógico explícito de um relatório.

## Adoção e pendências dos consumidores

CAW, mensagens/Assistente CWH e Explorador CCI já usam o CCR como render
compartilhado. Os recibos de cada pacote registram o SHA oficial. A adoção da
revisão g, a instalação e os testes operacionais são registrados pelos donos;
o estado do EcoServer fica em CServer/servers/EcoServer.

Permanecem aceites específicos: móvel/PWA com cache anterior e dois usuários
reais no CAW; fonte SQL paginada composta do modo Agente; tela estreita e
mudança de conta/filtro no Explorador; ferramentas/entrega de arquivo por canal.
Consultar `.agents/tasks.md` nos projetos CraniaAgent e CWH para as filas
locais dos produtos; contratos em CraniaAgent/docs/CCR-INTEGRATION.md e
CWH/docs/CWB-OWNERSHIP.md, relativos à raiz Platform do CES. Não reabrir extração já entregue nem marcar
esses aceites como concluídos por um HTTP200 ou teste do módulo.

CMAIL e CVideo não viram coletores ou renderizadores dentro do CCR. Conteúdo
Google pertence ao CMAIL e sua autenticação; email real continua sem
homologação neste ambiente. Migrações de outros consumidores exigem recibos
próprios, sem presumir estado a partir de referências históricas de ALP.
