/**
 * api.js — Axios-based API client for the RAG Admin Panel.
 * All methods return Promises and follow the { success, obj, msg } envelope.
 */

(function (window) {
  'use strict';

  const http = axios.create({
    baseURL: '/panel/api',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Response interceptor: unwrap envelope or reject with message.
  http.interceptors.response.use(
    function (response) {
      const data = response.data;
      if (data && data.success === false) {
        return Promise.reject(new Error(data.msg || 'Unknown error'));
      }
      return data;
    },
    function (error) {
      if (error.response && error.response.status === 401) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  window.PanelAPI = {
    // Server
    getServerStatus() {
      return http.get('/server/status').then(r => r.obj);
    },

    // Sites
    listSites() {
      return http.get('/sites').then(r => r.obj);
    },
    createSite(name, plan) {
      return http.post('/sites', { name, plan }).then(r => r.obj);
    },
    getSite(id) {
      return http.get(`/sites/${id}`).then(r => r.obj);
    },
    updatePlan(id, plan) {
      return http.post(`/sites/${id}/plan`, { plan }).then(r => r.obj);
    },
    deactivateSite(id) {
      return http.post(`/sites/${id}/deactivate`).then(r => r.obj);
    },
    reactivateSite(id) {
      return http.post(`/sites/${id}/reactivate`).then(r => r.obj);
    },

    // Queue
    getQueue() {
      return http.get('/queue').then(r => r.obj);
    },
    trackJob(jobId, siteId, siteName, filename) {
      return http.post(`/queue/${jobId}/track`, {
        site_id: siteId,
        site_name: siteName,
        filename: filename,
      }).then(r => r.obj);
    },
    retryJob(jobId, apiKey) {
      return http.post(`/queue/${jobId}/retry`, { api_key: apiKey || '' }).then(r => r.obj);
    },
  };
})(window);