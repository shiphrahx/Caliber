import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service — Cadence",
}

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px", fontFamily: "system-ui, sans-serif", color: "#f4f4f5", background: "#0a0a0b", minHeight: "100vh" }}>
      <Link href="/" style={{ fontSize: 13, color: "#a1a1aa", textDecoration: "none", marginBottom: 48, display: "inline-block" }}>← Back</Link>

      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: "#52525b", fontSize: 14, marginBottom: 48 }}>Last updated: May 2026</p>

      <div style={{ lineHeight: 1.75, fontSize: 15, color: "#a1a1aa" }}>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>1. What Cadence is</h2>
        <p>Cadence is an open-source tool for engineering managers. The source code is publicly available. Anyone can self-host it. These terms apply to the hosted version at this domain.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>2. Your account</h2>
        <p>You sign in with Google. You are responsible for keeping your account secure. We reserve the right to suspend accounts that abuse the service or violate these terms.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>3. Your data</h2>
        <p>You own your data. Cadence stores the data you enter — people, tasks, meetings, notes — so you can use the product. We do not sell it, share it, or use it for any purpose other than running the service for you.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>4. No warranty</h2>
        <p>Cadence is provided &ldquo;as is&rdquo;, without warranty of any kind. As an open-source project, there are no SLAs, uptime guarantees, or support commitments on the hosted version. Use it at your own risk.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>5. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, the contributors to Cadence are not liable for any damages arising from your use of the service, including loss of data.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>6. Changes</h2>
        <p>These terms may change as the project evolves. Continued use of the service after changes constitutes acceptance.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>7. Open source</h2>
        <p>The source code is available on GitHub under the <strong style={{ color: "#f4f4f5" }}>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>. You are free to self-host, fork, and modify Cadence. However, if you deploy a modified version — including as a hosted service — you must release your modifications under the same AGPL-3.0 license and make the source code available to your users. Self-hosted instances are governed by the AGPL-3.0, not these terms.</p>

      </div>

      <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid #1e1e22", display: "flex", gap: 24 }}>
        <Link href="/privacy" style={{ fontSize: 13, color: "#52525b", textDecoration: "none" }}>Privacy Policy</Link>
        <Link href="/" style={{ fontSize: 13, color: "#52525b", textDecoration: "none" }}>Home</Link>
      </div>
    </div>
  )
}
