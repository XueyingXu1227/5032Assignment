const MAPBOX_GEOCODE = 'https://api.mapbox.com/geocoding/v5/mapbox.places'
const OSRM = 'https://router.project-osrm.org/route/v1/foot'

function bboxFromCircle(center, radiusMeters = 2000) {
  const dLat = radiusMeters / 111320
  const dLon = radiusMeters / (111320 * Math.cos((center.lat * Math.PI) / 180))
  return [center.lon - dLon, center.lat - dLat, center.lon + dLon, center.lat + dLat]
}

const CATEGORIES = {
  gym: ['gym', 'fitness center', 'health club'],
  clinic: ['clinic', 'doctor', 'medical', 'urgent care', 'dental clinic'],
  supermarket: ['supermarket', 'grocery store'],
  park: ['park', 'garden'],
}

function toPOIs(features) {
  const seen = new Set()
  const arr = (features || [])
    .map((f) => {
      const lat = f.center?.[1]
      const lon = f.center?.[0]
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      const id = f.id || `${lon},${lat}`
      if (seen.has(id)) return null
      seen.add(id)
      return {
        id,
        name: f.place_name || f.text,
        lat,
        lon,
        bbox: f.bbox || null,
        type: f.place_type?.[0] || 'poi',
        category: f.properties?.category || '',
      }
    })
    .filter(Boolean)
  return arr
}

export async function searchPlaces(keyword, center, radiusMeters = 2000) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token) throw new Error('Missing VITE_MAPBOX_TOKEN')

  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  const catList = CATEGORIES[kw] || null
  const bbox = bboxFromCircle(center, radiusMeters).join(',')
  const base = MAPBOX_GEOCODE

  const p1 = new URLSearchParams({
    access_token: token,
    limit: '20',
    language: 'en',
    types: 'poi',
    proximity: `${center.lon},${center.lat}`,
    bbox,
  })
  if (catList) p1.set('categories', catList.join(','))
  const q1 = catList ? 'poi' : kw || 'search'
  let res = await fetch(`${base}/${encodeURIComponent(q1)}.json?${p1.toString()}`)
  let data = res.ok ? await res.json() : { features: [] }
  let feats = Array.isArray(data.features) ? data.features : []
  let pois = toPOIs(feats)

  if (!pois.length) {
    const p2 = new URLSearchParams({
      access_token: token,
      limit: '20',
      language: 'en',
      types: 'poi,poi.landmark',
      proximity: `${center.lon},${center.lat}`,
      bbox,
    })
    const u2 = `${base}/${encodeURIComponent(kw || 'search')}.json?${p2.toString()}`
    res = await fetch(u2)
    data = res.ok ? await res.json() : { features: [] }
    feats = Array.isArray(data.features) ? data.features : []
    pois = toPOIs(feats)
  }

  if (!pois.length) {
    const p3 = new URLSearchParams({
      access_token: token,
      limit: '5',
      language: 'en',
      types: 'address,place,locality,neighborhood',
      proximity: `${center.lon},${center.lat}`,
      bbox,
    })
    const u3 = `${base}/${encodeURIComponent(kw || 'search')}.json?${p3.toString()}`
    res = await fetch(u3)
    data = res.ok ? await res.json() : { features: [] }
    feats = Array.isArray(data.features) ? data.features : []
    pois = toPOIs(feats)
  }

  return pois
}

export async function footRoute(from, to) {
  const url = `${OSRM}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const json = await res.json()
  const route = json.routes && json.routes[0]
  if (!route) throw new Error('No route found')
  const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
  return { distance: route.distance, duration: route.duration, coordinates: coords }
}
