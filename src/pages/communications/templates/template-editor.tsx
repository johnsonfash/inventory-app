import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, Eye, Save } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/lists/status-badge"
import { interpolate } from "@/lib/comms/data"
import {
  deriveTokens,
  getTemplateById,
  newTemplateId,
  saveUserTemplate,
} from "@/lib/comms/storage"
import type { EmailTemplate, TemplateCategory } from "@/lib/comms/types"
import { cn } from "@/lib/utils"

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "transactional", label: "Transactional" },
  { value: "marketing", label: "Marketing" },
  { value: "ops", label: "Ops" },
  { value: "team", label: "Team" },
]

// Shared editor behind both /communications/templates/new and /:id.
//   * /:id              → edit that user template
//   * /new?from=<id>    → clone a builtin (or any) template into a new one
//   * /new              → blank template
// Builtins are never mutated; editing one always lands as a user copy.
export function TemplateEditor() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()

  // Resolve the starting template once.
  const seed = React.useMemo<EmailTemplate | null>(() => {
    if (id) return getTemplateById(id) ?? null
    const from = sp.get("from")
    if (from) {
      const src = getTemplateById(from)
      if (src) return { ...src, id: newTemplateId(), name: `Copy of ${src.name}`, builtin: false }
    }
    return null
  }, [id, sp])

  // If editing a builtin directly (shouldn't normally happen via :id),
  // fork it so we never persist over a builtin.
  const editingId = React.useMemo(
    () => (seed && !seed.builtin && id ? seed.id : newTemplateId()),
    [seed, id],
  )

  const [name, setName] = React.useState(seed?.name ?? "")
  const [description, setDescription] = React.useState(seed?.description ?? "")
  const [category, setCategory] = React.useState<TemplateCategory>(seed?.category ?? "marketing")
  const [subject, setSubject] = React.useState(seed?.subject ?? "")
  const [body, setBody] = React.useState(seed?.body?.trim() ?? "")

  const tokens = React.useMemo(
    () => deriveTokens(subject, body, seed?.tokens ?? []),
    [subject, body, seed],
  )

  // Live preview substitutes each token's sample (falling back to the
  // literal {{token}} so empty samples are still visible).
  const sampleMap = React.useMemo(() => {
    const m: Record<string, string> = {}
    for (const t of tokens) m[t.key] = t.sample || `{{${t.key}}}`
    return m
  }, [tokens])

  const [showErrors, setShowErrors] = React.useState(false)
  const nameInvalid = name.trim().length === 0
  const subjectInvalid = subject.trim().length === 0
  const bodyInvalid = body.trim().length === 0
  const valid = !nameInvalid && !subjectInvalid && !bodyInvalid

  const save = () => {
    if (!valid) {
      setShowErrors(true)
      toast.error("Fill in all required fields", {
        description: [
          nameInvalid ? "name" : null,
          subjectInvalid ? "subject" : null,
          bodyInvalid ? "body" : null,
        ].filter(Boolean).join(", "),
      })
      return
    }
    saveUserTemplate({
      id: editingId,
      name: name.trim(),
      description: description.trim() || "Custom template.",
      category,
      subject: subject.trim(),
      body,
      tokens,
      builtin: false,
    })
    toast.success(id ? "Template updated" : "Template created", { description: name.trim() })
    navigate("/communications/templates")
  }

  return (
    <PageShell
      title={id ? "Edit template" : "New template"}
      withToolbar={false}
      titleTooltip="Compose a reusable email. Anything in {{double_braces}} becomes a variable that fills in per-recipient when you send."
    >
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate("/communications/templates")}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to templates
        </button>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Editor */}
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
                Template name <span className="text-rose-500">*</span>
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Shipment delayed"
                maxLength={100}
                aria-label="Template name (required, up to 100 characters)"
                aria-invalid={showErrors && nameInvalid ? true : undefined}
                className={cn(showErrors && nameInvalid && "border-rose-500 focus-visible:ring-rose-500/20")}
              />
              {showErrors && nameInvalid && (
                <span role="alert" className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  Give your template a short name.
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-foreground/80">Category</span>
                <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-foreground/80">Short description</span>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this email is for" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
                Subject <span className="text-rose-500">*</span>
              </span>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Your order {{invoice_number}} has shipped"
                maxLength={200}
                aria-invalid={showErrors && subjectInvalid ? true : undefined}
                className={cn(showErrors && subjectInvalid && "border-rose-500 focus-visible:ring-rose-500/20")}
              />
              {showErrors && subjectInvalid && (
                <span role="alert" className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  Subject is required.
                </span>
              )}
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
                Body (HTML) <span className="text-rose-500">*</span>
              </span>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder={"<p>Hi {{customer_first_name}},</p>\n<p>…</p>"}
                className={cn("font-mono text-xs", showErrors && bodyInvalid && "border-rose-500 focus-visible:ring-rose-500/20")}
                aria-invalid={showErrors && bodyInvalid ? true : undefined}
              />
              {showErrors && bodyInvalid && (
                <span role="alert" className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  Body can't be empty.
                </span>
              )}
            </label>

            {/* Detected variables */}
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Variables detected ({tokens.length})
              </p>
              {tokens.length === 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Wrap anything in <code className="rounded bg-muted px-1">{"{{double_braces}}"}</code> to make it a per-recipient variable.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tokens.map((t) => (
                    <span key={t.key} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium">
                      {`{{${t.key}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="flex flex-col gap-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> Live preview
            </p>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</p>
              <p className="mt-0.5 text-sm font-semibold">{interpolate(subject, sampleMap) || "—"}</p>
              <div
                className="prose-pallio mt-3 max-w-none border-t border-border pt-3 text-sm"
                dangerouslySetInnerHTML={{ __html: interpolate(body, sampleMap) || "<p class='text-muted-foreground'>Body preview appears here.</p>" }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          {seed?.builtin ? (
            <StatusBadge tone="info">Saving as a copy (built-in stays untouched)</StatusBadge>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/communications/templates")}>Cancel</Button>
            <Button onClick={save}>
              <Save className="h-4 w-4" /> {id ? "Save changes" : "Create template"}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
