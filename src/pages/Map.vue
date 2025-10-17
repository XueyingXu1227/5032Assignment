<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { loopFootRoute, humanKM, humanMin } from '@/services/map'

const map = ref(null)
const mapEl = ref(null)

const me = ref(null)
const routeInfo = ref('')
const directions = ref([])
let meMarker = null

const candidates = ref([])
let routeSourceId = 'route-src'
let routeLayerId = 'route-layer'

const pace = ref('walk')
const customSpeed = ref(6)
const minutes = ref(20)

const SPEEDS = {
  walk: 4,
  brisk: 5.5,
  jog: 8,
}

/* init Mapbox map with basic controls */
onMounted(() => {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
  map.value = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [144.9631, -37.8136],
    zoom: 12,
    attributionControl: true,
    cooperativeGestures: true,
    pitchWithRotate: false,
  })
  map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')
})

/* clean up map and layers when leaving the page */
onBeforeUnmount(() => {
  clearRoute()
  if (meMarker) meMarker.remove()
  if (map.value) map.value.remove()
})

/* locate user and add a marker on the map */
async function locateMe() {
  if (!navigator.geolocation) throw new Error('Geolocation not supported')
  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
    })
  })
  me.value = { lat: pos.coords.latitude, lon: pos.coords.longitude }
  const ll = [me.value.lon, me.value.lat]
  if (!meMarker) {
    meMarker = new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat(ll)
      .setPopup(new mapboxgl.Popup({ offset: 12 }).setText('You are here'))
      .addTo(map.value)
  } else {
    meMarker.setLngLat(ll)
  }
  map.value.easeTo({ center: ll, zoom: 14, duration: 0 })
}

/* fit map to a list of lng/lat pairs */
function fitToBoundsLngLatPairs(pairs) {
  if (!pairs.length) return
  const b = new mapboxgl.LngLatBounds(pairs[0], pairs[0])
  for (let i = 1; i < pairs.length; i++) b.extend(pairs[i])
  map.value.fitBounds(b, { padding: 60, duration: 0 })
}

/*  clear active route and directions list */
function clearRoute() {
  routeInfo.value = ''
  directions.value = []
  if (map.value?.getLayer(routeLayerId)) map.value.removeLayer(routeLayerId)
  if (map.value?.getSource(routeSourceId)) map.value.removeSource(routeSourceId)
}

/* find a destination point by bearing and distance */
function destByBearing(center, distanceMeters, bearingDeg) {
  const theta = (bearingDeg * Math.PI) / 180
  const dNorth = Math.cos(theta) * distanceMeters
  const dEast = Math.sin(theta) * distanceMeters
  const dLat = dNorth / 111320
  const dLon = dEast / (111320 * Math.cos((center.lat * Math.PI) / 180))
  return { lat: center.lat + dLat, lon: center.lon + dLon }
}

/*  build 3 candidate out-and-back routes by heading */
async function recommendRoutes() {
  try {
    clearRoute()
    if (!me.value) await locateMe()
    if (!me.value) return

    const speedKmh = (pace.value === 'custom' ? Number(customSpeed.value) : SPEEDS[pace.value]) || 5
    const targetSec = Number(minutes.value) * 60
    const speedMps = (speedKmh * 1000) / 3600
    const oneWayMeters = (speedMps * targetSec) / 2

    const headings = [20, 140, 260]
    const results = []

    for (const h of headings) {
      const to = destByBearing(me.value, oneWayMeters, h)

      // ask OSRM via loopFootRoute for a foot route, then flip to [lng,lat]
      const r = await loopFootRoute(me.value, to)

      const lineLngLat = r.coordinates.map(([lat, lon]) => [lon, lat])
      results.push({
        id: `h${h}`,
        heading: h,
        to,
        distance: r.distance,
        duration: r.duration,
        steps: r.steps,
        line: lineLngLat,
      })
    }

    //Pick the route whose duration is closest to target time
    results.sort((a, b) => Math.abs(a.duration - targetSec) - Math.abs(b.duration - targetSec))
    candidates.value = results

    if (candidates.value.length) selectRoute(candidates.value[0].id)
  } catch (e) {
    console.error(e)
    alert('Failed to generate routes. Try a different time or pace.')
  }
}

