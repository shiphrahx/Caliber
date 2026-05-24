import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service — Caliber",
}

export default function TermsPage() {
  return (
    <div className="legal-page">
      <Link href="/" className="legal-back">← Back</Link>

      <h1 className="legal-title">Terms of Service</h1>
      <p className="legal-date">Last updated: May 2026</p>

      <div className="legal-body">

        <h2 className="legal-h2">1. What Caliber is</h2>
        <p>Caliber is an open-source tool for engineering managers. The source code is publicly available. Anyone can self-host it. These terms apply to the hosted version at this domain.</p>

        <h2 className="legal-h2">2. Your account</h2>
        <p>You sign in with Google. You are responsible for keeping your account secure. We reserve the right to suspend accounts that abuse the service or violate these terms.</p>

        <h2 className="legal-h2">3. Your data</h2>
        <p>You own your data. Caliber stores the data you enter — people, tasks, meetings, notes — so you can use the product. We do not sell it, share it, or use it for any purpose other than running the service for you.</p>

        <h2 className="legal-h2">4. No warranty</h2>
        <p>Caliber is provided &ldquo;as is&rdquo;, without warranty of any kind. As an open-source project, there are no SLAs, uptime guarantees, or support commitments on the hosted version. Use it at your own risk.</p>

        <h2 className="legal-h2">5. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, the contributors to Caliber are not liable for any damages arising from your use of the service, including loss of data.</p>

        <h2 className="legal-h2">6. Changes</h2>
        <p>These terms may change as the project evolves. Continued use of the service after changes constitutes acceptance.</p>

        <h2 className="legal-h2">7. Open source</h2>
        <p>The source code is available on GitHub under the <strong className="legal-strong">GNU Affero General Public License v3.0 (AGPL-3.0)</strong>. You are free to self-host, fork, and modify Caliber. However, if you deploy a modified version — including as a hosted service — you must release your modifications under the same AGPL-3.0 license and make the source code available to your users. Self-hosted instances are governed by the AGPL-3.0, not these terms.</p>

      </div>

      <div className="legal-footer">
        <Link href="/privacy" className="legal-footer-link">Privacy Policy</Link>
        <Link href="/" className="legal-footer-link">Home</Link>
      </div>
    </div>
  )
}
