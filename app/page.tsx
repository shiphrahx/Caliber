"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { JetBrains_Mono } from "next/font/google"

/**
 * The utility face. Inter comes from the root layout and carries the prose;
 * this one is only ever used for things that behave like readings off an
 * instrument: section labels, scores, the numbers on the rule.
 */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--f-mono",
})

/**
 * The people on the rule.
 *
 * A mock of the product's own People Radar, the same way the screenshots
 * further down are. Score is the attention score: how much of your week this
 * person has a claim on, from 1:1 gaps, ageing follow-ups and stale evidence.
 */
const RADAR = [
  { name: "Marcus", score: 12 },
  { name: "Ana", score: 31 },
  { name: "Ravi", score: 58 },
  { name: "Priya", score: 86 },
]

const FEATURES = [
  {
    label: "Weekly review",
    title: "Start the week knowing what slipped",
    body:
      "Caliber reads your people, tasks and meetings, then hands you a checklist of what needs attention. Overdue follow-ups, missed 1:1s, ageing action items. Mark the week reviewed when it's clear.",
    shot: "/landing/weekly-review.png",
    alt: "Weekly review showing people check, action items and tasks",
  },
  {
    label: "People radar",
    title: "Know who needs you before they ask",
    body:
      "Every person gets an attention score built from real signals: gaps between 1:1s, stale evidence, open follow-ups, topics that keep coming back. Whoever needs you most sits at the top.",
    shot: "/landing/people-radar.png",
    alt: "People radar showing attention scores and signals per team member",
  },
  {
    label: "Evidence bank",
    title: "Reviews that aren't written from memory",
    body:
      "Log achievements, feedback, concerns and growth moments as they happen. Come review season it is already there, categorised, timestamped and grouped by person.",
    shot: "/landing/evidence-bank.png",
    alt: "Evidence bank showing categorised entries across team members",
  },
  {
    label: "Tasks",
    title: "A board for your week, not your team's sprint",
    body:
      "Drag work between not started, in progress, blocked and done. The backlog keeps everything else out of sight until the week you need it.",
    shot: "/landing/tasks.png",
    alt: "Kanban board showing tasks by status with priority badges",
  },
  {
    label: "Career framework",
    title: "A ladder people are actually measured against",
    body:
      "Define your own competencies. Assess each person against them over time. See who is at level, who is climbing and where the gaps sit, per person and across the team.",
    shot: "/landing/skills-matrix.png",
    alt: "Skills matrix showing competency assessments and gap analysis",
  },
]

const GRID = [
  {
    title: "Free, forever",
    body: "No per-seat pricing and no trial that runs out. Your data, your tool.",
  },
  {
    title: "Weekly summary",
    body: "One click turns the week's data into a status update you can paste into Slack or send to your skip-level.",
  },
  {
    title: "Bring your own key",
    body: "Point Caliber at your own API key and it drafts reviews, preps 1:1s and pulls action items out of meeting notes. You pay pennies a month.",
  },
  {
    title: "Calendar view",
    body: "Tasks, deadlines and meetings on one month grid, so what is coming is visible without leaving.",
  },
  {
    title: "Follow-up engine",
    body: "Every commitment you make is tracked. The ones ageing quietly get surfaced before your team notices you forgot.",
  },
  {
    title: "Nobody else logs in",
    body: "Your team never sees Caliber. It is a private instrument, not a process you have to roll out.",
  },
]

