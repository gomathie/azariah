import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBusinessStore } from '@/stores/business'

declare module 'vue-router' {
  interface RouteMeta {
    /** Route needs a signed-in user. */
    requiresAuth?: boolean
    /** Route needs a selected business (implies requiresAuth). */
    requiresBusiness?: boolean
    /** Signed-in users are redirected away (login, signup). */
    guestOnly?: boolean
    titleKey?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('@/features/auth/WelcomeView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/features/auth/LoginView.vue'),
      meta: { guestOnly: true, titleKey: 'auth.signIn' },
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/features/auth/SignUpView.vue'),
      meta: { guestOnly: true, titleKey: 'auth.signUp' },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/features/auth/ResetPasswordView.vue'),
      meta: { titleKey: 'auth.resetTitle' },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/features/onboarding/CreateBusinessView.vue'),
      meta: { requiresAuth: true, titleKey: 'onboarding.title' },
    },
    {
      path: '/',
      component: () => import('@/app/AppShell.vue'),
      meta: { requiresAuth: true, requiresBusiness: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/features/dashboard/HomeView.vue'),
          meta: { titleKey: 'nav.home' },
        },
        {
          path: 'daybook',
          name: 'daybook',
          component: () => import('@/features/daybook/DaybookView.vue'),
          meta: { titleKey: 'nav.daybook' },
        },
        {
          path: 'add',
          name: 'add',
          component: () => import('@/features/daybook/AddChooserView.vue'),
          meta: { titleKey: 'nav.add' },
        },
        {
          path: 'add/sale',
          name: 'add-sale',
          component: () => import('@/features/sales/AddSaleView.vue'),
          meta: { titleKey: 'sale.add' },
        },
        {
          path: 'add/expense',
          name: 'add-expense',
          component: () => import('@/features/expenses/AddExpenseView.vue'),
          meta: { titleKey: 'expense.add' },
        },
        {
          path: 'customers',
          name: 'customers',
          component: () => import('@/features/customers/CustomersView.vue'),
          meta: { titleKey: 'nav.customers' },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/features/reports/ReportsView.vue'),
          meta: { titleKey: 'nav.reports' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/features/settings/SettingsView.vue'),
          meta: { titleKey: 'nav.settings' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.ready()

  if (to.meta.guestOnly && auth.isSignedIn) return { name: 'home' }
  if ((to.meta.requiresAuth || to.meta.requiresBusiness) && !auth.isSignedIn) {
    return { name: 'welcome', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.meta.requiresBusiness) {
    const business = useBusinessStore()
    await business.ensureLoaded()
    if (!business.current) return { name: 'onboarding' }
  }
  return true
})

router.afterEach((to) => {
  const suffix = ' · Azaria'
  document.title = to.meta.titleKey ? `${to.meta.titleKey}${suffix}` : 'Azaria'
})

export default router
