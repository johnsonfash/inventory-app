import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  Box,
  Building2,
  Calculator,
  CalendarDays,
  Compass,
  CreditCard,
  DollarSign,
  Factory,
  FileCheck,
  FileMinus,
  FileText,
  Globe,
  Layers,
  LifeBuoy,
  Lock,
  Megaphone,
  Package,
  Package2,
  PackagePlus,
  Plus,
  Play,
  Receipt,
  RotateCcw,
  Scale,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Tags,
  Truck,
  Users,
  UserPlus,
  Wallet,
  Warehouse,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import { loadCatalog } from "@/lib/pos/storage"
import { resetOnboarding } from "@/components/onboarding/getting-started"
import { formatPriceFor } from "@/contexts/currency"

// One command in the palette. `id` is stable across renders for
// React keys + recent-history matching; `group` puts it under the
// right section header in the result list.
export type CommandItem = {
  id: string
  title: string
  /** Optional one-line subtitle (route path / SKU / status). */
  subtitle?: string
  /** Searchable tokens — title + subtitle + any extras. Lowercased + joined. */
  searchTerms: string
  group: CommandGroup
  Icon: LucideIcon
  /** Destination route. If provided, palette navigates here on enter. */
  href?: string
  /** Custom action. Runs after closing the palette. */
  onSelect?: (helpers: CommandHelpers) => void | Promise<void>
  /** Keyboard shortcut hint (visual only). */
  shortcut?: string
}

export type CommandGroup =
  | "Recent"
  | "Quick actions"
  | "Navigate"
  | "Inventory"
  | "Customers"
  | "Settings"
  | "Help"

export type CommandHelpers = {
  navigate: (to: string) => void
  setTheme: (t: "light" | "dark" | "system") => void
}

// --- Quick actions: the "create new ___" + frequently-used POS bits. ---
const QUICK_ACTIONS: CommandItem[] = [
  { id: "qa-new-sale",     group: "Quick actions", title: "Run a new sale",      subtitle: "Open the POS",                Icon: ShoppingCart, href: "/pos",                  searchTerms: "new sale pos register checkout cart" },
  { id: "qa-new-item",     group: "Quick actions", title: "Add a new item",      subtitle: "Inventory / new",             Icon: PackagePlus,  href: "/inventory/new",         searchTerms: "new item product sku add inventory" },
  { id: "qa-new-po",       group: "Quick actions", title: "Create purchase order", subtitle: "Purchasing / new",          Icon: Box,          href: "/purchasing/pos/new",    searchTerms: "new purchase order po reorder vendor stock" },
  { id: "qa-receive",      group: "Quick actions", title: "Receive stock",       subtitle: "Goods in",                    Icon: Truck,        href: "/inventory/receive",     searchTerms: "receive stock goods in delivery shipment" },
  { id: "qa-new-customer", group: "Quick actions", title: "Add customer",        subtitle: "Sales / customers / new",     Icon: UserPlus,     href: "/sales/customers/new",   searchTerms: "new customer add contact buyer" },
  { id: "qa-new-invoice",  group: "Quick actions", title: "Create invoice",      subtitle: "Sales / invoices / new",      Icon: FileText,     href: "/sales/invoices/new",    searchTerms: "new invoice bill" },
  { id: "qa-new-expense",  group: "Quick actions", title: "Log an expense",      subtitle: "Expenses / new",              Icon: Receipt,      href: "/expenses/new",          searchTerms: "new expense receipt outflow" },
  { id: "qa-print-labels", group: "Quick actions", title: "Print labels",        subtitle: "Inventory / labels",          Icon: Tags,         href: "/inventory/labels",      searchTerms: "print labels barcode" },
  { id: "qa-new-recipe",   group: "Quick actions", title: "Add a recipe",         subtitle: "Inventory / recipes / new",  Icon: Workflow,    href: "/inventory/recipes/new", searchTerms: "new recipe bom build bake assemble blend service production component" },
  { id: "qa-log-run",      group: "Quick actions", title: "Log a production",     subtitle: "Inventory / production",     Icon: Factory,     href: "/inventory/production",  searchTerms: "production run batch made produced bake blend assemble service job" },
  { id: "qa-recall",       group: "Quick actions", title: "Start a recall",       subtitle: "Inventory / recalls",        Icon: ShieldAlert, href: "/inventory/recall",      searchTerms: "recall trace lot batch contamination defect compliance fsma" },
  { id: "qa-record-credit",group: "Quick actions", title: "Record vendor credit",subtitle: "Purchasing / credits / new",  Icon: FileMinus,    href: "/purchasing/vendor-credits/new", searchTerms: "vendor credit memo refund" },
  { id: "qa-send-email",   group: "Quick actions", title: "Send a new email",    subtitle: "Communications / new",        Icon: Megaphone,    href: "/communications/new",            searchTerms: "send email compose new message marketing customer" },
  { id: "qa-withdrawal",   group: "Quick actions", title: "Request withdrawal",  subtitle: "Settings / payments",         Icon: ArrowDownToLine, href: "/settings/payments/withdrawals/new", searchTerms: "withdrawal payout bank transfer" },
]