export default function LandingPage() {
  // The rule draws itself once, on load. Held behind a state flag rather than
  // a keyframe animation so every pin travels out from the same origin.
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setArmed(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const seen = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add("is-in")
          seen.unobserve(entry.target)
        })
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    )
    document.querySelectorAll(".rise").forEach((node) => seen.observe(node))
    return () => seen.disconnect()
  }, [])

  const hottest = RADAR[RADAR.length - 1]

  return (
    <div className={mono.variable}>
      <style>{`
        /* Tokens.
           Near black, hairlines, one accent. The accent is Caliber's own
           primary rather than anything borrowed, so the landing page and the
           product agree with each other. */
        .lp {
          --ink:      #08090a;
          --raise:    #0e0f12;
          --line:     rgba(255,255,255,0.07);
          --line-2:   rgba(255,255,255,0.13);
          --fg:       #f7f8f8;
          --fg-2:     #8a8f98;
          --fg-3:     #5c6068;
          --iris:     #aea6fd;
          --iris-dim: rgba(174,166,253,0.11);

          --measure: 1080px;
          --measure-wide: 1280px;
          --pad: 24px;

          background: var(--ink);
          color: var(--fg);
          font-family: var(--font-inter), system-ui, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
        .lp h1, .lp h2, .lp h3, .lp h4, .lp p, .lp figure { margin: 0; }

        .wrap { max-width: var(--measure); margin: 0 auto; padding: 0 var(--pad); }
        .wrap-wide { max-width: var(--measure-wide); margin: 0 auto; padding: 0 var(--pad); }

        /* Tight, low-contrast display setting. The size does the shouting,
           never the weight and never a gradient. */
        .lp h1, .lp h2, .lp h3 {
          font-weight: 590;
          letter-spacing: -0.035em;
          line-height: 1.06;
        }

        .eyebrow {
          font-family: var(--f-mono), ui-monospace, monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--fg-3);
        }

        .lp a { color: inherit; text-decoration: none; }
        .lp a:focus-visible {
          outline: 2px solid var(--iris);
          outline-offset: 3px;
          border-radius: 4px;
        }

        /* Nav */
        .nav {
          position: sticky; top: 0; z-index: 50;
          height: 56px;
          border-bottom: 1px solid var(--line);
          background: rgba(8,9,10,0.72);
          backdrop-filter: blur(12px);
        }
        .nav-in {
          max-width: var(--measure); margin: 0 auto; padding: 0 var(--pad);
          height: 100%; display: flex; align-items: center; gap: 32px;
        }
        .nav-mark { display: flex; align-items: center; gap: 9px; font-weight: 560; letter-spacing: -0.02em; }
        .nav-mark img { height: 26px; width: auto; }
        .nav-links { display: flex; gap: 26px; }
        .nav-links a { font-size: 14px; color: var(--fg-2); transition: color .15s; }
        .nav-links a:hover { color: var(--fg); }
        .nav-end { margin-left: auto; display: flex; align-items: center; gap: 14px; }

        /* Every button rule is scoped to .lp so it outranks the .lp a rule
           above, which would otherwise force colour: inherit and draw the
           solid button white on white. */
        .lp .btn {
          display: inline-flex; align-items: center; justify-content: center;
          height: 34px; padding: 0 15px; border-radius: 7px;
          font-size: 14px; font-weight: 500; letter-spacing: -0.01em;
          border: 1px solid transparent; white-space: nowrap;
          transition: background .15s, border-color .15s, color .15s;
        }
        .lp .btn-quiet { color: var(--fg-2); }
        .lp .btn-quiet:hover { color: var(--fg); }
        .lp .btn-solid { background: var(--fg); color: #08090a; }
        .lp .btn-solid:hover { background: #ffffff; }
        .lp .btn-line { border-color: var(--line-2); color: var(--fg); }
        .lp .btn-line:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.22); }
        .lp .btn-lg { height: 42px; padding: 0 20px; font-size: 15px; border-radius: 8px; }

        /* Hero */
        .hero { position: relative; padding: 108px 0 0; text-align: center; }
        /* One soft light source, well behind everything. There is no second glow. */
        .hero::before {
          content: ""; position: absolute; inset: -20% 0 auto 50%;
          width: 900px; height: 620px; transform: translateX(-50%);
          background: radial-gradient(50% 50% at 50% 50%, rgba(174,166,253,0.13), transparent 72%);
          pointer-events: none;
        }
        .hero > * { position: relative; }
        .hero h1 {
          margin: 22px auto 0;
          max-width: 15ch;
          font-size: clamp(2.6rem, 6.4vw, 4.35rem);
        }
        .hero-sub {
          margin: 20px auto 0; max-width: 46ch; text-wrap: balance;
          font-size: 17px; color: var(--fg-2); letter-spacing: -0.01em;
        }
        .hero-acts { margin-top: 30px; display: flex; gap: 11px; justify-content: center; flex-wrap: wrap; }

        /* The rule.
           The signature. A caliper scale with the team set along it by
           attention score, drawn once on load. It is the People Radar with
           the table taken away. */
        .rule { margin: 64px auto 0; max-width: 820px; text-align: left; }
        .rule-head {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 16px; margin-bottom: 34px;
        }
        .rule-when { font-family: var(--f-mono), monospace; font-size: 11px; color: var(--fg-3); }

        .scale { position: relative; height: 124px; }
        .scale-line { position: absolute; left: 0; right: 0; top: 84px; height: 1px; background: var(--line-2); }
        .grad { position: absolute; top: 84px; width: 1px; }
        .grad.major { height: 9px; background: var(--line-2); }
        .grad.minor { height: 5px; background: var(--line); }
        .scale-end {
          position: absolute; top: 100px;
          font-family: var(--f-mono), monospace; font-size: 10px; color: var(--fg-3);
        }

        .pin {
          position: absolute; top: 8px;
          transform: translateX(-50%);
          text-align: center;
          transition: left .9s cubic-bezier(.22,1,.36,1), opacity .5s ease;
          opacity: 0;
        }
        .pin.set { opacity: 1; }
        .pin-name { font-size: 13px; font-weight: 500; letter-spacing: -0.01em; white-space: nowrap; color: var(--fg-2); }
        .pin-score { font-family: var(--f-mono), monospace; font-size: 11px; color: var(--fg-3); }
        .pin-stem { width: 1px; height: 22px; margin: 6px auto 0; background: var(--line-2); }
        /* Only the person at the top of the scale is drawn in the accent.
           Highlight everyone and you have highlighted nobody. */
        .pin.hot .pin-name { color: var(--fg); }
        .pin.hot .pin-score { color: var(--iris); }
        .pin.hot .pin-stem { background: linear-gradient(to bottom, var(--iris), var(--line-2)); }

        .verdict {
          margin-top: 28px; display: inline-flex; align-items: center; gap: 10px;
          padding: 9px 14px; border: 1px solid var(--line); border-radius: 8px;
          background: var(--raise); font-size: 13.5px; color: var(--fg-2);
        }
        .verdict b { color: var(--fg); font-weight: 560; }
        .verdict i {
          width: 5px; height: 5px; border-radius: 50%; background: var(--iris);
          box-shadow: 0 0 0 3px var(--iris-dim); flex: none;
        }

        /* Framed screenshots */
        .frame {
          border: 1px solid var(--line); border-radius: 11px;
          background: var(--raise); overflow: hidden;
        }
        .frame img { display: block; width: 100%; height: auto; }

        .hero-shot { margin: 88px auto 0; max-width: var(--measure-wide); padding: 0 var(--pad); }
        .hero-shot .frame { box-shadow: 0 40px 90px -40px rgba(0,0,0,0.9); }

        /* Sections */
        .band { padding: 116px 0; }
        .hr { height: 1px; background: var(--line); border: 0; margin: 0; }

        .band-head { max-width: 46ch; }
        .band-head h2 { margin-top: 18px; font-size: clamp(1.9rem, 3.6vw, 2.6rem); }
        .band-head p { margin-top: 16px; color: var(--fg-2); font-size: 16.5px; }

        /* Feature rows */
        .rows { margin-top: 72px; display: flex; flex-direction: column; gap: 112px; }
        .row-copy { max-width: 58ch; margin-bottom: 30px; }
        .row-copy h3 { margin-top: 16px; font-size: 1.75rem; }
        .row-copy p { margin-top: 14px; color: var(--fg-2); font-size: 16px; }
        /* The label sits on the same tick mark used on the rule above. Same
           instrument, read at a different scale. */
        .row-label { display: flex; align-items: center; gap: 10px; }
        .row-label::before { content: ""; width: 14px; height: 1px; background: var(--iris); flex: none; }

        /* Grid. One hairline does the work of twelve borders. */
        .cells {
          margin-top: 62px;
          display: grid; grid-template-columns: repeat(3, 1fr);
          border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
          background: var(--line); gap: 1px;
        }
        .cell { background: var(--ink); padding: 30px 26px 34px; transition: background .18s; }
        .cell:hover { background: var(--raise); }
        .cell h4 { font-size: 15.5px; font-weight: 560; letter-spacing: -0.015em; }
        .cell p { margin-top: 10px; color: var(--fg-2); font-size: 14px; line-height: 1.62; }

        /* Close */
        .close { padding: 128px 0; text-align: center; }
        .close h2 { font-size: clamp(2rem, 4.4vw, 3rem); max-width: 24ch; margin: 0 auto; text-wrap: balance; }
        .close p { margin: 18px auto 0; max-width: 46ch; color: var(--fg-2); }
        .close-acts { margin-top: 30px; display: flex; gap: 11px; justify-content: center; flex-wrap: wrap; }

        .foot { border-top: 1px solid var(--line); padding: 30px 0 44px; }
        .foot-in { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .foot-mark { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--fg-3); }
        .foot-mark img { height: 18px; width: auto; opacity: .5; }
        .foot-links { margin-left: auto; display: flex; gap: 22px; font-size: 13px; color: var(--fg-3); }
        .foot-links a:hover { color: var(--fg-2); }

        /* Reveal */
        .rise { opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1); }
        .rise.is-in { opacity: 1; transform: none; }

        @media (max-width: 860px) {
          .nav-links { display: none; }
          .rows { gap: 76px; }
          .cells { grid-template-columns: 1fr; }
          .band { padding: 84px 0; }
          .hero { padding-top: 72px; }
          .rule { margin-top: 60px; }
          .pin-name { font-size: 11.5px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp *, .lp *::before, .lp *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
          }
          .rise { opacity: 1; transform: none; }
        }
      `}</style>

      <div className="lp">
        <nav className="nav">
          <div className="nav-in">
            <a href="#top" className="nav-mark" aria-label="Caliber, back to top">
              <img src="/logo_transparent.png" alt="" />
            </a>
            <div className="nav-links">
              <a href="#work">How it works</a>
              <a href="#built">What you get</a>
            </div>
            <div className="nav-end">
              <Link href="/login" className="btn btn-quiet">Log in</Link>
              <Link href="/login" className="btn btn-solid">Get started</Link>
            </div>
          </div>
        </nav>

        <header className="hero" id="top">
          <div className="wrap">
            <p className="eyebrow">Engineering management, measured</p>
            <h1>Know who needs you before they ask</h1>
            <p className="hero-sub">
              Caliber scores your team on signals you already generate, so attention goes where
              it is needed rather than where it is loudest.
            </p>
            <div className="hero-acts">
              <Link href="/login" className="btn btn-solid btn-lg">Get started, it is free</Link>
              <a href="#work" className="btn btn-line btn-lg">See how it works</a>
            </div>

            <section className="rule" aria-label="Example attention scale">
              <div className="rule-head">
                <span className="eyebrow">Attention scale</span>
                <span className="rule-when">this week</span>
              </div>

              <div className="scale">
                {Array.from({ length: 21 }, (_, tick) => (
                  <span
                    key={tick}
                    className={`grad ${tick % 5 === 0 ? "major" : "minor"}`}
                    style={{ left: `${tick * 5}%` }}
                  />
                ))}
                <span className="scale-line" />
                <span className="scale-end" style={{ left: 0 }}>0</span>
                <span className="scale-end" style={{ right: 0 }}>100</span>

                {RADAR.map((person, index) => (
                  <div
                    key={person.name}
                    className={`pin${armed ? " set" : ""}${person === hottest ? " hot" : ""}`}
                    style={{
                      left: armed ? `${person.score}%` : "0%",
                      transitionDelay: `${140 + index * 90}ms`,
                    }}
                  >
                    <div className="pin-name">{person.name}</div>
                    <div className="pin-score">{person.score}</div>
                    <div className="pin-stem" />
                  </div>
                ))}
              </div>

              <p className="verdict">
                <i />
                <span><b>{hottest.name}</b> is top of the scale. No 1:1 in five weeks.</span>
              </p>
            </section>
          </div>

          <div className="hero-shot rise">
            <figure className="frame">
              <img src="/landing/dashboard.png" alt="Caliber dashboard showing meetings, tasks due and the month view" />
            </figure>
          </div>
        </header>

        <section className="band" id="work">
          <div className="wrap">
            <div className="band-head">
              <p className="eyebrow">How it works</p>
              <h2>Five surfaces, one week</h2>
              <p>
                Caliber is not a place to file things. Each surface answers a question you already
                ask yourself somewhere between Monday and Friday.
              </p>
            </div>
          </div>

          <div className="wrap-wide">
            <div className="rows">
              {FEATURES.map((feature) => (
                <article className="row rise" key={feature.label}>
                  <div className="row-copy">
                    <p className="eyebrow row-label">{feature.label}</p>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </div>
                  <figure className="frame">
                    <img src={feature.shot} alt={feature.alt} />
                  </figure>
                </article>
              ))}
            </div>
          </div>
        </section>

        <hr className="hr" />

        <section className="band" id="built">
          <div className="wrap">
            <div className="band-head">
              <p className="eyebrow">What you get</p>
              <h2>A private instrument, not a rollout</h2>
              <p>
                Nothing here needs your team to adopt it, your director to approve it, or a
                procurement conversation to happen first.
              </p>
            </div>

            <div className="cells rise">
              {GRID.map((cell) => (
                <div className="cell" key={cell.title}>
                  <h4>{cell.title}</h4>
                  <p>{cell.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="hr" />

        <section className="close">
          <div className="wrap">
            <h2>Set it up before your next 1:1</h2>
            <p>Two minutes, no card, no rollout. Add your team and the scale fills itself in.</p>
            <div className="close-acts">
              <Link href="/login" className="btn btn-solid btn-lg">Get started, it is free</Link>
              <Link href="/login" className="btn btn-line btn-lg">Log in</Link>
            </div>
          </div>
        </section>

        <footer className="foot">
          <div className="wrap foot-in">
            <span className="foot-mark">
              <img src="/logo_transparent.png" alt="" />
              © 2026
            </span>
            <div className="foot-links">
              <Link href="/login">Log in</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <a href="https://github.com/shiphrahx/Caliber">GitHub</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
