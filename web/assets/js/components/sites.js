/**
 * sites.js — Site Management (x-ui style)
 */
(function (Vue) {
  'use strict';

  Vue.component('sites-view', {
    template: `
      <div>
        <!-- Stats bar -->
        <div class="page-stats-bar">
          <div class="stat-item">Total Sites: <span class="stat-value" style="margin-left:4px;">{{ sites.length }}</span></div>
          <div class="stat-item">Active: <span class="stat-badge green" style="margin-left:4px;">{{ activeSites }}</span></div>
          <div class="stat-item">Inactive: <span class="stat-badge" style="margin-left:4px;">{{ sites.length - activeSites }}</span></div>
          <div class="stat-item">Free: <span class="stat-badge" style="margin-left:4px;">{{ countPlan('free') }}</span></div>
          <div class="stat-item">Pro: <span class="stat-badge blue" style="margin-left:4px;">{{ countPlan('pro') }}</span></div>
          <div class="stat-item">Gold: <span class="stat-badge orange" style="margin-left:4px;">{{ countPlan('gold') }}</span></div>
          <div class="stat-item">Enterprise: <span class="stat-badge purple" style="margin-left:4px;">{{ countPlan('enterprise') }}</span></div>
        </div>

        <!-- API key alert (one-time after create) -->
        <div v-if="newApiKey" style="background:#f6ffed;border:1px solid #b7eb8f;border-radius:6px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px;">
          <a-icon type="check-circle" style="color:#52c41a;font-size:16px;margin-top:2px;" />
          <div style="flex:1;">
            <div style="font-weight:600;color:#262626;margin-bottom:4px;">Site created! Save your API key — it won't be shown again.</div>
            <code style="background:#fff;border:1px solid #d9d9d9;border-radius:4px;padding:4px 10px;font-size:13px;word-break:break-all;">{{ newApiKey }}</code>
          </div>
          <a-icon type="close" style="color:#8c8c8c;cursor:pointer;" @click="newApiKey = null" />
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <a-button type="primary" icon="plus" @click="createModalVisible = true">Add Site</a-button>
          <div class="toolbar-right">
            <a-input-search
              v-model="search"
              placeholder="Search sites..."
              style="width:220px;"
              allow-clear
            />
          </div>
        </div>

        <!-- Table -->
        <div class="table-card">
          <a-table
            :data-source="filteredSites"
            :columns="columns"
            :loading="loading"
            row-key="id"
            size="small"
            style="width:100%"
            :scroll="{ x: true }"
            :pagination="{ pageSize: 15, showSizeChanger: true, showTotal: t => 'Total ' + t }"
          >
            <!-- Enabled toggle -->
            <template #enabled="text, record">
              <a-switch
                :checked="record.is_active"
                size="small"
                :loading="!!actionLoading[record.id]"
                @change="val => toggleActive(record, val)"
              />
            </template>

            <!-- Plan badge -->
            <template #plan="text">
              <span class="plan-tag" :class="'plan-' + text">{{ text }}</span>
            </template>

            <!-- Requests with mini progress bar -->
            <template #requests="text, record">
              <div style="min-width:80px;">
                <span style="font-size:12px;">{{ record.total_requests }} / {{ record.message_limit }}</span>
                <div class="mini-progress">
                  <div
                    class="mini-progress-bar"
                    :class="{ warn: usagePct(record) > 75 }"
                    :style="{ width: Math.min(usagePct(record), 100) + '%' }"
                  ></div>
                </div>
              </div>
            </template>

            <!-- Actions -->
            <template #actions="text, record">
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <!-- Reactivate button (only when inactive) -->
                <a-button
                  v-if="!record.is_active"
                  size="small"
                  type="primary"
                  ghost
                  icon="sync"
                  :loading="!!actionLoading[record.id]"
                  @click="toggleActive(record, true)"
                >Reactivate</a-button>

                <!-- Regenerate API Key -->
                <a-button
                  size="small"
                  icon="key"
                  @click="toggleApiKey(record)"
                >Regen Key</a-button>

                <!-- Reset -->
                <a-button
                  size="small"
                  icon="delete"
                  type="danger"
                  ghost
                  @click="openResetModal(record)"
                >Reset</a-button>

                <!-- Plan selector -->
                <a-select
                  :value="record.plan"
                  size="small"
                  style="width:105px;"
                  @change="val => changePlan(record, val)"
                >
                  <a-select-option value="free">Free</a-select-option>
                  <a-select-option value="pro">Pro</a-select-option>
                  <a-select-option value="gold">Gold</a-select-option>
                  <a-select-option value="enterprise">Enterprise</a-select-option>
                </a-select>
              </div>
            </template>
          </a-table>
        </div>

        <!-- API Key Modal -->
        <a-modal
          v-model="keyModal.visible"
          :title="'API Key — ' + keyModal.siteName"
          :footer="null"
          width="520px"
          @cancel="keyModal.visible = false"
        >
          <a-spin :spinning="keyModal.loading">
            <div v-if="keyModal.apiKey" style="display:flex;align-items:center;gap:8px;">
              <code style="flex:1;background:#f5f5f5;border:1px solid #d9d9d9;border-radius:4px;padding:8px 12px;font-size:13px;word-break:break-all;display:block;">{{ keyModal.apiKey }}</code>
              <a-button icon="copy" @click="copyKey(keyModal.apiKey)">Copy</a-button>
            </div>
            <div v-else-if="!keyModal.loading" style="color:#8c8c8c;">No API key available.</div>
          </a-spin>
        </a-modal>

        <!-- Reset Site Modal -->
        <a-modal
          v-model="resetModal.visible"
          :title="'Reset — ' + resetModal.siteName"
          ok-text="Reset"
          ok-type="danger"
          :confirm-loading="resetModal.loading"
          @ok="submitReset"
          @cancel="resetModal.visible = false"
        >
          <p style="color:#595959;margin-bottom:16px;">Select what to clear. This cannot be undone.</p>
          <a-checkbox v-model="resetModal.messages" style="display:block;margin-bottom:10px;">
            <span style="font-weight:500;">Message logs</span>
            <span style="color:#8c8c8c;font-size:12px;margin-left:6px;">Resets message quota to zero</span>
          </a-checkbox>
          <a-checkbox v-model="resetModal.files" style="display:block;">
            <span style="font-weight:500;">Vector chunks (files)</span>
            <span style="color:#8c8c8c;font-size:12px;margin-left:6px;">Deletes all ingested documents</span>
          </a-checkbox>
        </a-modal>

        <!-- Create Site Modal -->
        <a-modal
          v-model="createModalVisible"
          title="Add New Site"
          :confirm-loading="creating"
          ok-text="Create"
          @ok="submitCreate"
          @cancel="resetForm"
        >
          <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
            <a-form-item label="Site Name" required>
              <a-input v-model="createForm.name" placeholder="e.g. my-website" />
            </a-form-item>
            <a-form-item label="Plan">
              <a-select v-model="createForm.plan">
                <a-select-option value="free">Free</a-select-option>
                <a-select-option value="pro">Pro</a-select-option>
                <a-select-option value="gold">Gold</a-select-option>
                <a-select-option value="enterprise">Enterprise</a-select-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-modal>
      </div>
    `,
    data() {
      return {
        sites: [],
        loading: false,
        search: '',
        createModalVisible: false,
        creating: false,
        newApiKey: null,
        actionLoading: {},
        keyModal: { visible: false, siteName: '', apiKey: '', loading: false, siteId: null },
        resetModal: { visible: false, siteName: '', siteId: null, messages: false, files: false, loading: false },
        createForm: { name: '', plan: 'free' },
        columns: [
          { title: 'ID',       dataIndex: 'id',       key: 'id',      width: 55 },
          { title: 'Enabled',  key: 'enabled',        width: 75,      scopedSlots: { customRender: 'enabled' } },
          { title: 'Name',     dataIndex: 'name',     key: 'name',    width: 180 },
          { title: 'Plan',     dataIndex: 'plan',     key: 'plan',    width: 110, scopedSlots: { customRender: 'plan' } },
          { title: 'Requests', key: 'requests',       width: 140,     scopedSlots: { customRender: 'requests' } },
          { title: 'Created',  dataIndex: 'created_at', key: 'created_at', width: 110,
            customRender: t => t ? t.split('T')[0] : '—' },
          { title: 'Actions',  key: 'actions',                        scopedSlots: { customRender: 'actions' } },
        ],
      };
    },
    computed: {
      activeSites() { return this.sites.filter(s => s.is_active).length; },
      filteredSites() {
        if (!this.search) return this.sites;
        const q = this.search.toLowerCase();
        return this.sites.filter(s => s.name.toLowerCase().includes(q) || String(s.id).includes(q));
      },
    },
    methods: {
      countPlan(p) { return this.sites.filter(s => s.plan === p).length; },
      usagePct(r) {
        if (!r.message_limit) return 0;
        return Math.round((r.total_requests / r.message_limit) * 100);
      },
      async fetchSites() {
        this.loading = true;
        try {
          this.sites = await window.PanelAPI.listSites() || [];
        } catch (e) {
          this.$message.error('Failed to load sites: ' + e.message);
        } finally {
          this.loading = false;
        }
      },
      async toggleActive(site, active) {
        this.$set(this.actionLoading, site.id, true);
        try {
          await window.PanelAPI.setActive(site.id, active);
          this.$message.success(site.name + (active ? ' reactivated' : ' deactivated'));
          await this.fetchSites();
        } catch (e) {
          this.$message.error(e.message);
        } finally {
          this.$set(this.actionLoading, site.id, false);
        }
      },
      async changePlan(site, plan) {
        this.$set(this.actionLoading, site.id, true);
        try {
          await window.PanelAPI.updatePlan(site.id, plan);
          this.$message.success('Plan updated to ' + plan);
          await this.fetchSites();
        } catch (e) {
          this.$message.error(e.message);
        } finally {
          this.$set(this.actionLoading, site.id, false);
        }
      },
      async submitCreate() {
        if (!this.createForm.name) { this.$message.warning('Name is required'); return; }
        this.creating = true;
        try {
          const resp = await window.PanelAPI.createSite(this.createForm.name, this.createForm.plan);
          this.newApiKey = resp.api_key;
          this.$message.success('Site created!');
          this.resetForm();
          await this.fetchSites();
        } catch (e) {
          this.$message.error(e.message);
        } finally {
          this.creating = false;
        }
      },
      resetForm() {
        this.createForm = { name: '', plan: 'free' };
        this.createModalVisible = false;
      },
      toggleApiKey(record) {
        if (this.keyModal.visible && this.keyModal.siteId === record.id) {
          this.keyModal.visible = false;
          return;
        }
        this.$confirm({
          title: 'Regenerate API Key for ' + record.name + '?',
          content: 'The current key will stop working immediately. Save the new key — it will only be shown once.',
          okText: 'Regenerate',
          okType: 'danger',
          cancelText: 'Cancel',
          onOk: () => this.doRegenerateKey(record),
        });
      },
      async doRegenerateKey(record) {
        this.keyModal = { visible: true, siteName: record.name, apiKey: '', loading: true, siteId: record.id };
        try {
          const resp = await window.PanelAPI.regenerateKey(record.id);
          this.keyModal.apiKey = resp.api_key || '';
          this.keyModal.loading = false;
        } catch (e) {
          this.$message.error('Failed to regenerate key: ' + e.message);
          this.keyModal.visible = false;
        }
      },
      copyKey(key) {
        navigator.clipboard.writeText(key).then(() => {
          this.$message.success('Copied to clipboard!');
        });
      },
      openResetModal(record) {
        this.resetModal = { visible: true, siteName: record.name, siteId: record.id, messages: false, files: false, loading: false };
      },
      async submitReset() {
        if (!this.resetModal.messages && !this.resetModal.files) {
          this.$message.warning('Select at least one option to reset.');
          return;
        }
        this.resetModal.loading = true;
        try {
          const resp = await window.PanelAPI.resetSite(this.resetModal.siteId, this.resetModal.messages, this.resetModal.files);
          const cleared = (resp.cleared || []).join(', ') || 'nothing';
          this.$message.success('Reset complete — cleared: ' + cleared);
          this.resetModal.visible = false;
          await this.fetchSites();
        } catch (e) {
          this.$message.error('Reset failed: ' + e.message);
        } finally {
          this.resetModal.loading = false;
        }
      },
    },
    mounted() { this.fetchSites(); },
  });
})(Vue);