/**
 * dashboard.js — Dashboard component (x-ui style)
 */
(function (Vue) {
  'use strict';

  Vue.component('dashboard-view', {
    template: `
      <div>
        <!-- Stats bar -->
        <div class="page-stats-bar">
          <div class="stat-item">
            <span>Total Sites:</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
          <div class="stat-item">
            <span>Active:</span>
            <span class="stat-badge green">{{ stats.active }}</span>
          </div>
          <div class="stat-item">
            <span>Inactive:</span>
            <span class="stat-badge">{{ stats.total - stats.active }}</span>
          </div>
          <div class="stat-item">
            <span>Free:</span>
            <span class="stat-badge">{{ stats.plans.free || 0 }}</span>
          </div>
          <div class="stat-item">
            <span>Pro:</span>
            <span class="stat-badge blue">{{ stats.plans.pro || 0 }}</span>
          </div>
          <div class="stat-item">
            <span>Gold:</span>
            <span class="stat-badge orange">{{ stats.plans.gold || 0 }}</span>
          </div>
          <div class="stat-item">
            <span>Enterprise:</span>
            <span class="stat-badge purple">{{ stats.plans.enterprise || 0 }}</span>
          </div>
          <div class="stat-item" style="margin-left:auto;">
            <span>Queue:</span>
            <span class="stat-badge blue">{{ queueStats.queued }} queued</span>
            <span class="stat-badge orange" style="margin-left:4px;">{{ queueStats.processing }} processing</span>
          </div>
        </div>

        <!-- RAG Server Status card -->
        <div class="table-card" style="margin-bottom:16px; padding:16px 20px;">
          <div style="font-weight:600; color:#262626; margin-bottom:12px; font-size:14px;">
            <a-icon type="cloud-server" style="margin-right:6px; color:#1890ff;" /> RAG Server Status
          </div>
          <a-spin :spinning="loadingStatus">
            <div v-if="serverStatus" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <span>
                <span class="status-dot" :class="serverStatus.status === 'ok' ? 'dot-green' : 'dot-gray'"></span>
                <span style="font-size:13px;color:#262626;">{{ serverStatus.status === 'ok' ? 'Online' : serverStatus.status }}</span>
              </span>
              <span v-if="serverStatus.model" class="stat-badge blue">
                <a-icon type="robot" style="margin-right:4px;" />{{ serverStatus.model }}
              </span>
              <span v-if="serverStatus.external_llm_provider" class="stat-badge purple">
                {{ serverStatus.external_llm_provider }}
              </span>
            </div>
            <div v-else-if="!loadingStatus" style="color:#bfbfbf;font-size:13px;">
              <a-icon type="warning" /> Could not reach RAG server
            </div>
          </a-spin>
        </div>

        <!-- Plan breakdown cards -->
        <a-row :gutter="12" style="margin-bottom:16px;">
          <a-col :xs="12" :sm="6" v-for="p in planList" :key="p.name">
            <div class="table-card" style="padding:16px 20px;text-align:center;">
              <div style="font-size:11px;color:#8c8c8c;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">{{ p.label }}</div>
              <div style="font-size:28px;font-weight:700;" :style="{ color: p.color }">{{ stats.plans[p.name] || 0 }}</div>
            </div>
          </a-col>
        </a-row>

        <!-- Recent jobs table -->
        <div class="table-card">
          <div style="padding:12px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:600;font-size:14px;color:#262626;">
              <a-icon type="ordered-list" style="margin-right:6px;color:#1890ff;" />Recent Jobs
            </span>
            <span style="font-size:12px;color:#8c8c8c;">auto-refreshes every 10s</span>
          </div>
          <a-spin :spinning="loadingQueue">
            <a-table
              :data-source="recentJobs"
              :columns="jobColumns"
              :pagination="false"
              row-key="job_id"
              size="small"
            >
              <template #status="text, record">
                <span class="plan-tag" :class="statusClass(record.status_info && record.status_info.status)">
                  {{ record.status_info ? record.status_info.status : '—' }}
                </span>
              </template>
            </a-table>
          </a-spin>
        </div>
      </div>
    `,
    data() {
      return {
        serverStatus: null,
        loadingStatus: false,
        sites: [],
        queue: [],
        loadingQueue: false,
        pollTimer: null,
        planList: [
          { name: 'free',       label: 'Free',       color: '#595959' },
          { name: 'pro',        label: 'Pro',        color: '#1890ff' },
          { name: 'gold',       label: 'Gold',       color: '#d48806' },
          { name: 'enterprise', label: 'Enterprise', color: '#722ed1' },
        ],
        jobColumns: [
          { title: 'Job ID',   dataIndex: 'job_id',    key: 'job_id',    ellipsis: true },
          { title: 'Filename', dataIndex: 'filename',  key: 'filename' },
          { title: 'Site',     dataIndex: 'site_name', key: 'site_name' },
          { title: 'Status',   key: 'status', scopedSlots: { customRender: 'status' } },
        ],
      };
    },
    computed: {
      stats() {
        const plans = {};
        let active = 0;
        this.sites.forEach(s => {
          plans[s.plan] = (plans[s.plan] || 0) + 1;
          if (s.is_active) active++;
        });
        return { total: this.sites.length, active, plans };
      },
      queueStats() {
        let queued = 0, processing = 0;
        this.queue.forEach(j => {
          const st = j.status_info && j.status_info.status;
          if (st === 'queued')     queued++;
          if (st === 'processing') processing++;
        });
        return { queued, processing };
      },
      recentJobs() { return this.queue.slice(0, 8); },
    },
    methods: {
      statusClass(st) {
        return { queued: 'plan-pro', processing: 'plan-gold', done: 'plan-free', failed: 'plan-enterprise' }[st] || 'plan-free';
      },
      async fetchAll() {
        this.loadingStatus = true;
        this.loadingQueue  = true;
        try {
          const [status, sites, queue] = await Promise.allSettled([
            window.PanelAPI.getServerStatus(),
            window.PanelAPI.listSites(),
            window.PanelAPI.getQueue(),
          ]);
          if (status.status === 'fulfilled') this.serverStatus = status.value;
          if (sites.status  === 'fulfilled') this.sites  = sites.value  || [];
          if (queue.status  === 'fulfilled') this.queue  = queue.value  || [];
        } finally {
          this.loadingStatus = false;
          this.loadingQueue  = false;
        }
      },
    },
    mounted() {
      this.fetchAll();
      this.pollTimer = setInterval(this.fetchAll, 10000);
    },
    beforeDestroy() { clearInterval(this.pollTimer); },
  });
})(Vue);