// --- Navigate: top-level destinations + the most frequently visited
// sub-pages. Keep this curated — dumping all 131 routes makes
// search noisier, not better.
const NAVIGATE: CommandItem[] = [
  { id: "nav-dashboard",      group: "Navigate", title: "Dashboard",            subtitle: "/dashboard",                Icon: BarChart3,    href: "/dashboard",                  searchTerms: "dashboard home overview today" },
  { id: "nav-pos",            group: "Navigate", title: "POS",                  subtitle: "/pos",                      Icon: CreditCard,   href: "/pos",                        searchTerms: "pos point of sale register checkout" },
  { id: "nav-pos-venue",      group: "Navigate", title: "Tables & Tabs",        subtitle: "/pos/venue",                Icon: CreditCard,   href: "/pos/venue",                  searchTerms: "tables tabs venue spots chairs bays floor seating open orders" },
  { id: "nav-pos-prep",       group: "Navigate", title: "Prep Queue",           subtitle: "/pos/prep",                 Icon: Layers,       href: "/pos/prep",                   searchTerms: "prep queue kitchen kds display tickets stylist service" },
  { id: "nav-pos-drafts",     group: "Navigate", title: "POS drafts",           subtitle: "/pos/drafts",               Icon: Layers,       href: "/pos/drafts",                 searchTerms: "drafts holds suspended sales pos" },
  { id: "nav-pos-shifts",     group: "Navigate", title: "Cashier shifts",       subtitle: "/pos/shifts",               Icon: Receipt,      href: "/pos/shifts",                 searchTerms: "shifts cash drawer x report z report reconcile open close till float" },
  { id: "nav-pos-tx",         group: "Navigate", title: "POS transactions",     subtitle: "/pos/transactions",         Icon: Receipt,      href: "/pos/transactions",           searchTerms: "transactions tape day pos history" },
  { id: "nav-inventory",      group: "Navigate", title: "Inventory",            subtitle: "/inventory",                Icon: Package2,     href: "/inventory",                  searchTerms: "inventory items stock" },
  { id: "nav-inventory-adj",  group: "Navigate", title: "Stock adjustments",    subtitle: "/inventory/adjustments",    Icon: Boxes,        href: "/inventory/adjustments",      searchTerms: "stock adjustments adjust shrinkage recount" },
  { id: "nav-inventory-cats", group: "Navigate", title: "Categories",           subtitle: "/inventory/categories",     Icon: Tags,         href: "/inventory/categories",       searchTerms: "categories taxonomy inventory" },
  { id: "nav-recipes",        group: "Navigate", title: "Recipes",               subtitle: "/inventory/recipes",         Icon: Workflow,    href: "/inventory/recipes",          searchTerms: "recipes bom bill of materials production assembly build bake blend formula composition component" },
  { id: "nav-production",     group: "Navigate", title: "Production",            subtitle: "/inventory/production",      Icon: Factory,     href: "/inventory/production",       searchTerms: "production runs batches made produced bakes blends assemblies services" },
  { id: "nav-lots",           group: "Navigate", title: "Batches",               subtitle: "/inventory/lots",            Icon: Boxes,       href: "/inventory/lots",             searchTerms: "lots batches expiry batch tracking fefo traceability" },
  { id: "nav-recall",         group: "Navigate", title: "Recalls",               subtitle: "/inventory/recall",          Icon: ShieldAlert, href: "/inventory/recall",           searchTerms: "recall trace contamination defect fsma compliance batch lot" },
  { id: "nav-customers",      group: "Navigate", title: "Customers",            subtitle: "/sales/customers",          Icon: Users,        href: "/sales/customers",            searchTerms: "customers buyers contacts crm" },
  { id: "nav-gift-cards",     group: "Navigate", title: "Gift cards",           subtitle: "/sales/gift-cards",         Icon: Wallet,       href: "/sales/gift-cards",           searchTerms: "gift cards prepaid voucher balance issued redeemed value instrument" },
  { id: "nav-tickets",        group: "Navigate", title: "Customer tickets",     subtitle: "/customers/tickets",        Icon: LifeBuoy,     href: "/customers/tickets",          searchTerms: "tickets complaints damaged missing late wrong item refund resolution support care" },
  { id: "nav-orders",         group: "Navigate", title: "Sales orders",         subtitle: "/sales/orders",             Icon: ShoppingBag,  href: "/sales/orders",               searchTerms: "orders sales fulfilment" },
  { id: "nav-invoices",       group: "Navigate", title: "Invoices",             subtitle: "/sales/invoices",           Icon: FileText,     href: "/sales/invoices",             searchTerms: "invoices billing ar" },
  { id: "nav-receipts",       group: "Navigate", title: "Receipts",             subtitle: "/sales/receipts",           Icon: FileCheck,    href: "/sales/receipts",             searchTerms: "receipts paid customer" },
  { id: "nav-team",           group: "Navigate", title: "Sales team",           subtitle: "/sales/team",               Icon: Users,        href: "/sales/team",                 searchTerms: "team sales performance leaderboard reps commissions" },
  { id: "nav-team-chat",      group: "Navigate", title: "Team chat",            subtitle: "/sales/team/chat",          Icon: Users,        href: "/sales/team/chat",            searchTerms: "team chat messages dms channels" },
  { id: "nav-purchasing",     group: "Navigate", title: "Purchase orders",     subtitle: "/purchasing/pos",            Icon: Box,          href: "/purchasing/pos",             searchTerms: "purchase orders po purchasing vendors" },
  { id: "nav-bills",          group: "Navigate", title: "Bills",                subtitle: "/purchasing/bills",         Icon: FileText,     href: "/purchasing/bills",           searchTerms: "bills ap accounts payable" },
  { id: "nav-goods-receipts", group: "Navigate", title: "Goods receipts",       subtitle: "/purchasing/receipts",      Icon: FileCheck,    href: "/purchasing/receipts",        searchTerms: "goods receipts grn receiving inbound" },
  { id: "nav-vendors",        group: "Navigate", title: "Vendors",              subtitle: "/purchasing/vendors",       Icon: Building2,    href: "/purchasing/vendors",         searchTerms: "vendors suppliers" },
  { id: "nav-reporting",      group: "Navigate", title: "Reporting",            subtitle: "/reporting",                Icon: FileText,     href: "/reporting/sales",            searchTerms: "reports reporting analytics" },
  { id: "nav-pnl",            group: "Navigate", title: "Profit & Loss",        subtitle: "/reporting/profit-loss",    Icon: DollarSign,   href: "/reporting/profit-loss",      searchTerms: "pnl profit loss income statement" },
  { id: "nav-variance",       group: "Navigate", title: "Stock Variance",       subtitle: "/reporting/variance",        Icon: Scale,       href: "/reporting/variance",         searchTerms: "variance theoretical actual shrinkage drift recipe production count" },
  { id: "nav-cash-drawer",    group: "Navigate", title: "Cash Drawer report",   subtitle: "/reporting/cash-drawer",     Icon: Receipt,      href: "/reporting/cash-drawer",      searchTerms: "cash drawer till variance short over reconcile shift" },
  { id: "nav-tip-pool",       group: "Navigate", title: "Tip Pool report",      subtitle: "/reporting/tip-pool",        Icon: Receipt,      href: "/reporting/tip-pool",         searchTerms: "tips gratuity pool split team payout" },
  { id: "nav-returns-reason", group: "Navigate", title: "Returns by Reason",    subtitle: "/reporting/returns-by-reason", Icon: Receipt,    href: "/reporting/returns-by-reason", searchTerms: "returns reasons refunds damaged defective sizing" },
  { id: "nav-refunds-method", group: "Navigate", title: "Refunds by Method",    subtitle: "/reporting/refunds-by-method", Icon: Receipt,    href: "/reporting/refunds-by-method", searchTerms: "refunds method cash card payback drawer" },
  { id: "nav-reorder",        group: "Navigate", title: "Reorder report",       subtitle: "/reporting/reorder",         Icon: Box,         href: "/reporting/reorder",          searchTerms: "reorder buy purchase low stock replenish vendor supplier po what to order" },
  { id: "nav-recipe-cost",    group: "Navigate", title: "Recipe Costs",         subtitle: "/reporting/recipe-cost",     Icon: Calculator,  href: "/reporting/recipe-cost",      searchTerms: "recipe cost watch drift price change margin food cost component" },
  { id: "nav-allergens",      group: "Navigate", title: "Allergens",            subtitle: "/reporting/allergens",       Icon: AlertTriangle,href: "/reporting/allergens",        searchTerms: "allergens food cosmetics gluten dairy nuts soy compliance label" },
  { id: "nav-balance",        group: "Navigate", title: "Balance sheet",        subtitle: "/accounting/balance-sheet", Icon: Wallet,       href: "/accounting/balance-sheet",   searchTerms: "balance sheet equity assets liabilities" },
  { id: "nav-marketing",      group: "Navigate", title: "Marketing",            subtitle: "/marketing",                Icon: Megaphone,    href: "/marketing",                  searchTerms: "marketing ads campaigns" },
  { id: "nav-fb-ads",         group: "Navigate", title: "Facebook Ads",         subtitle: "/marketing/facebook-ads",   Icon: Megaphone,    href: "/marketing/facebook-ads",     searchTerms: "facebook ads fb meta" },
  { id: "nav-ig-ads",         group: "Navigate", title: "Instagram Ads",        subtitle: "/marketing/instagram-ads",  Icon: Megaphone,    href: "/marketing/instagram-ads",    searchTerms: "instagram ads ig reels" },
  { id: "nav-ai",             group: "Navigate", title: "AI Assistant",         subtitle: "/ai",                       Icon: Bot,          href: "/ai",                         searchTerms: "ai assistant chat copilot" },
  { id: "nav-comms",          group: "Navigate", title: "Communications",       subtitle: "/communications",           Icon: Megaphone,    href: "/communications",             searchTerms: "communications email inbox sent drafts messages" },
  { id: "nav-comms-new",      group: "Navigate", title: "Compose email",        subtitle: "/communications/new",       Icon: Megaphone,    href: "/communications/new",         searchTerms: "compose new email send write message" },
  { id: "nav-comms-tpls",     group: "Navigate", title: "Email templates",      subtitle: "/communications/templates", Icon: Megaphone,    href: "/communications/templates",   searchTerms: "templates email library marketing transactional" },
  { id: "nav-notifications",  group: "Navigate", title: "Notifications",        subtitle: "/notifications",            Icon: Bell,         href: "/notifications",              searchTerms: "notifications alerts inbox" },
  { id: "nav-appointments",   group: "Navigate", title: "Appointments",         subtitle: "/appointments",             Icon: CalendarDays, href: "/appointments",               searchTerms: "appointments calendar bookings" },
  { id: "nav-storefront",     group: "Navigate", title: "Storefront",           subtitle: "/storefront",               Icon: Globe,        href: "/storefront",                 searchTerms: "storefront shop website online template subdomain domain hosted ecommerce" },
  { id: "nav-templates",      group: "Navigate", title: "Storefront templates", subtitle: "/storefront/templates",     Icon: Layers,       href: "/storefront/templates",       searchTerms: "templates storefront design themes shop gallery" },
  { id: "nav-affiliate",      group: "Navigate", title: "My commissions",       subtitle: "/affiliate/dashboard",      Icon: Wallet,       href: "/affiliate/dashboard",        searchTerms: "affiliate commission referral my earnings code link" },
  { id: "nav-glossary",       group: "Help",     title: "Glossary",             subtitle: "/help/glossary",            Icon: FileText,     href: "/help/glossary",              searchTerms: "glossary terms dictionary jargon sku cogs roas vat tin meaning" },
]

