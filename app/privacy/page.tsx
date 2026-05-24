import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — Caliber",
}

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <Link href="/" className="legal-back">← Back</Link>

      <h1 className="legal-title">Privacy Policy</h1>
      <p className="legal-date">Last updated: May 2026</p>

      <div className="legal-body">

        <h2 className="legal-h2">1. What we collect</h2>
        <p>When you sign in with Google, we receive your email address and display name from Google. We store the data you enter into Caliber: people, teams, tasks, meetings, notes, career goals, and evidence entries. We do not collect analytics, tracking pixels, or behavioural data.</p>

        <h2 className="legal-h2">2. How we use it</h2>
        <p>Your data is used solely to provide the Caliber service to you. We do not sell, share, rent, or otherwise disclose your data to third parties.</p>

        <h2 className="legal-h2">3. Data storage</h2>
        <p>Data is stored in Supabase (PostgreSQL), hosted on AWS infrastructure. Authentication is handled by Supabase Auth with Google OAuth. Data is stored in the region configured for the Supabase project. Supabase&apos;s privacy policy applies to their role as a data processor.</p>

        <h2 className="legal-h2">4. Data isolation</h2>
        <p>All data is isolated per user via Row Level Security (RLS) policies in the database. No user can access another user&apos;s data.</p>

        <h2 className="legal-h2">5. Deleting your data</h2>
        <p>You can delete individual records from within the app at any time. To delete your account and all associated data, contact us via the GitHub repository or submit an issue. We will process deletion requests promptly.</p>

        <h2 className="legal-h2">6. Cookies and sessions</h2>
        <p>We use cookies strictly for session management — to keep you signed in. No advertising or tracking cookies are used.</p>

        <h2 className="legal-h2">7. Open source</h2>
        <p>Caliber is open source. If you self-host the project, you control all data storage and processing. This policy applies only to the hosted instance.</p>

        <h2 className="legal-h2">8. Changes</h2>
        <p>This policy may be updated as the project evolves. Material changes will be noted in the GitHub repository changelog.</p>

      </div>

      <div className="legal-footer">
        <Link href="/terms" className="legal-footer-link">Terms of Service</Link>
        <Link href="/" className="legal-footer-link">Home</Link>
      </div>
    </div>
  )
}
