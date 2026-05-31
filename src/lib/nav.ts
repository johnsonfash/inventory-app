import {
  BarChart3,
  Bell,
  Bookmark,
  Bot,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Globe,
  Mail,
  Megaphone,
  Package2,
  Puzzle,
  Receipt,
  Settings,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react"

/**
 * A sub-item may opt into a runtime badge (e.g. count of new items).
 * `badgeKey` is a stable id the sidebar resolves to a count via
 * `getNavBadge()`. Kept off the bare data type so static imports of
 * NAV stay free of runtime dependencies — the resolver lives in
 * `lib/nav-badges.ts`.
 */
export type SubItem = { title: string; url: string; badgeKey?: string }
export type NavItem = { title: string; url?: string; icon: LucideIcon; sub?: SubItem[] }

// ----- Single source of truth for the full app navigation -----
//
// Consumed by:
//   - AppSidebar           (desktop)
//   - MobileMoreDrawer     (mobile tile grid + drill-in + search)
//
// NOT consumed by — these are intentionally curated subsets:
//   - BOTTOM_NAV_PRIMARY   (mobile bottom bar, 4 fixed icons)
//   - Command palette      (curated NAVIGATE + QUICK_ACTIONS in
//                           components/command/sources.ts)
//
// Section ordering follows how a shop owner actually thinks about
// their day:
//   1. At-a-glance       → Dashboard
//   2. Daily ops         → POS, Appointments
//   3. Sell side         → Sales, Inventory
//   4. Buy side          → Purchases, Expenses
//   5. Books             → Accounting, Reporting
//   6. Grow              → Storefront, Marketing, Communications, AI Assistant
//   7. System            → My Commissions, Notifications, Integrations, Settings, Help
//
// Sub-item ordering inside each group follows the "list/manage pages
// first, then 'new X' creation pages clustered at the bottom"
// convention — better for vertical scanning on desktop and tap
// scrolling on mobile.
export const NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },

  {
    title: "Point of Sale",
    icon: CreditCard,
    sub: [
      { title: "Current Sale", url: "/pos" },
      { title: "Tables & Tabs", url: "/pos/venue" },
      { title: "Prep Queue", url: "/pos/prep" },
      { title: "Drafts", url: "/pos/drafts" },
      { title: "Shifts", url: "/pos/shifts" },
      { title: "Transactions", url: "/pos/transactions" },
      { title: "Invoices", url: "/pos/invoices" },
      { title: "Returns", url: "/pos/returns" },
      { title: "Start Return", url: "/pos/returns/new" },
    ],
  },

  { title: "Appointments", url: "/appointments", icon: CalendarDays },

  {
    title: "Sales",
    icon: ShoppingCart,
    sub: [
      { title: "Customers", url: "/sales/customers" },
      { title: "Tickets", url: "/customers/tickets", badgeKey: "tickets:new" },
      { title: "Orders", url: "/sales/orders" },
      { title: "Invoices", url: "/sales/invoices" },
      { title: "Receipts", url: "/sales/receipts" },
      { title: "Shipments", url: "/sales/shipments" },
      { title: "Returns", url: "/sales/returns" },
      { title: "Discounts", url: "/sales/discounts" },
      { title: "Gift Cards", url: "/sales/gift-cards" },
      { title: "Team Performance", url: "/sales/team" },
      { title: "Live Stock", url: "/sales/inventory" },
      { title: "New Customer", url: "/sales/customers/new" },
      { title: "New Ticket", url: "/customers/tickets/new" },
      { title: "New Order", url: "/sales/orders/new" },
      { title: "New Invoice", url: "/sales/invoices/new" },
      { title: "New Shipment", url: "/sales/shipments/new" },
      { title: "New Return", url: "/sales/returns/new" },
      { title: "New Discount", url: "/sales/discounts/new" },
    ],
  },

  {
    title: "Inventory",
    icon: Package2,
    sub: [
      { title: "Items", url: "/inventory" },
      { title: "Receive Stock", url: "/inventory/receive" },
      { title: "Adjustments", url: "/inventory/adjustments" },
      { title: "Transfers", url: "/inventory/transfers" },
      { title: "Categories", url: "/inventory/categories" },
      { title: "Units", url: "/inventory/units" },
      { title: "Brands", url: "/inventory/brands" },
      { title: "Warranties", url: "/inventory/warranties" },
      { title: "Price Lists", url: "/inventory/price-lists" },
      { title: "Bundles & Kits", url: "/inventory/composite" },
      { title: "Recipes", url: "/inventory/recipes" },
      { title: "Production", url: "/inventory/production" },
      { title: "Batches", url: "/inventory/lots" },
      { title: "Recalls", url: "/inventory/recall" },
      { title: "Label Print", url: "/inventory/labels" },
      { title: "New Item", url: "/inventory/new" },
      { title: "Add Category", url: "/inventory/categories/new" },
      { title: "Add Unit", url: "/inventory/units/new" },
      { title: "Add Brand", url: "/inventory/brands/new" },
      { title: "Add Warranty", url: "/inventory/warranties/new" },
      { title: "New Price List", url: "/inventory/price-lists/new" },
      { title: "New Bundle", url: "/inventory/composite/new" },
      { title: "New Recipe", url: "/inventory/recipes/new" },
    ],
  },

  {
    title: "Purchases",
    icon: ClipboardList,
    sub: [
      { title: "Vendors", url: "/purchasing/vendors" },
      { title: "Purchase Orders", url: "/purchasing/pos" },
      { title: "Receipts", url: "/purchasing/receipts" },
      { title: "Bills", url: "/purchasing/bills" },
      { title: "Vendor Credits", url: "/purchasing/vendor-credits" },
      { title: "Add Vendor", url: "/purchasing/vendors/new" },
      { title: "New Purchase Order", url: "/purchasing/pos/new" },
      { title: "New Receipt", url: "/purchasing/receipts/new" },
      { title: "New Bill", url: "/purchasing/bills/new" },
      { title: "New Vendor Credit", url: "/purchasing/vendor-credits/new" },
    ],
  },

  {
    title: "Expenses",
    icon: Receipt,
    sub: [
      { title: "All Expenses", url: "/expenses" },
      { title: "Add Expense", url: "/expenses/new" },
    ],
  },

  {
    title: "Accounting",
    icon: Wallet,
    sub: [
      { title: "Profit & Loss",  url: "/accounting/profit-loss" },
      { title: "Balance Sheet",  url: "/accounting/balance-sheet" },
      { title: "Cash Flow",      url: "/accounting/cash-flow" },
      { title: "Payroll",        url: "/accounting/payroll" },
      { title: "Commission Payouts", url: "/accounting/commissions" },
      { title: "Tax Filings",    url: "/accounting/taxes" },
      { title: "Chart of Accounts", url: "/accounting/chart-of-accounts" },
      { title: "Journal Entries",   url: "/accounting/journal-entries" },
      { title: "Bank Reconciliation", url: "/accounting/reconciliation" },
    ],
  },

  {
    title: "Reporting",
    icon: FileText,
    sub: [
      { title: "Profit & Loss", url: "/reporting/profit-loss" },
      { title: "Purchase & Sale", url: "/reporting/purchase-sale" },
      { title: "Tax Report", url: "/reporting/tax" },
      { title: "Suppliers & Customers", url: "/reporting/supplier-customer" },
      { title: "Customer Segments", url: "/reporting/customer-group" },
      { title: "Stock", url: "/reporting/stock" },
      { title: "Stock Expiry", url: "/reporting/stock-expiry" },
      { title: "Stock Adjustment", url: "/reporting/stock-adjustment" },
      { title: "Stock Variance", url: "/reporting/variance" },
      { title: "Recipe Costs", url: "/reporting/recipe-cost" },
      { title: "Allergens", url: "/reporting/allergens" },
      { title: "Top Sellers", url: "/reporting/trending-product" },
      { title: "Item Performance", url: "/reporting/item" },
      { title: "Purchases by Product", url: "/reporting/product-purchase" },
      { title: "Sales by Product", url: "/reporting/product-sell" },
      { title: "Supplier Payments", url: "/reporting/purchase-payment" },
      { title: "Customer Payments", url: "/reporting/sell-payment" },
      { title: "Expense Report", url: "/reporting/expense" },
      { title: "Till Summary", url: "/reporting/register" },
      { title: "Cash Drawer", url: "/reporting/cash-drawer" },
      { title: "Tip Pool", url: "/reporting/tip-pool" },
      { title: "Returns by Reason", url: "/reporting/returns-by-reason" },
      { title: "Refunds by Method", url: "/reporting/refunds-by-method" },
      { title: "Sales Reps", url: "/reporting/sales-representatives" },
      { title: "Activity Log", url: "/reporting/activity-log" },
    ],
  },

  {
    title: "Storefront",
    icon: Globe,
    sub: [
      { title: "Manage", url: "/storefront" },
      { title: "Orders", url: "/storefront/orders" },
      { title: "Customers", url: "/storefront/customers" },
      { title: "Products", url: "/storefront/products" },
      { title: "Discounts", url: "/storefront/discounts" },
      { title: "Pages & Content", url: "/storefront/pages" },
      { title: "Analytics", url: "/storefront/analytics" },
      { title: "Domain & DNS", url: "/storefront/domain" },
      { title: "Billing", url: "/storefront/billing" },
      { title: "Settings", url: "/storefront/settings" },
      { title: "Browse Templates", url: "/storefront/templates" },
    ],
  },

  {
    title: "Marketing",
    icon: Megaphone,
    sub: [
      { title: "Overview", url: "/marketing" },
      { title: "Facebook Marketplace", url: "/marketing/facebook-marketplace" },
      { title: "Facebook Ads", url: "/marketing/facebook-ads" },
      { title: "Instagram Ads", url: "/marketing/instagram-ads" },
      { title: "YouTube & AdSense", url: "/marketing/youtube-adsense" },
      { title: "Commissions", url: "/marketing/commissions" },
      { title: "New Listing", url: "/marketing/listings/new" },
    ],
  },

  {
    title: "Communications",
    icon: Mail,
    sub: [
      { title: "Inbox", url: "/communications" },
      { title: "Compose", url: "/communications/new" },
      { title: "Templates", url: "/communications/templates" },
      { title: "Team Chat", url: "/sales/team/chat" },
    ],
  },

  { title: "AI Assistant", url: "/ai", icon: Bot },

  { title: "My Commissions", url: "/affiliate/dashboard", icon: Bookmark },

  { title: "Notifications", url: "/notifications", icon: Bell },

  { title: "Integrations", url: "/settings/integrations", icon: Puzzle },

  {
    title: "Settings",
    icon: Settings,
    sub: [
      { title: "Business Settings", url: "/settings/business" },
      { title: "Business Location", url: "/settings/locations" },
      { title: "Warehouses", url: "/settings/warehouses" },
      { title: "Team", url: "/settings/users" },
      { title: "Team Roles", url: "/settings/roles" },
      { title: "Currency", url: "/settings/currency" },
      { title: "Tax Settings", url: "/settings/taxes" },
      { title: "Payment Settings", url: "/settings/payments" },
      { title: "Receiving Accounts", url: "/settings/payments/business-accounts" },
      { title: "Payout Accounts", url: "/settings/payments/accounts" },
      { title: "Invoice Settings", url: "/settings/invoice" },
      { title: "Loyalty Rules", url: "/settings/loyalty" },
      { title: "Receipt Printers", url: "/settings/printers" },
      { title: "Barcode Settings", url: "/settings/barcodes" },
      { title: "Notification Settings", url: "/settings/notifications" },
      { title: "Security", url: "/settings/security" },
      { title: "Preferences", url: "/settings/preferences" },
      { title: "Profile", url: "/settings/profile" },
    ],
  },

  { title: "Help", url: "/help/glossary", icon: FileText },
]

// Primary destinations exposed in the mobile bottom nav. INTENTIONALLY
// a curated subset — picked for "most-used" rather than full coverage.
// Everything else falls into the More drawer.
export const BOTTOM_NAV_PRIMARY: { title: string; url: string; icon: LucideIcon }[] = [
  { title: "Home", url: "/dashboard", icon: BarChart3 },
  { title: "POS", url: "/pos", icon: CreditCard },
  { title: "Stock", url: "/inventory", icon: Package2 },
  { title: "Sales", url: "/sales/orders", icon: ShoppingCart },
]
