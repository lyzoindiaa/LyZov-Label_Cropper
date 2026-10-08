import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../gst-tool/gst.css";
import {
  Scissors, FileText, ArrowRight, Zap, ShieldCheck,
  Star, Globe, Layers, CheckCircle2, Sparkles, BookOpen,
  Upload, Download, MousePointer, ChevronDown,
  Package, Clock, Lock, Cpu, Lightbulb, TrendingUp,
  Users, BarChart2, FileCheck, Printer,
} from "lucide-react";

const TOOLS = [
  {
    id: "cropper",
    icon: Scissors,
    name: "LyZov Cropper Studio",
    tagline: "Batch PDF Label Cropper & Thermal Printer",
    description: "Upload any multi-page PDF, draw your crop zone once, and batch-extract hundreds of labels in seconds. Perfect for shipping labels, barcodes, product tags, and any repeated PDF element.",
    accent: "#00c9ff",
    accentDim: "#0096cc",
    glowColor: "rgba(0,201,255,0.22)",
    route: "/cropper",
    badge: "Free · No Signup",
    badgeClass: "gst-badge-blue",
    features: [
      "Drag-and-drop multi-page PDF upload",
      "Visual crop zone — drag to select once",
      "Batch export as ZIP of images or PDF",
      "Thermal printer ready (4x6, 6x4, A4)",
      "100% client-side — files never leave your device",
    ],
    useCases: ["Shipping Labels", "Barcodes", "Product Tags", "Invoices"],
    cta: "Open Cropper Studio",
    status: "Live",
    statusColor: "#00d68f",
  },
  {
    id: "gst",
    icon: FileText,
    name: "GST Tool",
    tagline: "GSTR-1 Return Generator for Online Sellers",
    description: "Upload your Amazon MTR or Flipkart GST report and get a government-compliant GSTR-1 JSON ready to file in minutes. Handles B2B, B2CS, CDNR, HSN, and Table 14 with built-in GSTIN validation and error checking.",
    accent: "#00d68f",
    accentDim: "#00a86b",
    glowColor: "rgba(0,214,143,0.22)",
    route: "/gst-tool",
    badge: "30-Day Free Trial",
    badgeClass: "gst-badge-green",
    features: [
      "Supports Amazon MTR & Flipkart GST reports",
      "Auto-classifies B2B / B2CS / CDNR / HSN / Table 14",
      "GSTIN checksum & structure validation",
      "Row-level error report with exact line numbers",
      "GSTR-1 JSON (portal-ready) + Excel for CA review",
    ],
    useCases: ["Amazon Sellers", "Flipkart Sellers", "CAs & Tax Filers", "Multi-GSTIN Businesses"],
    cta: "Open GST Tool",
    status: "Live",
    statusColor: "#00d68f",
  },
];

const HOW_IT_WORKS = [
  { step: "01", icon: MousePointer, title: "Choose your tool", desc: "Browse the tools below and click into the one you need. No account required to get started.", accent: "#00c9ff" },
  { step: "02", icon: Upload, title: "Upload your file", desc: "Drag and drop or browse for your file. Every tool shows you exactly what formats it accepts.", accent: "#a78bfa" },
  { step: "03", icon: Cpu, title: "Processed locally", desc: "All computation runs in your browser. Your files are never sent to any server, ever.", accent: "#00d68f" },
  { step: "04", icon: Download, title: "Download your result", desc: "Get your output instantly — cropped labels, GSTR-1 JSON, or Excel report — with one click.", accent: "#f5a623" },
];

const WHY_LYZOV = [
  { icon: Lock, title: "100% Private", desc: "Your files and documents never leave your device. All processing runs locally in the browser with zero server calls." },
  { icon: Zap, title: "Instant Results", desc: "No upload queues, no delays. Results are generated in real time as soon as you provide the input." },
  { icon: Layers, title: "Purpose-Built", desc: "Each tool is laser-focused on doing exactly one job — and doing it better than any generic solution." },
  { icon: Globe, title: "Works Everywhere", desc: "Any modern browser on any OS. No app installs, no plugins, no admin permissions needed." },
  { icon: Clock, title: "Always Available", desc: "Browser-based tools have no downtime. Open the URL and start working — any time, anywhere." },
  { icon: TrendingUp, title: "Continuously Improving", desc: "Tools are updated regularly based on real user feedback. New formats and features added often." },
];

