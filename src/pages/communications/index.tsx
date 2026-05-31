import * as React from "react"
import { Link } from "react-router-dom"
import {
  ChevronRight,
  Inbox,
  LayoutTemplate,
  Mail,
  Paperclip,
  Pencil,
  Search,
  Send,
  Trash2,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { EmptyState } from "@/components/lists/empty-state"
import { InfoTooltip } from "@/components/info-tooltip"
import { Avatar } from "@/components/avatar"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { MESSAGES, TEMPLATES } from "@/lib/comms/data"
import type { EmailMessage } from "@/lib/comms/types"
import { cn } from "@/lib/utils"

type Folder = "inbox" | "sent" | "drafts"

const FOLDER_LABEL: Record<Folder, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60_000)
  if (min < 1) return "now"
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  return d === 1 ? "1d" : `${d}d`
}

export default function CommunicationsHub() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))
  const [folder, setFolder] = React.useState<Folder>("inbox")
  const [query, setQuery] = React.useState("")
  const [messages, setMessages] = React.useState<EmailMessage[]>(MESSAGES)
  const [detail, setDetail] = React.useState<EmailMessage | null>(null)

  // Open a message in the detail drawer; mark inbox messages read.
  const openMessage = (m: EmailMessage) => {
    if (m.folder === "inbox" && !m.read) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, read: true } : x)))
    }
    setDetail({ ...m, read: true })
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return messages.filter((m) => m.folder === folder).filter((m) => {
      if (!q) return true
      return (
        m.subject.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q) ||
        m.from.name.toLowerCase().includes(q) ||
        m.to.some((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
      )
    })
  }, [folder, query, messages])

  const counts: Record<Folder, number> = {
    inbox: messages.filter((m) => m.folder === "inbox").length,
    sent: messages.filter((m) => m.folder === "sent").length,
    drafts: messages.filter((m) => m.folder === "drafts").length,
  }
  const unread = messages.filter((m) => m.folder === "inbox" && !m.read).length

  return (
    <PageShell
      title="Communications"
      withToolbar={false}
      titleTooltip={
        <>
          All outbound + inbound messages your business sends through
          Pallio: order confirmations, payment receipts, marketing
          blasts, support replies. Templates live one tab over so the
          team isn't re-writing the same email every time.
        </>
      }
      mobileTrailing={
        <Link to="/communications/new">
          <button
            type="button"
            aria-label="Compose email"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 hover:bg-accent active:bg-accent/70"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Inbox",     value: String(counts.inbox),  tone: "brand",   hint: `${unread} unread` },
            { label: "Sent (7d)", value: String(counts.sent),   tone: "success", hint: "all team" },
            { label: "Drafts",    value: String(counts.drafts), tone: "warning", hint: "in progress" },
            { label: "Templates", value: String(TEMPLATES.length), tone: "info", hint: "ready to use" },
          ]}
        />

        {/* Folder tabs + search + compose */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
            {(["inbox", "sent", "drafts"] as Folder[]).map((f) => {
              const FolderIcon = f === "inbox" ? Inbox : f === "sent" ? Send : Pencil
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFolder(f)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    folder === f
                      ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <FolderIcon className="h-3.5 w-3.5" />
                  {FOLDER_LABEL[f]}
                  <span className={cn("ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]", folder === f ? "bg-white/25" : "bg-muted")}>
                    {counts[f]}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="pl-9" />
            </div>
            <Link to="/communications/new" className="hidden sm:inline-flex">
              <Button><Pencil className="h-4 w-4" /> Compose</Button>
            </Link>
            <Link to="/communications/templates" className="hidden sm:inline-flex">
              <Button variant="outline"><LayoutTemplate className="h-4 w-4" /> Templates</Button>
            </Link>
          </div>
        </div>

        {/* Message list */}
        {filtered.length === 0 ? (
          <EmptyState
            Icon={Mail}
            title={query ? "No messages match" : `No ${FOLDER_LABEL[folder].toLowerCase()} messages`}
            description={
              query
                ? "Try a different search."
                : folder === "drafts"
                  ? "Start a new draft — it'll save automatically as you write."
                  : folder === "inbox"
                    ? "Quiet for now. Start a new thread when you're ready."
                    : "Nothing sent recently. Compose a new message to get started."
            }
            action={
              query ? undefined : (
                <Link to="/communications/new">
                  <Button><Pencil className="h-4 w-4" /> {folder === "drafts" ? "New email" : "Compose"}</Button>
                </Link>
              )
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((m) => (
              <li key={m.id}>
                <MessageRow message={m} folder={folder} onOpen={() => openMessage(m)} />
              </li>
            ))}
          </ul>
        )}

        <p className="text-[10px] text-muted-foreground">
          <InfoTooltip label="Mock data" size="xs">
            Inbox + Sent + Drafts are mocked here. Real email send / receive lands when the backend ships — the same composer + templates will drive the production flow.
          </InfoTooltip>
          <span className="ml-1">Sending is a no-op for now — see Templates to author copy.</span>
        </p>
      </div>

      {/* Message detail */}
      <BottomSheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.subject ?? "Message"}
        maxHeightVh={85}
        footer={
          detail ? (
            <div className="flex items-center justify-end gap-2 pb-3">
              <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
              <Link to="/communications/new">
                <Button onClick={() => setDetail(null)}>
                  <Pencil className="h-4 w-4" /> {detail.folder === "inbox" ? "Reply" : "Compose"}
                </Button>
              </Link>
            </div>
          ) : null
        }
      >
        {detail && (
          <div className="pb-2">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Avatar seed={detail.from.email || detail.from.name} name={detail.from.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{detail.from.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{detail.from.email}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{relTime(detail.sentAt)} ago</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              To: {detail.to.map((t) => t.name).join(", ")}
            </p>
            <div
              className="prose-pallio mt-3 max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: detail.body }}
            />
            {detail.templateId && (
              <div className="mt-4 border-t border-border pt-3">
                <StatusBadge tone="info">sent from template: {detail.templateId.replace(/^tpl-/, "")}</StatusBadge>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </PageShell>
  )
}

function MessageRow({ message, folder, onOpen }: { message: EmailMessage; folder: Folder; onOpen: () => void }) {
  const counterparty = folder === "inbox" ? message.from : message.to[0]
  const name = counterparty?.name ?? "Unknown"
  const email = counterparty?.email ?? ""

  const rowClass = cn(
    "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors hover:border-brand/40",
    message.folder === "inbox" && !message.read
      ? "border-brand/30 bg-brand-soft/30 dark:bg-primary/10"
      : "border-border bg-card",
  )

  // Drafts open the composer; everything else opens the read drawer.
  const inner = (
    <>
      <Avatar seed={email || name} name={name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">
            {folder === "inbox" ? "" : "To: "}{name}
          </p>
          <span className="text-[11px] text-muted-foreground">{relTime(message.sentAt)}</span>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">{email}</p>
        <p className="mt-1 truncate text-sm font-medium">{message.subject}</p>
        <p className="line-clamp-1 text-[11px] text-muted-foreground">{message.preview}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
          {message.templateId && <StatusBadge tone="info">template: {message.templateId.replace(/^tpl-/, "")}</StatusBadge>}
          {message.attachments && message.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Paperclip className="h-3 w-3" /> {message.attachments.length}
            </span>
          )}
          {folder === "inbox" && !message.read && (
            <StatusBadge tone="brand" withDot>unread</StatusBadge>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  )

  if (folder === "drafts") {
    return <Link to="/communications/new" className={rowClass}>{inner}</Link>
  }
  return (
    <button type="button" onClick={onOpen} className={rowClass}>{inner}</button>
  )
}

// Keep unused-import suppression simple if we add a delete button later.
const _Trash = Trash2
void _Trash
