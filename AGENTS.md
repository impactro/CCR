# CCR

Direção Fábio02/11/2026: não bloquear evolução por versões exatas de dependências.
Usar faixas compatíveis; o lock e o recibo de cada build registram as revisões
testadas, sem impedir atualização coordenada no próximo SYNC. Consumidores podem
seguir main oficial e conferir o commit resolvido no lock; isso substitui a
exigência histórica de SHA fixo na declaração do consumidor.

Em manutenção/SYNC, ler `.agents/updates/README.md`. Avisos planejados são
handoffs, não capacidades entregues; reconciliar a referência na fila local.

Nome curto CCR; origem canônica pública `https://github.com/impactro/CCR.git`.
O nome técnico `@crania/chat-render` e os imports não mudam. Ver
`docs/GIT-ORIGIN.md` para SHAs, fronteiras e consumo. Não usar checkout virtual,
cópia local como fonte canônica ou dependência main flutuante.
Pasta física padronizada: `CM/CCR`, igual ao nome do repositório GitHub.

Biblioteca JavaScript de apresentação em CM/. Herdar ../../CServer/AGENTS.md e
../../CServer/CES/padroes/README.md, TEAM.md e guidelines.md.
Não contém motor de IA, autenticação, acesso a bancos ou identidade de produto.
O host autoriza recursos e fornece adaptadores. Manter conteúdo não confiável
isolado, limites explícitos e dispose verificável. Testes não executam modelos.

Evolução compartilhada: ler docs/shared-render-plan.md e
docs/compatibility-matrix.md antes de ciclos de render ou integração. Preservar
as linhas CAW atual e ALP atual durante a candidata comum; registrar decisões
nesses documentos e ações futuras somente na fila do projeto responsável.

Exceção técnica documentada: npm exige SemVer para dependências; converter
AA.M.Dletra em AA.M.D-letra no campo package.version. cesVersion e release.json
conservam AA.M.Dletra, com correspondência fixa e sem versão alternativa de runtime.
