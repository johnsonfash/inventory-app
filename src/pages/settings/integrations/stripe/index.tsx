import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CreditCard, KeyRound, Webhook } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { SwitchField } from "@/components/forms/switch-field"
import { IntegrationShell } from "@/components/settings/integration-shell"

export default function StripeConfig() {
  const [confirmDisconnect, setConfirmDisconnect] = React.useState(false)
  const [disconnecting, setDisconnecting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const navigate = useNavigate()

  const onDisconnect = async () => {
    setDisconnecting(true)
    try {
      // Mock latency — when backend lands, replace with api.delete('/integrations/stripe').
      await new Promise((r) => setTimeout(r, 500))
      toast.success("Stripe disconnected", { description: "Card payments are paused until you reconnect." })
      setConfirmDisconnect(false)
      navigate("/settings/integrations")
    } catch {
      toast.error("Couldn't disconnect", { description: "Try again in a moment." })
    } finally {
      setDisconnecting(false)
    }
  }

  const onSave = async () => {
    setSaving(true)
    try {
      await new Promise((r) => setTimeout(r, 500))
      toast.success("Stripe settings saved")
    } catch {
      toast.error("Couldn't save changes", { description: "Check the keys and try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <IntegrationShell
      name="Stripe"
      category="Payments"
      description="Accept Visa, Mastercard, Amex, Apple Pay, and Google Pay. Handles payouts to your bank."
      Icon={CreditCard}
      tone="violet"
      status="connected"
      lastSynced="3 minutes ago"
      docsHref="https://docs.stripe.com"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={() => setConfirmDisconnect(true)} disabled={disconnecting || saving}>Disconnect</Button>
          <Button type="button" onClick={onSave} disabled={saving || disconnecting}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      }
    >
      <FormSection title="API keys" description="Stored encrypted, never shown after save" Icon={KeyRound}>
        <FormGrid cols={2}>
          <FormField label="Publishable key" required hint="Starts with pk_live_ or pk_test_">
            <Input placeholder="pk_live_…" defaultValue="pk_live_*****************************WJ4" />
          </FormField>
          <FormField label="Secret key" required hint="Starts with sk_live_ or sk_test_">
            <Input type="password" placeholder="sk_live_…" defaultValue="sk_live_*********************************K2" />
          </FormField>
          <FormField label="Mode">
            <Select defaultValue="live">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live (production)</SelectItem>
                <SelectItem value="test">Test (sandbox)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Default currency">
            <Select defaultValue="USD">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Webhook" description="Stripe will POST events to this URL" Icon={Webhook}>
        <FormGrid cols={1}>
          <FormField label="Webhook URL" hint="Add this URL in Stripe Dashboard → Developers → Webhooks.">
            <Input readOnly defaultValue="https://pallio.app/api/webhooks/stripe" />
          </FormField>
          <FormField label="Webhook signing secret" required>
            <Input type="password" placeholder="whsec_…" defaultValue="whsec_*********************************" />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Behaviour" description="What Stripe does on your behalf" Icon={CreditCard}>
        <div className="space-y-2">
          <SwitchField label="Auto-capture payments" description="Capture funds immediately on authorisation." defaultChecked />
          <SwitchField label="Save customer cards" description="Re-charge returning customers without re-entering details." defaultChecked />
          <SwitchField label="Send Stripe receipt email" description="In addition to the Pallio invoice." />
          <SwitchField label="Enable Apple Pay / Google Pay" description="Show tap-to-pay buttons on web checkout." defaultChecked />
        </div>
      </FormSection>
    </IntegrationShell>
    <Dialog open={confirmDisconnect} onOpenChange={(v) => { if (!v && !disconnecting) setConfirmDisconnect(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Stripe?</DialogTitle>
          <DialogDescription>
            Card payments through Stripe (Visa, Mastercard, Amex, Apple Pay, Google Pay) will stop until you reconnect. In-flight payouts continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirmDisconnect(false)} disabled={disconnecting}>Cancel</Button>
          <Button onClick={onDisconnect} disabled={disconnecting} className="bg-rose-600 text-white hover:bg-rose-700">
            {disconnecting ? "Disconnecting…" : "Disconnect Stripe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
