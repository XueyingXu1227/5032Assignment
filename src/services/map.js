const OSRM = 'https://router.project-osrm.org/route/v1/foot'

export async function loopFootRoute(from, to) {
  const coordStr = `${from.lon},${from.lat};${to.lon},${to.lat};${from.lon},${from.lat}`
  const url = `${OSRM}/${coordStr}?overview=full&geometries=geojson&steps=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM failed: ${res.status}`)
  const json = await res.json()
  const route = json.routes && json.routes[0]
  if (!route) throw new Error('No route')

  const coords = (route.geometry?.coordinates || []).map(([lon, lat]) => [lat, lon])

  const steps = []
  const legs = route.legs || []
  for (const leg of legs) {
    for (const s of leg.steps || []) {
      steps.push({
        distance: s.distance,
        name: s.name || '',
        type: s.maneuver?.type || '',
        modifier: s.maneuver?.modifier || '',
      })
    }
  }

  return {
    distance: route.distance,
    duration: route.duration,
    coordinates: coords,
    steps,
  }
}

export function humanKM(m) {
  return (m / 1000).toFixed(2)
}
export function humanMin(s) {
  return Math.round(s / 60)
}
