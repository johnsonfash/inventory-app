import { kvJson } from "@/lib/storage/kv"

// Industry-agnostic recipe / BOM model. Every "made thing" in Pallio
// — a sourdough loaf, a mango smoothie, a custom perfume blend, a
// brake-pad replacement service, a tailored suit, a bar of soap — is
// the SAME shape: a parent SKU consumes child SKUs in defined
// quantities, produces N units of output, with wastage / yield
// factors and optional sub-recipes.
//
// This file is deliberately not called "recipes-restaurant.ts" or
// "boms-manufacturing.ts". One model, every industry. The
// agnostic principle saved in memory drives every decision here.
//
// See feedback_industry_agnostic_derivations.md and
// project_inventory_catalog_source.md.

// ----- Allergens -----
// Top-14 EU allergens + common US additions. Drives the allergen
// rollup report + storefront menu badges + FSMA traceability.
// Universal enough for food; ignored by non-food industries.
export type Allergen =
  | "gluten"
  | "crustaceans"
  | "eggs"
  | "fish"
  | "peanuts"
  | "soy"
  | "milk"
  | "nuts"
  | "celery"
  | "mustard"
  | "sesame"
  | "sulphites"
  | "lupin"
  | "molluscs"
  | "sugar"        // common request even though not legal allergen
  | "alcohol"      // ditto — relevant for halal/age gates

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten:      "Gluten",
  crustaceans: "Crustaceans",
  eggs:        "Eggs",
  fish:        "Fish",
  peanuts:     "Peanuts",
  soy:         "Soy",
  milk:        "Milk / dairy",
  nuts:        "Tree nuts",
  celery:      "Celery",
  mustard:     "Mustard",
  sesame:      "Sesame",
  sulphites:   "Sulphites",
  lupin:       "Lupin",
  molluscs:    "Molluscs",
  sugar:       "Added sugar",
  alcohol:     "Alcohol",
}

// ----- Recipe line -----
// A single ingredient (or sub-recipe) consumed by a parent recipe.
// `componentSku` is the child SKU; `qty` is in `unit` per **single
// yielded unit** of the parent recipe (so the math stays composable
// — multiply by yield to get the batch total).
//
// `wastageFactor` accounts for the difference between raw input and
// usable output (1kg raw potato → 700g cooked = 0.3 wastage). It's
// optional and defaults to 0; food/coffee/wholesale produce use it,
// manufactured goods rarely do.
export type RecipeLine = {
  /** Child SKU consumed. Can be a raw ingredient OR another recipe
   *  (sub-recipe). When a recipe, the engine recursively expands. */
  componentSku: string
  /** Optional display name cached at line-write so the UI doesn't
   *  have to re-resolve every render. */
  componentName?: string
  /** Quantity per single yielded unit of the parent. */
  qty: number
  /** Unit of measure. Resolved via UNIT_CONVERSIONS when consumed
   *  against stock in a different base unit. */
  unit: string
  /** Wastage / yield-loss factor, 0..1. 0.3 = 30% of input is lost
   *  in processing. */
  wastageFactor?: number
  /** Optional notes the cook / production tech reads. */
  notes?: string
}

