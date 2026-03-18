/**
 * dashboard.js — Dashboard component (uAdmin Bootstrap 3 style)
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

        <!-- RAG Server Status panel -->
        <div class="panel panel-default" style="margin-bottom:16px;">
          <div class="panel-heading">
            <strong><i class="fa fa-cloud" style="margin-right:6px;color:#1890ff;"></i>RAG Server Status</strong>
          </div>
          <div class="panel-body">
            <div v-if="loadingStatus" class="text-muted" style="font-size:13px;">
              <i class="fa fa-spinner fa-spin"></i> Loading...
            </div>
            <div v-else-if="serverStatus" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <span>
                <span class="status-dot" :class="serverStatus.status === 'ok' ? 'dot-green' : 'dot-gray'"></span>
                <span style="font-size:13px;color:#262626;">{{ serverStatus.status === 'ok' ? 'Online' : serverStatus.status }}</span>
              </span>
              <span v-if="serverStatus.model" class="stat-badge blue">
                <i class="fa fa-microchip" style="margin-right:4px;"></i>{{ serverStatus.model }}
              </span>
              <span v-if="serverStatus.external_llm_provider" class="stat-badge purple">
                {{ serverStatus.external_llm_provider }}
              </span>
            </div>
            <div v-else style="color:#bfbfbf;font-size:13px;">
              <i class="fa fa-warning"></i> Could not reach RAG server
            </div>
          </div>
        </div>

        <!-- Plan breakdown row -->
        <div class="row" style="margin-bottom:16px;">
          <div class="col-xs-6 col-sm-3" v-for="p in planList" :key="p.name">
            <div class="panel panel-default" style="text-align:center;margin-bottom:8px;">
              <div class="panel-body" style="padding:14px 10px;">
                <div style="font-size:11px;color:#8c8c8c;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">{{ p.label }}</div>
                <div style="font-size:28px;font-weight:700;" :style="{ color: p.color }">{{ stats.plans[p.name] || 0 }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent jobs panel -->
        <div class="panel panel-default">
          <div class="panel-heading" style="display:flex;align-items:center;justify-content:space-between;">
            <strong><i class="fa fa-list-ol" style="margin-right:6px;color:#1890ff;"></i>Recent Jobs</strong>
            <span style="font-size:12px;color:#8c8c8c;font-weight:normal;">auto-refreshes every 10s</span>
          </div>
          <div class="panel-body" style="padding:0;">
            <div v-if="loadingQueue" class="text-center" style="padding:20px;">
              <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
            </div>
            <div v-else-if="recentJobs.length === 0" class="text-center text-muted" style="padding:20px;font-size:13px;">
              No jobs found.
            </div>
            <table v-else class="table table-striped table-bordered table-condensed" style="margin:0;">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Filename</th>
                  <th>Site</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in recentJobs" :key="job.job_id">
                  <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;">{{ job.job_id }}</td>
                  <td style="font-size:12px;">{{ job.filename || '—' }}</td>
                  <td style="font-size:12px;">{{ job.site_name || '—' }}</td>
                  <td>
                    <span class="plan-tag" :class="statusClass(job.status_info && job.status_info.status)">
                      {{ job.status_info ? job.status_info.status : '—' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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