const COMING_SOON = [
  { icon: BarChart2, name: "P&L Analyzer", desc: "Upload your sales reports and get a clean profit & loss breakdown by product, channel, and date range." },
  { icon: FileCheck, name: "Invoice Generator", desc: "Create GST-compliant invoices in seconds. Enter items, auto-calculate tax, download as PDF." },
  { icon: Printer, name: "Barcode Studio", desc: "Generate and print EAN-13, QR, Code128 barcodes in bulk from a CSV. Thermal-printer optimized." },
  { icon: Package, name: "Packing List Tool", desc: "Convert order exports into print-ready packing slips and box labels for warehouse operations." },
];

const FAQS = [
  { q: "Do I need to create an account to use these tools?", a: "For the Label Cropper Studio, no account is needed at all — just open and use it. The GST Tool offers a 30-day free trial without a credit card, and a login is needed only to save your business GSTINs and return history across sessions." },
  { q: "Are my files safe? Is my data uploaded to any server?", a: "The Label Cropper Studio is 100% client-side — your PDF files are processed entirely in your browser and never uploaded anywhere. The GST Tool also processes your reports locally; only account credentials and return summaries are stored on the server." },
  { q: "What file formats are supported?", a: "The Cropper Studio accepts any standard PDF file. The GST Tool accepts CSV and Excel (.xlsx, .xls) — specifically Amazon MTR (Merchant Tax Report) and Flipkart GST / Sales Tax Report formats." },
  { q: "Can I use these tools on my phone or tablet?", a: "Yes, all tools work on modern mobile browsers. For the best experience — especially for the visual crop zone selector — a desktop or laptop with a larger screen is recommended." },
  { q: "Will more tools be added?", a: "Absolutely. LyZov Tools is a growing collection. Upcoming additions include a P&L Analyzer, Invoice Generator, Barcode Studio, and Packing List Tool — all following the same privacy-first, browser-based approach." },
  { q: "Is there a cost to use these tools?", a: "The Label Cropper Studio is completely free. The GST Tool has a 30-day free trial with no credit card required. After the trial, plans start at Rs.149/month for individual sellers." },
];

