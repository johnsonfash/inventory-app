// F1 — Industry curation engine.
//
// SOFT curation, never hard module gating (see memory: feedback_no_hard_modules):
//   * Vocabulary swaps   — "Item" → "Menu item" for restaurants, "SKU" → "Part number" for auto, etc.
//   * Capability hints   — pages READ these to choose default visibility; the user can always override.
//   * Sidebar curation   — softHideSections lists NAV group ids the user typically doesn't need;
//                          the sidebar may demote/collapse them, but the route still resolves and
//                          the user can re-enable. No 401, no redirect, no toast.
//
// One Pallio org can run multiple industries simultaneously (a shop + a kitchen + a workshop).
// This file just tunes defaults; it never locks features away.
//
// IndustryKey set here is INTENTIONALLY broader than `lib/profile/business-profile.ts`
// (which is a 6-key onboarding question). Reconciliation lives in `./storage.ts` —
// it maps the legacy keys ("food" → "restaurant", "other" → "retail") so this
// richer profile can drive curation without breaking the simpler onboarding answer.

export type IndustryKey =
  | "retail"        // shops, boutiques, electronics, books, general merchandise
  | "restaurant"    // dine-in + counter food (sit-down)
  | "qsr"           // quick-service / takeaway food, coffee, juice bars
  | "services"      // appointment-driven: salon, spa, repair, consulting
  | "auto"          // garages, parts dealers, motor service
  | "apparel"       // fashion + textile (size/colour variants prominent)
  | "pharmacy"      // pharmacies + medical supplies (batch + expiry critical)
  | "gym"           // gyms / fitness with memberships
  | "hotel"         // lodging + ancillary services (room nights + folio)
  | "manufacturing" // production-first (recipe/BOM prominent, batch lots)

export type Capability =
  | "tipSuggested"        // show tip presets in checkout by default
  | "hasTables"           // dine-in tables/seats relevant
  | "hasPrepQueue"        // kitchen/bar prep display relevant
  | "usesRecipes"         // recipe/BOM module surfaced
  | "usesLotTracking"     // lot/batch + expiry surfaced
  | "usesAppointments"    // appointments module surfaced
  | "usesMemberships"     // memberships/subscriptions surfaced
  | "usesVariants"        // size/colour variants prominent
  | "usesWarranty"        // warranty tracking surfaced
  | "usesPartsCompat"     // parts compatibility / vehicle match
  | "usesRoomNights"      // lodging-style nights billing
  | "usesServiceDuration" // duration-based services
  | "usesWorkOrders"      // internal job/work orders (auto/repair/salon)

export type TermKey =
  | "item"           // product / menu item / part / treatment
  | "item.plural"    // items / menu items / parts / treatments
  | "sku"            // sku / barcode / plu / part-number
  | "customer"       // customer / guest / patient / client / member
  | "customer.plural" // customers / guests / patients / clients / members
  | "sale"           // sale / order / ticket / check / work order
  | "sale.plural"    // sales / checks / work orders
  | "invoice"        // invoice / receipt / bill / folio
  | "inventory"      // inventory / stock / pantry / catalog
  | "production"     // production / batch / run / kitchen
  | "shift"          // shift / service / clinic-session
  | "employee"       // employee / staff / clinician / technician / mechanic
  | "price"          // price / rate / fee
  | "category"       // category / section / department / menu

export type IndustryProfile = {
  key: IndustryKey
  label: string
  description: string
  capabilities: Partial<Record<Capability, boolean>>
  terms: Partial<Record<TermKey, string>>
  /**
   * NAV group titles (see `lib/nav.ts`) typically not needed for this industry.
   * Sidebar should soft-hide / demote these — but the user can re-enable, and
   * direct URL navigation always still works. Never used to block a route.
   */
  softHideSections: string[]
  /** Sub-features within a module that should be surfaced more prominently. Free-form hints. */
  emphasise: string[]
}

// ---------------------------------------------------------------------------
// Seed profiles — sensible defaults. F2 sweeps page-by-page reading these.
// ---------------------------------------------------------------------------

