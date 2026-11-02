# Receitas, não datasets versionados

Dados públicos baixados, tabelas derivadas e desenhos ficam somente no cache
local permanente do consumidor, fora do Git. O pacote contém o motor Python,
[receitas e origens](../../python/ccr/recipes/geography.json),
[skill canônico](../../python/ccr/skills/geographic-map/SKILL.md) e
[procedimento](../../docs/geographic-map.md).

Use `python tools/manage-geography.py --help` neste checkout, ou
`python -s -m ccr --help` com o pacote instalado. Primeira demanda cria o recorte;
as seguintes reutilizam a mesma base verificada, mesmo sem internet.
