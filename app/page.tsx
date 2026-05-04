"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible")
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    )
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        *{box-sizing:border-box;margin:0;padding:0}

        :root{
          --bg:#0a0a0b;
          --surf:#111113;
          --surf2:#18181b;
          --b1:#1e1e22;
          --b2:#27272b;
          --t1:#f4f4f5;
          --t2:#a1a1aa;
          --t3:#52525b;
          --green:#00f058;
          --teal:#00ffe5;
          --grad:linear-gradient(135deg,#00ffe5 0%,#00f058 50%,#00c846 100%);
          --grad-text:linear-gradient(135deg,#00ffe5,#00f058);
          --glow:0 0 80px rgba(0,240,88,0.08);
          --font:'Plus Jakarta Sans',system-ui,sans-serif;
          --mono:'JetBrains Mono',monospace;
        }

        html{scroll-behavior:smooth;overflow-x:hidden}
        body{background:var(--bg);color:var(--t1);font-family:var(--font);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}

        body::before{
          content:'';position:fixed;inset:0;z-index:9999;pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity:0.025;
        }

        .container{max-width:1200px;margin:0 auto;padding:0 24px}
        .container-wide{max-width:1400px;margin:0 auto;padding:0 24px}

        nav{
          position:fixed;top:0;left:0;right:0;z-index:100;
          padding:14px 0;
          background:rgba(10,10,11,0.7);
          backdrop-filter:blur(20px) saturate(1.2);
          -webkit-backdrop-filter:blur(20px) saturate(1.2);
          border-bottom:1px solid rgba(255,255,255,0.04);
        }
        .nav-inner{
          max-width:1200px;margin:0 auto;padding:0 24px;
          display:flex;align-items:center;justify-content:space-between;
        }
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .nav-logo-mark{
          width:30px;height:30px;border-radius:8px;
          background:var(--grad);
          display:flex;align-items:center;justify-content:center;
        }
        .nav-logo-name{font-size:17px;font-weight:700;color:var(--t1);letter-spacing:-0.02em}
        .nav-links{display:flex;align-items:center;gap:32px}
        .nav-links a{color:var(--t2);text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
        .nav-links a:hover{color:var(--t1)}
        .nav-actions{display:flex;align-items:center;gap:12px}
        .btn-ghost{
          padding:7px 16px;border-radius:6px;font-size:13px;font-weight:600;font-family:var(--font);
          background:transparent;border:1px solid var(--b2);color:var(--t2);cursor:pointer;
          transition:all .2s;text-decoration:none;display:inline-flex;align-items:center;
        }
        .btn-ghost:hover{border-color:var(--t3);color:var(--t1)}
        .btn-primary{
          padding:7px 18px;border-radius:6px;font-size:13px;font-weight:600;font-family:var(--font);
          background:var(--t1);border:none;color:var(--bg);cursor:pointer;
          transition:all .2s;text-decoration:none;display:inline-flex;align-items:center;
        }
        .btn-primary:hover{background:#e4e4e7;transform:translateY(-1px)}

        .hero{
          padding:160px 0 80px;text-align:center;position:relative;
        }
        .hero::before{
          content:'';position:absolute;top:60px;left:50%;transform:translateX(-50%);
          width:800px;height:500px;
          background:radial-gradient(ellipse at center,rgba(0,255,229,0.06) 0%,rgba(0,240,88,0.03) 40%,transparent 70%);
          pointer-events:none;
        }
        .hero-badge{
          display:inline-flex;align-items:center;gap:6px;
          padding:5px 14px 5px 6px;border-radius:20px;
          background:rgba(0,240,88,0.06);border:1px solid rgba(0,240,88,0.12);
          font-size:12px;font-weight:600;color:var(--green);
          margin-bottom:28px;
          animation:fadeInDown .8s ease;
        }
        .hero-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--green);margin:0 4px;animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

        .hero h1{
          font-size:clamp(48px,6.5vw,80px);font-weight:700;
          letter-spacing:-0.035em;line-height:1.05;
          margin-bottom:20px;
          animation:fadeInDown .8s ease .1s both;
        }
        .hero h1 .grad{
          background:var(--grad-text);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text;
        }
        .hero-sub{
          font-size:clamp(16px,2vw,19px);color:var(--t2);
          max-width:560px;margin:0 auto 40px;line-height:1.6;font-weight:400;
          animation:fadeInDown .8s ease .2s both;
        }
        .hero-actions{
          display:flex;justify-content:center;gap:12px;
          animation:fadeInDown .8s ease .3s both;
        }
        .btn-hero{
          padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;font-family:var(--font);
          cursor:pointer;transition:all .25s;text-decoration:none;display:inline-flex;align-items:center;gap:8px;
        }
        .btn-hero-primary{
          background:var(--t1);border:none;color:var(--bg);
        }
        .btn-hero-primary:hover{background:#e4e4e7;transform:translateY(-2px);box-shadow:0 8px 30px rgba(244,244,245,0.15)}
        .btn-hero-secondary{
          background:transparent;border:1px solid var(--b2);color:var(--t2);
        }
        .btn-hero-secondary:hover{border-color:var(--t3);color:var(--t1)}

        .hero-screenshot{
          margin-top:64px;position:relative;
          animation:fadeInUp 1s ease .4s both;
        }
        .hero-screenshot::before{
          content:'';position:absolute;inset:-2px;border-radius:14px;
          background:linear-gradient(180deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.01) 100%);
          z-index:0;
        }
        .hero-screenshot::after{
          content:'';position:absolute;bottom:-120px;left:50%;transform:translateX(-50%);
          width:80%;height:200px;
          background:radial-gradient(ellipse,rgba(0,240,88,0.08) 0%,transparent 70%);
          pointer-events:none;filter:blur(40px);
        }
        .hero-screenshot img{
          width:100%;max-width:1100px;border-radius:12px;
          border:1px solid rgba(255,255,255,0.06);
          box-shadow:0 20px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.03);
          position:relative;z-index:1;
        }

        .trust{padding:100px 0 60px;text-align:center}
        .trust-label{font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:var(--t3);font-weight:600;margin-bottom:12px}
        .trust-text{font-size:14px;color:var(--t3);max-width:500px;margin:0 auto}

        .section{padding:120px 0}
        .section-label{
          font-size:12px;text-transform:uppercase;letter-spacing:0.1em;
          font-weight:600;margin-bottom:16px;
        }
        .section-label .grad{background:var(--grad-text);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .section h2{
          font-size:clamp(32px,4.5vw,52px);font-weight:700;
          letter-spacing:-0.03em;line-height:1.1;margin-bottom:16px;
        }
        .section-desc{font-size:17px;color:var(--t2);max-width:520px;line-height:1.65}

        .feature-block{
          display:flex;flex-direction:column;gap:48px;
          padding:80px 0;
        }
        .feature-text-row{
          display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start;
        }
        .feature-visual{position:relative}
        .feature-visual img{
          width:100%;border-radius:12px;
          border:1px solid rgba(255,255,255,0.05);
          box-shadow:0 20px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.03);
        }
        .feature-visual::before{
          content:'';position:absolute;inset:-1px;border-radius:13px;
          background:linear-gradient(180deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.01) 100%);
          z-index:0;pointer-events:none;
        }
        .feature-visual::after{
          content:'';position:absolute;bottom:-80px;left:50%;transform:translateX(-50%);
          width:70%;height:160px;
          background:radial-gradient(ellipse,rgba(0,240,88,0.06) 0%,transparent 70%);
          pointer-events:none;filter:blur(30px);
        }
        .feature-visual img{position:relative;z-index:1}
        .feature-content h3{font-size:28px;font-weight:700;letter-spacing:-0.02em;margin-bottom:12px;line-height:1.2}
        .feature-content p{font-size:15px;color:var(--t2);line-height:1.7;margin-bottom:20px}
        .feature-tag{
          display:inline-flex;align-items:center;gap:6px;
          font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;
          margin-bottom:16px;
        }
        .feature-tag .dot{width:5px;height:5px;border-radius:50%}
        .ft-green .dot{background:var(--green)}
        .ft-teal .dot{background:var(--teal)}
        .ft-blue .dot{background:#60a5fa}
        .ft-purple .dot{background:#c084fc}
        .ft-orange .dot{background:#f97316}
        .ft-green{color:var(--green)}
        .ft-teal{color:var(--teal)}
        .ft-blue{color:#60a5fa}
        .ft-purple{color:#c084fc}
        .ft-orange{color:#f97316}

        .bento{
          display:grid;grid-template-columns:repeat(3,1fr);gap:1px;
          background:var(--b1);border-radius:16px;overflow:hidden;
          margin-top:64px;
        }
        .bento-card{background:var(--surf);padding:36px 32px}
        .bento-card h4{font-size:17px;font-weight:600;margin-bottom:8px;letter-spacing:-0.01em}
        .bento-card p{font-size:14px;color:var(--t2);line-height:1.6}
        .bento-icon{
          width:36px;height:36px;border-radius:8px;
          display:flex;align-items:center;justify-content:center;
          margin-bottom:16px;
        }
        .bi-green{background:rgba(0,240,88,0.08);color:var(--green)}
        .bi-teal{background:rgba(0,255,229,0.08);color:var(--teal)}
        .bi-blue{background:rgba(96,165,250,0.08);color:#60a5fa}
        .bi-purple{background:rgba(192,132,252,0.08);color:#c084fc}
        .bi-orange{background:rgba(249,115,22,0.08);color:#f97316}
        .bi-red{background:rgba(248,113,113,0.08);color:#f87171}

        .divider{height:1px;background:linear-gradient(90deg,transparent,var(--b1) 20%,var(--b1) 80%,transparent);margin:0 auto;max-width:1000px}

        .cta-section{
          padding:140px 0;text-align:center;position:relative;
        }
        .cta-section::before{
          content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:700px;height:400px;
          background:radial-gradient(ellipse,rgba(0,240,88,0.06) 0%,transparent 65%);
          pointer-events:none;
        }
        .cta-section h2{
          font-size:clamp(36px,5vw,56px);font-weight:700;
          letter-spacing:-0.03em;line-height:1.1;margin-bottom:16px;
        }
        .cta-section p{font-size:17px;color:var(--t2);max-width:440px;margin:0 auto 36px;line-height:1.6}
        .cta-actions{display:flex;justify-content:center;gap:12px}

        footer{
          border-top:1px solid var(--b1);padding:48px 0;
        }
        .footer-inner{
          display:flex;align-items:center;justify-content:space-between;
        }
        .footer-left{display:flex;align-items:center;gap:10px}
        .footer-left span{font-size:13px;color:var(--t3)}
        .footer-links{display:flex;gap:24px}
        .footer-links a{font-size:13px;color:var(--t3);text-decoration:none;transition:color .2s}
        .footer-links a:hover{color:var(--t2)}

        @keyframes fadeInDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}

        .reveal{opacity:0;transform:translateY(30px);transition:all .7s cubic-bezier(0.16,1,0.3,1)}
        .reveal.visible{opacity:1;transform:translateY(0)}
        .reveal-delay-1{transition-delay:.1s}
        .reveal-delay-2{transition-delay:.2s}
        .reveal-delay-3{transition-delay:.3s}

        @media(max-width:900px){
          .feature-text-row{grid-template-columns:1fr;gap:20px}
          .bento{grid-template-columns:1fr}
          .nav-links{display:none}
        }
        @media(max-width:600px){
          .hero h1{font-size:36px}
          .hero-actions{flex-direction:column;align-items:center}
          .footer-inner{flex-direction:column;gap:20px;text-align:center}
          .cta-actions{flex-direction:column;align-items:center}
        }
      `}</style>

      {/* NAVIGATION */}
      <nav>
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            <img src="/logo_transparent.png" alt="Cadence" style={{height:"32px",width:"auto"}} />
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#ai">AI</a>
          </div>
          <div className="nav-actions">
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/login" className="btn-primary">Sign up</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge"><span className="hero-badge-dot"></span> Now with AI-powered review drafts</div>
          <h1>The operating system<br />for <span className="grad">engineering managers</span></h1>
          <p className="hero-sub">Track your team, run your 1:1s, write better reviews, and never lose a follow-up. One tool, no spreadsheets, no juggling.</p>
          <div className="hero-actions">
            <Link href="/login" className="btn-hero btn-hero-primary">Get started — it&apos;s free</Link>
            <a href="#features" className="btn-hero btn-hero-secondary">See how it works</a>
          </div>
        </div>
        <div className="container-wide">
          <div className="hero-screenshot">
            <img src="/landing/dashboard.png" alt="Cadence dashboard showing meetings, tasks due, and calendar view" />
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="trust">
        <div className="container">
          <div className="trust-label">Built for ICs turned managers</div>
          <p className="trust-text">Cadence replaces the Notion templates, Jira workarounds, and spreadsheets you&apos;re already using. Everything in one place, private to you.</p>
        </div>
      </section>

      <div className="divider"></div>

      {/* FEATURES SECTION */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-label"><span className="grad">Features</span></div>
          <h2>Everything an EM needs.</h2>
          <p className="section-desc">Purpose-built surfaces for the work engineering managers actually do — from Monday review to Friday summary.</p>
        </div>
      </section>

      {/* Feature 1: Weekly Review */}
      <div className="container-wide">
        <div className="feature-block reveal">
          <div className="feature-content" style={{maxWidth:"600px"}}>
            <div className="feature-tag ft-green"><span className="dot"></span> Weekly Review</div>
            <h3>Start every week with clarity</h3>
            <p>Cadence scans your people, tasks, and meetings and surfaces what needs attention. Overdue follow-ups, missed 1:1s, ageing action items — all in one guided checklist. Mark the week as reviewed when you&apos;re done.</p>
          </div>
          <div className="feature-visual">
            <img src="/landing/weekly-review.png" alt="Weekly Review page showing people check, action items, and tasks sections" />
          </div>
        </div>
      </div>

      {/* Feature 2: People Radar */}
      <div className="container-wide">
        <div className="feature-block reveal">
          <div className="feature-content" style={{maxWidth:"600px"}}>
            <div className="feature-tag ft-teal"><span className="dot"></span> People Radar</div>
            <h3>Know who needs you before they ask</h3>
            <p>Every team member gets an attention score based on real signals: 1:1 gaps, stale evidence, open follow-ups, recurring topics. People who need attention float to the top.</p>
          </div>
          <div className="feature-visual">
            <img src="/landing/people-radar.png" alt="People Radar showing attention scores and signals for each team member" />
          </div>
        </div>
      </div>

      {/* Feature 3: Evidence Bank */}
      <div className="container-wide">
        <div className="feature-block reveal">
          <div className="feature-content" style={{maxWidth:"600px"}}>
            <div className="feature-tag ft-purple"><span className="dot"></span> Evidence Bank</div>
            <h3>Reviews without recency bias</h3>
            <p>Log achievements, feedback, concerns, and growth moments throughout the year. When review season comes, everything is already there — categorised, timestamped, and grouped by person.</p>
          </div>
          <div className="feature-visual">
            <img src="/landing/evidence-bank.png" alt="Evidence Bank showing categorised entries across team members" />
          </div>
        </div>
      </div>

      {/* Feature 4: Tasks */}
      <div className="container-wide" id="workflow">
        <div className="feature-block reveal">
          <div className="feature-content" style={{maxWidth:"600px"}}>
            <div className="feature-tag ft-orange"><span className="dot"></span> Tasks &amp; Kanban</div>
            <h3>Your work, your week, your board</h3>
            <p>A kanban board built for your week — not your team&apos;s sprint. Drag tasks between Not Started, In Progress, Blocked, and Done. A separate backlog keeps future work out of sight until you need it.</p>
          </div>
          <div className="feature-visual">
            <img src="/landing/tasks.png" alt="Kanban board showing tasks organised by status with priority badges" />
          </div>
        </div>
      </div>

      {/* Feature 5: Career Framework */}
      <div className="container-wide">
        <div className="feature-block reveal">
          <div className="feature-content" style={{maxWidth:"600px"}}>
            <div className="feature-tag ft-blue"><span className="dot"></span> Career Framework</div>
            <h3>Competencies that actually get used</h3>
            <p>Define your own engineering ladder. Assess each person against it over time. See who&apos;s at level, who&apos;s growing, and where the gaps are — per person and across the team.</p>
          </div>
          <div className="feature-visual">
            <img src="/landing/skills-matrix.png" alt="Skills matrix showing team competency assessments with gap analysis" />
          </div>
        </div>
      </div>

      <div className="divider"></div>

      {/* BENTO GRID */}
      <section className="section" id="ai">
        <div className="container">
          <div className="section-label"><span className="grad">Built different</span></div>
          <h2>Designed for how<br />EMs actually work</h2>
          <p className="section-desc">Not another HR tool that needs team-wide adoption. Cadence is your private control centre.</p>

          <div className="bento reveal">
            <div className="bento-card">
              <div className="bento-icon bi-green">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4L15 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h4>Free, forever</h4>
              <p>No per-seat pricing. No trial that expires. Your data, your tool, no strings attached.</p>
            </div>
            <div className="bento-card">
              <div className="bento-icon bi-teal">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M9 5v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <h4>Weekly Summary</h4>
              <p>One click generates a copy-pasteable status update from your week&apos;s data. Slack, email, skip-level — done.</p>
            </div>
            <div className="bento-card">
              <div className="bento-icon bi-purple">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l2.5 5H16l-4 3.5 1.5 5.5L9 13l-4.5 3 1.5-5.5L2 7h4.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              </div>
              <h4>BYOK AI</h4>
              <p>Bring your own API key. AI drafts reviews, preps 1:1s, extracts action items, and suggests growth plans. You pay pennies, not subscriptions.</p>
            </div>
            <div className="bento-card">
              <div className="bento-icon bi-blue">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 1v3M12 1v3M2 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <h4>Calendar View</h4>
              <p>See your tasks, deadlines, and meetings on a monthly calendar. Know what&apos;s coming without leaving Cadence.</p>
            </div>
            <div className="bento-card">
              <div className="bento-icon bi-orange">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 15V7l6-4 6 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 15v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h4>Follow-up Engine</h4>
              <p>Track every commitment you make. Cadence surfaces unresolved promises that keep ageing — before your team notices you forgot.</p>
            </div>
            <div className="bento-card">
              <div className="bento-icon bi-red">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 3L3 15M3 3l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <h4>No team adoption needed</h4>
              <p>Your team doesn&apos;t log in. They don&apos;t even know it exists. Cadence is your private manager toolkit.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <h2>Stop juggling.<br /><span style={{background:"var(--grad-text)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Start managing.</span></h2>
          <p>Set up in 2 minutes. No credit card. No team rollout. Just you and a better way to lead.</p>
          <div className="cta-actions">
            <Link href="/login" className="btn-hero btn-hero-primary">Get started — it&apos;s free</Link>
            <Link href="/login" className="btn-hero btn-hero-secondary">Log in</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-inner">
            <div className="footer-left">
              <img src="/logo_transparent.png" alt="Cadence" style={{height:"24px",width:"auto",opacity:0.6}} />
              <span>© 2026 Cadence</span>
            </div>
            <div className="footer-links">
              <Link href="/login">Log in</Link>
              <Link href="/login">Sign up</Link>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
