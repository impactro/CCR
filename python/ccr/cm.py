"""Standard CM discovery; selection/authorization remains owned by the host."""
from pathlib import Path
from . import __version__

def describe():
    operations={
        'render-positions':{'description':'Mapa local de clientes em raio definido, PNG/SVG/HTML com links; sem consultas externas ou envio.','argv':['render-positions'],'effects':['read-files','write-files']},
        'prepare-map':{'description':'Reutiliza cache ou obtém fonte pública e desenha fronteiras do mundo ao bairro; sem dados de cliente.','argv':['prepare-map'],'effects':['read-files','write-files','network-public-geography-on-cache-miss']},
        'lookup-place':{'description':'Resolve nome/IBGE/UF por catálogo local criado sob demanda, preservando homônimos; sem enviar catálogo inteiro ao modelo.','argv':['lookup-place'],'effects':['read-files','write-files','network-public-geography-on-cache-miss']},
        'render-map':{'description':'Sobrepõe quantidades agregadas por fronteira e GPS do cliente em SVG/PNG dentro do workspace; não envia mensagem.','argv':['render-map'],'effects':['read-files','write-files','network-public-geography-on-cache-miss']},
        'export-document':{'description':'Exporta documento CES em PNG/PDF real, com runtime local fechado, recursos lógicos PNG/JPEG e manifesto exato; sem rede nem envio.','argv':['export-document'],'effects':['read-files','write-files']},
    }
    return {'id':'ccr','contractVersion':3,'version':__version__,'pythonModule':'ccr','description':'Render rico comum e receitas cartográficas por fronteiras, com cache permanente local do mundo ao bairro.','requires':[],
            'skillGroups':[
                {'id':'positions','name':'Mapa de posições','description':'Raio e pontos já autorizados, sem geocodificação ou envio.','skills':[{'path':(Path(__file__).parent/'skills/position-map/SKILL.md').resolve(),'operations':['render-positions']}]},
                {'id':'geography','name':'Mapas por demanda','description':'Intenção de localização, recorte, fronteiras reais, origem e PNG por canal.','skills':[{'path':(Path(__file__).parent/'skills/geographic-map/SKILL.md').resolve(),'operations':['prepare-map','lookup-place','render-map']}]},
                {'id':'documents','name':'Relatórios e exportação','description':'Composição tipada e artefatos locais.','skills':[{'path':(Path(__file__).parent/'skills/document-export/SKILL.md').resolve(),'operations':['export-document']}]}
            ], 'operations':operations}