// ----- Recipe -----
// The full BOM for a parent SKU. The parent SKU is what the POS
// sells / the storefront lists / the customer pays for. Recipes
// are stored separately from catalog so the same SKU can have its
// recipe revised without disturbing the catalog row.
export type Recipe = {
  id: string
  /** Parent SKU — the thing being made. Must match a catalog item. */
  parentSku: string
  /** Display name cached for the list view. */
  name: string
  /** Free-form description / preparation method. */
  method?: string
  /** Lines that make this. */
  lines: RecipeLine[]
  /** Yield — how many units of the parent SKU this recipe produces
   *  when run once. A bread recipe yields 30 loaves; a brake-pad
   *  service yields 1 completed job; a perfume blend yields 100ml. */
  yield: number
  /** Unit of the yielded output. Often "pcs" but can be "kg", "ml",
   *  "L", "hr" for service recipes. */
  yieldUnit: string
  /** Total prep + cook + cure time in minutes — drives the
   *  production schedule's batch start-time math. */
  durationMinutes?: number
  /** Allergens rolled up from ingredients + any added at the recipe
   *  level (cross-contact warnings). Frontend may auto-derive from
   *  child SKUs; this field is the override / final answer. */
  allergens: Allergen[]
  /** Optional nutritional info per yielded unit. */
  nutrition?: {
    kcal?: number
    proteinG?: number
    carbsG?: number
    fatG?: number
    fiberG?: number
    sodiumMg?: number
  }
  /** Active recipes are eligible for production scheduling +
   *  POS-driven auto-deduction. Drafts are not. */
  status: "active" | "draft"
  /** Created / last edited timestamps. */
  createdAt: string
  updatedAt: string
  /** Optional version tag — bumped manually when a recipe is
   *  meaningfully revised. Surfaces in the variance report so you
   *  can attribute drift to a known change. */
  version?: number
  /** Soft tags for filtering. Industry-agnostic on purpose — a
   *  bakery might tag "bread", a workshop "service", a perfumer
   *  "blend". */
  tags?: string[]
}

// ----- Production run -----
// A recorded instance of someone actually running a recipe. Creates
// stock of the parent SKU + decrements stock of every child SKU.
// Critical for variance analysis (theoretical from sales vs actual
// from production runs).
export type ProductionRun = {
  id: string
  recipeId: string
  /** SKU of the parent at the time of the run — denormalized so a
   *  later parent rename doesn't lose the history. */
  parentSku: string
  /** Number of YIELDED batches run. Real qty produced = batches *
   *  recipe.yield. */
  batches: number
  /** Lot code for the produced output (food traceability). Optional
   *  for non-food. */
  lotCode?: string
  /** Expiry of the produced output. Optional. */
  expiresAt?: string
  /** Location where production happened. */
  locationId?: string
  /** Member id of the person who logged the run. */
  runById: string
  /** When the run happened. */
  ranAt: string
  /** Free-form note — useful for "had to substitute X for Y today". */
  note?: string
  /** True once the parent SKU's stock has been incremented + child
   *  SKUs decremented. False = logged but not yet committed to
   *  inventory (e.g. a dry run / planning state). */
  committed: boolean
}

// ----- Lot entry -----
// A batch of stock received against a SKU with traceability fields.
// Drives FEFO consumption, expiry alerts, and recall handling.
export type LotEntry = {
  id: string
  sku: string
  /** Vendor-assigned or self-assigned lot code. */
  lotCode: string
  /** Qty in this lot. Decreases as stock is consumed. */
  qty: number
  /** Original received qty (immutable). */
  originalQty: number
  /** Unit. Usually matches the catalog item's unit. */
  unit: string
  /** Optional expiry — perishable goods only. */
  expiresAt?: string
  /** When this lot was received. */
  receivedAt: string
  /** Optional link to the PO that brought it in. */
  poNumber?: string
  /** Optional link to the production run that created it (for
   *  manufactured / cooked output). */
  productionRunId?: string
  /** Location holding the lot. */
  locationId: string
  /** Optional vendor / supplier name. */
  vendor?: string
}

// ----- Unit conversion table -----
// How to translate between units of the same base type. Crucial for
// food (recipe in grams, stock in kg) and manufacturing (recipe in
// metres, stock in rolls of 50m). Each row reads "1 fromUnit =
// factor toUnit" — engine inverts as needed.
export type UnitConversion = {
  fromUnit: string
  toUnit: string
  factor: number
  /** Optional per-SKU scoping. When set, this conversion only
   *  applies to that SKU (e.g. "1 case of EL-2109 = 24 pcs",
   *  whereas other SKUs have different case sizes). */
  forSku?: string
}

