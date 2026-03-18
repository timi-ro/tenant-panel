/**
 * app.js — Vue Router setup and root Vue instance.
 * Must be loaded AFTER api.js and all component scripts.
 */

(function (Vue, VueRouter) {
  'use strict';

  Vue.use(VueRouter);

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------
  const routes = [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: { template: '<dashboard-view />' },
    },
    {
      path: '/sites',
      name: 'sites',
      component: { template: '<sites-view />' },
    },
    {
      path: '/queue',
      name: 'queue',
      component: { template: '<queue-monitor-view />' },
    },
    {
      // Catch-all: redirect unknown paths to dashboard.
      path: '*',
      redirect: '/dashboard',
    },
  ];

  const router = new VueRouter({
    mode: 'hash',
    routes,
  });

  // ---------------------------------------------------------------------------
  // Page title / icon map
  // ---------------------------------------------------------------------------
  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    sites: 'Sites',
    queue: 'Queue Monitor',
  };

  const PAGE_ICONS = {
    dashboard: 'fa fa-tachometer',
    sites: 'fa fa-globe',
    queue: 'fa fa-list-ol',
  };

  // ---------------------------------------------------------------------------
  // Global toast notification helper
  // ---------------------------------------------------------------------------
  function showToast(type, text, duration) {
    duration = duration || 3000;
    var container = document.getElementById('toast-container');
    if (!container) return;
    var el = document.createElement('div');
    el.className = 'toast-msg ' + type;
    el.textContent = text;
    container.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 400);
    }, duration);
  }

  Vue.prototype.$showMessage = function (type, text) { showToast(type, text); };

  // ---------------------------------------------------------------------------
  // Root instance
  // ---------------------------------------------------------------------------
  new Vue({
    el: '#app',
    router,
    computed: {
      pageTitle() {
        return PAGE_TITLES[this.$route.name] || 'Tenant Panel';
      },
      pageIcon() {
        return PAGE_ICONS[this.$route.name] || 'fa fa-home';
      },
    },
    methods: {
      go(name) {
        if (this.$route.name !== name) this.$router.push({ name });
      },
      async logout() {
        try {
          await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (_) {
          // ignore
        }
        window.location.href = '/login';
      },
    },
  });
})(Vue, VueRouter);