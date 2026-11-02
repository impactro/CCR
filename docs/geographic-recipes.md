# Receitas geográficas e cache permanente sob demanda

Direção aprovada em02/11/2026: Git contém receitas Python, contratos, URLs,
prompts e testes sintéticos. Não contém vetores baixados, tabelas públicas
completas, CSV/JSON derivados nem imagens geográficas geradas. A revisão
substitui a distribuição anterior de279 SVGs e catálogos completos.

## Contrato de execução

1. A intenção escolhe um recorte: mundo, continente, país, Brasil, UF,
   município ou bairros de município com provedor conhecido.
2. Consultar chave estável do cache local da instalação, separada do Git e
   dos temporários descartáveis. Conferir receita/versão e hashes.
3. Se válido, reutilizar dados, vetores e desenho sem rede. Se ausente,
   obter somente as fontes necessárias àquele recorte; não antecipar mundo
   para uma consulta de UF nem desenhar todos os mapas.
4. Validar coordenadas, identidade, cobertura e limites; gerar JSON de
   consulta e SVG. PNG é derivado local opcional, sem navegador obrigatório.
5. Publicar atomicamente só resultado completo, com origem/URL, obtenção,
   licença, transformação e hashes. Compartilhar só bases públicas entre
   usuários; fatos de clientes permanecem no workspace autorizado.
6. Falha de rede/fonte/validação retorna indisponibilidade explícita, sem
   fronteiras inventadas, troca silenciosa de fonte ou destruição do cache
   válido. Repetição concorrente da mesma chave não repete download.

Sem expiração destrutiva automática. Atualização é explícita e atômica;
cache válido não depende de a fonte continuar online. Não limpar esse cache
em rotina genérica de temp/deploy. Receitas nunca aceitam URL arbitrária do
modelo, caminhos de saída arbitrários no servidor ou dados de cliente na URL.

## Fontes e exemplos

- Mundo, países e continentes: Natural Earth em revisão Git fixa,
  domínio público; recortes derivados sem inventar classificações.
- Brasil/UF/município: malhas e Localidades IBGE. Sedes municipais pela
  Infra S.A. quando solicitadas, filtrando por UF/município quando aplicável.
- Bairros: fonte municipal específica. Exemplo Santo André/SP, código IBGE
 3547809, usando SIGA da Prefeitura. Bairro oficial não é setor censitário,
  distrito nem rótulo de ponto do OSM; não substituir esses conceitos.

Preparar amostras locais de Brasil, SP, mundo e Santo André/bairros para
inspeção em pasta aberta pelo operador. As amostras são cache, não Git.
O código deve permitir novos provedores municipais com origem documentada;
município sem provedor de bairros responde capacidade indisponível.

## Integração e validação

CCR mantém motor/receitas e distribui tools pelo contrato padrão CM, no
pacote Python `crania-ccr` (`ccr`), além da biblioteca web. As operações são
`prepare-map`, `lookup-place` e `render-map`; skill e prompt pertencem ao
mesmo módulo. CA/CAX, CWH e CCI adaptam cache e autorização do host.
O render web recebe dados pelo host e conserva a tabela acessível
durante carga/erro. Nenhum frontend baixa vetores de provedores externos.
O agente usa o mesmo motor, recebe só localidades/recortes relevantes e
entrega PNG no CAX/WhatsApp. O primeiro uso pode precisar rede; os seguintes
usam cache local sem reinferência do desenho. O padrão é sempre fronteira
poligonal: países no mundo/continente, UFs no Brasil, municípios na UF,
bairros no município. Pontos representam instalações/GPS sobre a base;
sedes de cidades não substituem os limites municipais.

Regressões: cache frio/quente, recortes independentes, concorrência, falha
de obtenção, integridade, atualização atômica, exclusão de dados no pacote,
homônimos/UF, descarte do render e ausência de vazamento entre workspaces.
Instalar somente após validar a candidata; preservar serviços e configuração.