// Universal conversions that work for every SKU. Per-SKU conversions
// (e.g. case sizes) live alongside in storage with forSku set.
export const UNIVERSAL_CONVERSIONS: UnitConversion[] = [
  { fromUnit: "kg", toUnit: "g",  factor: 1000 },
  { fromUnit: "g",  toUnit: "kg", factor: 0.001 },
  { fromUnit: "L",  toUnit: "ml", factor: 1000 },
  { fromUnit: "ml", toUnit: "L",  factor: 0.001 },
  { fromUnit: "m",  toUnit: "cm", factor: 100 },
  { fromUnit: "cm", toUnit: "m",  factor: 0.01 },
  { fromUnit: "hr", toUnit: "min", factor: 60 },
  { fromUnit: "min",toUnit: "hr", factor: 1 / 60 },
  { fromUnit: "dz", toUnit: "pcs", factor: 12 },
  { fromUnit: "pcs",toUnit: "dz", factor: 1 / 12 },
]

// ----- Variance entry -----
// Output of the periodic count vs theoretical-consumption diff.
// Surfaced in /reporting/variance. Created by the variance engine
// (server-side eventually); local-mocked here.
export type VarianceEntry = {
  sku: string
  name: string
  /** Stock the recipes + sales SHOULD have left, given starting
   *  count + receipts − theoretical consumption. */
  theoreticalQty: number
  /** What the physical count actually found. */
  actualQty: number
  /** actual − theoretical. Negative = unexplained shrinkage. */
  variance: number
  /** Variance as a fraction of theoretical. Drives severity. */
  variancePct: number
  /** Reporting period this entry covers. */
  periodStart: string
  periodEnd: string
  /** Optional rolled-up dollar impact at average cost. */
  costImpactUsd?: number
}

// ----- Storage keys -----
const RECIPES_KEY = "pallio:recipes"
const RUNS_KEY = "pallio:production-runs"
const LOTS_KEY = "pallio:lots"
const UNIT_CONVERSIONS_KEY = "pallio:unit-conversions"

