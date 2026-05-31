import { Download, FileSpreadsheet, Printer, Share2 } from "lucide-react"
import { toast } from "sonner"
import { Dropdown, DropdownItem } from "@/components/ui/dropdown"
import { useShare } from "@/hooks/use-share"

type Props = {
  /** Filename stem used for downloaded files (no extension). */
  filename: string
  /** Rows for CSV. Headers come from object keys of the first row. */
  rows?: Record<string, string | number | null | undefined>[]
  /** Optional custom CSV headers (and their order). Defaults to keys
      of the first row. */
  headers?: string[]
  /** Called before window.print() so the caller can stash state. */
  onPrint?: () => void
  /** Hidden when no rows AND no print handler — there's nothing to do. */
  className?: string
  /** Report title used in the share-sheet preview. Falls back to
   *  filename when omitted. */
  shareTitle?: string
}

// Compact "Export" dropdown with CSV, PDF, Print, and Share actions.
// PDF uses `window.print()` against a print-targeted CSS class
// (handled by the caller). The CSV pathway escapes values + handles
// commas / quotes / newlines safely. Share uses the native iOS/Android
// sheet via tauri-plugin-sharesheet + falls back to navigator.share or the
// clipboard on web.
export function ExportMenu({ filename, rows, onPrint, headers, className, shareTitle }: Props) {
  const share = useShare()

  const downloadCsv = () => {
    if (!rows || rows.length === 0) return
    const keys = headers ?? Object.keys(rows[0]!)
    const header = keys.map(csvCell).join(",")
    const body = rows.map((r) => keys.map((k) => csvCell(r[k] ?? "")).join(",")).join("\n")
    const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const triggerPrint = () => {
    onPrint?.()
    requestAnimationFrame(() => window.print())
  }

  const triggerShare = async () => {
    // Share the deep link to this report. We don't ship the CSV as
    // an attachment (most native share sheets reject blob: URLs);
    // a link with a short summary is what teammates actually want
    // to receive — they can click through and re-export themselves.
    const origin = typeof window !== "undefined" && window.location.origin.includes("localhost")
      ? "https://pallio.app"
      : window.location.origin
    const url = typeof window !== "undefined" ? `${origin}${window.location.pathname}${window.location.search}` : undefined
    const title = shareTitle ?? filename
    const res = await share({
      title,
      text: `Pallio report: ${title}`,
      url,
      dialogTitle: "Share report",
    })
    if (res.kind === "copied") toast.success("Report link copied")
    else if (res.kind === "unavailable") toast.error("Sharing not available")
  }

  return (
    <Dropdown
      className={className}
      button={
        <>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </>
      }
    >
      {rows && rows.length > 0 && (
        <DropdownItem onSelect={downloadCsv}>
          <FileSpreadsheet className="h-4 w-4" /> Download CSV
        </DropdownItem>
      )}
      <DropdownItem onSelect={triggerPrint}>
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </DropdownItem>
      <DropdownItem onSelect={triggerShare}>
        <Share2 className="h-4 w-4" /> Share link
      </DropdownItem>
    </Dropdown>
  )
}

function csvCell(v: unknown): string {
  if (v == null) return ""
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
