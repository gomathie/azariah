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
          path: 'daybook/:transactionId',
          name: 'transaction',
          component: () => import('@/features/daybook/TransactionDetailView.vue'),
          meta: { titleKey: 'daybook.title' },
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
          path: 'customers/:contactId',
          name: 'customer-detail',
          component: () => import('@/features/customers/CustomerDetailView.vue'),
          meta: { titleKey: 'customers.statement' },
        },
        {
          path: 'customers/:contactId/payment',
          name: 'record-payment',
          component: () => import('@/features/customers/RecordPaymentView.vue'),
          meta: { titleKey: 'collection.record' },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/features/reports/ReportsView.vue'),
          meta: { titleKey: 'nav.reports' },
        },
        {
          path: 'accounts',
          name: 'accounts',
          component: () => import('@/features/accounts/AccountsView.vue'),
          meta: { titleKey: 'nav.accounts' },
        },
        {
          path: 'accounts/transfer',
          name: 'transfer',
          component: () => import('@/features/accounts/TransferView.vue'),
          meta: { titleKey: 'transfer.title' },
        },
        {
          path: 'accounts/:accountId',
          name: 'account-statement',
          component: () => import('@/features/accounts/AccountStatementView.vue'),
          meta: { titleKey: 'accounts.statement' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/features/settings/SettingsView.vue'),
          meta: { titleKey: 'nav.settings' },
        },
        {
          path: 'settings/business',
          name: 'business-settings',
          component: () => import('@/features/settings/BusinessSettingsView.vue'),
          meta: { titleKey: 'businessSettings.title' },
        },
        {
          path: 'settings/members',
          name: 'members',
          component: () => import('@/features/settings/MembersView.vue'),
          meta: { titleKey: 'members.title' },
        },
        {
          path: 'settings/privacy',
          name: 'privacy',
          component: () => import('@/features/settings/PrivacyView.vue'),
          meta: { titleKey: 'privacy.title' },
        },
        {
          path: 'settings/profile',
          name: 'profile',
          component: () => import('@/features/settings/ProfileView.vue'),
          meta: { titleKey: 'profile.title' },
        },
        {
          path: 'help',
          name: 'help',
          component: () => import('@/features/help/HelpView.vue'),
          meta: { titleKey: 'help.title' },
        },
        {
          path: 'sync',
          name: 'sync',
          component: () => import('@/features/sync/SyncStatusView.vue'),
          meta: { titleKey: 'sync.title' },
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
