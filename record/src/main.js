// Record 記帳主功能入口
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Dashboard from '../../src/modules/dashboard/Dashboard.vue'
import PITCalculator from '../../src/modules/calculation/PITCalculator.vue'
import WithholdingCalculator from '../../src/modules/calculation/WithholdingCalculator.vue'
import PenaltyCalculator from '../../src/modules/calculation/PenaltyCalculator.vue'
import ReportGenerator from '../../src/modules/reports/ReportGenerator.vue'
import RuleManagement from '../../src/modules/rules/RuleManagement.vue'

// 引入共用模組
import '../../shared/storage/database.js'

const pinia = createPinia()

const app = createApp({
  components: {
    Dashboard,
    PITCalculator,
    WithholdingCalculator,
    PenaltyCalculator,
    ReportGenerator,
    RuleManagement
  },
  data() {
    return {
      currentView: 'dashboard'
    }
  },
  template: `
    <div class="record-app">
      <header>
        <h1>💰 記帳管理系統</h1>
        <nav>
          <button @click="currentView = 'dashboard'">儀表板</button>
          <button @click="currentView = 'pit'">個人所得稅</button>
          <button @click="currentView = 'withholding'">扣繳計算</button>
          <button @click="currentView = 'penalty'">罰款計算</button>
          <button @click="currentView = 'reports'">報表</button>
          <button @click="currentView = 'rules'">規則</button>
          <a href="/">← 返回首頁</a>
        </nav>
      </header>
      <main>
        <Dashboard v-if="currentView === 'dashboard'" />
        <PITCalculator v-else-if="currentView === 'pit'" />
        <WithholdingCalculator v-else-if="currentView === 'withholding'" />
        <PenaltyCalculator v-else-if="currentView === 'penalty'" />
        <ReportGenerator v-else-if="currentView === 'reports'" />
        <RuleManagement v-else-if="currentView === 'rules'" />
      </main>
    </div>
  `
})

app.use(pinia)
app.mount('#app')
