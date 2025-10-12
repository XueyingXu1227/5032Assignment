<script setup>
import { onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { searchPlaces, footRoute } from '@/services/map'

// 解决 Leaflet 在打包后默认图标丢失的问题（使用 CDN 图标）
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = defaultIcon

// 状态
const map = ref(null)
const mapEl = ref(null)
const me = ref(null) // {lat, lon}
const keyword = ref('gym') // 默认关键词
const radius = ref(2000) // 搜索半径（米）
const results = ref([]) // 搜索结果
let markersLayer = null // 标注图层
let routeLayer = null // 路线图层
const routeInfo = ref('') // 距离/时长信息

// 初始化地图
onMounted(() => {
  map.value = L.map(mapEl.value).setView([-37.8136, 144.9631], 13) // 初始给墨尔本 CBD
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map.value)

  markersLayer = L.layerGroup().addTo(map.value)
})

// 获取当前位置
async function locateMe() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        me.value = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        // 在图上放标记
        markersLayer.clearLayers()
        L.marker([me.value.lat, me.value.lon])
          .addTo(markersLayer)
          .bindPopup('You are here')
          .openPopup()
        map.value.setView([me.value.lat, me.value.lon], 14)
        resolve(me.value)
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  })
}

// 搜索附近
async function runSearch() {
  routeClear()
  if (!me.value) await locateMe()
  if (!me.value) return
  const list = await searchPlaces(keyword.value || 'park', me.value, Number(radius.value) || 2000)
  results.value = list
  // 打点
  markersLayer.clearLayers()
  L.marker([me.value.lat, me.value.lon]).addTo(markersLayer).bindPopup('You are here')
  list.forEach((p) => {
    const mk = L.marker([p.lat, p.lon]).addTo(markersLayer)
    mk.bindPopup(p.name)
  })
  if (list.length) {
    const group = L.featureGroup(list.map((p) => L.marker([p.lat, p.lon])))
    map.value.fitBounds(group.getBounds().pad(0.3))
  }
}

// 绘制路线
async function drawRoute(toPlace) {
  if (!me.value) await locateMe()
  if (!me.value) return

  const r = await footRoute(me.value, { lat: toPlace.lat, lon: toPlace.lon })
  routeClear()
  routeLayer = L.polyline(r.coordinates, { color: 'blue', weight: 5, opacity: 0.7 }).addTo(
    map.value,
  )
  map.value.fitBounds(routeLayer.getBounds().pad(0.3))
  const km = (r.distance / 1000).toFixed(2)
  const min = Math.round(r.duration / 60)
  routeInfo.value = `Route: ${km} km · ~${min} min on foot`
}

function routeClear() {
  routeInfo.value = ''
  if (routeLayer) {
    map.value.removeLayer(routeLayer)
    routeLayer = null
  }
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
        <li>
          In the results list, click <em>Route</em> to draw a walking route from your position to
          that place. Distance and time will show on the right of the toolbar.
        </li>
      </ol>
      <small class="text-muted d-block mt-2">
        Tip: you can link to this page with a preset keyword, e.g. <code>/map?kw=supermarket</code>
        (we"ll wire shortcuts from Programs/Tracker later).
      </small>
    </div>

    <!-- control panel -->
    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <button class="btn btn-outline-primary" @click="locateMe">Locate me</button>

      <div class="input-group" style="max-width: 520px">
        <span class="input-group-text">Search</span>
        <input class="form-control" v-model="keyword" placeholder="e.g., gym / park / clinic" />
        <span class="input-group-text">Radius(m)</span>
        <input class="form-control" type="number" v-model.number="radius" min="200" step="100" />
        <button class="btn btn-primary" @click="runSearch">Go</button>
      </div>

      <span class="badge bg-secondary ms-auto" v-if="routeInfo">{{ routeInfo }}</span>
    </div>

    <!-- map -->
    <div
      ref="mapEl"
      style="height: 420px; width: 100%; border-radius: 8px; border: 1px solid #eee"
    ></div>

    <!-- List of results -->
    <div class="mt-3" v-if="results.length">
      <h5>Results ({{ results.length }})</h5>
      <ul class="list-group">
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