// ----- Mock seed data — deliberately cross-industry -----
// Each recipe demonstrates the agnostic principle: same data shape
// works for food, beverage, cosmetics, service trade, apparel, and
// manufactured goods. Don't add restaurant-specific or bakery-
// specific fields to the type — extend the tags array instead.
const SEED_RECIPES: Recipe[] = [
  {
    id: "rec-sourdough",
    parentSku: "BK-2001",
    name: "Sourdough loaf (1kg)",
    method: "Autolyse 1h, bulk 4h with 4 stretch-folds, shape, cold-proof 12-18h, bake 30min at 240°C.",
    yield: 1,
    yieldUnit: "pcs",
    durationMinutes: 20 * 60,
    allergens: ["gluten"],
    nutrition: { kcal: 2400, proteinG: 80, carbsG: 480, fatG: 8, fiberG: 24, sodiumMg: 1600 },
    lines: [
      { componentSku: "ING-FLOUR-BREAD", componentName: "Bread flour", qty: 500, unit: "g" },
      { componentSku: "ING-WATER",        componentName: "Water",       qty: 350, unit: "g" },
      { componentSku: "REC-STARTER",      componentName: "Sourdough starter (sub-recipe)", qty: 100, unit: "g" },
      { componentSku: "ING-SALT",         componentName: "Salt",        qty: 10,  unit: "g" },
    ],
    status: "active",
    createdAt: "2026-04-01T08:00:00Z",
    updatedAt: "2026-05-15T11:32:00Z",
    version: 3,
    tags: ["bread", "bakery"],
  },
  {
    id: "rec-starter",
    parentSku: "REC-STARTER",
    name: "Sourdough starter (refresh, 200g)",
    method: "Discard 100g, feed 50g flour + 50g water, rest 6h until doubled.",
    yield: 200,
    yieldUnit: "g",
    durationMinutes: 6 * 60,
    allergens: ["gluten"],
    lines: [
      { componentSku: "ING-FLOUR-BREAD", componentName: "Bread flour", qty: 0.5, unit: "g" },
      { componentSku: "ING-WATER",        componentName: "Water",       qty: 0.5, unit: "g" },
      { componentSku: "REC-STARTER",      componentName: "Mother culture (self-perpetuating)", qty: 0.5, unit: "g", notes: "Reserve 100g from previous batch." },
    ],
    status: "active",
    createdAt: "2026-04-01T08:00:00Z",
    updatedAt: "2026-04-01T08:00:00Z",
    tags: ["bread", "bakery", "sub-recipe"],
  },
  {
    id: "rec-mango-smoothie",
    parentSku: "DRK-3045",
    name: "Mango smoothie (regular)",
    method: "Blend 60s on high. Pour into 16oz cup, top with chia.",
    yield: 1,
    yieldUnit: "pcs",
    durationMinutes: 2,
    allergens: ["milk"],
    nutrition: { kcal: 280, proteinG: 6, carbsG: 52, fatG: 4, fiberG: 6, sodiumMg: 80 },
    lines: [
      { componentSku: "ING-MANGO",   componentName: "Mango chunks (frozen)", qty: 200, unit: "g" },
      { componentSku: "ING-YOGURT",  componentName: "Greek yogurt",          qty: 100, unit: "g" },
      { componentSku: "ING-MILK-OAT",componentName: "Oat milk",              qty: 150, unit: "ml" },
      { componentSku: "ING-HONEY",   componentName: "Honey",                 qty: 15,  unit: "g" },
      { componentSku: "ING-CHIA",    componentName: "Chia seeds (garnish)",  qty: 5,   unit: "g" },
    ],
    status: "active",
    createdAt: "2026-04-05T10:00:00Z",
    updatedAt: "2026-04-05T10:00:00Z",
    tags: ["beverage", "smoothie", "café"],
  },
  {
    id: "rec-perfume-amber",
    parentSku: "PRF-1101",
    name: "Amber Noir EDP (100ml)",
    method: "Combine top + heart + base notes in alcohol base. Macerate 4 weeks dark. Filter through 0.45μm before bottling.",
    yield: 100,
    yieldUnit: "ml",
    durationMinutes: 4 * 7 * 24 * 60,
    allergens: ["alcohol"],
    lines: [
      { componentSku: "ING-OIL-BERGAMOT",  componentName: "Bergamot essential oil", qty: 4,  unit: "ml" },
      { componentSku: "ING-OIL-ROSE",      componentName: "Rose absolute",          qty: 3,  unit: "ml" },
      { componentSku: "ING-OIL-AMBER",     componentName: "Amber accord",           qty: 8,  unit: "ml" },
      { componentSku: "ING-OIL-VANILLA",   componentName: "Vanilla extract",        qty: 2,  unit: "ml" },
      { componentSku: "ING-ALCOHOL-PERF",  componentName: "Perfumer's alcohol",     qty: 80, unit: "ml" },
      { componentSku: "ING-WATER-DIST",    componentName: "Distilled water",        qty: 3,  unit: "ml" },
    ],
    status: "active",
    createdAt: "2026-03-15T14:00:00Z",
    updatedAt: "2026-04-20T09:15:00Z",
    version: 2,
    tags: ["fragrance", "cosmetics"],
  },
  {
    id: "rec-brake-service",
    parentSku: "SVC-BRAKE-PADS",
    name: "Brake-pad replacement (front axle)",
    method: "Lift, remove wheels, retract caliper pistons, swap pads, re-grease slides, refit + torque to 120Nm.",
    yield: 1,
    yieldUnit: "pcs",
    durationMinutes: 90,
    allergens: [],
    lines: [
      { componentSku: "ING-BRAKE-PAD-F", componentName: "Front brake pad set", qty: 1, unit: "pcs" },
      { componentSku: "ING-BRAKE-GREASE",componentName: "Caliper grease",      qty: 5, unit: "g" },
      { componentSku: "ING-LABOR-MECH",  componentName: "Mechanic labor",      qty: 1.5, unit: "hr" },
    ],
    status: "active",
    createdAt: "2026-04-10T12:00:00Z",
    updatedAt: "2026-04-10T12:00:00Z",
    tags: ["service", "automotive"],
  },
  {
    id: "rec-suit-3pc",
    parentSku: "APP-SUIT-3PC",
    name: "Three-piece tailored suit",
    method: "Measure, cut from bolt, baste, fit, finish, press.",
    yield: 1,
    yieldUnit: "pcs",
    durationMinutes: 16 * 60,
    allergens: [],
    lines: [
      { componentSku: "ING-FABRIC-WOOL",   componentName: "Wool suiting fabric", qty: 3.5, unit: "m", wastageFactor: 0.12 },
      { componentSku: "ING-LINING-VISC",   componentName: "Viscose lining",       qty: 1.5, unit: "m" },
      { componentSku: "ING-BUTTONS-HORN",  componentName: "Horn buttons",         qty: 12,  unit: "pcs" },
      { componentSku: "ING-THREAD-SILK",   componentName: "Silk thread",          qty: 0.1, unit: "m" },
      { componentSku: "ING-LABOR-TAILOR",  componentName: "Tailor labor",         qty: 16,  unit: "hr" },
    ],
    status: "active",
    createdAt: "2026-04-12T09:00:00Z",
    updatedAt: "2026-04-12T09:00:00Z",
    tags: ["apparel", "tailoring", "made-to-measure"],
  },
  {
    id: "rec-soap-lavender",
    parentSku: "SOA-2210",
    name: "Cold-process lavender soap (1 bar, 100g)",
    method: "Combine lye/water (40°C) into oils (40°C), trace, scent + colour, mould, cure 4 weeks.",
    yield: 1,
    yieldUnit: "pcs",
    durationMinutes: 4 * 7 * 24 * 60,
    allergens: [],
    lines: [
      { componentSku: "ING-OIL-OLIVE",    componentName: "Olive oil",        qty: 40, unit: "g" },
      { componentSku: "ING-OIL-COCONUT",  componentName: "Coconut oil",      qty: 25, unit: "g" },
      { componentSku: "ING-OIL-PALM",     componentName: "Palm oil (RSPO)",  qty: 15, unit: "g" },
      { componentSku: "ING-LYE",          componentName: "Sodium hydroxide", qty: 12, unit: "g" },
      { componentSku: "ING-WATER-DIST",   componentName: "Distilled water",  qty: 28, unit: "g" },
      { componentSku: "ING-OIL-LAVENDER", componentName: "Lavender essential oil", qty: 3, unit: "g" },
    ],
    status: "active",
    createdAt: "2026-04-18T15:30:00Z",
    updatedAt: "2026-04-18T15:30:00Z",
    tags: ["soap", "cosmetics", "handmade"],
  },
]