// --- Settings: the most-asked-for settings pages. ---
const SETTINGS_SHORTCUTS: CommandItem[] = [
  { id: "set-business",   group: "Settings", title: "Business settings",   subtitle: "/settings/business",       Icon: Store,         href: "/settings/business",       searchTerms: "business org profile branding" },
  { id: "set-currency",   group: "Settings", title: "Currency",            subtitle: "/settings/currency",       Icon: DollarSign,    href: "/settings/currency",       searchTerms: "currency naira ngn usd dollar pound symbol money" },
  { id: "set-warehouses", group: "Settings", title: "Warehouses + locations", subtitle: "/settings/warehouses", Icon: Warehouse,      href: "/settings/warehouses",     searchTerms: "warehouses locations stores" },
  { id: "set-users",      group: "Settings", title: "Users & roles",       subtitle: "/settings/users",          Icon: Users,         href: "/settings/users",          searchTerms: "users roles team invites permissions staff" },
  { id: "set-roles",      group: "Settings", title: "Roles & permissions", subtitle: "/settings/roles",          Icon: ShieldCheck,   href: "/settings/roles",          searchTerms: "roles permissions access scopes" },
  { id: "set-payments",   group: "Settings", title: "Payment methods",     subtitle: "/settings/payments",       Icon: CreditCard,    href: "/settings/payments",       searchTerms: "payments stripe paypal" },
  { id: "set-tax",        group: "Settings", title: "Tax rates",           subtitle: "/settings/taxes",          Icon: FileText,      href: "/settings/taxes",          searchTerms: "tax rates vat gst" },
  { id: "set-invoice",    group: "Settings", title: "Invoice template",    subtitle: "/settings/invoice",        Icon: FileText,      href: "/settings/invoice",        searchTerms: "invoice template numbering branding" },
  { id: "set-loyalty",    group: "Settings", title: "Loyalty rules",       subtitle: "/settings/loyalty",        Icon: Sparkles,      href: "/settings/loyalty",        searchTerms: "loyalty points rewards earn redeem rate program membership credit" },
  { id: "set-integrations", group: "Settings", title: "Integrations",      subtitle: "/settings/integrations",   Icon: Globe,         href: "/settings/integrations",   searchTerms: "integrations connectors stripe paypal shopify" },
  { id: "set-security",   group: "Settings", title: "Security",            subtitle: "/settings/security",       Icon: Lock,          href: "/settings/security",       searchTerms: "security biometric face id password 2fa" },
  { id: "set-printers",   group: "Settings", title: "Printers",            subtitle: "/settings/printers",       Icon: Package,       href: "/settings/printers",       searchTerms: "printers receipt label" },
]

