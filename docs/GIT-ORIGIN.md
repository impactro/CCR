# CCR — origem oficial e dependências Git

Em 31/10/2026, por solicitação de Fábio, o histórico Git local de CChatRender
foi publicado integralmente no repositório público
**https://github.com/impactro/CCR**. Remoto SSH:
`git@github.com:impactro/CCR.git`; HTTPS:
`https://github.com/impactro/CCR.git`; branch principal: `main`.

Não houve extração nova, fork ou geração de implementação substituta. O último
commit anterior à publicação era
`0d0abcaef7c2c6d34c6c68f547906f7293dd21ba`, mapa de quatro consumidores e
capacidades ricas. Esse commit e todo o seu histórico estão no remoto oficial.
As referências antigas a "Git local sem remoto" descrevem a situação anterior
e não devem ser usadas como orientação operacional atual.

## Identidade e contrato de distribuição

- Repositório GitHub: `impactro/CCR`.
- Nome humano: CCR — Crânio Chat Render.
- Pacote JavaScript: `@crania/chat-render`.
- Diretório físico padronizado: `CM/CCR`, igual ao repositório GitHub.
- O antigo clone `CM/CChatRender` no LAB foi renomeado preservando .git e
  arquivos locais. Isso não muda imports, pacote npm ou contratos de runtime.
- `private: true` em package.json impede publicação acidental no registry npm;
  não indica a visibilidade do GitHub, que é pública.
- A origem Git recebe commits de código e de documentação. Uma mudança só de
  procedência não cria uma nova versão funcional nem muda os tarballs históricos.

## Como consumir

Obter uma fonte Git real. A partir da pasta `CM`:

```sh
git clone https://github.com/impactro/CCR.git CCR
git -C CCR rev-parse HEAD
git -C CCR remote -v
```

Se já existir um clone, conferir remoto, alterações e worktrees antes de atualizar
ou renomear. Não sobrescrever um diretório `CCR` existente nem criar outra cópia
para contornar trabalho em andamento. Documentação atual dos consumidores deve
apontar para esse clone e para a revisão utilizada; snapshots históricos ficam
inalterados. Recursos compilados em vendor são saídas de build da fonte Git.

Direção do proprietário em02/11/2026: acompanhar main oficial no manifesto;
o lock de cada publicação conserva a revisão completa testada:

```json
{
  "dependencies": {
    "@crania/chat-render": "git+https://github.com/impactro/CCR.git#main"
  }
}
```

No SYNC, resolver a revisão oficial, atualizar e commitar o package-lock.json,
validar a integração e conferir o SHA resolvido. npm ci reproduz essa composição
na instalação. Não adquirir fonte flutuante durante a conversa nem usar link
para diretório irmão, tarball sem origem ou pacote virtual. Dependências
CM/* e ALP usam faixas compatíveis, sem pins exatos nos requisitos.

O build do consumidor importa o pacote instalado e produz seus assets fechados.
Esses assets podem integrar bundle, tarball ou wheel do produto com procedência
documentada; são saída de build, não outra fonte do CCR. Serviços de produção
não executam Git/npm nem dependem da localização de um checkout para renderizar.

## Revisões dos consumidores no momento da publicação

| Consumidor | Versão já usada | Commit de código publicado no CCR | Dono da migração de origem |
| --- | --- | --- | --- |
| CWH WhatsApp e Assistente | 26.10.30-b | `8bfc3ea1ed96f1ee9512a95f71c8273671bc1e88` | DEV CWH, por pedido direto de Fábio |
| CCI Explorador | 26.10.30-a | `bdd74b9635b1eebfa9a97808189cfa52b3b07e5b` | AIstein CCI |
| ALP / Pergunte Aí | 26.10.29-d | `37c03818b471a3919476271ff96675ff8c74d2bd` | AIstein ALP, por pedido direto de Fábio |
| CAW | Migração CCR futura | Sem dependência CCR adotada neste corte | Dono CAW em rodada posterior |

Esta tabela registra a baseline; não comprova que os consumidores já concluíram
a migração Git. Cada dono devolve commit consumidor, SHA CCR resolvido, testes
e limitações. Uma migração de origem preserva a versão funcional; upgrades de
capacidade são tratados e validados separadamente.

## Procedência histórica preservada

Os consumidores guardavam tarballs imutáveis, alguns recebidos pelo Git CWH.
Não alterar seu conteúdo/hash, nem reescrever um recibo antigo para fingir que
ele já vinha do novo remoto. Registrar o novo caminho oficial e a revisão real.
Também não editar snapshots de documentação cujo hash foi publicado.

O código continua com origem na extração/generalização do Pergunte Aí e nos
contratos de apresentação compartilhados. A publicação em impactro/CCR muda
a distribuição da fonte, sem transferir para o renderizador transporte,
autenticação, banco, identidade ou decisões de negócio dos produtos.