const SEED_RUNS: ProductionRun[] = [
  { id: "run-1", recipeId: "rec-sourdough",      parentSku: "BK-2001",        batches: 24, lotCode: "BR-2026-141", expiresAt: "2026-05-26", locationId: "wh-a",     runById: "m-1", ranAt: "2026-05-21T05:30:00Z", note: "Morning bake — strong oven spring.", committed: true },
  { id: "run-2", recipeId: "rec-mango-smoothie", parentSku: "DRK-3045",       batches: 12,                            locationId: "downtown", runById: "m-3", ranAt: "2026-05-21T11:15:00Z", committed: true },
  { id: "run-3", recipeId: "rec-perfume-amber",  parentSku: "PRF-1101",       batches: 50, lotCode: "AMB-2026-04",  expiresAt: "2029-04-22", locationId: "wh-a",     runById: "m-1", ranAt: "2026-04-22T10:00:00Z", note: "Macerating; bottling 2026-05-20.", committed: true },
  { id: "run-4", recipeId: "rec-brake-service",  parentSku: "SVC-BRAKE-PADS", batches: 1,                            locationId: "east-dc",  runById: "m-2", ranAt: "2026-05-20T14:30:00Z", note: "Toyota Camry 2019, 78k mi.", committed: true },
  { id: "run-5", recipeId: "rec-sourdough",      parentSku: "BK-2001",        batches: 30, lotCode: "BR-2026-142", expiresAt: "2026-05-27", locationId: "wh-a",     runById: "m-1", ranAt: "2026-05-22T05:30:00Z", committed: false },
]

