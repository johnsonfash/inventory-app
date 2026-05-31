import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, Copy, Eye, LayoutTemplate, Lock, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { EmptyState } from "@/components/lists/empty-state"
import { InfoTooltip } from "@/components/info-tooltip"
import { interpolate } from "@/lib/comms/data"
import { loadAllTemplates, deleteUserTemplate, saveUserTemplate, TEMPLATES_CHANGED } from "@/lib/comms/storage"
import type { EmailTemplate, TemplateCategory } from "@/lib/comms/types"
import { cn } from "@/lib/utils"

const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  transactional: "Transactional",
  marketing: "Marketing",
  ops: "Ops",
  team: "Team",
}

const CATEGORY_TONE: Record<TemplateCategory, StatusTone> = {
  transactional: "info",
  marketing: "warning",
  ops: "success",
  team: "brand",
}

// Build a {token: sample} map so previews render real-looking copy.
function sampleMapFor(t: EmailTemplate): Record<string, string> {
  const m: Record<string, string> = {}
  for (const tok of t.tokens) m[tok.key] = tok.sample || `{{${tok.key}}}`
  return m
}

export default function TemplatesLibrary() {
  const navigate = useNavigate()
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState<"all" | TemplateCategory>("all")
  const [templates, setTemplates] = React.useState<EmailTemplate[]>(() => loadAllTemplates())
  const [preview, setPreview] = React.useState<EmailTemplate | null>(null)

  // Refresh after an edit/create/delete (the editor dispatches this).
  React.useEffect(() => {
    const refresh = () => setTemplates(loadAllTemplates())
    refresh()
    window.addEventListener(TEMPLATES_CHANGED, refresh)
    return () => window.removeEventListener(TEMPLATES_CHANGED, refresh)
  }, [])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return templates.filter((t) => category === "all" || t.category === category).filter((t) => {
      if (!q) return true
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
    })
  }, [query, category, templates])

  const byCategory: Record<TemplateCategory, number> = { transactional: 0, marketing: 0, ops: 0, team: 0 }
  for (const t of templates) byCategory[t.category]++

  // Builtins clone into an editable copy; user templates edit in place.
  const onEditOrClone = (t: EmailTemplate) => {
    if (t.builtin) navigate(`/communications/templates/new?from=${t.id}`)
    else navigate(`/communications/templates/${t.id}`)
  }

  const onDelete = (t: EmailTemplate) => {
    deleteUserTemplate(t.id)
    setTemplates(loadAllTemplates())
    toast.success("Template deleted", {
      description: t.name,
      action: { label: "Undo", onClick: () => { saveUserTemplate(t); setTemplates(loadAllTemplates()) } },
    })
  }

  return (
    <PageShell
      title="Email templates"
      withToolbar={false}
      titleTooltip={
        <>
          Reusable email designs Pallio fires automatically — order
          confirmations, payment receipts, abandoned-cart reminders,
          marketing blasts. Edit a template once and every future
          send uses the new copy. Variables fill in per-recipient.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Link to="/communications" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to inbox
        </Link>

        <SummaryStrip
          tiles={[
            { label: "Templates",    value: String(templates.length), tone: "brand",   hint: "in library" },
            { label: "Transactional",value: String(byCategory.transactional), tone: "info",    hint: "invoices, receipts" },
            { label: "Marketing",    value: String(byCategory.marketing), tone: "warning", hint: "promos, restocks" },
            { label: "Internal",     value: String(byCategory.team + byCategory.ops), tone: "success", hint: "team + ops" },
          ]}
        />

        {/* Filters + new */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
            {(["all", "transactional", "marketing", "ops", "team"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                  category === c
                    ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {c === "all" ? "All" : CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates…" className="pl-9" />
            </div>
            <Button onClick={() => navigate("/communications/templates/new")}>
              <Plus className="h-4 w-4" /> New template
            </Button>
          </div>
        </div>

        {/* Template grid */}
        {filtered.length === 0 ? (
          <EmptyState
            Icon={LayoutTemplate}
            title={query || category !== "all" ? "No templates match" : "No templates yet"}
            description={
              query || category !== "all"
                ? "Try a different search term, switch category, or clear the filters."
                : "Start with a built-in template or compose a new one from scratch."
            }
            action={
              query || category !== "all" ? (
                <Button variant="outline" onClick={() => { setQuery(""); setCategory("all") }}>Clear filters</Button>
              ) : (
                <Button onClick={() => navigate("/communications/templates/new")}>
                  <Plus className="h-4 w-4" /> New template
                </Button>
              )
            }
          />
        ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <article key={t.id} className="flex flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-brand/40">
              {/* Tapping the body opens the full preview ("full view"). */}
              <button type="button" onClick={() => setPreview(t)} className="text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{t.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>
                  </div>
                  {t.builtin ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" /> built-in
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
                      yours
                    </span>
                  )}
                </div>

                <div className="mt-3 rounded-lg border border-dashed border-border bg-background/40 p-2 text-[11px] text-muted-foreground">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/60">Subject</p>
                  <p className="mt-0.5 line-clamp-2 font-medium text-foreground">{t.subject}</p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusBadge tone={CATEGORY_TONE[t.category]}>{CATEGORY_LABEL[t.category]}</StatusBadge>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Eye className="h-3 w-3" /> {t.tokens.length} variable{t.tokens.length === 1 ? "" : "s"}
                  </span>
                </div>
              </button>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onEditOrClone(t)}>
                    {t.builtin ? <><Copy className="h-3.5 w-3.5" /> Clone</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                  </Button>
                  {!t.builtin && (
                    <Button size="sm" variant="ghost" onClick={() => onDelete(t)} aria-label="Delete template" className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Link to={`/communications/new?template=${t.id}`}>
                  <Button size="sm">
                    Use template <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
        )}

        {/* AI helper card */}
        <section className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-brand-soft via-card to-emerald-50/40 p-4 dark:from-primary/10 dark:to-emerald-950/15">
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-sm font-bold tracking-tight">Need a new template?</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
              soon
            </span>
            <InfoTooltip label="AI templates" size="xs">
              Describe what you want — "an apology when a shipment is delayed" — and Pallio AI drafts a complete template with the right variables. Lands when the AI backend ships.
            </InfoTooltip>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Pallio AI can draft one in a few seconds — just describe the use case. Lands with the AI backend.
          </p>
          <Button
            size="sm"
            className="mt-3"
            disabled
            aria-disabled
            aria-label="Draft a template with AI — feature unlocks when the Pallio AI backend ships"
            title="Unlocks when the Pallio AI backend ships"
          >
            <Sparkles className="h-3.5 w-3.5" /> Draft a template with AI · coming soon
          </Button>
        </section>
      </div>

      {/* Full preview */}
      <BottomSheet
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.name ?? "Preview"}
        description={preview ? CATEGORY_LABEL[preview.category] : undefined}
        maxHeightVh={85}
        footer={
          preview ? (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
              <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { const t = preview; setPreview(null); onEditOrClone(t) }}>
                  {preview.builtin ? <><Copy className="h-3.5 w-3.5" /> Clone</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                </Button>
                <Link to={`/communications/new?template=${preview.id}`}>
                  <Button onClick={() => setPreview(null)}>Use template <ArrowRight className="h-3.5 w-3.5" /></Button>
                </Link>
              </div>
            </div>
          ) : null
        }
      >
        {preview && (
          <div className="pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</p>
            <p className="mt-0.5 text-sm font-semibold">{interpolate(preview.subject, sampleMapFor(preview))}</p>
            <div
              className="prose-pallio mt-3 max-w-none border-t border-border pt-3 text-sm"
              dangerouslySetInnerHTML={{ __html: interpolate(preview.body, sampleMapFor(preview)) }}
            />
            {preview.tokens.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Variables</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {preview.tokens.map((tok) => (
                    <span key={tok.key} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium">
                      {`{{${tok.key}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </PageShell>
  )
}
