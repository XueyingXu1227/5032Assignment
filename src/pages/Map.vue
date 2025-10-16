<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { searchPlaces, footRoute } from '@/services/map'

// UI status
const map = ref(null)
const mapEl = ref(null)
const me = ref(null) // {lat, lon}
const keyword = ref('gym')
const radius = ref(2000)
const results = ref([])
const routeInfo = ref('')

let meMarker = null
let poiMarkers = []
const ROUTE_SOURCE_ID = 'route-src'
const ROUTE_LAYER_ID = 'route-layer'

// 初始化地图
onMounted(() => {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
  map.value = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [144.9631, -37.8136], // Melbourne
    zoom: 12,
    attributionControl: true,
    cooperativeGestures: true,
    pitchWithRotate: false,
  })

  map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')
})

onBeforeUnmount(() => {
  clearRoute()
  clearPoiMarkers()
  if (meMarker) meMarker.remove()
  if (map.value) map.value.remove()
})

function clearPoiMarkers() {
  poiMarkers.forEach((m) => m.remove())
  poiMarkers = []
}

function fitToBoundsLngLatPairs(pairs) {
  if (!pairs.length) return
  const b = new mapboxgl.LngLatBounds(pairs[0], pairs[0])
  for (let i = 1; i < pairs.length; i++) b.extend(pairs[i])

  map.value.fitBounds(b, { padding: 60, duration: 0 })
}

async function locateMe() {
  try {
    if (!navigator.geolocation) throw new Error('Geolocation not supported')
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
      })
    })
    me.value = { lat: pos.coords.latitude, lon: pos.coords.longitude }

    const lngLat = [me.value.lon, me.value.lat]
    if (!meMarker) {
      meMarker = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(lngLat)
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText('You are here'))
        .addTo(map.value)
    } else {
      meMarker.setLngLat(lngLat)
    }

    map.value.easeTo({ center: lngLat, zoom: 14, duration: 0 })
  } catch (e) {
    console.warn(e)
    alert('Unable to get your location. Please allow location access.')
  }
}

async function runSearch() {
  try {
    clearRoute()
    if (!me.value) await locateMe()
    if (!me.value) return

    const list = await searchPlaces(keyword.value || 'park', me.value, Number(radius.value) || 2000)
    results.value = list

    clearPoiMarkers()

    if (me.value) {
      const lngLat = [me.value.lon, me.value.lat]
      if (!meMarker) {
        meMarker = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat(lngLat)
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setText('You are here'))
          .addTo(map.value)
      } else {
        meMarker.setLngLat(lngLat)
      }
    }

    const boundsPairs = []
    list.forEach((p) => {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return
      const m = new mapboxgl.Marker()
        .setLngLat([p.lon, p.lat])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(p.name || ''))
        .addTo(map.value)
      poiMarkers.push(m)
      boundsPairs.push([p.lon, p.lat])
    })

    if (boundsPairs.length) {
      fitToBoundsLngLatPairs(boundsPairs.concat([[me.value.lon, me.value.lat]]))
    } else {
      alert('No matching places found nearby.')
    }
  } catch (err) {
    console.error(err)
    alert('Search failed. Please try again later.')
  }
}

async function drawRoute(toPlace) {
  try {
    if (!me.value) await locateMe()
    if (!me.value) return
    const r = await footRoute(me.value, { lat: toPlace.lat, lon: toPlace.lon })

    const lineCoords = r.coordinates.map(([lat, lon]) => [lon, lat])

    if (map.value.getSource(ROUTE_SOURCE_ID)) {
      map.value.getSource(ROUTE_SOURCE_ID).setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: lineCoords },
        properties: {},
      })
    } else {
      map.value.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: lineCoords },
          properties: {},
        },
      })
      map.value.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 5,
          'line-opacity': 0.7,
        },
      })
    }

    fitToBoundsLngLatPairs(lineCoords)

    const km = (r.distance / 1000).toFixed(2)
    const min = Math.round(r.duration / 60)
    routeInfo.value = `Route: ${km} km · ~${min} min on foot`
  } catch (e) {
    console.error(e)
    alert('Failed to draw route.')
  }
}

function clearRoute() {
  routeInfo.value = ''
  if (map.value?.getLayer(ROUTE_LAYER_ID)) map.value.removeLayer(ROUTE_LAYER_ID)
  if (map.value?.getSource(ROUTE_SOURCE_ID)) map.value.removeSource(ROUTE_SOURCE_ID)
}
</script>

<template>
  <div class="container mt-4">
    <h2 class="mb-3">Healthy Map</h2>

    <div class="alert alert-info" role="region" aria-label="How to use Healthy Map">
      <strong>What this page does:</strong> Find nearby health-related places and draw a walking
      route.
      <ol class="mb-0 mt-2">
        <li>
          Click <em>Locate me</em> to set your current position (allow location in your browser).
        </li>
        <li>
          Enter a keyword (e.g., <code>gym</code>, <code>park</code>, <code>clinic</code>,
          <code>supermarket</code>) and a radius, then click <em>Go</em>.
        </li>
        <li>Click <em>Route</em> to draw a walking route from your position to that place.</li>
      </ol>
      <small class="text-muted d-block mt-2">
        Tip: You can link to this page with preset keyword, e.g. <code>/map?kw=supermarket</code>.
      </small>
    </div>

    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <button class="btn btn-outline-primary" @click="locateMe">Locate me</button>

      <div class="input-group" style="max-width: 520px">
        <span class="input-group-text">Search</span>
        <input class="form-control" v-model="keyword" placeholder="e.g., gym / park / clinic" />
        <span class="input-group-text">Radius(m)</span>
        <input class="form-control" type="number" v-model.number="radius" min="200" step="100" />
        <button class="btn btn-primary" @click="runSearch">Go</button>
      </div>

      <span class="badge bg-secondary ms-auto" v-if="routeInfo" aria-live="polite">{{
        routeInfo
      }}</span>
    </div>

    <div
      ref="mapEl"
      role="application"
      aria-label="Health map. Use arrow keys to pan and plus/minus to zoom."
      style="height: 420px; width: 100%; border-radius: 8px; border: 1px solid #eee"
    ></div>

    <!-- List of results -->

    <div class="mt-3" v-if="results.length">
      <h5 id="results-title">Results ({{ results.length }})</h5>
      <ul class="list-group" aria-labelledby="results-title">
        <li
          v-for="p in results"
          :key="p.id"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <span class="me-2" style="max-width: 70%">{{ p.name }}</span>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-secondary" @click="drawRoute(p)">Route</button>
            <a
              class="btn btn-sm btn-outline-secondary"
              :href="`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`"
              target="_blank"
              rel="noopener"
              >OSM</a
            >
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
