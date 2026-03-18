/**
 * sites.js — Site Management (uAdmin Bootstrap 3 style)
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

        <!-- New API key alert (one-time after create) -->
        <div v-if="newApiKey" class="api-key-alert">
          <i class="fa fa-check-circle" style="color:#52c41a;font-size:16px;margin-top:2px;"></i>
          <div style="flex:1;">
            <div style="font-weight:600;color:#262626;margin-bottom:4px;">Site created! Save your API key &mdash; it won't be shown again.</div>
            <code style="background:#fff;border:1px solid #d9d9d9;border-radius:4px;padding:4px 10px;font-size:13px;word-break:break-all;display:inline-block;">{{ newApiKey }}</code>
          </div>
          <button type="button" class="close" @click="newApiKey = null" style="margin-left:8px;">&times;</button>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <button class="btn btn-primary btn-sm" @click="showCreateModal()">
            <i class="fa fa-plus"></i> Add Site
          </button>
          <div class="toolbar-right">
            <div class="input-group input-group-sm" style="width:220px;">
              <input type="text" class="form-control" v-model="search" placeholder="Search sites...">
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

        <!-- Sites Table panel -->
        <div class="panel panel-default">
          <div class="panel-body" style="padding:0;">
            <div v-if="loading" class="text-center" style="padding:30px;">
              <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
            </div>
            <div v-else-if="filteredSites.length === 0" class="text-center text-muted" style="padding:30px;font-size:13px;">
              No sites found.
            </div>
            <div v-else style="overflow-x:auto;">
              <table class="table table-striped table-bordered table-condensed" style="margin:0;">
                <thead>
                  <tr>
                    <th style="width:55px;">ID</th>
                    <th style="width:75px;">Enabled</th>
                    <th style="width:180px;">Name</th>
                    <th style="width:110px;">Plan</th>
                    <th style="width:140px;">Requests</th>
                    <th style="width:110px;">Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="site in paginatedSites" :key="site.id">
                    <td style="font-size:12px;color:#888;">{{ site.id }}</td>
                    <td>
                      <!-- Toggle switch styled as checkbox -->
                      <label class="switch switch-success" style="margin:0;" :title="site.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'">
                        <input
                          type="checkbox"
                          :checked="site.is_active"
                          :disabled="!!actionLoading[site.id]"
                          @change="toggleActive(site, $event.target.checked)"
                        >
                        <span></span>
                      </label>
                    </td>
                    <td style="font-size:13px;font-weight:500;">{{ site.name }}</td>
                    <td>
                      <span class="plan-tag" :class="'plan-' + site.plan">{{ site.plan }}</span>
                    </td>
                    <td>
                      <div style="min-width:80px;">
                        <span style="font-size:12px;">{{ site.total_requests }} / {{ site.message_limit }}</span>
                        <div class="mini-progress">
                          <div
                            class="mini-progress-bar"
                            :class="{ warn: usagePct(site) > 75 }"
                            :style="{ width: Math.min(usagePct(site), 100) + '%' }"
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td style="font-size:12px;">{{ site.created_at ? site.created_at.split('T')[0] : '—' }}</td>
                    <td>
                      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
                        <!-- Reactivate button (only when inactive) -->
                        <button
                          v-if="!site.is_active"
                          class="btn btn-xs btn-primary"
                          :disabled="!!actionLoading[site.id]"
                          @click="toggleActive(site, true)"
                        >
                          <i class="fa fa-refresh" :class="{ 'fa-spin': !!actionLoading[site.id] }"></i> Reactivate
                        </button>

                        <!-- Regen API Key -->
                        <button class="btn btn-xs btn-default" @click="toggleApiKey(site)" title="Regenerate API Key">
                          <i class="fa fa-key"></i> Regen Key
                        </button>

                        <!-- Configure LLM -->
                        <button class="btn btn-xs btn-default" @click="openLLMModal(site)" title="Configure LLM">
                          <i class="fa fa-cog"></i> LLM
                        </button>

                        <!-- Reset -->
                        <button class="btn btn-xs btn-danger" @click="openResetModal(site)" title="Reset site data">
                          <i class="fa fa-trash-o"></i> Reset
                        </button>

                        <!-- Plan selector -->
                        <select
                          class="form-control input-sm"
                          style="width:105px;display:inline-block;"
                          :value="site.plan"
                          :disabled="!!actionLoading[site.id]"
                          @change="changePlan(site, $event.target.value)"
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="gold">Gold</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Pagination -->
            <div v-if="totalPages > 1" style="padding:10px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-top:1px solid #ddd;">
              <span style="font-size:12px;color:#777;">Total {{ filteredSites.length }}</span>
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

        <!-- ============================================================
             MODALS
        ============================================================ -->

        <!-- Create Site Modal -->
        <div class="modal fade" id="createSiteModal" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" @click="resetForm"><span>&times;</span></button>
                <h4 class="modal-title"><i class="fa fa-plus-circle"></i> Add New Site</h4>
              </div>
              <div class="modal-body">
                <form class="form-horizontal">
                  <div class="form-group">
                    <label class="control-label col-sm-4">Site Name <span class="text-danger">*</span></label>
                    <div class="col-sm-8">
                      <input type="text" class="form-control" v-model="createForm.name" placeholder="e.g. my-website">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="control-label col-sm-4">Plan</label>
                    <div class="col-sm-8">
                      <select class="form-control" v-model="createForm.plan">
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="gold">Gold</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal" @click="resetForm">Cancel</button>
                <button type="button" class="btn btn-primary" @click="submitCreate" :disabled="creating">
                  <i class="fa fa-spinner fa-spin" v-if="creating"></i>
                  <i class="fa fa-check" v-else></i>
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- END Create Site Modal -->

        <!-- API Key Modal -->
        <div class="modal fade" id="apiKeyModal" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                <h4 class="modal-title"><i class="fa fa-key"></i> API Key &mdash; {{ keyModal.siteName }}</h4>
              </div>
              <div class="modal-body">
                <div v-if="keyModal.loading" class="text-center" style="padding:20px;">
                  <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
                </div>
                <div v-else-if="keyModal.apiKey" style="display:flex;align-items:center;gap:8px;">
                  <code style="flex:1;background:#f5f5f5;border:1px solid #d9d9d9;border-radius:4px;padding:8px 12px;font-size:13px;word-break:break-all;display:block;">{{ keyModal.apiKey }}</code>
                  <button class="btn btn-default btn-sm" @click="copyKey(keyModal.apiKey)">
                    <i class="fa fa-copy"></i> Copy
                  </button>
                </div>
                <div v-else class="text-muted" style="font-size:13px;">No API key available.</div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
        <!-- END API Key Modal -->

        <!-- LLM Config Modal -->
        <div class="modal fade" id="llmModal" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                <h4 class="modal-title"><i class="fa fa-cog"></i> LLM Config &mdash; {{ llmModal.siteName }}</h4>
              </div>
              <div class="modal-body">
                <form class="form-horizontal">
                  <div class="form-group">
                    <label class="control-label col-sm-4">Provider <span class="text-danger">*</span></label>
                    <div class="col-sm-8">
                      <select class="form-control" v-model="llmModal.provider">
                        <option value="" disabled>Select provider</option>
                        <option value="openai">OpenAI</option>
                        <option value="gemini">Gemini</option>
                        <option value="anthropic">Anthropic</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="control-label col-sm-4">Model</label>
                    <div class="col-sm-8">
                      <input type="text" class="form-control" v-model="llmModal.model" :placeholder="llmModelPlaceholder">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="control-label col-sm-4">API Key <span class="text-danger">*</span></label>
                    <div class="col-sm-8">
                      <input type="password" class="form-control" v-model="llmModal.apiKey" placeholder="Paste API key">
                    </div>
                  </div>
                </form>
                <div v-if="llmModal.currentProvider" style="margin-top:4px;padding:8px 12px;background:#f5f5f5;border-radius:4px;font-size:12px;color:#595959;">
                  Current provider: <strong>{{ llmModal.currentProvider }}</strong>
                  <span v-if="llmModal.currentModel"> &middot; model: <strong>{{ llmModal.currentModel }}</strong></span>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" @click="submitLLM" :disabled="llmModal.loading">
                  <i class="fa fa-spinner fa-spin" v-if="llmModal.loading"></i>
                  <i class="fa fa-save" v-else></i>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- END LLM Config Modal -->

        <!-- Reset Site Modal -->
        <div class="modal fade" id="resetSiteModal" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                <h4 class="modal-title"><i class="fa fa-trash-o text-danger"></i> Reset &mdash; {{ resetModal.siteName }}</h4>
              </div>
              <div class="modal-body">
                <p class="text-muted" style="margin-bottom:16px;">Select what to clear. This cannot be undone.</p>
                <div class="checkbox">
                  <label>
                    <input type="checkbox" v-model="resetModal.messages">
                    <strong>Message logs</strong>
                    <span class="text-muted" style="font-size:12px;margin-left:6px;">Resets message quota to zero</span>
                  </label>
                </div>
                <div class="checkbox">
                  <label>
                    <input type="checkbox" v-model="resetModal.files">
                    <strong>Vector chunks (files)</strong>
                    <span class="text-muted" style="font-size:12px;margin-left:6px;">Deletes all ingested documents</span>
                  </label>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" @click="submitReset" :disabled="resetModal.loading">
                  <i class="fa fa-spinner fa-spin" v-if="resetModal.loading"></i>
                  <i class="fa fa-trash-o" v-else></i>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- END Reset Site Modal -->

        <!-- Confirm Regen Key Modal -->
        <div class="modal fade" id="confirmRegenModal" tabindex="-1" role="dialog">
          <div class="modal-dialog modal-sm" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                <h4 class="modal-title"><i class="fa fa-exclamation-triangle text-warning"></i> Regenerate API Key</h4>
              </div>
              <div class="modal-body">
                <p>Regenerate API Key for <strong>{{ pendingRegenSite ? pendingRegenSite.name : '' }}</strong>?</p>
                <p class="text-danger" style="font-size:13px;">The current key will stop working immediately. Save the new key — it will only be shown once.</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" @click="confirmRegen">
                  <i class="fa fa-key"></i> Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- END Confirm Regen Key Modal -->

      </div>
    `,
    data() {
      return {
        sites: [],
        loading: false,
        search: '',
        currentPage: 1,
        pageSize: 15,
        creating: false,
        newApiKey: null,
        actionLoading: {},
        pendingRegenSite: null,
        keyModal:   { visible: false, siteName: '', apiKey: '', loading: false, siteId: null },
        resetModal: { visible: false, siteName: '', siteId: null, messages: false, files: false, loading: false },
        llmModal:   { visible: false, siteName: '', siteId: null, provider: '', model: '', apiKey: '', currentProvider: '', currentModel: '', loading: false },
        createForm: { name: '', plan: 'free' },
      };
    },
    computed: {
      activeSites() { return this.sites.filter(s => s.is_active).length; },
      llmModelPlaceholder() {
        const defaults = { openai: 'gpt-4o', gemini: 'gemini-1.5-pro', anthropic: 'claude-3-5-sonnet-20241022' };
        return this.llmModal.provider ? ('default: ' + (defaults[this.llmModal.provider] || '')) : 'optional';
      },
      filteredSites() {
        if (!this.search) return this.sites;
        const q = this.search.toLowerCase();
        return this.sites.filter(s => s.name.toLowerCase().includes(q) || String(s.id).includes(q));
      },
      totalPages() {
        return Math.max(1, Math.ceil(this.filteredSites.length / this.pageSize));
      },
      paginatedSites() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredSites.slice(start, start + this.pageSize);
      },
    },
    watch: {
      search() { this.currentPage = 1; },
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
          this.$showMessage('error', 'Failed to load sites: ' + e.message);
        } finally {
          this.loading = false;
        }
      },
      async toggleActive(site, active) {
        this.$set(this.actionLoading, site.id, true);
        try {
          await window.PanelAPI.setActive(site.id, active);
          this.$showMessage('success', site.name + (active ? ' reactivated' : ' deactivated'));
          await this.fetchSites();
        } catch (e) {
          this.$showMessage('error', e.message);
        } finally {
          this.$set(this.actionLoading, site.id, false);
        }
      },
      async changePlan(site, plan) {
        this.$set(this.actionLoading, site.id, true);
        try {
          await window.PanelAPI.updatePlan(site.id, plan);
          this.$showMessage('success', 'Plan updated to ' + plan);
          await this.fetchSites();
        } catch (e) {
          this.$showMessage('error', e.message);
        } finally {
          this.$set(this.actionLoading, site.id, false);
        }
      },

      // Create Site
      showCreateModal() {
        jQuery('#createSiteModal').modal('show');
      },
      async submitCreate() {
        if (!this.createForm.name) {
          this.$showMessage('warning', 'Name is required');
          return;
        }
        this.creating = true;
        try {
          const resp = await window.PanelAPI.createSite(this.createForm.name, this.createForm.plan);
          this.newApiKey = resp.api_key;
          this.$showMessage('success', 'Site created!');
          this.resetForm();
          await this.fetchSites();
        } catch (e) {
          this.$showMessage('error', e.message);
        } finally {
          this.creating = false;
        }
      },
      resetForm() {
        this.createForm = { name: '', plan: 'free' };
        jQuery('#createSiteModal').modal('hide');
      },

      // API Key
      toggleApiKey(record) {
        this.pendingRegenSite = record;
        jQuery('#confirmRegenModal').modal('show');
      },
      confirmRegen() {
        jQuery('#confirmRegenModal').modal('hide');
        if (this.pendingRegenSite) {
          this.doRegenerateKey(this.pendingRegenSite);
        }
      },
      async doRegenerateKey(record) {
        this.keyModal = { visible: true, siteName: record.name, apiKey: '', loading: true, siteId: record.id };
        jQuery('#apiKeyModal').modal('show');
        try {
          const resp = await window.PanelAPI.regenerateKey(record.id);
          this.keyModal.apiKey = resp.api_key || '';
          this.keyModal.loading = false;
        } catch (e) {
          this.$showMessage('error', 'Failed to regenerate key: ' + e.message);
          jQuery('#apiKeyModal').modal('hide');
        }
      },
      copyKey(key) {
        navigator.clipboard.writeText(key).then(() => {
          this.$showMessage('success', 'Copied to clipboard!');
        });
      },

      // LLM Config
      openLLMModal(record) {
        this.llmModal = {
          visible: true,
          siteName: record.name,
          siteId: record.id,
          provider: record.llm_provider || '',
          model: record.llm_model || '',
          apiKey: '',
          currentProvider: record.llm_provider || '',
          currentModel: record.llm_model || '',
          loading: false,
        };
        jQuery('#llmModal').modal('show');
      },
      async submitLLM() {
        if (!this.llmModal.provider) { this.$showMessage('warning', 'Provider is required'); return; }
        if (!this.llmModal.apiKey)   { this.$showMessage('warning', 'API key is required');  return; }
        this.llmModal.loading = true;
        try {
          await window.PanelAPI.setLLM(this.llmModal.siteId, this.llmModal.provider, this.llmModal.model, this.llmModal.apiKey);
          this.$showMessage('success', 'LLM credentials saved');
          jQuery('#llmModal').modal('hide');
          await this.fetchSites();
        } catch (e) {
          this.$showMessage('error', 'Failed to save LLM config: ' + e.message);
        } finally {
          this.llmModal.loading = false;
        }
      },

      // Reset Site
      openResetModal(record) {
        this.resetModal = { visible: true, siteName: record.name, siteId: record.id, messages: false, files: false, loading: false };
        jQuery('#resetSiteModal').modal('show');
      },
      async submitReset() {
        if (!this.resetModal.messages && !this.resetModal.files) {
          this.$showMessage('warning', 'Select at least one option to reset.');
          return;
        }
        this.resetModal.loading = true;
        try {
          const resp = await window.PanelAPI.resetSite(this.resetModal.siteId, this.resetModal.messages, this.resetModal.files);
          const cleared = (resp.cleared || []).join(', ') || 'nothing';
          this.$showMessage('success', 'Reset complete — cleared: ' + cleared);
          jQuery('#resetSiteModal').modal('hide');
          await this.fetchSites();
        } catch (e) {
          this.$showMessage('error', 'Reset failed: ' + e.message);
        } finally {
          this.resetModal.loading = false;
        }
      },
    },
    mounted() { this.fetchSites(); },
  });
})(Vue);