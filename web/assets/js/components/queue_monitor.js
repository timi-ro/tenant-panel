/**
 * queue_monitor.js — Queue Monitor (uAdmin Bootstrap 3 style)
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
          <button class="btn btn-primary btn-sm" @click="trackModalVisible = true">
            <i class="fa fa-plus"></i> Track Job
          </button>
          <div class="toolbar-right">
            <div class="input-group input-group-sm" style="width:220px;">
              <input type="text" class="form-control" v-model="search" placeholder="Search jobs...">
              <span class="input-group-btn">
                <button class="btn btn-default" type="button" @click="search = ''" v-if="search">
                  <i class="fa fa-times"></i>
                </button>
                <button class="btn btn-default" type="button" v-else>
                  <i class="fa fa-search"></i>
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Table panel -->
        <div class="panel panel-default">
          <div class="panel-body" style="padding:0;">
            <div v-if="jobs.length === 0" class="text-center text-muted" style="padding:30px;font-size:13px;">
              No jobs tracked yet. Click "Track Job" to add one.
            </div>
            <div v-else style="overflow-x:auto;">
              <table class="table table-striped table-bordered table-condensed" style="margin:0;">
                <thead>
                  <tr>
                    <th style="width:180px;">Job ID</th>
                    <th>Filename</th>
                    <th>Site</th>
                    <th style="width:110px;">Status</th>
                    <th style="width:85px;">Position</th>
                    <th style="width:70px;">ETA</th>
                    <th style="width:90px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="job in paginatedJobs" :key="job.job_id">
                    <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ job.job_id }}</td>
                    <td style="font-size:12px;">{{ job.filename || '—' }}</td>
                    <td style="font-size:12px;">{{ job.site_name || '—' }}</td>
                    <td>
                      <span class="plan-tag" :class="statusClass(job.status_info && job.status_info.status)">
                        {{ job.status_info ? job.status_info.status : 'unknown' }}
                      </span>
                    </td>
                    <td style="font-size:12px;">
                      <span v-if="job.status_info && job.status_info.queue_position > 0">#{{ job.status_info.queue_position }}</span>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td style="font-size:12px;">
                      <span v-if="job.status_info && job.status_info.eta_seconds > 0">{{ Math.round(job.status_info.eta_seconds) }}s</span>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td>
                      <div style="display:flex;gap:4px;">
                        <button
                          v-if="job.status_info && job.status_info.status === 'failed'"
                          class="btn btn-xs btn-default"
                          title="Retry"
                          @click="retryJob(job)"
                        ><i class="fa fa-repeat"></i></button>
                        <button
                          class="btn btn-xs btn-danger"
                          title="Remove from tracking"
                          @click="removeJob(job)"
                        ><i class="fa fa-trash-o"></i></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Pagination -->
            <div v-if="totalPages > 1" style="padding:10px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-top:1px solid #ddd;">
              <span style="font-size:12px;color:#777;">Total {{ filteredJobs.length }}</span>
              <div style="margin-left:auto;display:flex;gap:4px;">
                <button class="btn btn-xs btn-default" :disabled="currentPage === 1" @click="currentPage--">
                  <i class="fa fa-chevron-left"></i>
                </button>
                <span style="font-size:12px;padding:2px 8px;line-height:20px;">{{ currentPage }} / {{ totalPages }}</span>
                <button class="btn btn-xs btn-default" :disabled="currentPage === totalPages" @click="currentPage++">
                  <i class="fa fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Track Job Modal -->
        <div class="modal fade" id="trackJobModal" tabindex="-1" role="dialog" aria-labelledby="trackJobModalLabel">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close" @click="resetTrackForm"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="trackJobModalLabel"><i class="fa fa-plus-circle"></i> Track Upload Job</h4>
              </div>
              <div class="modal-body">
                <form class="form-horizontal">
                  <div class="form-group">
                    <label class="control-label col-sm-4">Job ID <span class="text-danger">*</span></label>
                    <div class="col-sm-8">
                      <input type="text" class="form-control" v-model="trackForm.jobId" placeholder="e.g. job_abc123">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="control-label col-sm-4">Site Name</label>
                    <div class="col-sm-8">
                      <input type="text" class="form-control" v-model="trackForm.siteName" placeholder="optional">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="control-label col-sm-4">Filename</label>
                    <div class="col-sm-8">
                      <input type="text" class="form-control" v-model="trackForm.filename" placeholder="optional">
                    </div>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal" @click="resetTrackForm">Cancel</button>
                <button type="button" class="btn btn-primary" @click="submitTrack" :disabled="tracking">
                  <i class="fa fa-spinner fa-spin" v-if="tracking"></i>
                  <i class="fa fa-check" v-else></i>
                  Track
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- END Track Job Modal -->

      </div>
    `,
    data() {
      return {
        jobs: [],
        search: '',
        pollTimer: null,
        trackModalVisible: false,
        tracking: false,
        currentPage: 1,
        pageSize: 15,
        trackForm: { jobId: '', siteName: '', filename: '' },
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
      totalPages() {
        return Math.max(1, Math.ceil(this.filteredJobs.length / this.pageSize));
      },
      paginatedJobs() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredJobs.slice(start, start + this.pageSize);
      },
    },
    watch: {
      search() { this.currentPage = 1; },
      trackModalVisible(val) {
        if (val) {
          this.$nextTick(() => {
            jQuery('#trackJobModal').modal('show');
          });
        } else {
          jQuery('#trackJobModal').modal('hide');
        }
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
          this.$showMessage('success', 'Job retry triggered');
          await this.fetchQueue();
        } catch (e) {
          this.$showMessage('error', e.message);
        }
      },
      removeJob(job) {
        this.jobs = this.jobs.filter(j => j.job_id !== job.job_id);
      },
      async submitTrack() {
        if (!this.trackForm.jobId) {
          this.$showMessage('warning', 'Job ID is required');
          return;
        }
        this.tracking = true;
        try {
          await window.PanelAPI.trackJob(this.trackForm.jobId, 0, this.trackForm.siteName, this.trackForm.filename);
          this.$showMessage('success', 'Job is now being tracked');
          this.resetTrackForm();
          await this.fetchQueue();
        } catch (e) {
          this.$showMessage('error', e.message);
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
      var self = this;
      jQuery('#trackJobModal').on('hidden.bs.modal', function () {
        self.trackModalVisible = false;
      });
      this.fetchQueue();
      this.pollTimer = setInterval(this.fetchQueue, 5000);
    },
    beforeDestroy() { clearInterval(this.pollTimer); },
  });
})(Vue);