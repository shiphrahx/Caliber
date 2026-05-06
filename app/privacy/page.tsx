import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — Cadence",
}

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px", fontFamily: "system-ui, sans-serif", color: "#f4f4f5", background: "#0a0a0b", minHeight: "100vh" }}>
      <Link href="/" style={{ fontSize: 13, color: "#a1a1aa", textDecoration: "none", marginBottom: 48, display: "inline-block" }}>← Back</Link>

      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "#52525b", fontSize: 14, marginBottom: 48 }}>Last updated: May 2026</p>

      <div style={{ lineHeight: 1.75, fontSize: 15, color: "#a1a1aa" }}>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>1. What we collect</h2>
        <p>When you sign in with Google, we receive your email address and display name from Google. We store the data you enter into Cadence: people, teams, tasks, meetings, notes, career goals, and evidence entries. We do not collect analytics, tracking pixels, or behavioural data.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>2. How we use it</h2>
        <p>Your data is used solely to provide the Cadence service to you. We do not sell, share, rent, or otherwise disclose your data to third parties.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>3. Data storage</h2>
        <p>Data is stored in Supabase (PostgreSQL), hosted on AWS infrastructure. Authentication is handled by Supabase Auth with Google OAuth. Data is stored in the region configured for the Supabase project. Supabase&apos;s privacy policy applies to their role as a data processor.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>4. Data isolation</h2>
        <p>All data is isolated per user via Row Level Security (RLS) policies in the database. No user can access another user&apos;s data.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>5. Deleting your data</h2>
        <p>You can delete individual records from within the app at any time. To delete your account and all associated data, contact us via the GitHub repository or submit an issue. We will process deletion requests promptly.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>6. Cookies and sessions</h2>
        <p>We use cookies strictly for session management — to keep you signed in. No advertising or tracking cookies are used.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>7. Open source</h2>
        <p>Cadence is open source. If you self-host the project, you control all data storage and processing. This policy applies only to the hosted instance.</p>

        <h2 style={{ color: "#f4f4f5", fontSize: 20, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>8. Changes</h2>
        <p>This policy may be updated as the project evolves. Material changes will be noted in the GitHub repository changelog.</p>

      </div>

      <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid #1e1e22", display: "flex", gap: 24 }}>
        <Link href="/terms" style={{ fontSize: 13, color: "#52525b", textDecoration: "none" }}>Terms of Service</Link>
        <Link href="/" style={{ fontSize: 13, color: "#52525b", textDecoration: "none" }}>Home</Link>
      </div>
    </div>
  )
}
