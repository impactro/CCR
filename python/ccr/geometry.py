"""Public geometry transforms; no stored map data."""
def rounded(value):
    if isinstance(value, list):
        return [rounded(item) for item in value]
    return round(value, 5) if isinstance(value, float) else value


def center(geometry):
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    total = xsum = ysum = 0
    for polygon in polygons:
        ring = polygon[0]
        cross = [a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:])]
        area = sum(cross)
        if not area:
            continue
        x = sum((a[0]+b[0])*v for a,b,v in zip(ring,ring[1:],cross))/(3*area)
        y = sum((a[1]+b[1])*v for a,b,v in zip(ring,ring[1:],cross))/(3*area)
        weight = abs(area)
        total += weight; xsum += x*weight; ysum += y*weight
    assert total
    return round(ysum/total,5),round(xsum/total,5)


def simplify_ring(points, tolerance=0.03):
    """Bound coastline detail at build time; preserve closed rings/country identity."""
    if len(points)<=4:
        return points
    keep={0,len(points)-1};stack=[(0,len(points)-1)]
    while stack:
        first,last=stack.pop();a,b=points[first],points[last]
        vx,vy=b[0]-a[0],b[1]-a[1];length=vx*vx+vy*vy;furthest=None;maximum=tolerance*tolerance
        for index in range(first+1,last):
            p=points[index];ratio=max(0,min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/length)) if length else 0
            distance=(p[0]-a[0]-ratio*vx)**2+(p[1]-a[1]-ratio*vy)**2
            if distance>maximum:maximum=distance;furthest=index
        if furthest is not None:keep.add(furthest);stack.extend(((first,furthest),(furthest,last)))
    result=[points[index] for index in sorted(keep)]
    return result if len(result)>=4 else points


def simplified_geometry(geometry):
    polygons=[geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
    simplified=[[simplify_ring(ring) for ring in polygon] for polygon in polygons]
    return {'type':geometry['type'],'coordinates':rounded(simplified[0] if geometry['type']=='Polygon' else simplified)}

