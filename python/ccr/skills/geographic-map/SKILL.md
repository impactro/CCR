---
name: geographic-map
description: Localiza e quantifica clientes, instalações, lojas e máquinas em mapas de fronteiras reais, do mundo ao bairro, com receitas e cache sob demanda; entrega PNG no CAX/WhatsApp.
---

# Mapas geográficos por demanda

Use para “Onde estão?”, “Cadê meus clientes?”, “Mapa de clientes/instalações/
máquinas/lojas”, cidades, estados, países, continentes, bairros ou GPS. Contexto
define o objeto; não exigir a palavra mapa. Mapa significa geográfico; calor
somente quando pedido. Quantificar regiões por preenchimento proporcional
não transforma automaticamente o pedido em mapa de calor.

## Intenção e evidência

1. Obter os fatos pela fonte autorizada do consumidor: cadastro, consulta,
   histórico ou tabela. Grupo “Campinas” sugere cidade; não prova cliente/GPS.
2. Escolher a unidade: quantidade distinta de clientes, instalações, máquinas,
   lojas ou mensagens; nunca confundir linhas/mensagens com clientes únicos.
3. Cruzar nome, UF, país e código oficial usando `lookup-place`. Homônimos e
   nível ambíguo (São Paulo cidade/estado) permanecem explícitos. Informar
   cobertura, sem localização, zero/nulo e critérios de agrupamento.
4. Escolher menor recorte que explica a distribuição: mundo → continente →
   país → Brasil/UF → município → bairro. Solicitação explícita prevalece.

## Receita, cache e fronteiras

`prepare-map` consulta primeiro o cache público permanente do consumidor.
Ausente: baixa fonte oficial conhecida, valida e gera somente esse recorte.
Presente: reutiliza vetores, tabelas e SVG/PNG sem rede. Não desenhar o atlas
inteiro, baixar mundo para uma UF, refazer script por resposta nem mandar
milhares de localidades ao modelo. Python do CCR faz o trabalho fora do LLM.

Fronteiras são sempre polígonos reais: países no mundo/continente, UFs no
Brasil, municípios dentro da UF, bairros dentro do município. Pontos são
GPS de lojas/máquinas sobre a base; ponto de sede não substitui limite de cidade.
Não criar bairros a partir de setores, distritos ou rótulos de mapa.

```sh
python -s -m ccr prepare-map --agent-root . --key brazil
python -s -m ccr prepare-map --agent-root . --key state-SP --png
python -s -m ccr prepare-map --agent-root . --key world
python -s -m ccr prepare-map --agent-root . --key continent-europa
python -s -m ccr prepare-map --agent-root . --key country-FRA
python -s -m ccr prepare-map --agent-root . --key municipality-3547809
python -s -m ccr prepare-map --agent-root . --key neighborhoods-3547809 --png
python -s -m ccr prepare-map --agent-root . --key neighborhood-3547809-centro --png
python -s -m ccr lookup-place --agent-root . --kind city --state SP --name "Santo André"
```

Santo André/SP (IBGE3547809) é o exemplo municipal com112 bairros oficiais
SIGA; a receita documenta URL, camada, campos e cobertura. Outros municípios
precisam provedor municipal documentado; ausência retorna indisponibilidade.
Fonte mundial possui países/territórios e agrupamentos próprios; não inventar
fronteira continental em país transcontinental. Cache e derivados ficam fora
do Git e da limpeza de temp. Atualização só via `--refresh`, sem apagar a base
válida antes de obter e validar a substituta.

## Render, interação e canal

`render-map` recebe JSON local com `title`, `values:[{code,value}]` agregados
por código de região e/ou `points:[{latitude,longitude,label}]`. Códigos devem
pertencer ao recorte; não somar duplicatas silenciosamente. A base pública
compartilhada nunca recebe valores privados. O resultado fica em temp/outputs
do workspace autorizado, separado do cache de bases.

```sh
python -s -m ccr render-map --agent-root . --key state-SP --data temp/valores.json --output outputs/AAAA-MM/mapa-clientes.png
```

Use legenda, título, fonte, período/critério quando disponível, unidade e
cobertura. Visualizar o resultado: enquadramento, fronteiras, corte, rótulos,
valores e legibilidade. Base vazia não é mapa de clientes concluído.
No CAW/CWH/CCI, usar render geográfico CCR e tabela acessível. No CAX/WhatsApp,
gerar PNG real por tool disponível, validar/registrar artefato e só então
entregar pelo transporte autorizado; não responder apenas JSON/HTML ou alegar
imagem sem arquivo. Se usar `python-run`, declarar array `artifacts` obrigatório.

Falha da fonte/rede: explicar que no momento não foi possível obter o recorte;
informar provedor/etapa para revisão. Não inventar geometrias, trocar fonte
silenciosamente, apagar cache válido nem repetir download em loop. As tools
nunca enviam mensagens e não concedem acesso ao banco ou a outro workspace.