// --- Help / system. ---
const HELP: CommandItem[] = [
  {
    id: "help-tour",
    group: "Help",
    title: "Replay the Getting Started checklist",
    subtitle: "Resets your onboarding progress",
    Icon: Compass,
    searchTerms: "tour onboarding getting started replay reset checklist",
    onSelect: async () => { await resetOnboarding() },
  },
  {
    id: "help-contact",
    group: "Help",
    title: "Contact support",
    subtitle: "/contact",
    Icon: Bot,
    href: "/contact",
    searchTerms: "contact support help us email chat",
  },
  {
    id: "help-theme-light",
    group: "Help",
    title: "Switch to light theme",
    Icon: Sparkles,
    searchTerms: "theme light bright",
    onSelect: ({ setTheme }) => setTheme("light"),
  },
  {
    id: "help-theme-dark",
    group: "Help",
    title: "Switch to dark theme",
    Icon: Sparkles,
    searchTerms: "theme dark night",
    onSelect: ({ setTheme }) => setTheme("dark"),
  },
  {
    id: "help-theme-system",
    group: "Help",
    title: "Match system theme",
    Icon: Sparkles,
    searchTerms: "theme system auto",
    onSelect: ({ setTheme }) => setTheme("system"),
  },
]

// --- Inventory items + customers from dummy data. Loaded lazily so
// the palette opens fast even when the catalog is large. ---
function getInventoryItems(): CommandItem[] {
  const catalog = loadCatalog("retail")
  return catalog.slice(0, 80).map((it) => ({
    id: `item-${it.id}`,
    group: "Inventory" as const,
    title: it.name,
    subtitle: `${it.sku} · ${formatPriceFor(it.price)}${it.stock != null ? ` · ${it.stock} in stock` : ""}`,
    Icon: Package2,
    href: "/inventory",
    searchTerms: `${it.name} ${it.sku} ${it.category ?? ""}`,
  }))
}

