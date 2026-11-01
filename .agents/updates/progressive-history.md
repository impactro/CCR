# CCR-PROGRESSIVE-HISTORY — revisão 2

- Tipo: handoff de desenvolvimento externo; não é funcionalidade instalada.
- Decisão: Fábio, 01/11/2026. Iniciativa única: renderização comum, histórico
  progressivo, navegação contextual e serviços JSON desacoplados.
- Fonte única: [pedido consolidado e aceite](../../docs/progressive-history.md).
- Controle existente: [CCR#1](https://github.com/impactro/CCR/issues/1).
- Executar em outra máquina; devolver commits/artefatos/testes/métricas para
  inspeção neste chat e depois teste de Fábio, antes de promoção neste ambiente.
- CCR fornece render/hover/tooltip/timeline; hosts fornecem áreas/contexto;
  CCI/CWH/CMAIL fornecem dados e ações autorizadas. Piloto: CMAIL no CWH, depois CAW.
- Barra sem limite fixo de atalhos, conforme viabilidade. Navegação e conteúdo
  possuem estados de carga independentes. Tokens de serviço não vão aos assets.
- Loading CAW e migração CMAIL são antecedentes concluídos, não tarefas novas.
- Substitui a revisão 1 deste aviso; concilia o mapa de composição CAW na mesma iniciativa.
- Não alterar runtime, dados, versões instaladas, sessões ou mensagens por
  aplicar este aviso. A recuperação desta publicação é documental pelo Git.
