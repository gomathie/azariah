import './assets/main.css'
import './lib/pwa/install'
import { registerSW } from 'virtual:pwa-register'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { startMonitoring } from './lib/monitoring'

registerSW({ immediate: true })

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(router)

app.mount('#app')

// Error tracking starts after the first screen and only when a DSN is configured.
void startMonitoring(app)
