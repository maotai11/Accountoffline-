import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import MainLayout from './layouts/MainLayout.vue'

const app = createApp({
  template: '<MainLayout><router-view /></MainLayout>',
  components: { MainLayout }
})

app.use(createPinia())
app.use(router)
app.mount('#app')
