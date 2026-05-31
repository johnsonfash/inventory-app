import { lazy, type ComponentType } from "react"
import type { RouteObject } from "react-router-dom"

type PageModule = { default: ComponentType<any> }

// Wraps React.lazy so a chunk-load failure (typical after a deploy:
// the running tab holds the old asset manifest, the new build has
// different hashes, the dynamic import 404s and Vercel serves the
// SPA fallback HTML where a JS module was expected → MIME error)
// triggers a one-time full reload. The reload pulls the fresh
// index.html with the new asset URLs and the app boots cleanly.
//
// The sessionStorage guard prevents a reload loop if the chunk is
// actually broken (not just stale). After one auto-reload, further
// failures bubble up to the error boundary instead.
const RELOAD_GUARD_KEY = "pallio:chunk-reload-once"

// A lazy component that also exposes `preload()` so a route's chunk
// can be warmed BEFORE the user navigates — this kills the Suspense
// fallback flash on first visit to a heavy route (notably POS).
type PreloadableComponent = ReturnType<typeof lazy> & { preload: () => Promise<unknown> }

const page = (load: () => Promise<PageModule>): PreloadableComponent => {
  const Comp = lazy(async () => {
    try {
      const mod = await load()
      // Successful load — reset the guard so a future stale-chunk
      // event after another deploy can recover the same way.
      try { sessionStorage.removeItem(RELOAD_GUARD_KEY) } catch { /* private mode */ }
      return mod
    } catch (err) {
      const reloaded = (() => { try { return sessionStorage.getItem(RELOAD_GUARD_KEY) === "1" } catch { return false } })()
      if (!reloaded && typeof window !== "undefined") {
        try { sessionStorage.setItem(RELOAD_GUARD_KEY, "1") } catch { /* private mode */ }
        window.location.reload()
        // Return a never-resolving promise so React keeps the
        // Suspense fallback visible until the reload kicks in.
        return new Promise(() => {}) as never
      }
      throw err
    }
  }) as PreloadableComponent
  // Warm the chunk on demand; swallow errors (a failed prefetch is
  // harmless — the real navigation still takes the lazy path).
  Comp.preload = () => load().catch(() => {})
  return Comp
}

