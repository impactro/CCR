import {createDataTable} from './data.js';
import {validateTable} from './data-value.mjs';
import {chartScene,sceneSvg} from './chart-spec.mjs';
export const localChartViews=new Set(['bar','column','line','area']);
export function createDataChart(document,value,{view=value?.view||'bar',locale='pt-BR'}={}){
 const figure=createDataTable(document,value,{locale});
 if(value.chart!==undefined&&!['line','column'].includes(view))throw Error('invalid_chart_view');
 if(!localChartViews.has(view))return figure;
 const validated=validateTable(value),scene=chartScene({...validated,chart:value.chart},{view});
 if(!scene)return figure;
 const template=document.createElement('template');template.innerHTML=sceneSvg(scene,String(value.title||'Gráfico'));
 const svg=template.content.firstElementChild;svg.style.width='100%';svg.style.height='auto';
 figure.insertBefore(svg,figure.querySelector('table'));figure.classList.add('chat-local-chart');figure.localChart=true;figure.ready=Promise.resolve();return figure;
}
