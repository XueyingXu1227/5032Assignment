const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OSRM = 'https://router.project-osrm.org/route/v1/foot'

/**
 * Keyword search (limited to near some centre + radius, returns [{id, name, lat, lon}])
 * @param {string} keyword -  'gym' | 'park' | 'clinic'
 * @param {{lat:number, lon:number}} center
 * @param {number} radiusMeters
 */
export async function searchPlaces(keyword, center, radiusMeters = 2000) {
  const dLat = radiusMeters / 111320
  const dLon = radiusMeters / (111320 * Math.cos((center.lat * Math.PI) / 180))
  const viewbox = [center.lon - dLon, center.lat - dLat, center.lon + dLon, center.lat + dLat].join(
    ',',
  )

  const url = `${NOMINATIM}?format=json&accept-language=en&q=${encodeURIComponent(keyword)}&limit=20&bounded=1&viewbox=${viewbox}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const data = await res.json()
  return (data || []).map((d, i) => ({
    id: d.place_id || `p${i}`,
    name: d.display_name,
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
    type: d.type,
  }))
}

/**
 * OSRM walking route
 * @param {{lat:number,lon:number}} from
 * @param {{lat:number,lon:number}} to
 * @returns { distance: number(m), duration: number(s), coordinates: [ [lat,lon], ... ] }
 */
export async function footRoute(from, to) {
  const url = `${OSRM}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const json = await res.json()
  const route = json.routes && json.routes[0]
  if (!route) throw new Error('No route')
  const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
  return {
    distance: route.distance,
    duration: route.duration,
    coordinates: coords,
  }
}