export const routes: RouteObject[] = [
  // --- Public marketing site ---
  { path: "/", Component: page(() => import("./pages/marketing-site/landing")) },
  { path: "/pricing", Component: page(() => import("./pages/marketing-site/pricing")) },
  { path: "/about", Component: page(() => import("./pages/marketing-site/about")) },
  { path: "/faq", Component: page(() => import("./pages/marketing-site/faq")) },
  { path: "/contact", Component: page(() => import("./pages/marketing-site/contact")) },
  { path: "/privacy", Component: page(() => import("./pages/marketing-site/privacy")) },
  { path: "/terms", Component: page(() => import("./pages/marketing-site/terms")) },
  { path: "/login", Component: page(() => import("./pages/marketing-site/login")) },
  { path: "/register", Component: page(() => import("./pages/marketing-site/register")) },

  // --- App routes (everything under the AppFrame shell) ---
  { path: "/dashboard", Component: page(() => import("./pages/dashboard")) },
  { path: "/onboarding", Component: page(() => import("./pages/onboarding")) },
  { path: "/accounting/balance-sheet", Component: page(() => import("./pages/accounting/balance-sheet")) },
  { path: "/accounting/profit-loss",   Component: page(() => import("./pages/accounting/profit-loss")) },
  { path: "/accounting/cash-flow",     Component: page(() => import("./pages/accounting/cash-flow")) },
  { path: "/accounting/taxes",         Component: page(() => import("./pages/accounting/taxes")) },
  { path: "/accounting/payroll",       Component: page(() => import("./pages/accounting/payroll")) },
  { path: "/accounting/commissions",   Component: page(() => import("./pages/accounting/commissions")) },
  { path: "/accounting/chart-of-accounts", Component: page(() => import("./pages/accounting/chart-of-accounts")) },
  { path: "/accounting/journal-entries",   Component: page(() => import("./pages/accounting/journal-entries")) },
  { path: "/accounting/reconciliation",    Component: page(() => import("./pages/accounting/reconciliation")) },
  { path: "/ai", Component: page(() => import("./pages/ai")) },
  { path: "/analytics", Component: page(() => import("./pages/analytics")) },
  { path: "/appointments", Component: page(() => import("./pages/appointments")) },
  { path: "/communications", Component: page(() => import("./pages/communications")) },
  { path: "/communications/new", Component: page(() => import("./pages/communications/new")) },
  { path: "/communications/templates", Component: page(() => import("./pages/communications/templates")) },
  { path: "/communications/templates/new", Component: page(() => import("./pages/communications/templates/new")) },
  { path: "/communications/templates/:id", Component: page(() => import("./pages/communications/templates/[id]")) },
  { path: "/expenses", Component: page(() => import("./pages/expenses")) },
  { path: "/expenses/new", Component: page(() => import("./pages/expenses/new")) },
  { path: "/integrations/website", Component: page(() => import("./pages/integrations/website")) },
  { path: "/inventory", Component: page(() => import("./pages/inventory")) },
  { path: "/inventory/adjustments", Component: page(() => import("./pages/inventory/adjustments")) },
  { path: "/inventory/brands", Component: page(() => import("./pages/inventory/brands")) },
  { path: "/inventory/brands/new", Component: page(() => import("./pages/inventory/brands/new")) },
  { path: "/inventory/categories", Component: page(() => import("./pages/inventory/categories")) },
  { path: "/inventory/categories/new", Component: page(() => import("./pages/inventory/categories/new")) },
  { path: "/inventory/composite", Component: page(() => import("./pages/inventory/composite")) },
  { path: "/inventory/composite/new", Component: page(() => import("./pages/inventory/composite/new")) },
  { path: "/inventory/labels", Component: page(() => import("./pages/inventory/labels")) },
  { path: "/inventory/new", Component: page(() => import("./pages/inventory/new")) },
  { path: "/inventory/price-lists", Component: page(() => import("./pages/inventory/price-lists")) },
  { path: "/inventory/price-lists/new", Component: page(() => import("./pages/inventory/price-lists/new")) },
  { path: "/inventory/production", Component: page(() => import("./pages/inventory/production")) },
  { path: "/inventory/recipes", Component: page(() => import("./pages/inventory/recipes")) },
  { path: "/inventory/recipes/new", Component: page(() => import("./pages/inventory/recipes/new")) },
  { path: "/inventory/recipes/:id", Component: page(() => import("./pages/inventory/recipes/[id]")) },
  { path: "/inventory/lots", Component: page(() => import("./pages/inventory/lots")) },
  { path: "/inventory/recall", Component: page(() => import("./pages/inventory/recall")) },
  { path: "/inventory/receive", Component: page(() => import("./pages/inventory/receive")) },
  { path: "/inventory/transfers", Component: page(() => import("./pages/inventory/transfers")) },
  { path: "/inventory/units", Component: page(() => import("./pages/inventory/units")) },
  { path: "/inventory/units/new", Component: page(() => import("./pages/inventory/units/new")) },
  { path: "/inventory/warranties", Component: page(() => import("./pages/inventory/warranties")) },
  { path: "/inventory/warranties/new", Component: page(() => import("./pages/inventory/warranties/new")) },
  { path: "/marketing", Component: page(() => import("./pages/marketing")) },
  { path: "/marketing/commissions", Component: page(() => import("./pages/marketing/commissions")) },
  { path: "/marketing/facebook-ads", Component: page(() => import("./pages/marketing/facebook-ads")) },
  { path: "/marketing/facebook-ads/new-campaign", Component: page(() => import("./pages/marketing/facebook-ads/new-campaign")) },
  { path: "/marketing/facebook-ads/new-listing", Component: page(() => import("./pages/marketing/facebook-ads/new-listing")) },
  { path: "/marketing/facebook-marketplace", Component: page(() => import("./pages/marketing/facebook-marketplace")) },
  { path: "/marketing/tiktok-ads", Component: page(() => import("./pages/marketing/tiktok-ads")) },
  { path: "/marketing/generate", Component: page(() => import("./pages/marketing/generate")) },
  { path: "/marketing/analytics", Component: page(() => import("./pages/marketing/analytics")) },
  { path: "/marketing/instagram-ads", Component: page(() => import("./pages/marketing/instagram-ads")) },
  { path: "/marketing/instagram-ads/new-campaign", Component: page(() => import("./pages/marketing/instagram-ads/new-campaign")) },
  { path: "/marketing/instagram-ads/new-listing", Component: page(() => import("./pages/marketing/instagram-ads/new-listing")) },
  { path: "/marketing/listings/new", Component: page(() => import("./pages/marketing/listings/new")) },
  { path: "/marketing/youtube-adsense", Component: page(() => import("./pages/marketing/youtube-adsense")) },
  { path: "/marketing/youtube-adsense/new-campaign", Component: page(() => import("./pages/marketing/youtube-adsense/new-campaign")) },
  { path: "/marketing/youtube-adsense/new-listing", Component: page(() => import("./pages/marketing/youtube-adsense/new-listing")) },
  { path: "/notifications", Component: page(() => import("./pages/notifications")) },
  { path: "/pos", Component: page(() => import("./pages/pos")) },
  { path: "/pos/venue", Component: page(() => import("./pages/pos/venue")) },
  { path: "/pos/prep", Component: page(() => import("./pages/pos/prep")) },
  { path: "/pos/shifts", Component: page(() => import("./pages/pos/shifts")) },
  { path: "/pos/drafts", Component: page(() => import("./pages/pos/drafts")) },
  { path: "/pos/invoices", Component: page(() => import("./pages/pos/invoices")) },
  { path: "/pos/invoices/:id", Component: page(() => import("./pages/pos/invoices/[id]")) },
  { path: "/pos/returns", Component: page(() => import("./pages/pos/returns")) },
  { path: "/pos/returns/:id", Component: page(() => import("./pages/pos/returns/[id]")) },
  { path: "/pos/returns/new", Component: page(() => import("./pages/pos/returns/new")) },
  { path: "/pos/transactions", Component: page(() => import("./pages/pos/transactions")) },
  { path: "/purchasing/bills", Component: page(() => import("./pages/purchasing/bills")) },
  { path: "/purchasing/bills/new", Component: page(() => import("./pages/purchasing/bills/new")) },
  { path: "/purchasing/bills/:id", Component: page(() => import("./pages/purchasing/bills/[id]")) },
  { path: "/purchasing/pos", Component: page(() => import("./pages/purchasing/pos")) },
  { path: "/purchasing/pos/new", Component: page(() => import("./pages/purchasing/pos/new")) },
  { path: "/purchasing/pos/:id", Component: page(() => import("./pages/purchasing/pos/[id]")) },
  { path: "/purchasing/receipts", Component: page(() => import("./pages/purchasing/receipts")) },
  { path: "/purchasing/receipts/new", Component: page(() => import("./pages/purchasing/receipts/new")) },
  { path: "/purchasing/receipts/:id", Component: page(() => import("./pages/purchasing/receipts/[id]")) },
  { path: "/purchasing/suppliers", Component: page(() => import("./pages/purchasing/suppliers")) },
  { path: "/purchasing/vendor-credits", Component: page(() => import("./pages/purchasing/vendor-credits")) },
  { path: "/purchasing/vendor-credits/new", Component: page(() => import("./pages/purchasing/vendor-credits/new")) },
  { path: "/purchasing/vendor-credits/:id", Component: page(() => import("./pages/purchasing/vendor-credits/[id]")) },
  { path: "/purchasing/vendors", Component: page(() => import("./pages/purchasing/vendors")) },
  { path: "/purchasing/vendors/new", Component: page(() => import("./pages/purchasing/vendors/new")) },
  { path: "/purchasing/vendors/:id", Component: page(() => import("./pages/purchasing/vendors/[id]")) },
  { path: "/reporting", Component: page(() => import("./pages/reporting")) },
  { path: "/reporting/activity-log", Component: page(() => import("./pages/reporting/activity-log")) },
  { path: "/reporting/cash-drawer", Component: page(() => import("./pages/reporting/cash-drawer")) },
  { path: "/reporting/tip-pool", Component: page(() => import("./pages/reporting/tip-pool")) },
  { path: "/reporting/returns-by-reason", Component: page(() => import("./pages/reporting/returns-by-reason")) },
  { path: "/reporting/refunds-by-method", Component: page(() => import("./pages/reporting/refunds-by-method")) },
  { path: "/reporting/customer-group", Component: page(() => import("./pages/reporting/customer-group")) },
  { path: "/reporting/expense", Component: page(() => import("./pages/reporting/expense")) },
  { path: "/reporting/item", Component: page(() => import("./pages/reporting/item")) },
  { path: "/reporting/product-purchase", Component: page(() => import("./pages/reporting/product-purchase")) },
  { path: "/reporting/product-sell", Component: page(() => import("./pages/reporting/product-sell")) },
  { path: "/reporting/profit-loss", Component: page(() => import("./pages/reporting/profit-loss")) },
  { path: "/reporting/purchase-payment", Component: page(() => import("./pages/reporting/purchase-payment")) },
  { path: "/reporting/purchase-sale", Component: page(() => import("./pages/reporting/purchase-sale")) },
  { path: "/reporting/register", Component: page(() => import("./pages/reporting/register")) },
  { path: "/reporting/sales-representatives", Component: page(() => import("./pages/reporting/sales-representatives")) },
  { path: "/reporting/sell-payment", Component: page(() => import("./pages/reporting/sell-payment")) },
  { path: "/reporting/stock", Component: page(() => import("./pages/reporting/stock")) },
  { path: "/reporting/stock-adjustment", Component: page(() => import("./pages/reporting/stock-adjustment")) },
  { path: "/reporting/stock-expiry", Component: page(() => import("./pages/reporting/stock-expiry")) },
  { path: "/reporting/variance", Component: page(() => import("./pages/reporting/variance")) },
  { path: "/reporting/allergens", Component: page(() => import("./pages/reporting/allergens")) },
  { path: "/reporting/recipe-cost", Component: page(() => import("./pages/reporting/recipe-cost")) },
  { path: "/reporting/supplier-customer", Component: page(() => import("./pages/reporting/supplier-customer")) },
  { path: "/reporting/tax", Component: page(() => import("./pages/reporting/tax")) },
  { path: "/reporting/trending-product", Component: page(() => import("./pages/reporting/trending-product")) },
  { path: "/sales/customers", Component: page(() => import("./pages/sales/customers")) },
  { path: "/sales/customers/new", Component: page(() => import("./pages/sales/customers/new")) },
  { path: "/sales/customers/:id", Component: page(() => import("./pages/sales/customers/[id]")) },
  { path: "/sales/discounts", Component: page(() => import("./pages/sales/discounts")) },
  { path: "/sales/discounts/new", Component: page(() => import("./pages/sales/discounts/new")) },
  { path: "/sales/discounts/:code", Component: page(() => import("./pages/sales/discounts/[code]")) },
  { path: "/sales/inventory", Component: page(() => import("./pages/sales/inventory")) },
  { path: "/sales/invoices", Component: page(() => import("./pages/sales/invoices")) },
  { path: "/sales/invoices/new", Component: page(() => import("./pages/sales/invoices/new")) },
  { path: "/sales/invoices/:id", Component: page(() => import("./pages/sales/invoices/[id]")) },
  { path: "/sales/orders", Component: page(() => import("./pages/sales/orders")) },
  { path: "/sales/orders/new", Component: page(() => import("./pages/sales/orders/new")) },
  { path: "/sales/receipts", Component: page(() => import("./pages/sales/receipts")) },
  { path: "/sales/receipts/:id", Component: page(() => import("./pages/sales/receipts/[id]")) },
  { path: "/sales/returns", Component: page(() => import("./pages/sales/returns")) },
  { path: "/sales/returns/new", Component: page(() => import("./pages/sales/returns/new")) },
  { path: "/sales/returns/:id", Component: page(() => import("./pages/sales/returns/[id]")) },
  { path: "/sales/shipments", Component: page(() => import("./pages/sales/shipments")) },
  { path: "/sales/shipments/new", Component: page(() => import("./pages/sales/shipments/new")) },
  { path: "/sales/shipments/:id", Component: page(() => import("./pages/sales/shipments/[id]")) },
  { path: "/sales/team", Component: page(() => import("./pages/sales/team")) },
  { path: "/sales/team/:member", Component: page(() => import("./pages/sales/team/[member]")) },
  { path: "/sales/team/chat", Component: page(() => import("./pages/sales/team/chat")) },
  { path: "/settings", Component: page(() => import("./pages/settings")) },
  { path: "/settings/barcodes", Component: page(() => import("./pages/settings/barcodes")) },
  { path: "/settings/business", Component: page(() => import("./pages/settings/business")) },
  { path: "/settings/currency", Component: page(() => import("./pages/settings/currency")) },
  { path: "/settings/integrations", Component: page(() => import("./pages/settings/integrations")) },
  { path: "/settings/integrations/calendar", Component: page(() => import("./pages/settings/integrations/calendar")) },
  { path: "/settings/integrations/easypost", Component: page(() => import("./pages/settings/integrations/easypost")) },
  { path: "/settings/integrations/facebook-ads", Component: page(() => import("./pages/settings/integrations/facebook-ads")) },
  { path: "/settings/integrations/facebook-marketplace", Component: page(() => import("./pages/settings/integrations/facebook-marketplace")) },
  { path: "/settings/integrations/google-workspace", Component: page(() => import("./pages/settings/integrations/google-workspace")) },
  { path: "/settings/integrations/instagram-ads", Component: page(() => import("./pages/settings/integrations/instagram-ads")) },
  { path: "/settings/integrations/paypal", Component: page(() => import("./pages/settings/integrations/paypal")) },
  { path: "/settings/integrations/shippo", Component: page(() => import("./pages/settings/integrations/shippo")) },
  { path: "/settings/integrations/shopify", Component: page(() => import("./pages/settings/integrations/shopify")) },
  { path: "/settings/integrations/stripe", Component: page(() => import("./pages/settings/integrations/stripe")) },
  { path: "/settings/integrations/website", Component: page(() => import("./pages/settings/integrations/website")) },
  { path: "/settings/integrations/woocommerce", Component: page(() => import("./pages/settings/integrations/woocommerce")) },
  { path: "/settings/integrations/youtube-adsense", Component: page(() => import("./pages/settings/integrations/youtube-adsense")) },
  { path: "/settings/integrations/:id", Component: page(() => import("./pages/settings/integrations/[id]")) },
  { path: "/settings/invoice", Component: page(() => import("./pages/settings/invoice")) },
  { path: "/settings/locations", Component: page(() => import("./pages/settings/locations")) },
  { path: "/settings/notifications", Component: page(() => import("./pages/settings/notifications")) },
  { path: "/settings/payments", Component: page(() => import("./pages/settings/payments")) },
  { path: "/settings/payments/accounts", Component: page(() => import("./pages/settings/payments/accounts")) },
  { path: "/settings/payments/accounts/new", Component: page(() => import("./pages/settings/payments/accounts/new")) },
  { path: "/settings/payments/business-accounts", Component: page(() => import("./pages/settings/payments/business-accounts")) },
  { path: "/settings/payments/locations", Component: page(() => import("./pages/settings/payments/locations")) },
  { path: "/settings/payments/withdrawals", Component: page(() => import("./pages/settings/payments/withdrawals")) },
  { path: "/settings/payments/withdrawals/new", Component: page(() => import("./pages/settings/payments/withdrawals/new")) },
  { path: "/affiliate/dashboard", Component: page(() => import("./pages/affiliate/dashboard")) },
  { path: "/help/glossary", Component: page(() => import("./pages/help/glossary")) },
  { path: "/storefront", Component: page(() => import("./pages/storefront")) },
  { path: "/storefront/templates", Component: page(() => import("./pages/storefront/templates")) },
  { path: "/storefront/templates/:id", Component: page(() => import("./pages/storefront/templates/[id]")) },
  { path: "/storefront/analytics", Component: page(() => import("./pages/storefront/analytics")) },
  { path: "/storefront/orders", Component: page(() => import("./pages/storefront/orders")) },
  { path: "/storefront/orders/:id", Component: page(() => import("./pages/storefront/orders/[id]")) },
  { path: "/storefront/customers", Component: page(() => import("./pages/storefront/customers")) },
  { path: "/storefront/products", Component: page(() => import("./pages/storefront/products")) },
  { path: "/storefront/domain", Component: page(() => import("./pages/storefront/domain")) },
  { path: "/storefront/settings", Component: page(() => import("./pages/storefront/settings")) },
  { path: "/storefront/discounts", Component: page(() => import("./pages/storefront/discounts")) },
  { path: "/storefront/pages", Component: page(() => import("./pages/storefront/pages")) },
  { path: "/storefront/billing", Component: page(() => import("./pages/storefront/billing")) },
  { path: "/settings/preferences", Component: page(() => import("./pages/settings/preferences")) },
  { path: "/settings/profile", Component: page(() => import("./pages/settings/profile")) },
  { path: "/settings/printers", Component: page(() => import("./pages/settings/printers")) },
  { path: "/settings/roles", Component: page(() => import("./pages/settings/roles")) },
  { path: "/settings/roles/new", Component: page(() => import("./pages/settings/roles/new")) },
  { path: "/settings/security", Component: page(() => import("./pages/settings/security")) },
  { path: "/settings/billing", Component: page(() => import("./pages/settings/billing")) },
  { path: "/settings/api", Component: page(() => import("./pages/settings/api")) },
  { path: "/settings/webhooks", Component: page(() => import("./pages/settings/webhooks")) },
  { path: "/settings/automations", Component: page(() => import("./pages/settings/automations")) },
  { path: "/settings/export", Component: page(() => import("./pages/settings/export")) },
  { path: "/settings/audit", Component: page(() => import("./pages/settings/audit")) },
  { path: "/settings/taxes", Component: page(() => import("./pages/settings/taxes")) },
  { path: "/settings/users", Component: page(() => import("./pages/settings/users")) },
  { path: "/settings/users/new", Component: page(() => import("./pages/settings/users/new")) },
  { path: "/settings/users/:id", Component: page(() => import("./pages/settings/users/[id]")) },
  { path: "/settings/warehouses", Component: page(() => import("./pages/settings/warehouses")) },
  { path: "/settings/warehouses/:code/edit", Component: page(() => import("./pages/settings/warehouses/[code]/edit")) },
  { path: "/settings/warehouses/new", Component: page(() => import("./pages/settings/warehouses/new")) },
  { path: "*", Component: page(() => import("./pages/not-found")) },
]

// Warm the chunks for the given route paths (no-op for unknown paths).
// Called on idle from the app shell so the heavy, most-visited routes
// are already cached by the time the operator taps them — no Suspense
// "loading" flash that reads like the boot splash.
export function prefetchRoutes(paths: string[]): void {
  for (const p of paths) {
    const comp = routes.find((r) => r.path === p)?.Component as
      | (ComponentType<any> & { preload?: () => Promise<unknown> })
      | undefined
    comp?.preload?.()
  }
}