const SEED_LOTS: LotEntry[] = [
  { id: "lot-1", sku: "ING-FLOUR-BREAD", lotCode: "MIL-2026-J17", qty: 18, originalQty: 25, unit: "kg", receivedAt: "2026-05-17", poNumber: "PO-1042", locationId: "wh-a", vendor: "Cobalt Distributors", expiresAt: "2027-05-17" },
  { id: "lot-2", sku: "ING-MANGO",        lotCode: "TFP-26-118",  qty: 6,  originalQty: 10, unit: "kg", receivedAt: "2026-05-19", poNumber: "PO-1041", locationId: "downtown", vendor: "Glow Co",            expiresAt: "2026-11-19" },
  { id: "lot-3", sku: "ING-OIL-ROSE",     lotCode: "BLG-2026-03", qty: 240,originalQty: 500,unit: "ml", receivedAt: "2026-03-10", poNumber: "PO-1019", locationId: "wh-a", vendor: "Bulgaria Rose Distillery", expiresAt: "2028-03-10" },
  { id: "lot-4", sku: "BK-2001",          lotCode: "BR-2026-141", qty: 6,  originalQty: 24, unit: "pcs",receivedAt: "2026-05-21", productionRunId: "run-1", locationId: "wh-a", expiresAt: "2026-05-26" },
  { id: "lot-5", sku: "ING-FABRIC-WOOL",  lotCode: "MLT-26-K22",  qty: 42, originalQty: 50, unit: "m",  receivedAt: "2026-04-30", poNumber: "PO-1038", locationId: "wh-a", vendor: "Loro Piana" },
]

// ----- Public API -----

export function loadRecipes(): Recipe[] {
  return kvJson.get<Recipe[]>(RECIPES_KEY) ?? SEED_RECIPES
}

export function getRecipe(id: string): Recipe | undefined {
  return loadRecipes().find((r) => r.id === id || r.parentSku === id)
}

export function recipesUsingComponent(componentSku: string): Recipe[] {
  return loadRecipes().filter((r) => r.lines.some((l) => l.componentSku === componentSku))
}

export function loadProductionRuns(): ProductionRun[] {
  return kvJson.get<ProductionRun[]>(RUNS_KEY) ?? SEED_RUNS
}

// Append a freshly-logged run. Stored alongside the seed runs in kv
// so subsequent reads pick it up. Backend will replace this with a
// POST /production/runs call.
export function recordProductionRun(input: Omit<ProductionRun, "id" | "ranAt"> & Partial<Pick<ProductionRun, "id" | "ranAt">>): ProductionRun {
  const run: ProductionRun = {
    id: input.id ?? `run-${Date.now().toString(36)}`,
    ranAt: input.ranAt ?? new Date().toISOString(),
    recipeId: input.recipeId,
    parentSku: input.parentSku,
    batches: input.batches,
    lotCode: input.lotCode,
    expiresAt: input.expiresAt,
    locationId: input.locationId,
    runById: input.runById,
    note: input.note,
    committed: input.committed,
  }
  const next = [run, ...loadProductionRuns()]
  kvJson.set(RUNS_KEY, next)
  return run
}

export function loadLots(): LotEntry[] {
  return kvJson.get<LotEntry[]>(LOTS_KEY) ?? SEED_LOTS
}

export function lotsForSku(sku: string): LotEntry[] {
  return loadLots().filter((l) => l.sku === sku && l.qty > 0)
}

