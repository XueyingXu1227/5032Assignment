/* OSRM public API base for foot routes */
const OSRM = 'https://router.project-osrm.org/route/v1/foot'

/* get an out-and-back (loop) walking route with steps
   from: { lat, lon }
   to:   { lat, lon }
   Returns: { distance, duration, coordinates([lat,lon]), steps[] } */
export async function loopFootRoute(from, to) {
  // build "start;dest;start" to make an out-and-back loop
  const coordStr = `${from.lon},${from.lat};${to.lon},${to.lat};${from.lon},${from.lat}`
  const url = `${OSRM}/${coordStr}?overview=full&geometries=geojson&steps=true`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM failed: ${res.status}`)

  const json = await res.json()
  const route = json.routes && json.routes[0]
  if (!route) throw new Error('No route')

  // flip to [lat, lon] so it matches our map usage
  const coords = (route.geometry?.coordinates || []).map(([lon, lat]) => [lat, lon])

  // flatten per-leg steps into a simple list
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

/* meters to km (2 decimals) */
export function humanKM(m) {
  return (m / 1000).toFixed(2)
}

/*seconds to whole minutes */
export function humanMin(s) {
  return Math.round(s / 60)
}