/* draw the chosen route on the map and build turn list */
function selectRoute(id) {
  const item = candidates.value.find((x) => x.id === id)
  if (!item) return

  if (map.value.getSource(routeSourceId)) {
    map.value.getSource(routeSourceId).setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: item.line },
      properties: {},
    })
  } else {
    map.value.addSource(routeSourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: item.line },
        properties: {},
      },
    })
    map.value.addLayer({
      id: routeLayerId,
      type: 'line',
      source: routeSourceId,
      paint: { 'line-color': '#1d4ed8', 'line-width': 5, 'line-opacity': 0.7 },
    })
  }
  fitToBoundsLngLatPairs(item.line)
  routeInfo.value = `~${humanKM(item.distance)} km · ${humanMin(item.duration)} min`

  directions.value = item.steps.map((s, i) => ({
    idx: i + 1,
    text: `${s.type}${s.modifier ? ' ' + s.modifier : ''}${s.name ? ' on ' + s.name : ''}`.trim(),
    distance: Math.round(s.distance),
  }))
}

/* remove all candidates and clear the map line */
function clearCandidates() {
  candidates.value = []
  clearRoute()
}
</script>

<template>
  <div class="container mt-4">
    <!-- simple explainer of how to use the route tool -->
    <h2 class="mb-3">Healthy Route Recommender</h2>

    <!-- region label explains map data sources -->
    <div class="alert alert-info mb-3" role="region" aria-label="How this works">
      <strong>Plan a workout route</strong>
      <ul class="mb-0 mt-2">
        <li>Choose your pace and time.</li>
        <li>Tap <em>Recommend</em> to get routes that start and end at your location.</li>
        <li>Select a route to view the line and step-by-step guidance.</li>
      </ul>
      <small class="text-muted d-block mt-2">
        Map data © OpenStreetMap contributors • Rendering by Mapbox GL • Routing by OSRM.
      </small>
    </div>

    <!-- pick pace and time then generate suggestions -->
    <div class="controls row g-2 align-items-center mb-3">
      <div class="col-auto">
        <!-- Locate user on map -->
        <button class="btn btn-outline-primary" @click="locateMe">Locate me</button>
      </div>

      <div class="col-auto">
        <!--Pace selector with custom speed option -->
        <label class="form-label me-2 mb-0">Pace</label>
        <select class="form-select d-inline-block" style="width: auto" v-model="pace">
          <option value="walk">Walk (~4 km/h)</option>
          <option value="brisk">Brisk (~5.5 km/h)</option>
          <option value="jog">Jog (~8 km/h)</option>
          <option value="custom">Custom</option>
        </select>
        <input
          v-if="pace === 'custom'"
          class="form-control d-inline-block ms-2"
          type="number"
          min="3"
          step="0.5"
          v-model.number="customSpeed"
          placeholder="km/h"
          style="width: 100px"
        />
      </div>

      <div class="col-auto">
        <!-- Time selector for total workout minutes -->
        <label class="form-label me-2 mb-0">Time</label>
        <select class="form-select d-inline-block" style="width: auto" v-model.number="minutes">
          <option :value="10">10 min</option>
          <option :value="20">20 min</option>
          <option :value="30">30 min</option>
        </select>
      </div>

      <div class="col-auto">
        <!-- Generate recommended routes -->
        <button class="btn btn-primary" @click="recommendRoutes">Recommend</button>
      </div>

      <div class="col-auto">
        <!-- Clear candidates and remove route line -->
        <button class="btn btn-outline-secondary" @click="clearCandidates">Clear</button>
      </div>

      <!-- Quick summary of chosen route distance and time -->
      <div class="col-auto ms-auto" v-if="routeInfo">
        <span class="badge bg-secondary">{{ routeInfo }}</span>
      </div>
    </div>

    <!-- Map container with ARIA role for assistive tech -->
    <div
      ref="mapEl"
      role="application"
      aria-label="Workout routes map"
      style="height: 460px; width: 100%; border-radius: 8px; border: 1px solid #eee"
    ></div>

    <!-- List of suggested routes with quick select -->
    <div class="mt-3" v-if="candidates.length">
      <h5 class="mb-2">Suggested routes (out-and-back)</h5>
      <div class="row g-3">
        <div class="col-12 col-md-4" v-for="c in candidates" :key="c.id">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <strong>Heading {{ c.heading }}°</strong>
                <span class="badge bg-primary"
                  >~{{ (c.distance / 1000).toFixed(2) }} km ·
                  {{ Math.round(c.duration / 60) }} min</span
                >
              </div>
              <p class="text-muted mb-2">Out-and-back route from your location.</p>
              <button class="btn btn-outline-primary w-100" @click="selectRoute(c.id)">
                Select
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Directions list — step by step guidance for the chosen route -->
    <div class="mt-4" v-if="directions.length">
      <h5 class="mb-2">Turn-by-turn directions</h5>
      <ol class="list-group list-group-numbered">
        <li
          v-for="d in directions"
          :key="d.idx"
          class="list-group-item d-flex justify-content-between"
        >
          <span>{{ d.text || 'Continue' }}</span>
          <span class="text-muted">{{ d.distance }} m</span>
        </li>
      </ol>
    </div>
  </div>
</template>