// Cost rollup. Walks the BOM, resolves child SKU prices from the
// catalog, expands sub-recipes, returns total cost per yielded unit.
// Caller passes a SKU → unitCost lookup so this stays decoupled from
// the catalog module (no circular import).
//
// `priceLookup` returns null for SKUs not in the catalog — those
// lines contribute 0 (with a warning surfaced separately). Recursion
// guarded against cycles by `seen` set.
export function rollupRecipeCost(
  recipe: Recipe,
  priceLookup: (sku: string) => number | null,
  seen: Set<string> = new Set(),
): { perUnit: number; missing: string[] } {
  if (seen.has(recipe.id)) {
    return { perUnit: 0, missing: [`cycle:${recipe.parentSku}`] }
  }
  const nextSeen = new Set(seen).add(recipe.id)
  const recipes = loadRecipes()

  let total = 0
  const missing: string[] = []

  for (const line of recipe.lines) {
    const subRecipe = recipes.find((r) => r.parentSku === line.componentSku)
    if (subRecipe) {
      const sub = rollupRecipeCost(subRecipe, priceLookup, nextSeen)
      const factor = 1 + (line.wastageFactor ?? 0)
      total += sub.perUnit * line.qty * factor
      missing.push(...sub.missing)
    } else {
      const unit = priceLookup(line.componentSku)
      if (unit === null) {
        missing.push(line.componentSku)
        continue
      }
      const factor = 1 + (line.wastageFactor ?? 0)
      total += unit * line.qty * factor
    }
  }

  return { perUnit: total / recipe.yield, missing }
}

// FEFO — first-expired-first-out. Returns lots sorted by expiry
// (earliest first, undefined-expiry last). Use to allocate stock for
// production runs + customer orders.
export function fefoOrder(lots: LotEntry[]): LotEntry[] {
  return [...lots].sort((a, b) => {
    if (!a.expiresAt && !b.expiresAt) return 0
    if (!a.expiresAt) return 1
    if (!b.expiresAt) return -1
    return a.expiresAt.localeCompare(b.expiresAt)
  })
}

// Convert qty from one unit to another. Returns null when no
// conversion path exists (the caller should surface a "configure
// conversion" CTA in the UI). Searches per-SKU conversions first,
// then universal.
export function convertUnit(
  qty: number,
  fromUnit: string,
  toUnit: string,
  forSku?: string,
): number | null {
  if (fromUnit === toUnit) return qty
  const all: UnitConversion[] = [
    ...(kvJson.get<UnitConversion[]>(UNIT_CONVERSIONS_KEY) ?? []),
    ...UNIVERSAL_CONVERSIONS,
  ]
  const direct = all.find(
    (c) => c.fromUnit === fromUnit && c.toUnit === toUnit && (!c.forSku || c.forSku === forSku),
  )
  if (direct) return qty * direct.factor
  return null
}

// Mock variance dataset — surfaced on /reporting/variance.
// Real-world this is computed server-side from start-of-period count
// + receipts − theoretical consumption from sales/recipes.
export function mockVariance(): VarianceEntry[] {
  return [
    { sku: "ING-FLOUR-BREAD",   name: "Bread flour",        theoreticalQty: 22.5, actualQty: 18, variance: -4.5, variancePct: -0.20, periodStart: "2026-05-15", periodEnd: "2026-05-22", costImpactUsd: -9.0 },
    { sku: "ING-MANGO",          name: "Mango chunks",       theoreticalQty: 8.4,  actualQty: 6,  variance: -2.4, variancePct: -0.29, periodStart: "2026-05-15", periodEnd: "2026-05-22", costImpactUsd: -12.0 },
    { sku: "ING-OIL-ROSE",       name: "Rose absolute",      theoreticalQty: 250,  actualQty: 240,variance: -10,  variancePct: -0.04, periodStart: "2026-04-15", periodEnd: "2026-05-22", costImpactUsd: -180.0 },
    { sku: "BK-2001",            name: "Sourdough loaf",     theoreticalQty: 8,    actualQty: 6,  variance: -2,   variancePct: -0.25, periodStart: "2026-05-21", periodEnd: "2026-05-22", costImpactUsd: -7.0 },
    { sku: "ING-FABRIC-WOOL",    name: "Wool suiting",       theoreticalQty: 46.5, actualQty: 42, variance: -4.5, variancePct: -0.10, periodStart: "2026-04-30", periodEnd: "2026-05-22", costImpactUsd: -157.5 },
  ]
}
