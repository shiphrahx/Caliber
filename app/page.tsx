import type { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Cadence — The OS for Engineering Managers",
  description:
    "The operating system for engineering managers. Track tasks, monitor your team, log evidence, and never let a 1:1 slip through the cracks.",
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #111111;
          --bg-2: #161616;
          --bg-3: #1c1c1c;
          --bg-4: #212121;
          --border: #262626;
          --border-2: #303030;
          --t1: #f0f0f0;
          --t2: #888;
          --t3: #555;
          --grad: linear-gradient(90deg, #00ffe5 0%, #00f058 100%);
          --grad-text: linear-gradient(90deg, #00ffe5 0%, #00f058 100%);
          --cyan: #00ffe5;
          --green: #00f058;
          --display: 'Syne', sans-serif;
          --body: 'DM Sans', sans-serif;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--bg);
          color: var(--t1);
          font-family: var(--body);
          font-size: 15px;
          line-height: 1.6;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.5;
        }

        nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 0 40px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(17,17,17,0.85);
          backdrop-filter: blur(20px);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .nav-logo-mark {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: var(--grad);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-logo-name {
          font-family: var(--display);
          font-size: 16px;
          font-weight: 600;
          color: var(--t1);
          letter-spacing: -0.02em;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
          list-style: none;
        }

        .nav-links a {
          color: var(--t2);
          text-decoration: none;
          font-size: 14px;
          font-weight: 400;
          transition: color 0.15s;
        }

        .nav-links a:hover { color: var(--t1); }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-login {
          padding: 7px 16px;
          background: transparent;
          border: 1px solid var(--border-2);
          color: var(--t2);
          border-radius: 6px;
          font-size: 13px;
          font-family: var(--body);
          cursor: pointer;
          text-decoration: none;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
        }

        .btn-login:hover { color: var(--t1); border-color: #444; }

        .btn-signup {
          padding: 7px 16px;
          background: var(--grad);
          border: none;
          color: #061a0a;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          font-family: var(--body);
          cursor: pointer;
          text-decoration: none;
          transition: opacity 0.15s;
          display: inline-flex;
          align-items: center;
        }

        .btn-signup:hover { opacity: 0.88; }

        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 120px 40px 80px;
          text-align: center;
          overflow: hidden;
        }

        .hero::after {
          content: '';
          position: absolute;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse at center, rgba(0,240,88,0.08) 0%, rgba(0,255,229,0.04) 40%, transparent 70%);
          pointer-events: none;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px 5px 6px;
          background: rgba(0,240,88,0.06);
          border: 1px solid rgba(0,240,88,0.2);
          border-radius: 100px;
          font-size: 12px;
          color: #00f058;
          margin-bottom: 32px;
          animation: fadeUp 0.6s ease both;
        }

        .hero-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--grad);
          animation: pulse 2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }

        .hero-title {
          font-family: var(--display);
          font-size: clamp(48px, 7vw, 88px);
          font-weight: 800;
          line-height: 1.0;
          letter-spacing: -0.035em;
          color: var(--t1);
          max-width: 820px;
          margin-bottom: 24px;
          animation: fadeUp 0.6s ease 0.1s both;
        }

        .hero-title span {
          background: var(--grad-text);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          font-size: 18px;
          font-weight: 300;
          color: var(--t2);
          max-width: 520px;
          line-height: 1.65;
          margin-bottom: 40px;
          animation: fadeUp 0.6s ease 0.2s both;
        }

        .hero-cta {
          display: flex;
          align-items: center;
          gap: 12px;
          animation: fadeUp 0.6s ease 0.3s both;
        }

        .btn-hero-primary {
          padding: 12px 24px;
          background: var(--grad);
          border: none;
          color: #061a0a;
          border-radius: 7px;
          font-size: 14px;
          font-weight: 700;
          font-family: var(--body);
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.15s, transform 0.15s;
        }

        .btn-hero-primary:hover { opacity: 0.88; transform: translateY(-1px); }

        .btn-hero-secondary {
          padding: 12px 24px;
          background: transparent;
          border: 1px solid var(--border-2);
          color: var(--t2);
          border-radius: 7px;
          font-size: 14px;
          font-family: var(--body);
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }

        .btn-hero-secondary:hover { color: var(--t1); border-color: #444; }

        .hero-meta {
          margin-top: 20px;
          font-size: 12px;
          color: var(--t3);
          animation: fadeUp 0.6s ease 0.4s both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero-screenshot {
          position: relative;
          margin-top: 64px;
          width: 100%;
          max-width: 1100px;
          animation: fadeUp 0.8s ease 0.5s both;
        }

        .screenshot-frame {
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,240,88,0.05);
        }

        .screenshot-bar {
          padding: 12px 16px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot-r { background: #ff5f57; }
        .dot-y { background: #febc2e; }
        .dot-g { background: #28c840; }

        .screenshot-url {
          flex: 1;
          text-align: center;
          font-size: 11px;
          color: var(--t3);
          font-family: monospace;
        }

        .app-mockup {
          display: flex;
          height: 520px;
          overflow: hidden;
        }

        .mock-sidebar {
          width: 180px;
          flex-shrink: 0;
          background: #1a1a1a;
          border-right: 1px solid var(--border);
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .mock-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .mock-logo-mark {
          width: 22px;
          height: 22px;
          border-radius: 5px;
          background: var(--grad);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: #061a0a;
        }

        .mock-logo-name {
          font-family: var(--display);
          font-size: 13px;
          font-weight: 600;
          color: var(--t1);
        }

        .mock-nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 7px;
          border-radius: 4px;
          color: #666;
          font-size: 11px;
        }

        .mock-nav-item.active {
          background: #272727;
          color: var(--t1);
          border-right: 2px solid #00f058;
        }

        .mock-nav-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }

        .mock-main {
          flex: 1;
          background: #171717;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .mock-topbar {
          height: 40px;
          padding: 0 16px;
          background: #1a1a1a;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .mock-title { font-size: 12px; font-weight: 500; color: var(--t1); }

        .mock-btn {
          padding: 4px 10px;
          background: var(--grad);
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          color: #061a0a;
        }

        .mock-content {
          flex: 1;
          padding: 14px;
          overflow: hidden;
        }

        .mock-section-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #444;
          margin-bottom: 10px;
        }

        .mock-kanban {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .mock-col {
          background: #1c1c1c;
          border: 1px solid #262626;
          border-radius: 6px;
          overflow: hidden;
        }

        .mock-col-hdr {
          padding: 7px 9px;
          border-bottom: 1px solid #262626;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 9px;
          font-weight: 500;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .mock-col-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

        .mock-card {
          margin: 5px;
          background: #202020;
          border: 1px solid #2a2a2a;
          border-left: 2.5px solid;
          border-radius: 4px;
          padding: 7px 8px;
        }

        .mock-card-name {
          font-size: 10px;
          color: #d0d0d0;
          margin-bottom: 5px;
          line-height: 1.3;
        }

        .mock-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mock-pri {
          font-size: 8px;
          font-family: monospace;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .mock-date { font-size: 8px; color: #444; font-family: monospace; }

        .logos-section {
          padding: 40px 40px;
          text-align: center;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .logos-label {
          font-size: 12px;
          color: var(--t3);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 28px;
        }

        .logos-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 48px;
          flex-wrap: wrap;
          opacity: 0.35;
        }

        .logo-wordmark {
          font-family: var(--display);
          font-size: 18px;
          font-weight: 700;
          color: var(--t1);
          letter-spacing: -0.02em;
        }

        .features-section {
          padding: 100px 40px;
          max-width: 1160px;
          margin: 0 auto;
        }

        .section-eyebrow {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #00f058;
          margin-bottom: 14px;
        }

        .section-title {
          font-family: var(--display);
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--t1);
          line-height: 1.1;
          margin-bottom: 16px;
        }

        .section-sub {
          font-size: 16px;
          font-weight: 300;
          color: var(--t2);
          max-width: 480px;
          line-height: 1.65;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          margin-top: 64px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .feature-card {
          background: var(--bg);
          padding: 36px 32px;
          transition: background 0.2s;
        }

        .feature-card:hover { background: var(--bg-2); }

        .feature-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(0,240,88,0.08);
          border: 1px solid rgba(0,240,88,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .feature-icon svg { width: 16px; height: 16px; }

        .feature-title {
          font-family: var(--display);
          font-size: 17px;
          font-weight: 600;
          color: var(--t1);
          letter-spacing: -0.02em;
          margin-bottom: 10px;
        }

        .feature-desc {
          font-size: 14px;
          font-weight: 300;
          color: var(--t2);
          line-height: 1.65;
        }

        .bento-section {
          padding: 0 40px 100px;
          max-width: 1160px;
          margin: 0 auto;
        }

        .bento-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 12px;
        }

        .bento-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }

        .bento-card.wide { grid-column: 1 / -1; }

        .bento-card-content {
          padding: 32px;
        }

        .bento-label {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #00f058;
          margin-bottom: 10px;
        }

        .bento-title {
          font-family: var(--display);
          font-size: 22px;
          font-weight: 700;
          color: var(--t1);
          letter-spacing: -0.02em;
          margin-bottom: 10px;
          line-height: 1.2;
        }

        .bento-desc {
          font-size: 14px;
          font-weight: 300;
          color: var(--t2);
          line-height: 1.6;
          max-width: 360px;
        }

        .bento-visual {
          padding: 0 32px 0;
          overflow: hidden;
        }

        .radar-preview {
          background: #161616;
          border: 1px solid var(--border);
          border-radius: 8px 8px 0 0;
          overflow: hidden;
          margin-top: 20px;
        }

        .radar-hdr {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          font-size: 10px;
          color: #555;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .radar-person {
          padding: 12px 14px;
          border-bottom: 1px solid #1e1e1e;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .radar-av {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #242424;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 600;
          color: #888;
          flex-shrink: 0;
        }

        .radar-info { flex: 1 }
        .radar-name { font-size: 11px; font-weight: 500; color: #d0d0d0; margin-bottom: 3px; }
        .radar-signals { font-size: 9px; color: #555; }

        .radar-badge {
          padding: 2px 7px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .rb-critical { background: rgba(220,60,60,0.15); color: #e05555; }
        .rb-warning { background: rgba(200,130,30,0.15); color: #c9a227; }
        .rb-ok { background: rgba(0,195,74,0.12); color: #00c44a; }

        .evidence-preview {
          background: #161616;
          border: 1px solid var(--border);
          border-radius: 8px 8px 0 0;
          overflow: hidden;
          margin-top: 20px;
        }

        .ev-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid #1e1e1e;
        }

        .ev-cat {
          padding: 2px 7px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .ec-growth { background: rgba(0,195,74,0.12); color: #00c44a; }
        .ec-achieve { background: rgba(0,150,255,0.12); color: #5b9bd5; }
        .ec-promo { background: rgba(200,130,30,0.12); color: #c9a227; }
        .ec-concern { background: rgba(220,60,60,0.12); color: #e05555; }
        .ec-feedback { background: rgba(160,80,230,0.12); color: #b06cf8; }

        .ev-body { flex: 1 }
        .ev-title { font-size: 11px; color: #ccc; margin-bottom: 2px; }
        .ev-sub { font-size: 9px; color: #444; }
        .ev-person { font-size: 10px; color: #666; white-space: nowrap; flex-shrink: 0; }

        .review-preview {
          background: #161616;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          margin-top: 20px;
        }

        .review-hdr {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .review-title-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .rt { font-size: 13px; font-weight: 600; color: var(--t1); font-family: var(--display); }
        .rd { font-size: 10px; color: #555; }

        .review-progress { height: 2px; background: #222; margin: 0; }
        .review-progress-fill { height: 100%; width: 28%; background: var(--grad); border-radius: 1px; }

        .review-item {
          padding: 10px 14px;
          border-bottom: 1px solid #1e1e1e;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .ri-left { display: flex; align-items: flex-start; gap: 8px; }
        .ri-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
        .ri-dot-red { background: #e05555; }
        .ri-dot-blue { background: #5b9bd5; }
        .ri-name { font-size: 11px; font-weight: 500; color: #888; margin-bottom: 1px; }
        .ri-desc { font-size: 9px; color: #444; }

        .ri-actions { display: flex; gap: 5px; }
        .ri-btn {
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-family: var(--body);
        }

        .rb-grad { background: var(--grad); color: #061a0a; }
        .rb-ghost { background: transparent; border: 1px solid #303030; color: #666; }

        .testimonials-section {
          padding: 100px 40px;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .testimonials-inner { max-width: 680px; margin: 0 auto; }

        blockquote {
          font-family: var(--display);
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 500;
          letter-spacing: -0.02em;
          color: var(--t1);
          line-height: 1.4;
          margin-bottom: 28px;
        }

        blockquote span {
          background: var(--grad-text);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .quote-author {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .quote-av {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--grad);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #061a0a;
        }

        .quote-name { font-size: 14px; font-weight: 500; color: var(--t1); }
        .quote-role { font-size: 13px; color: var(--t3); }

        .cta-section {
          padding: 100px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-section::before {
          content: '';
          position: absolute;
          bottom: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          height: 300px;
          background: radial-gradient(ellipse, rgba(0,240,88,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .cta-inner { max-width: 600px; margin: 0 auto; }

        .cta-title {
          font-family: var(--display);
          font-size: clamp(36px, 5vw, 60px);
          font-weight: 800;
          letter-spacing: -0.035em;
          color: var(--t1);
          line-height: 1.0;
          margin-bottom: 20px;
        }

        .cta-title span {
          background: var(--grad-text);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .cta-sub {
          font-size: 16px;
          font-weight: 300;
          color: var(--t2);
          margin-bottom: 36px;
          line-height: 1.6;
        }

        .cta-actions { display: flex; gap: 12px; align-items: center; justify-content: center; }
        .cta-note { margin-top: 14px; font-size: 12px; color: var(--t3); }

        footer {
          border-top: 1px solid var(--border);
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }

        .footer-logo-mark {
          width: 20px;
          height: 20px;
          border-radius: 5px;
          background: var(--grad);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .footer-logo-name {
          font-family: var(--display);
          font-size: 14px;
          font-weight: 600;
          color: var(--t2);
        }

        .footer-links { display: flex; gap: 28px; list-style: none; }

        .footer-links a {
          font-size: 13px;
          color: var(--t3);
          text-decoration: none;
          transition: color 0.15s;
        }

        .footer-links a:hover { color: var(--t2); }
        .footer-copy { font-size: 12px; color: var(--t3); }

        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .reveal.visible { opacity: 1; transform: translateY(0); }

        section { position: relative; z-index: 1; }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">
          <div className="nav-logo-mark">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4L12 3" stroke="#061a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="nav-logo-name">Cadence</span>
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#people">People</a></li>
          <li><a href="#reviews">Reviews</a></li>
          <li><a href="#">Pricing</a></li>
          <li><a href="#">Docs</a></li>
        </ul>
        <div className="nav-actions">
          <a href="/login" className="btn-login">Log in</a>
          <a href="/login" className="btn-signup">Get started free</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          Built for engineering managers
        </div>
        <h1 className="hero-title">Your team runs on<br /><span>Cadence</span></h1>
        <p className="hero-sub">The operating system for engineering managers. Track tasks, monitor your team, log evidence, and never let a 1:1 slip through the cracks.</p>
        <div className="hero-cta">
          <a href="/login" className="btn-hero-primary">
            Start for free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <a href="/login" className="btn-hero-secondary">Log in to your workspace</a>
        </div>
        <p className="hero-meta">No credit card required &nbsp;·&nbsp; Free for up to 5 direct reports</p>

        <div className="hero-screenshot">
          <div className="screenshot-frame">
            <div className="screenshot-bar">
              <div className="dot dot-r"></div>
              <div className="dot dot-y"></div>
              <div className="dot dot-g"></div>
              <div className="screenshot-url">app.cadence.so/tasks</div>
            </div>
            <div className="app-mockup">
              <div className="mock-sidebar">
                <div className="mock-logo">
                  <div className="mock-logo-mark">✓</div>
                  <span className="mock-logo-name">Cadence</span>
                </div>
                <div className="mock-nav-item"><span className="mock-nav-dot"></span>Dashboard</div>
                <div className="mock-nav-item active"><span className="mock-nav-dot" style={{background:"#00f058"}}></span>Tasks</div>
                <div className="mock-nav-item"><span className="mock-nav-dot"></span>Teams</div>
                <div className="mock-nav-item"><span className="mock-nav-dot"></span>People</div>
                <div className="mock-nav-item"><span className="mock-nav-dot"></span>Meetings</div>
                <div className="mock-nav-item"><span className="mock-nav-dot"></span>Evidence</div>
                <div className="mock-nav-item"><span className="mock-nav-dot"></span>Follow-ups</div>
                <div className="mock-nav-item"><span className="mock-nav-dot"></span>Weekly Review</div>
                <div style={{marginTop:"auto",paddingTop:"10px",borderTop:"1px solid #262626",display:"flex",alignItems:"center",gap:"7px"}}>
                  <div style={{width:"22px",height:"22px",borderRadius:"50%",background:"linear-gradient(90deg,#00ffe5,#00f058)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:700,color:"#061a0a"}}>LS</div>
                  <div style={{fontSize:"10px",color:"#666"}}>Lisa Shiphrah</div>
                </div>
              </div>
              <div className="mock-main">
                <div className="mock-topbar">
                  <span className="mock-title">Tasks</span>
                  <div className="mock-btn">+ New task</div>
                </div>
                <div className="mock-content">
                  <div className="mock-section-label">This week</div>
                  <div className="mock-kanban">
                    <div className="mock-col">
                      <div className="mock-col-hdr"><div className="mock-col-dot" style={{background:"#444"}}></div>Not started <span style={{marginLeft:"auto",color:"#444"}}>4</span></div>
                      <div className="mock-card" style={{borderLeftColor:"#818cf8"}}>
                        <div className="mock-card-name">Write Q2 team update</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#0a0b1a",color:"#818cf8"}}>Low</span><span className="mock-date">9 May</span></div>
                      </div>
                      <div className="mock-card" style={{borderLeftColor:"#c9a227"}}>
                        <div className="mock-card-name">Review Alice&apos;s PR</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#1a1200",color:"#c9a227"}}>Medium</span><span className="mock-date">6 May</span></div>
                      </div>
                      <div className="mock-card" style={{borderLeftColor:"#e04040"}}>
                        <div className="mock-card-name">Resolve prod incident RCA</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#1a0606",color:"#e04040"}}>Very high</span><span className="mock-date">Today</span></div>
                      </div>
                    </div>
                    <div className="mock-col">
                      <div className="mock-col-hdr"><div className="mock-col-dot" style={{background:"#3b82f6"}}></div>In progress <span style={{marginLeft:"auto",color:"#444"}}>4</span></div>
                      <div className="mock-card" style={{borderLeftColor:"#818cf8"}}>
                        <div className="mock-card-name">Update team handbook</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#0a0b1a",color:"#818cf8"}}>Low</span><span className="mock-date">11 May</span></div>
                      </div>
                      <div className="mock-card" style={{borderLeftColor:"#e07030"}}>
                        <div className="mock-card-name">Unblock data pipeline issue</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#1e0d00",color:"#e07030"}}>High</span><span className="mock-date">Tomorrow</span></div>
                      </div>
                      <div className="mock-card" style={{borderLeftColor:"#e04040"}}>
                        <div className="mock-card-name">Performance review for Carol</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#1a0606",color:"#e04040"}}>Very high</span><span className="mock-date">6 May</span></div>
                      </div>
                    </div>
                    <div className="mock-col">
                      <div className="mock-col-hdr"><div className="mock-col-dot" style={{background:"#ea580c"}}></div>Blocked <span style={{marginLeft:"auto",color:"#444"}}>4</span></div>
                      <div className="mock-card" style={{borderLeftColor:"#c9a227"}}>
                        <div className="mock-card-name">Finalise headcount request</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#1a1200",color:"#c9a227"}}>Medium</span><span className="mock-date">8 May</span></div>
                      </div>
                      <div className="mock-card" style={{borderLeftColor:"#e07030"}}>
                        <div className="mock-card-name">Deploy new auth service</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#1e0d00",color:"#e07030"}}>High</span><span className="mock-date">Tomorrow</span></div>
                      </div>
                    </div>
                    <div className="mock-col">
                      <div className="mock-col-hdr"><div className="mock-col-dot" style={{background:"#00f058"}}></div>Done <span style={{marginLeft:"auto",color:"#444"}}>6</span></div>
                      <div className="mock-card" style={{borderLeftColor:"#818cf8",opacity:0.45}}>
                        <div className="mock-card-name" style={{textDecoration:"line-through",color:"#555"}}>Send meeting notes from retro</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#0a0b1a",color:"#818cf8"}}>Low</span><span className="mock-date">3 May</span></div>
                      </div>
                      <div className="mock-card" style={{borderLeftColor:"#e04040",opacity:0.45}}>
                        <div className="mock-card-name" style={{textDecoration:"line-through",color:"#555"}}>Resolve P0 auth outage</div>
                        <div className="mock-card-meta"><span className="mock-pri" style={{background:"#1a0606",color:"#e04040"}}>Very high</span><span className="mock-date">1 May</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="mock-section-label">Backlog</div>
                  <div style={{background:"#1c1c1c",border:"1px solid #262626",borderRadius:"5px",overflow:"hidden"}}>
                    <div style={{display:"flex",padding:"5px 10px",borderBottom:"1px solid #222",gap:"10px",alignItems:"center"}}>
                      <span style={{fontSize:"9px",color:"#444",width:"28px"}}>⇿</span>
                      <span style={{fontSize:"10px",color:"#aaa",flex:1}}>Set up E2E test suite</span>
                      <span style={{fontSize:"8px",padding:"1px 6px",borderRadius:"2px",background:"#1e1e1e",color:"#888"}}>Not started</span>
                      <span style={{fontSize:"9px",color:"#444",fontFamily:"monospace",width:"80px"}}>14 May 2026</span>
                      <span style={{fontSize:"8px",padding:"1px 5px",borderRadius:"2px",background:"#1a0606",color:"#e04040"}}>Very High</span>
                    </div>
                    <div style={{display:"flex",padding:"5px 10px",gap:"10px",alignItems:"center"}}>
                      <span style={{fontSize:"9px",color:"#444",width:"28px"}}>⇿</span>
                      <span style={{fontSize:"10px",color:"#aaa",flex:1}}>Define promotion criteria doc</span>
                      <span style={{fontSize:"8px",padding:"1px 6px",borderRadius:"2px",background:"#0a1a2e",color:"#5b9bd5"}}>In progress</span>
                      <span style={{fontSize:"9px",color:"#444",fontFamily:"monospace",width:"80px"}}>18 May 2026</span>
                      <span style={{fontSize:"8px",padding:"1px 5px",borderRadius:"2px",background:"#1e0d00",color:"#e07030"}}>High</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGOS */}
      <section className="logos-section">
        <p className="logos-label">Trusted by engineering leaders at</p>
        <div className="logos-row">
          <span className="logo-wordmark">Vercel</span>
          <span className="logo-wordmark">Stripe</span>
          <span className="logo-wordmark">Notion</span>
          <span className="logo-wordmark">Figma</span>
          <span className="logo-wordmark">Loom</span>
          <span className="logo-wordmark">Retool</span>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="features-section" id="features">
        <div className="reveal">
          <p className="section-eyebrow">Everything in one place</p>
          <h2 className="section-title">Built around how<br />managers actually work</h2>
          <p className="section-sub">Stop context-switching between six tools. Cadence puts your people, meetings, tasks, and evidence in a single focused workspace.</p>
        </div>
        <div className="features-grid reveal">
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="#00f058" strokeWidth="1.4" strokeLinecap="round"><path d="M2 4h12M2 8h8M2 12h5"/></svg>
            </div>
            <div className="feature-title">Task management</div>
            <p className="feature-desc">Kanban board with priority-coded cards. Low friction to add, move, and close tasks — no ceremony required.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="#00f058" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="5.5" r="3"/><path d="M2 14c0-2.5 2.7-4.5 6-4.5s6 2 6 4.5"/></svg>
            </div>
            <div className="feature-title">People Radar</div>
            <p className="feature-desc">Automatically surfaces who needs attention — missed 1:1s, no meeting notes, evidence gaps — before they become problems.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="#00f058" strokeWidth="1.4" strokeLinecap="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 2v2M11 2v2M2 7h12"/></svg>
            </div>
            <div className="feature-title">Meeting notes</div>
            <p className="feature-desc">Log 1:1s, team syncs, and retros with structured templates. Action items are tracked and never lost between sessions.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="#00f058" strokeWidth="1.4" strokeLinecap="round"><path d="M3 4l5 5 5-7M8 15V9"/></svg>
            </div>
            <div className="feature-title">Evidence Bank</div>
            <p className="feature-desc">Capture observations, achievements, and concerns as they happen. Promotion cycles and performance reviews write themselves.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="#00f058" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
            </div>
            <div className="feature-title">Weekly Review</div>
            <p className="feature-desc">A structured checklist that walks you through your whole team each week. See exactly where you&apos;re behind before it&apos;s too late.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="#00f058" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="1" fill="#00f058" stroke="none"/></svg>
            </div>
            <div className="feature-title">Career Framework</div>
            <p className="feature-desc">Define levels, track skills, and build a shared language for growth. Know where every person is heading and how to get them there.</p>
          </div>
        </div>
      </section>

      {/* BENTO */}
      <section className="bento-section" id="people">
        <div className="bento-grid">
          <div className="bento-card">
            <div className="bento-card-content">
              <div className="bento-label">People Radar</div>
              <div className="bento-title">Know who needs you<br />before they ask</div>
              <p className="bento-desc">Cadence monitors engagement signals across your team and flags gaps automatically — no manual tracking required.</p>
            </div>
            <div className="bento-visual">
              <div className="radar-preview">
                <div className="radar-hdr">
                  <span>People Radar</span>
                  <span>4 persons need attention</span>
                </div>
                <div className="radar-person">
                  <div className="radar-av">EN</div>
                  <div className="radar-info">
                    <div className="radar-name">Eve Nakamura</div>
                    <div className="radar-signals">No 1:1 in 30 days · No evidence in 90 days · Missing meeting notes</div>
                  </div>
                  <div className="radar-badge rb-critical">Critical · 9</div>
                </div>
                <div className="radar-person">
                  <div className="radar-av">DS</div>
                  <div className="radar-info">
                    <div className="radar-name">Dave Singh</div>
                    <div className="radar-signals">No 1:1 in 30 days · Missing meeting notes</div>
                  </div>
                  <div className="radar-badge rb-warning">Warning · 7</div>
                </div>
                <div className="radar-person">
                  <div className="radar-av">GT</div>
                  <div className="radar-info">
                    <div className="radar-name">Grace Torres</div>
                    <div className="radar-signals">All checks passing</div>
                  </div>
                  <div className="radar-badge rb-ok">All clear</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-card-content">
              <div className="bento-label">Evidence Bank</div>
              <div className="bento-title">Never scramble for<br />performance notes again</div>
              <p className="bento-desc">Log observations in seconds. When review season arrives, the evidence is already there — timestamped and categorised.</p>
            </div>
            <div className="bento-visual">
              <div className="evidence-preview">
                <div className="ev-row">
                  <div className="ev-cat ec-achieve">Achievement</div>
                  <div className="ev-body">
                    <div className="ev-title">Delivered auth refactor on time</div>
                    <div className="ev-sub">Carol shipped within the planned sprint despite cross-team deps</div>
                  </div>
                  <div className="ev-person">Carol Mendes</div>
                </div>
                <div className="ev-row">
                  <div className="ev-cat ec-promo">Promotion</div>
                  <div className="ev-body">
                    <div className="ev-title">Tech spec approved by staff eng</div>
                    <div className="ev-sub">Strong signal for senior readiness. Minor revisions only.</div>
                  </div>
                  <div className="ev-person">Bob Okafor</div>
                </div>
                <div className="ev-row">
                  <div className="ev-cat ec-concern">Concern</div>
                  <div className="ev-body">
                    <div className="ev-title">Underestimated complexity twice this sprint</div>
                    <div className="ev-sub">Estimates off by 2x on two stories. Needs coaching.</div>
                  </div>
                  <div className="ev-person">Alice Chen</div>
                </div>
                <div className="ev-row">
                  <div className="ev-cat ec-growth">Growth</div>
                  <div className="ev-body">
                    <div className="ev-title">Proactively asked for stretch assignment</div>
                    <div className="ev-sub">Asked to take on monitoring alerts ticket unprompted</div>
                  </div>
                  <div className="ev-person">Alice Chen</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-card wide">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0"}}>
              <div className="bento-card-content" style={{borderRight:"1px solid var(--border)"}}>
                <div className="bento-label">Weekly Review</div>
                <div className="bento-title">A structured cadence<br />for your whole team</div>
                <p className="bento-desc">Every week, Cadence walks you through a checklist of each direct report — flagging what&apos;s missing and what needs action. Never let someone fall through the cracks again.</p>
                <div style={{marginTop:"20px",display:"flex",gap:"10px"}}>
                  <a href="/login" className="btn-hero-primary" style={{fontSize:"13px",padding:"9px 18px"}}>
                    Start your review
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5h8M6.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                </div>
              </div>
              <div style={{padding:"32px"}}>
                <div className="review-preview">
                  <div className="review-hdr">
                    <div className="review-title-row">
                      <span className="rt">Weekly Review</span>
                      <span className="rd">4 May – 10 May 2026</span>
                    </div>
                    <div style={{padding:"2px 8px",borderRadius:"3px",background:"#0a1a2e",color:"#5b9bd5",fontSize:"10px",fontWeight:500}}>In Progress</div>
                  </div>
                  <div className="review-progress"><div className="review-progress-fill"></div></div>
                  <div className="review-item">
                    <div className="ri-left">
                      <div className="ri-dot ri-dot-red" style={{marginTop:"4px"}}></div>
                      <div>
                        <div className="ri-name">Dave Singh</div>
                        <div className="ri-desc">No 1:1 in the last 30 days</div>
                      </div>
                    </div>
                    <div className="ri-actions">
                      <button className="ri-btn rb-grad">Schedule 1:1</button>
                      <button className="ri-btn rb-ghost">Dismiss</button>
                    </div>
                  </div>
                  <div className="review-item">
                    <div className="ri-left">
                      <div className="ri-dot ri-dot-blue" style={{marginTop:"4px"}}></div>
                      <div>
                        <div className="ri-name">Eve Nakamura</div>
                        <div className="ri-desc">No evidence logged in 90 days</div>
                      </div>
                    </div>
                    <div className="ri-actions">
                      <button className="ri-btn rb-grad">Log evidence</button>
                      <button className="ri-btn rb-ghost">Dismiss</button>
                    </div>
                  </div>
                  <div className="review-item">
                    <div className="ri-left">
                      <div className="ri-dot ri-dot-red" style={{marginTop:"4px"}}></div>
                      <div>
                        <div className="ri-name">Frank Liu</div>
                        <div className="ri-desc">No meeting notes in 21 days</div>
                      </div>
                    </div>
                    <div className="ri-actions">
                      <button className="ri-btn rb-grad">Log note</button>
                      <button className="ri-btn rb-ghost">Dismiss</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="testimonials-section" id="reviews">
        <div className="testimonials-inner reveal">
          <blockquote>&ldquo;Cadence is the first tool that actually maps to how I think about my job. <span>My 1:1s are sharper, my reviews write themselves,</span> and I finally feel in control of my team.&rdquo;</blockquote>
          <div className="quote-author">
            <div className="quote-av">SL</div>
            <div>
              <div className="quote-name">Sarah Lin</div>
              <div className="quote-role">Engineering Manager, Vercel</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner reveal">
          <h2 className="cta-title">Run a tighter<br /><span>ship</span></h2>
          <p className="cta-sub">Join engineering managers who use Cadence to stay on top of their team, their work, and their own development — every single week.</p>
          <div className="cta-actions">
            <a href="/login" className="btn-hero-primary">
              Get started free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <a href="/login" className="btn-hero-secondary">Log in</a>
          </div>
          <p className="cta-note">Free for up to 5 direct reports &nbsp;·&nbsp; No credit card required</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <a href="#" className="footer-logo">
          <div className="footer-logo-mark">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l3 3L9.5 2" stroke="#061a0a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="footer-logo-name">Cadence</span>
        </a>
        <ul className="footer-links">
          <li><a href="#">Features</a></li>
          <li><a href="#">Pricing</a></li>
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
          <li><a href="#">Status</a></li>
        </ul>
        <span className="footer-copy">© 2026 Cadence</span>
      </footer>

      <script dangerouslySetInnerHTML={{__html: `
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('visible');
              observer.unobserve(e.target);
            }
          });
        }, { threshold: 0.12 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
      `}} />
    </>
  )
}
