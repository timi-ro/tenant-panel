/**
 * app.js — Vue Router setup and root Vue instance.
 * Must be loaded AFTER api.js and all component scripts.
 */

(function (Vue, VueRouter, antd) {
  'use strict';

  Vue.use(VueRouter);
  Vue.use(antd);

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
  // Page title map
  // ---------------------------------------------------------------------------
  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    sites: 'Sites',
    queue: 'Queue Monitor',
  };

  // ---------------------------------------------------------------------------
  // Root instance
  // ---------------------------------------------------------------------------
  new Vue({
    el: '#app',
    router,
    data() {
      return {
        collapsed: false,
      };
    },
    computed: {
      pageTitle() {
        return PAGE_TITLES[this.$route.name] || 'RAG Admin Panel';
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
})(Vue, VueRouter, antd);