export const INDUSTRIES: Readonly<Record<IndustryKey, IndustryProfile>> = {
  retail: {
    key: "retail",
    label: "Retail / Shop",
    description: "Boutiques, electronics, gifts, general merchandise.",
    capabilities: {
      tipSuggested: false,
      usesVariants: true,
      usesWarranty: true,
      usesAppointments: false,
      usesRecipes: false,
      usesLotTracking: false,
      hasTables: false,
      hasPrepQueue: false,
    },
    terms: {
      item: "Item",
      "item.plural": "items",
      sku: "SKU",
      customer: "Customer",
      "customer.plural": "customers",
      sale: "Sale",
      "sale.plural": "sales",
      invoice: "Invoice",
      inventory: "Inventory",
      shift: "Shift",
      employee: "Staff",
      price: "Price",
      category: "Category",
    },
    softHideSections: ["Appointments"],
    emphasise: ["categories", "brands", "variants", "labels"],
  },

  restaurant: {
    key: "restaurant",
    label: "Restaurant",
    description: "Dine-in + counter food with tables and a kitchen queue.",
    capabilities: {
      tipSuggested: true,
      hasTables: true,
      hasPrepQueue: true,
      usesRecipes: true,
      usesLotTracking: true, // ingredients: expiring stock matters
      usesAppointments: false,
      usesVariants: false,
      usesWarranty: false,
      usesServiceDuration: false,
    },
    terms: {
      item: "Menu item",
      "item.plural": "menu items",
      sku: "PLU",
      customer: "Guest",
      "customer.plural": "guests",
      sale: "Check",
      "sale.plural": "checks",
      invoice: "Check",
      inventory: "Pantry",
      production: "Prep",
      shift: "Service",
      employee: "Staff",
      price: "Price",
      category: "Menu section",
    },
    softHideSections: ["Storefront", "Marketing"],
    emphasise: ["menu", "tables", "prep-queue", "recipes", "tip-pool"],
  },

  qsr: {
    key: "qsr",
    label: "Quick-service food",
    description: "Counter / takeaway food, coffee, juice bars, ghost kitchens.",
    capabilities: {
      tipSuggested: true,
      hasTables: false,
      hasPrepQueue: true,
      usesRecipes: true,
      usesLotTracking: true,
      usesAppointments: false,
      usesVariants: false,
      usesWarranty: false,
    },
    terms: {
      item: "Menu item",
      "item.plural": "menu items",
      sku: "PLU",
      customer: "Guest",
      "customer.plural": "guests",
      sale: "Ticket",
      "sale.plural": "tickets",
      invoice: "Receipt",
      inventory: "Pantry",
      production: "Prep",
      shift: "Shift",
      employee: "Staff",
      price: "Price",
      category: "Menu section",
    },
    softHideSections: ["Appointments", "Storefront"],
    emphasise: ["menu", "prep-queue", "modifiers", "tip-presets"],
  },

  services: {
    key: "services",
    label: "Services / Salon",
    description: "Appointment-driven — salon, spa, repair, consulting, clinics.",
    capabilities: {
      tipSuggested: true,
      usesAppointments: true,
      usesServiceDuration: true,
      usesMemberships: true,
      usesWorkOrders: true,
      hasTables: false,
      hasPrepQueue: false,
      usesRecipes: false,
      usesLotTracking: false,
      usesVariants: false,
      usesWarranty: false,
    },
    terms: {
      item: "Service",
      "item.plural": "services",
      sku: "Service code",
      customer: "Client",
      "customer.plural": "clients",
      sale: "Booking",
      "sale.plural": "bookings",
      invoice: "Invoice",
      inventory: "Stock",
      shift: "Shift",
      employee: "Specialist",
      price: "Rate",
      category: "Service category",
    },
    softHideSections: ["Purchases"],
    emphasise: ["appointments", "memberships", "service-duration", "specialist-roster"],
  },

  auto: {
    key: "auto",
    label: "Auto / Workshop",
    description: "Garages, parts dealers, motor service, repair shops.",
    capabilities: {
      tipSuggested: false,
      usesPartsCompat: true,
      usesWorkOrders: true,
      usesWarranty: true,
      usesAppointments: true,
      usesServiceDuration: true,
      hasTables: false,
      hasPrepQueue: false,
      usesRecipes: false,
      usesLotTracking: false,
      usesVariants: false,
    },
    terms: {
      item: "Part",
      "item.plural": "parts",
      sku: "Part number",
      customer: "Customer",
      "customer.plural": "customers",
      sale: "Work order",
      "sale.plural": "work orders",
      invoice: "Invoice",
      inventory: "Parts catalogue",
      shift: "Shift",
      employee: "Technician",
      price: "Price",
      category: "Category",
    },
    softHideSections: ["Storefront"],
    emphasise: ["parts-compat", "vehicle-match", "work-orders", "warranties"],
  },

  apparel: {
    key: "apparel",
    label: "Apparel / Fashion",
    description: "Fashion + textile — size and colour variants prominent.",
    capabilities: {
      tipSuggested: false,
      usesVariants: true,
      usesWarranty: false,
      usesAppointments: false,
      usesRecipes: false,
      usesLotTracking: false,
      hasTables: false,
      hasPrepQueue: false,
    },
    terms: {
      item: "Style",
      "item.plural": "styles",
      sku: "SKU",
      customer: "Customer",
      "customer.plural": "customers",
      sale: "Sale",
      "sale.plural": "sales",
      invoice: "Invoice",
      inventory: "Stock",
      shift: "Shift",
      employee: "Staff",
      price: "Price",
      category: "Collection",
    },
    softHideSections: ["Appointments"],
    emphasise: ["variants", "size-matrix", "collections", "lookbook"],
  },

  pharmacy: {
    key: "pharmacy",
    label: "Pharmacy",
    description: "Pharmacies + medical supplies — batch and expiry critical.",
    capabilities: {
      tipSuggested: false,
      usesLotTracking: true,
      usesWarranty: false,
      usesVariants: false,
      usesAppointments: false,
      hasTables: false,
      hasPrepQueue: false,
      usesRecipes: false,
    },
    terms: {
      item: "Item",
      "item.plural": "items",
      sku: "SKU",
      customer: "Patient",
      "customer.plural": "patients",
      sale: "Sale",
      "sale.plural": "sales",
      invoice: "Receipt",
      inventory: "Stock",
      shift: "Shift",
      employee: "Pharmacist",
      price: "Price",
      category: "Category",
    },
    softHideSections: ["Storefront", "Marketing"],
    emphasise: ["batches", "expiry", "stock-expiry-report", "recalls"],
  },

  gym: {
    key: "gym",
    label: "Gym / Fitness",
    description: "Memberships, classes, drop-ins, retail add-ons.",
    capabilities: {
      tipSuggested: false,
      usesMemberships: true,
      usesAppointments: true,
      usesServiceDuration: true,
      hasTables: false,
      hasPrepQueue: false,
      usesRecipes: false,
      usesLotTracking: false,
      usesVariants: false,
      usesWarranty: false,
    },
    terms: {
      item: "Plan",
      "item.plural": "plans",
      sku: "Plan code",
      customer: "Member",
      "customer.plural": "members",
      sale: "Booking",
      "sale.plural": "bookings",
      invoice: "Invoice",
      inventory: "Retail stock",
      shift: "Shift",
      employee: "Trainer",
      price: "Rate",
      category: "Programme",
    },
    softHideSections: ["Purchases"],
    emphasise: ["memberships", "classes", "appointments", "trainer-roster"],
  },

  hotel: {
    key: "hotel",
    label: "Hotel / Lodging",
    description: "Lodging + ancillary services, with room nights and folios.",
    capabilities: {
      tipSuggested: true,
      usesRoomNights: true,
      usesAppointments: true,
      usesServiceDuration: true,
      usesMemberships: true,
      hasTables: false,
      hasPrepQueue: false,
      usesRecipes: false,
      usesLotTracking: false,
      usesVariants: false,
      usesWarranty: false,
    },
    terms: {
      item: "Room / service",
      "item.plural": "rooms & services",
      sku: "Code",
      customer: "Guest",
      "customer.plural": "guests",
      sale: "Reservation",
      "sale.plural": "reservations",
      invoice: "Folio",
      inventory: "Stock",
      shift: "Shift",
      employee: "Staff",
      price: "Rate",
      category: "Category",
    },
    softHideSections: ["Storefront", "Marketing"],
    emphasise: ["room-nights", "folios", "house-keeping", "ancillary-services"],
  },

  manufacturing: {
    key: "manufacturing",
    label: "Manufacturing / Maker",
    description: "Production-first — recipe/BOM, batch lots, raw → finished.",
    capabilities: {
      tipSuggested: false,
      usesRecipes: true,
      usesLotTracking: true,
      usesWarranty: false,
      usesPartsCompat: false,
      usesAppointments: false,
      usesVariants: false,
      hasTables: false,
      hasPrepQueue: false,
    },
    terms: {
      item: "SKU",
      "item.plural": "SKUs",
      sku: "SKU",
      customer: "Customer",
      "customer.plural": "customers",
      sale: "Order",
      "sale.plural": "orders",
      invoice: "Invoice",
      inventory: "Materials",
      production: "Production run",
      shift: "Shift",
      employee: "Operator",
      price: "Price",
      category: "Category",
    },
    softHideSections: ["Storefront", "Marketing", "Appointments"],
    emphasise: ["recipes-bom", "production-runs", "batches", "raw-materials"],
  },
} as const

// ---------------------------------------------------------------------------
// Lookup utilities
// ---------------------------------------------------------------------------

const DEFAULT_INDUSTRY: IndustryKey = "retail"

export function getIndustryProfile(key: IndustryKey | undefined | null): IndustryProfile {
  if (!key) return INDUSTRIES[DEFAULT_INDUSTRY]
  return INDUSTRIES[key] ?? INDUSTRIES[DEFAULT_INDUSTRY]
}

export function applyTerm(profile: IndustryProfile, key: TermKey, fallback: string): string {
  return profile.terms[key] ?? fallback
}

export function hasCapability(profile: IndustryProfile, cap: Capability): boolean {
  return profile.capabilities[cap] === true
}

export function listIndustries(): IndustryProfile[] {
  return Object.values(INDUSTRIES)
}
