# Testes do CCR

Todos os testes JavaScript do módulo ficam em unit/. São unidades de
apresentação com Node/JSDOM; helpers/ contém apenas fixtures e conclusões
assíncronas controladas. Não iniciam navegador, serviço, modelo ou transporte.
A integração visual real pertence ao consumidor CAW/CWH/CCI.

## Executar

Na raiz do CCR, com dependências do lock instaladas e Node24:

```sh
npm test
npm run test:coverage
```

O primeiro comando descobre toda a suíte unitária. O segundo mede exatamente
contextual-views, progressive-history e conversation, gerando LCOV em
.agents/temp/tests/unit.lcov. Gate:99% linhas,90% ramos e95% funções. Sem
dependência de uma ferramenta externa de cobertura ou acesso de rede no teste.

## Revisão de01/11/2026

| Medida V8, nos três componentes | Antes | Depois |
| --- | ---: | ---: |
| Linhas |98,79%|100%|
| Ramos |82,07%|92,82%|
| Funções |91,43%|97,18%|
| Casos focais |22|45|
| Suíte unitária completa |67|90|

Baseline:878ad74, antes da reorganização e ampliação. Medições do mesmo
conjunto de fontes, com Node24.21.0; não representam cobertura de todo o CCR.
Arquivos movidos preservam os casos anteriores; imports e discovery foram
atualizados, sem cópia antiga dos testes na raiz.

Novos cenários verificam cancelamento antes do dispatch, troca de contexto
dentro de callback, descarte sem reentrada, erro/retry por região, retorno
inválido do adaptador, rollback de uma página, nó duplicado, métricas ausentes
ou zero e cancelamento dos listeners. Seis falhas de ciclo de vida foram
reproduzidas antes da correção: callbacks durante dispose, consulta depois de
suspensão, limpeza de handle inválido na timeline e nas regiões, navegação
repetida após redirecionamento e descarte repetido por reentrada na suspensão.

JSDOM não comprova geometria, CSP do navegador, reprodução de mídia ou contas
autorizadas. Não ampliar permissões para fazer um teste passar nem substituir
uma dependência oficial por checkout irmão nos builds dos consumidores.
