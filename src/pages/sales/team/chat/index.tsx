import * as React from "react"
import { toast } from "sonner"
import { ArrowUp, Hash, MessageSquare, MoreHorizontal, Trash2, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useChatKeyboard } from "@/hooks/use-chat-keyboard"
import { kvJson } from "@/lib/storage/kv"
import { EmptyState } from "@/components/lists/empty-state"
import { RoleGuard } from "@/components/auth/role-guard"
import { Avatar } from "@/components/avatar"
import { ConnectionChip } from "@/components/integrations/connection-chip"
import { cn } from "@/lib/utils"
import { formatPriceFor } from "@/contexts/currency"

type Message = { id: string; author: string; text: string; ts: number; channel: string }

const KEY = "team:chat"
const CHANNELS = ["general", "sales", "marketing", "ops"] as const
type Channel = (typeof CHANNELS)[number]

function getMessages(): Message[] {
  if (typeof window === "undefined") return []
  // kvJson reads sync from localStorage (hydrated from
  // @tauri-apps/plugin-store on app start), so chat history survives
  // app reinstalls on native.
  return kvJson.get<Message[]>(KEY) ?? seed
}
function setMessagesStorage(msgs: Message[]) {
  // Fire-and-forget. localStorage writes synchronously inside
  // kvJson.set; the native Preferences mirror happens in the
  // background.
  void kvJson.set(KEY, msgs)
}

const seed: Message[] = [
  { id: "m1", author: "Mia Chen", text: "POS-1042 partial just arrived — needs scanning before 5pm.", ts: Date.now() - 120000, channel: "ops" },
  { id: "m2", author: "Alex Larson", text: `Closing ${formatPriceFor(14000)} week on Wholesale. New record 🎉`, ts: Date.now() - 360000, channel: "sales" },
  { id: "m3", author: "Mia Chen", text: "Anyone in storefront? Customer asking about the USB-C Hub.", ts: Date.now() - 1800000, channel: "general" },
  { id: "m4", author: "Priya Patel", text: "IG Reels campaign live — first 24h CTR 6.2%.", ts: Date.now() - 86_400_000, channel: "marketing" },
]