// Mock customer list — same dummy data the customers page uses.
// Hard-coded here so we don't introduce a coupling. Swap for a real
// query once the backend lands.
const CUSTOMERS_MOCK: { name: string; email: string }[] = [
  { name: "NovaApps", email: "ops@novaapps.com" },
  { name: "BrightLane", email: "billing@brightlane.io" },
  { name: "Acme Co", email: "ap@acme.co" },
  { name: "Aisha N.", email: "aisha@walkin.local" },
  { name: "Cobalt Distributors", email: "po@cobalt.com" },
  { name: "Glow Co", email: "wholesale@glowco.com" },
  { name: "Porcel Ceramics", email: "trade@porcel.shop" },
  { name: "Delta Apparel", email: "orders@deltaapparel.co" },
]

function getCustomerItems(): CommandItem[] {
  return CUSTOMERS_MOCK.map((c) => ({
    id: `cust-${c.name}`,
    group: "Customers" as const,
    title: c.name,
    subtitle: c.email,
    Icon: Users,
    href: "/sales/customers",
    searchTerms: `${c.name} ${c.email}`,
  }))
}

// Public entrypoint — assemble the full source list. Memoise in the
// caller; the inventory + customer slices are cheap but not free.
export function buildCommandSources(): CommandItem[] {
  return [
    ...QUICK_ACTIONS,
    ...NAVIGATE,
    ...SETTINGS_SHORTCUTS,
    ...HELP,
    ...getInventoryItems(),
    ...getCustomerItems(),
  ]
}

// Search helper — case-insensitive token match. Each character of
// the query has to appear in order somewhere in `searchTerms`
// (loose fuzzy). Returns a score so we can rank tighter matches
// higher.
export function fuzzyScore(haystack: string, query: string): number {
  if (!query) return 1
  const h = haystack.toLowerCase()
  const q = query.toLowerCase().trim()
  if (h.includes(q)) return 100 + q.length // exact substring → big bonus
  let hi = 0
  let score = 0
  let lastMatchedAt = -1
  for (const char of q) {
    const idx = h.indexOf(char, hi)
    if (idx === -1) return 0
    // Smaller gap = higher score.
    if (lastMatchedAt !== -1) score += Math.max(0, 5 - (idx - lastMatchedAt))
    lastMatchedAt = idx
    hi = idx + 1
    score += 1
  }
  return score
}

// Helper alias for the icon registry. Keeps it where future
// shortcut + custom-bind features can find it.
export { Search }
