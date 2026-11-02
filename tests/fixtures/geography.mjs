// Deliberately synthetic rectangles, never production cartography.
export function publicFixture(){
 const region=(code,name,x,y,extra={})=>({code,name,latitude:y+.5,longitude:x+.5,geometry:{type:'Polygon',coordinates:[[[x,y],[x+1,y],[x+1,y+1],[x,y+1],[x,y]]]},...extra});
 const states=[region('35','São Paulo',-47,-24,{uf:'SP'}),region('26','Pernambuco',-35,-9,{uf:'PE'}),region('29','Bahia',-39,-13,{uf:'BA'})];
 const municipalities=[region('2600001','Recife',-35,-9,{uf:'PE'}),region('3500001','Arujá',-47,-24,{uf:'SP'})];
 const countries=[region('FRA','França',2,46,{iso2:'FR',iso3:'FRA',name_en:'France',continent:'Europa'}),region('DEU','Alemanha',10,50,{iso2:'DE',iso3:'DEU',continent:'Europa'}),region('BRA','Brasil',-50,-15,{iso2:'BR',iso3:'BRA',continent:'América do Sul'}),region('PRT','Portugal',-8,39,{iso2:'PT',iso3:'PRT',continent:'Europa'})];
 return {key:'injected',states,cities:municipalities.map(r=>[r.name,r.uf,r.latitude,r.longitude,r.code]),municipalities,regions:municipalities,countries,attribution:'Synthetic test cartography',obtainedAt:'test'};
}