function relTime(ms: number) {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function TeamChatPage() {
  const [author, setAuthor] = React.useState("You")
  const [text, setText] = React.useState("")
  const [channel, setChannel] = React.useState<Channel>("general")
  const [messages, setMsgs] = React.useState<Message[]>(getMessages)
  const [confirmClear, setConfirmClear] = React.useState(false)
  // Chat-aware keyboard handling on native. The hook owns the scroll
  // ref so the ResizeObserver auto-snap can fire on keyboard show.
  const kb = useChatKeyboard()
  const scrollRef = kb.scrollContainerRef

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 200)) }, []))

  React.useEffect(() => {
    const handler = () => setMsgs(getMessages())
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  // Newest at bottom; scroll into view on change.
  const sortedAsc = React.useMemo(() => [...messages].sort((a, b) => a.ts - b.ts), [messages])
  const visible = sortedAsc.filter((m) => m.channel === channel)

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [channel, visible.length])

  const counts = React.useMemo(() => {
    const m: Record<Channel, number> = { general: 0, sales: 0, marketing: 0, ops: 0 }
    for (const msg of messages) (m[msg.channel as Channel] ?? 0) && (m[msg.channel as Channel] += 1)
    // ^ above ternary is weird; recompute cleanly:
    const c: Record<Channel, number> = { general: 0, sales: 0, marketing: 0, ops: 0 }
    for (const msg of messages) {
      if (msg.channel in c) c[msg.channel as Channel] += 1
    }
    return c
  }, [messages])

  function send() {
    if (!text.trim()) return
    const msg: Message = {
      id: Math.random().toString(36).slice(2),
      author: author.trim() || "Anonymous",
      text: text.trim(),
      ts: Date.now(),
      channel,
    }
    const next = [...messages, msg]
    setMsgs(next)
    setMessagesStorage(next)
    setText("")
  }

  function remove(id: string) {
    const next = messages.filter((m) => m.id !== id)
    setMsgs(next)
    setMessagesStorage(next)
  }

  function clearChannel() {
    setConfirmClear(true)
  }

  function confirmClearChannel() {
    const removed = messages.filter((m) => m.channel === channel).length
    const next = messages.filter((m) => m.channel !== channel)
    setMsgs(next)
    setMessagesStorage(next)
    setConfirmClear(false)
    toast.success(`Cleared ${removed} message${removed === 1 ? "" : "s"} from #${channel}.`)
  }

  return (
    <RoleGuard permission="view:team">
      <PageShell
        title="Team chat"
        withToolbar={false}
        titleTooltip={
          <>
            Real-time chat for your team inside Pallio — channels for
            ops, sales, marketing, general. Mentions, file drops, and
            sales-context replies (@Alex, can you ship SO-7842?) all
            live here so WhatsApp doesn't sprawl out of control.
          </>
        }
        mobileTrailing={
          <button
            type="button"
            onClick={clearChannel}
            aria-label="Clear channel"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent active:bg-accent/70"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        }
      >
        {/* Slack integration — when connected, channel messages
            mirror to a matching Slack channel + DM mentions notify
            the user's Slack. */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">Mirror channels to Slack so the team gets Pallio messages where they already work.</p>
          <ConnectionChip providerId="slack" />
        </div>
        <div className="grid h-[calc(100dvh-180px)] grid-cols-1 gap-4 md:h-[calc(100dvh-200px)] lg:grid-cols-[240px_1fr]">
          {/* Channels sidebar */}
          <aside className="hidden flex-col gap-1 lg:flex">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>
            {CHANNELS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  channel === c
                    ? "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> {c}
                </span>
                {counts[c] > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums">{counts[c]}</span>
                )}
              </button>
            ))}
          </aside>

          {/* Chat column. On native iOS, when the composer takes
              focus, pad-bottom by the live keyboard height so the
              composer rides above the keyboard. See useChatKeyboard
              for the full rationale (it also disables Capacitor's
              built-in resize on this route to avoid double-shifting). */}
          <div
            className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
            style={{
              paddingBottom: kb.composerFocused ? kb.kbHeight : 0,
              transition: "padding-bottom 200ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* Header (mobile: channel switcher; desktop: title) */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">{channel}</p>
              <span className="text-[11px] text-muted-foreground">· {counts[channel]} messages</span>
              <div className="ml-auto flex items-center gap-2">
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name"
                  className="hidden h-8 w-32 text-xs sm:flex"
                />
                <Button type="button" variant="ghost" size="sm" onClick={clearChannel} className="hidden md:inline-flex" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </div>
            </div>

            {/* Mobile channel pills */}
            <div className="-mx-3 flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 scrollbar-hide lg:hidden">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    channel === c
                      ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  #{c}
                  {counts[c] > 0 && (
                    <span className={cn("ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]", channel === c ? "bg-white/25" : "bg-muted")}>
                      {counts[c]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
              {visible.length === 0 ? (
                <EmptyState
                  Icon={MessageSquare}
                  title={`No messages in #${channel}`}
                  description="Send the first one below."
                  size="sm"
                />
              ) : (
                <AnimatePresence initial={false}>
                  {visible.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", damping: 28, stiffness: 320 }}
                      className="group mb-3 flex gap-2.5"
                    >
                      <Avatar seed={m.author} name={m.author} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="truncate text-sm font-semibold">{m.author}</p>
                          <span className="text-[10px] text-muted-foreground">{relTime(m.ts)}</span>
                          <button
                            type="button"
                            onClick={() => remove(m.id)}
                            className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                            aria-label="Delete message"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{m.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Composer */}
            <div
              {...kb.composerZoneProps}
              className={cn("border-t border-border bg-card p-3", kb.composerZoneProps.className)}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  send()
                }}
                className="flex items-end gap-2"
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Message #${channel}…`}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10"
                  disabled={!text.trim()}
                  aria-label={text.trim() ? "Send message" : "Send (type a message first)"}
                  title={text.trim() ? "Send message" : "Type a message to enable send"}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Unused refs to keep imports trim */}
        <div className="hidden"><MoreHorizontal /></div>

        <Dialog open={confirmClear} onOpenChange={(o) => !o && setConfirmClear(false)}>
          <DialogContent className="max-w-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-semibold">Clear #{channel}?</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  This removes every message in this channel for everyone.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmClear(false)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={confirmClearChannel}>Clear channel</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageShell>
    </RoleGuard>
  )
}