export default function HubPage() {
  const navigate = useNavigate();
  const [hoveredTool, setHoveredTool] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".hub-obs").forEach(el => {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const S = { px: "clamp(20px,8vw,160px)" };

  return (
    <div className="gst-root" style={{ background: "var(--gst-bg)" }}>

      {/* NAVBAR */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,12,24,0.93)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--gst-border)",
        padding: `0 ${S.px}`, height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#00c9ff,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,201,255,0.35)" }}>
            <Sparkles size={18} color="#0a0f1e" />
          </div>
          <div>
            <span style={{ color: "var(--gst-text)", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.3px" }}>LyZov <span style={{ color: "#00c9ff" }}>Tools</span></span>
            <div style={{ color: "var(--gst-text-mute)", fontSize: "0.67rem", lineHeight: 1.1 }}>tools.lyzov.com</div>
          </div>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <a href="#tools" className="gst-btn gst-btn-ghost gst-btn-sm">Tools</a>
          <a href="#how" className="gst-btn gst-btn-ghost gst-btn-sm">How it works</a>
          <a href="#why" className="gst-btn gst-btn-ghost gst-btn-sm">Why LyZov</a>
          <a href="#faq" className="gst-btn gst-btn-ghost gst-btn-sm">FAQ</a>
          <button className="gst-btn gst-btn-outline gst-btn-sm" style={{ marginLeft: 8 }} onClick={() => navigate("/cropper")}><Scissors size={14} /> Cropper</button>
          <button className="gst-btn gst-btn-primary gst-btn-sm" onClick={() => navigate("/gst-tool")}><FileText size={14} /> GST Tool</button>
        </nav>
      </header>

      {/* HERO */}
      <section style={{ textAlign: "center", padding: `clamp(80px,13vh,140px) ${S.px} clamp(60px,9vh,110px)`, position: "relative", overflow: "hidden" }}>
        {[{ t: "5%", l: "8%", w: 520, c: "rgba(0,201,255,0.07)" }, { t: "15%", r: "8%", w: 420, c: "rgba(167,139,250,0.07)" }, { b: "-5%", l: "38%", w: 340, c: "rgba(0,214,143,0.07)" }].map((o, i) => (
          <div key={i} style={{ position: "absolute", borderRadius: "50%", pointerEvents: "none", filter: "blur(70px)", width: o.w, height: o.w, background: `radial-gradient(circle,${o.c} 0%,transparent 70%)`, top: o.t, left: o.l, right: o.r, bottom: o.b }} />
        ))}
        <div className="gst-badge gst-badge-blue" style={{ margin: "0 auto 24px", display: "inline-flex" }}>
          <Sparkles size={11} /> Free browser-based tools · No signup required to start
        </div>
        <h1 style={{ fontSize: "clamp(2.6rem,6vw,4.8rem)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-2.5px", margin: "0 auto 24px", maxWidth: 900 }}>
          Tools that actually<br /><span className="gst-gradient-text">get work done.</span>
        </h1>
        <p style={{ fontSize: "clamp(1rem,2vw,1.22rem)", color: "var(--gst-text-sec)", maxWidth: 600, margin: "0 auto 44px", lineHeight: 1.78 }}>
          A growing collection of precision-built browser tools designed to handle repetitive, error-prone tasks — fast, private, and free to start.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
          <button className="gst-btn gst-btn-primary gst-btn-lg" onClick={() => document.querySelector("#tools").scrollIntoView({ behavior: "smooth" })}>Explore All Tools <ArrowRight size={18} /></button>
          <button className="gst-btn gst-btn-outline gst-btn-lg" onClick={() => navigate("/gst-tool")}><FileText size={16} /> Open GST Tool</button>
        </div>
        <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
          {[{ icon: ShieldCheck, text: "100% private — no server uploads" }, { icon: Zap, text: "Runs entirely in your browser" }, { icon: Star, text: "No credit card to start" }].map(({ icon: Icon, text }) => (
            <span key={text} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.83rem", color: "var(--gst-text-sec)" }}><Icon size={14} color="var(--gst-emerald)" /> {text}</span>
          ))}
        </div>
      </section>

      {/* TOOLS */}
      <section id="tools" style={{ padding: `clamp(60px,10vh,100px) ${S.px}` }}>
        <div className="hub-obs" style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="gst-badge gst-badge-gold" style={{ margin: "0 auto 16px", display: "inline-flex" }}><BookOpen size={11} /> Available Tools</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 14px" }}>Pick your <span className="gst-gradient-text">tool</span></h2>
          <p style={{ color: "var(--gst-text-sec)", maxWidth: 520, margin: "0 auto", lineHeight: 1.75 }}>Each tool is fully self-contained, works offline after first load, and keeps your data completely private on your device.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 28, maxWidth: 920, margin: "0 auto" }}>
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isH = hoveredTool === tool.id;
            return (
              <div key={tool.id} className="hub-obs"
                style={{ background: isH ? "linear-gradient(160deg,rgba(14,22,40,0.98),rgba(10,15,30,0.9))" : "var(--gst-surface)", border: `1px solid ${isH ? tool.accent + "55" : "var(--gst-border)"}`, borderRadius: "var(--gst-radius-lg)", padding: "32px 28px", cursor: "pointer", transition: "all 0.28s ease", boxShadow: isH ? `0 0 40px ${tool.glowColor}, var(--gst-shadow-lg)` : "var(--gst-shadow)", transform: isH ? "translateY(-8px)" : "translateY(0)", position: "relative", overflow: "hidden" }}
                onMouseEnter={() => setHoveredTool(tool.id)} onMouseLeave={() => setHoveredTool(null)} onClick={() => navigate(tool.route)}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${tool.accent},transparent)`, opacity: isH ? 1 : 0.25, transition: "opacity 0.28s" }} />
                <div style={{ width: 58, height: 58, borderRadius: 16, marginBottom: 22, background: `${tool.accent}15`, border: `1px solid ${tool.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isH ? `0 0 22px ${tool.glowColor}` : "none", transition: "box-shadow 0.28s" }}>
                  <Icon size={28} color={tool.accent} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.68rem", fontWeight: 700, color: tool.statusColor }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: tool.statusColor, boxShadow: `0 0 6px ${tool.statusColor}`, display: "inline-block" }} />{tool.status}
                  </span>
                  <span className={`gst-badge ${tool.badgeClass}`} style={{ fontSize: "0.65rem" }}>{tool.badge}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.25rem", marginBottom: 4, letterSpacing: "-0.3px" }}>{tool.name}</div>
                <div style={{ fontSize: "0.78rem", color: tool.accent, fontWeight: 600, marginBottom: 14 }}>{tool.tagline}</div>
                <p style={{ fontSize: "0.875rem", color: "var(--gst-text-sec)", lineHeight: 1.7, marginBottom: 22 }}>{tool.description}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px" }}>
                  {tool.features.map(f => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: "0.83rem", color: "var(--gst-text-sec)", marginBottom: 9 }}>
                      <CheckCircle2 size={14} color={tool.accent} style={{ flexShrink: 0, marginTop: 2 }} /> {f}
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 26 }}>
                  {tool.useCases.map(uc => (<span key={uc} className="gst-badge" style={{ fontSize: "0.67rem", background: `${tool.accent}12`, color: tool.accent, border: `1px solid ${tool.accent}28` }}>{uc}</span>))}
                </div>
                <button className="gst-btn" style={{ width: "100%", justifyContent: "center", background: `linear-gradient(135deg,${tool.accent},${tool.accentDim})`, color: "#0a0f1e", fontWeight: 800, boxShadow: `0 4px 16px ${tool.glowColor}` }}
                  onClick={(e) => { e.stopPropagation(); navigate(tool.route); }}>
                  {tool.cta} <ArrowRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: `clamp(60px,10vh,100px) ${S.px}`, background: "var(--gst-surface)", borderTop: "1px solid var(--gst-border)", borderBottom: "1px solid var(--gst-border)" }}>
        <div className="hub-obs" style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="gst-badge gst-badge-blue" style={{ margin: "0 auto 16px", display: "inline-flex" }}><Lightbulb size={11} /> Simple by design</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 14px" }}>How it <span className="gst-gradient-text">works</span></h2>
          <p style={{ color: "var(--gst-text-sec)", maxWidth: 480, margin: "0 auto", lineHeight: 1.75 }}>Every tool follows the same four-step flow. No learning curve.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 32, maxWidth: 960, margin: "0 auto" }}>
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, accent }) => (
            <div key={step} className="hub-obs" style={{ textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", margin: "0 auto 20px", background: `${accent}15`, border: `2px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 18px ${accent}25` }}>
                <Icon size={24} color={accent} />
              </div>
              <div style={{ fontSize: "0.67rem", fontWeight: 700, color: accent, letterSpacing: "0.12em", marginBottom: 10, textTransform: "uppercase" }}>Step {step}</div>
              <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--gst-text-sec)", lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY LYZOV */}
      <section id="why" style={{ padding: `clamp(60px,10vh,100px) ${S.px}` }}>
        <div className="hub-obs" style={{ textAlign: "center", marginBottom: 52 }}>
          <div className="gst-badge gst-badge-green" style={{ margin: "0 auto 16px", display: "inline-flex" }}><Star size={11} /> Our principles</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 14px" }}>Why <span className="gst-gradient-text">LyZov Tools</span>?</h2>
          <p style={{ color: "var(--gst-text-sec)", maxWidth: 520, margin: "0 auto", lineHeight: 1.75 }}>Every decision we make is guided by one principle: your data belongs to you, and your time is too valuable to waste on clunky workflows.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18, maxWidth: 960, margin: "0 auto" }}>
          {WHY_LYZOV.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="gst-card hub-obs"
              style={{ transition: "border 0.22s, transform 0.22s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,201,255,0.3)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--gst-border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, marginBottom: 16, background: "rgba(0,201,255,0.1)", border: "1px solid rgba(0,201,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={21} color="#00c9ff" />
              </div>
              <div style={{ fontWeight: 700, marginBottom: 9, fontSize: "0.98rem" }}>{title}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--gst-text-sec)", lineHeight: 1.68 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMING SOON */}
      <section style={{ padding: `clamp(60px,10vh,100px) ${S.px}`, background: "var(--gst-surface)", borderTop: "1px solid var(--gst-border)", borderBottom: "1px solid var(--gst-border)" }}>
        <div className="hub-obs" style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="gst-badge gst-badge-gold" style={{ margin: "0 auto 16px", display: "inline-flex" }}><Sparkles size={11} /> On the roadmap</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 14px" }}>Tools <span className="gst-gradient-text">coming soon</span></h2>
          <p style={{ color: "var(--gst-text-sec)", maxWidth: 480, margin: "0 auto", lineHeight: 1.75 }}>More browser-based tools are in development. Same privacy-first, no-signup approach.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, maxWidth: 960, margin: "0 auto" }}>
          {COMING_SOON.map(({ icon: Icon, name, desc }) => (
            <div key={name} className="hub-obs" style={{ background: "var(--gst-surface2)", border: "1px solid var(--gst-border)", borderRadius: "var(--gst-radius)", padding: "24px 22px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 12, right: -22, background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.3)", color: "var(--gst-gold)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", padding: "3px 28px", transform: "rotate(35deg)" }}>SOON</div>
              <div style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 16, background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={20} color="var(--gst-gold)" />
              </div>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: "0.97rem" }}>{name}</div>
              <div style={{ fontSize: "0.84rem", color: "var(--gst-text-sec)", lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: `clamp(60px,10vh,100px) ${S.px}` }}>
        <div className="hub-obs" style={{ textAlign: "center", marginBottom: 52 }}>
          <div className="gst-badge gst-badge-blue" style={{ margin: "0 auto 16px", display: "inline-flex" }}><Users size={11} /> Common questions</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 14px" }}>Frequently asked <span className="gst-gradient-text">questions</span></h2>
        </div>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map(({ q, a }, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="hub-obs" style={{ background: isOpen ? "var(--gst-surface)" : "var(--gst-surface2)", border: `1px solid ${isOpen ? "rgba(0,201,255,0.3)" : "var(--gst-border)"}`, borderRadius: "var(--gst-radius)", overflow: "hidden", transition: "border 0.22s" }}>
                <button onClick={() => setOpenFaq(isOpen ? null : i)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "var(--gst-text)", fontFamily: "inherit" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", textAlign: "left", lineHeight: 1.4 }}>{q}</span>
                  <ChevronDown size={18} color="var(--gst-text-sec)" style={{ flexShrink: 0, transition: "transform 0.25s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>
                {isOpen && (<div style={{ padding: "0 22px 20px", fontSize: "0.88rem", color: "var(--gst-text-sec)", lineHeight: 1.75, animation: "gst-fade-in 0.2s ease" }}>{a}</div>)}
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{ margin: `0 ${S.px} clamp(60px,10vh,100px)`, background: "linear-gradient(135deg,rgba(0,201,255,0.07),rgba(167,139,250,0.05),rgba(0,214,143,0.06))", border: "1px solid rgba(0,201,255,0.16)", borderRadius: "var(--gst-radius-lg)", padding: "clamp(40px,7vw,72px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(167,139,250,0.1),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,214,143,0.08),transparent 70%)", pointerEvents: "none" }} />
        <div className="gst-badge gst-badge-green" style={{ margin: "0 auto 20px", display: "inline-flex" }}><Zap size={11} /> Open in seconds</div>
        <h2 style={{ fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: 800, letterSpacing: "-0.6px", marginBottom: 14 }}>Ready to get started?</h2>
        <p style={{ color: "var(--gst-text-sec)", maxWidth: 460, margin: "0 auto 36px", lineHeight: 1.75 }}>Open any tool instantly. No account needed for most tools, no installs, no waiting. Just open and work.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="gst-btn gst-btn-outline gst-btn-lg" onClick={() => navigate("/cropper")} style={{ borderColor: "rgba(0,201,255,0.4)", color: "#00c9ff" }}><Scissors size={18} /> Open Cropper Studio</button>
          <button className="gst-btn gst-btn-primary gst-btn-lg" onClick={() => navigate("/gst-tool")}><FileText size={18} /> Open GST Tool <ArrowRight size={16} /></button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--gst-border)", padding: `clamp(28px,4vh,44px) ${S.px}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 32 }}>
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#00c9ff,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={15} color="#0a0f1e" /></div>
              <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--gst-text)" }}>LyZov Tools</span>
            </div>
            <p style={{ fontSize: "0.83rem", color: "var(--gst-text-mute)", lineHeight: 1.7, margin: 0 }}>Free, private, browser-based tools built for people who have real work to get done.</p>
          </div>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            {[
              { heading: "Tools", links: [{ label: "Cropper Studio", route: "/cropper" }, { label: "GST Tool", route: "/gst-tool" }] },
              { heading: "Legal", links: [{ label: "Privacy Policy", route: "/privacy-policy" }, { label: "Terms of Service", route: "/terms" }, { label: "Disclaimer", route: "/disclaimer" }] },
              { heading: "Company", links: [{ label: "About", route: "/about" }, { label: "Contact", route: "/contact" }, { label: "FAQ", route: "#faq" }] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gst-text-sec)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>{heading}</div>
                {links.map(({ label, route }) => (
                  <a key={label} href={route} style={{ display: "block", fontSize: "0.85rem", color: "var(--gst-text-mute)", textDecoration: "none", marginBottom: 8 }}
                    onMouseEnter={e => e.target.style.color = "var(--gst-text)"} onMouseLeave={e => e.target.style.color = "var(--gst-text-mute)"}>{label}</a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--gst-border)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--gst-text-mute)" }}>© {new Date().getFullYear()} LyZov Tools · tools.lyzov.com · All rights reserved.</span>
          <span style={{ fontSize: "0.78rem", color: "var(--gst-text-mute)", display: "flex", alignItems: "center", gap: 5 }}><Lock size={12} color="var(--gst-emerald)" /> Your data never leaves your device</span>
        </div>
      </footer>
    </div>
  );
}
