# Tarefas pendentes

Fila única do projeto. Seguir a [governança CES](../../../CServer/CES/padroes/project-governance.md).
Concluídos saem desta fila e vão para [histórico](../docs/history.md).

Pendências preexistentes preservadas; a padronização documental não revalida
seus estados nem autoriza efeitos operacionais. Conferir baseline antes da retomada.

## BUG

## SUGESTÃO

## BACKLOG

### CCR-RENDER-RESTANTE — aceite integrado dos consumidores

- VALIDATION. Preservado da fila local anterior ao primeiro pull que a versiona.
- Restante: inspeção integrada de recursos e desempenho nos consumidores e
  aceite visual de Fábio; consultar CA:docs/inspecao-renderizacao.md.
- Timeline comum e instalação no devServer já concluídas. Não repetir esse
  desenvolvimento, a instalação ou os testes de e-mail já aceitos no CMAIL.
- Alias anterior: CCR-PROGRESSIVE-HISTORY. Não sobrepõe as entregas específicas
  de dados ricos e mídia listadas abaixo; nenhum envio ou ciclo pago implícito.

### CCR-RICH-DATA-20261103 — Google Charts e listagens compartilhadas

- DOING; root FAST, pedido direto de Fábio. Extrair CAWShowData para CCR como componente reutilizável, preservando 20 visões, busca, sort, paginação e export por callback do host. Colunas de ação recebem callbacks confiáveis, nunca HTML ou instruções serializadas dos dados.
- Aceite: testes CCR/CAW do componente e lifecycle, botões estáveis após filtro/sort/paginação, fallback sem Google, tema/responsivo, piloto visual sintético e status no subtítulo. Integração/runtime documentados separadamente.

### CCR-MEDIA-COMPONENTS-20261103

- OPEN; Fábio aprovou consolidar players/viewers chat no CCR. Dono externo AIstein CWH, handoff versionado no CWH; nenhum arquivo CCR de implementação será editado aqui. Aceite e retorno por commit/testes/limites no handoff.
