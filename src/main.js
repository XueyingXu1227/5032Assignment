/* Import project-level base CSS */
import './assets/main.css'

/* Import Bootstrap (for layout, grid, and UI components) */
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

/*Create and mount root Vue app with router support */
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

/* enable routing and mount to #app */
createApp(App).use(router).mount('#app')
