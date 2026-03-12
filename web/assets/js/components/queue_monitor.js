/**
 * queue_monitor.js — Queue Monitor (x-ui style)
 */
(function (Vue) {
  'use strict';

  Vue.component('queue-monitor-view', {
    template: `
      <div>
        <!-- Stats bar -->
        <div class="page-stats-bar">
          <div class="stat-item">Total Jobs: <span class="stat-value" style="margin-left:4px;">{{ jobs.length }}</span></div>
          <div class="stat-item">Queued: <span class="stat-badge blue" style="margin-left:4px;">{{ countStatus('queued') }}</span></div>
          <div class="stat-item">Processing: <span class="stat-badge orange" style="margin-left:4px;">{{ countStatus('processing') }}</span></div>
          <div class="stat-item">Done: <span class="stat-badge green" style="margin-left:4px;">{{ countStatus('done') }}</span></div>
          <div class="stat-item">Failed: <span class="stat-badge red" style="margin-left:4px;">{{ countStatus('failed') }}</span></div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <a-button type="primary" icon="plus" @click="trackModalVisible = true">Track Job</a-button>
          <div class="toolbar-right">
            <a-input-search v-model="search" placeholder="Search jobs..." style="width:220px;" allow-clear />
          </div>
        </div>

        <!-- Table -->
        <div class="table-card">
          <a-table
            :data-source="filteredJobs"
            :columns="columns"
            row-key="job_id"
            size="small"
            :pagination="{ pageSize: 15, showSizeChanger: true, showTotal: t => 'Total ' + t }"
          >
            <template #status="text, record">
              <span class="plan-tag" :class="statusClass(record.status_info && record.status_info.status)">
                {{ record.status_info ? record.status_info.status : 'unknown' }}
              </span>
            </template>

            <template #position="text, record">
              <span v-if="record.status_info && record.status_info.queue_position > 0">
                #{{ record.status_info.queue_position }}
              </span>
              <span v-else style="color:#bfbfbf;">—</span>
            </template>

            <template #eta="text, record">
              <span v-if="record.status_info && record.status_info.eta_seconds > 0">
                {{ Math.round(record.status_info.eta_seconds) }}s
              </span>
              <span v-else style="color:#bfbfbf;">—</span>
            </template>

            <template #actions="text, record">
              <div style="display:flex;gap:4px;">
                <button
                  v-if="record.status_info && record.status_info.status === 'failed'"
                  class="action-btn"
                  title="Retry"
                  @click="retryJob(record)"
                >
                  <a-icon type="redo" />
                </button>
                <button class="action-btn danger" title="Remove from tracking" @click="removeJob(record)">
                  <a-icon type="delete" />
                </button>
              </div>
            </template>
          </a-table>
        </div>

        <!-- Track Job Modal -->
        <a-modal
          v-model="trackModalVisible"
          title="Track Upload Job"
          ok-text="Track"
          :confirm-loading="tracking"
          @ok="submitTrack"
          @cancel="resetTrackForm"
        >
          <a-form :label-col="{ span: 7 }" :wrapper-col="{ span: 15 }">
            <a-form-item label="Job ID" required>
              <a-input v-model="trackForm.jobId" placeholder="e.g. job_abc123" />
            </a-form-item>
            <a-form-item label="Site Name">
              <a-input v-model="trackForm.siteName" placeholder="optional" />
            </a-form-item>
            <a-form-item label="Filename">
              <a-input v-model="trackForm.filename" placeholder="optional" />
            </a-form-item>
          </a-form>
        </a-modal>
      </div>
    `,
    data() {
      return {
        jobs: [],
        search: '',
        pollTimer: null,
        trackModalVisible: false,
        tracking: false,
        trackForm: { jobId: '', siteName: '', filename: '' },
        columns: [
          { title: 'Job ID',   dataIndex: 'job_id',    key: 'job_id',   ellipsis: true, width: 180 },
          { title: 'Filename', dataIndex: 'filename',  key: 'filename' },
          { title: 'Site',     dataIndex: 'site_name', key: 'site_name' },
          { title: 'Status',   key: 'status',   width: 110, scopedSlots: { customRender: 'status' } },
          { title: 'Position', key: 'position', width: 85,  scopedSlots: { customRender: 'position' } },
          { title: 'ETA',      key: 'eta',      width: 70,  scopedSlots: { customRender: 'eta' } },
          { title: 'Actions',  key: 'actions',  width: 90,  scopedSlots: { customRender: 'actions' } },
        ],
      };
    },
    computed: {
      filteredJobs() {
        if (!this.search) return this.jobs;
        const q = this.search.toLowerCase();
        return this.jobs.filter(j =>
          j.job_id.toLowerCase().includes(q) ||
          (j.filename  || '').toLowerCase().includes(q) ||
          (j.site_name || '').toLowerCase().includes(q)
        );
      },
    },
    methods: {
      countStatus(st) {
        return this.jobs.filter(j => j.status_info && j.status_info.status === st).length;
      },
      statusClass(st) {
        const map = { queued: 'plan-pro', processing: 'plan-gold', done: 'plan-free', failed: 'plan-enterprise' };
        return map[st] || 'plan-free';
      },
      async fetchQueue() {
        try {
          this.jobs = await window.PanelAPI.getQueue() || [];
        } catch (_) {}
      },
      async retryJob(job) {
        try {
          await window.PanelAPI.retryJob(job.job_id, '');
          this.$message.success('Job retry triggered');
          await this.fetchQueue();
        } catch (e) {
          this.$message.error(e.message);
        }
      },
      removeJob(job) {
        this.jobs = this.jobs.filter(j => j.job_id !== job.job_id);
      },
      async submitTrack() {
        if (!this.trackForm.jobId) { this.$message.warning('Job ID is required'); return; }
        this.tracking = true;
        try {
          await window.PanelAPI.trackJob(this.trackForm.jobId, 0, this.trackForm.siteName, this.trackForm.filename);
          this.$message.success('Job is now being tracked');
          this.resetTrackForm();
          await this.fetchQueue();
        } catch (e) {
          this.$message.error(e.message);
        } finally {
          this.tracking = false;
        }
      },
      resetTrackForm() {
        this.trackForm = { jobId: '', siteName: '', filename: '' };
        this.trackModalVisible = false;
      },
    },
    mounted() {
      this.fetchQueue();
      this.pollTimer = setInterval(this.fetchQueue, 5000);
    },
    beforeDestroy() { clearInterval(this.pollTimer); },
  });
})(Vue);