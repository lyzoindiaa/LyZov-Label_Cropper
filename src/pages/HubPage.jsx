import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../gst-tool/gst.css";
import { AppContext } from "../context/AppContext";
import { TOOL_CATEGORIES, TOOLS_CATALOG } from "../data/toolsCatalog";
import {
  Scissors, FileText, ArrowRight, Zap, ShieldCheck,
  Star, Globe, Layers, CheckCircle2, Sparkles, BookOpen,
  Upload, Download, MousePointer, ChevronDown,
  Package, Clock, Lock, Cpu, Lightbulb, TrendingUp,
  Users, BarChart2, FileCheck, Printer, Sun, Moon,
  Menu, X, Image as ImageIcon, Maximize2, Minimize2,
  RefreshCw, Wand2, FileType2, FileOutput, Search,
} from "lucide-react";

import SEOHead from "../components/SEOHead";

const TOOL_ICON_MAP = {
  Maximize2,
  Minimize2,
  RefreshCw,
  Wand2,
  Layers,
  FileType2,
  FileOutput,
  Scissors,
  FileText,
  BarChart2,
  ImageIcon,
  Image: ImageIcon,
  Package,
  Sparkles,
};

const HOW_IT_WORKS = [
  { step: "01", icon: MousePointer, title: "Choose your tool", desc: "Pick any image, PDF, Word, or seller tool below. No account required to get started.", accent: "#00c9ff" },
  { step: "02", icon: Upload, title: "Upload your file", desc: "Drag and drop single or bulk files. Clear prompts show accepted formats instantly.", accent: "#a78bfa" },
  { step: "03", icon: Cpu, title: "Processed in browser", desc: "Your everyday image, PDF, and Word tasks run directly in your browser without server waits.", accent: "#00d68f" },
  { step: "04", icon: Download, title: "Download your result", desc: "Preview your output and download individual files or all items in a single ZIP.", accent: "#f5a623" },
];

const WHY_LYZOV = [
  { icon: Lock, title: "Privacy First", desc: "Your everyday image, PDF, and document files stay on your device with browser-side processing." },
  { icon: Zap, title: "Instant Results", desc: "No upload queues, no delays. Process single files or bulk batches in seconds." },
  { icon: Layers, title: "Purpose-Built", desc: "Each tool focuses on doing one job cleanly without cluttered menus or confusing settings." },
  { icon: Globe, title: "Works Everywhere", desc: "Any modern browser on desktop or mobile. No software installs or admin permissions needed." },
  { icon: Clock, title: "Always Available", desc: "Browser-based tools stay fast and reliable whenever you need to resize, compress, merge, or convert." },
  { icon: TrendingUp, title: "Built for Everyone", desc: "Designed for students, office teams, small businesses, and e-commerce sellers alike." },
];

const COMING_SOON = [
  { icon: FileCheck, name: "Invoice Generator", desc: "Create GST-compliant invoices in seconds. Enter items, auto-calculate tax, download as PDF." },
  { icon: Printer, name: "Barcode Studio", desc: "Generate and print EAN-13, QR, Code128 barcodes in bulk from a CSV. Thermal-printer optimized." },
  { icon: Package, name: "Packing List Tool", desc: "Convert order exports into print-ready packing slips and box labels for warehouse operations." },
];

const FAQS = [
  { q: "Do I need to create an account to use these tools?", a: "No account is needed for our Image Tools, PDF & Document Tools, or Label Cropper Studio — just open a tool and start working. The GST Tool and P&L Analyzer offer free trials with optional sign-in to sync reports across sessions." },
  { q: "Are my files safe? Are images or documents uploaded to a server?", a: "Our Image Resizer, Compressor, Converter, Background Remover, Merge PDF, PDF to Word, Word to PDF, and Label Cropper run right in your browser, so your files stay on your device." },
  { q: "What file formats are supported?", a: "Image tools support JPG, JPEG, PNG, WEBP, and BMP. Document tools support PDF (including OCR for scanned PDFs) and Word (.docx). E-commerce tools support shipping label PDFs, CSV, and Excel (.xlsx, .xls)." },
  { q: "Can I process multiple files at once?", a: "Yes! Most tools — including Image Resizer, Compressor, Converter, Background Remover, Merge PDF, and Label Cropper — support bulk uploads and one-click Download All as ZIP." },
  { q: "Can I use these tools on my phone or tablet?", a: "Yes, every tool is responsive and works on modern mobile and desktop browsers. For large batches or heavy AI background removal, a desktop browser provides the fastest performance." },
  { q: "Are the new image and PDF tools free?", a: "Yes! All Image Tools and PDF & Document Tools are completely free to use right now with no signup or credit card required." },
];

export default function HubPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useContext(AppContext);
  const [hoveredTool, setHoveredTool] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; }
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".hub-obs").forEach(el => {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [selectedCategory, searchQuery]);

  const S = { px: "clamp(12px, 4vw, 80px)" };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const visibleCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cats = selectedCategory === "all"
      ? TOOL_CATEGORIES
      : TOOL_CATEGORIES.filter((c) => c.id === selectedCategory);

    return cats
      .map((cat) => {
        const catTools = TOOLS_CATALOG.filter((tool) => {
          if (tool.categoryId !== cat.id) return false;
          if (!q) return true;
          return (
            tool.name.toLowerCase().includes(q) ||
            tool.tagline.toLowerCase().includes(q) ||
            tool.description.toLowerCase().includes(q) ||
            (tool.tags || []).some((tag) => tag.includes(q))
          );
        });
        return { ...cat, tools: catTools };
      })
      .filter((cat) => cat.tools.length > 0);
  }, [selectedCategory, searchQuery]);

  return (
    <div className="gst-root" style={{ background: "var(--gst-bg)", minHeight: "100vh", width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
      <SEOHead
        title="LyZov Tools — Free Image, PDF, Document & E-Commerce Tools"
        description="Free, fast, browser-based online tools: resize, compress, convert images, remove backgrounds with AI, merge PDFs, convert PDF & Word, crop shipping labels, and manage GST."
        canonical="https://tools.lyzov.com/"
      />

      {/* NAVBAR */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: theme === "dark" ? "rgba(8,12,24,0.93)" : "rgba(255,255,255,0.93)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--gst-border)",
        padding: `0 ${S.px}`, minHeight: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", maxWidth: "100vw", boxSizing: "border-box", gap: 10,
      }}>
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", cursor: "pointer" }} onClick={() => navigate("/")}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#00c9ff,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,201,255,0.35)", flexShrink: 0 }}>
            <Sparkles size={18} color="#0a0f1e" />
          </div>
          <div>
            <span style={{ color: "var(--gst-text)", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.3px" }}>LyZov <span style={{ color: "#00c9ff" }}>Tools</span></span>
            <div style={{ color: "var(--gst-text-mute)", fontSize: "0.67rem", lineHeight: 1.1 }}>tools.lyzov.com</div>
          </div>
        </div>

        {/* Desktop Links & Action Buttons */}
        <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="gst-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <a href="#cat-image" className="gst-btn gst-btn-ghost gst-btn-sm">Image Tools</a>
            <a href="#cat-pdf" className="gst-btn gst-btn-ghost gst-btn-sm">PDF &amp; Docs</a>
            <a href="#cat-ecommerce" className="gst-btn gst-btn-ghost gst-btn-sm">Seller Tools</a>
            <button className="gst-btn gst-btn-ghost gst-btn-sm" onClick={() => navigate("/blog")}>
              <BookOpen size={14} color="#a78bfa" /> Guides
            </button>
            <a href="#faq" className="gst-btn gst-btn-ghost gst-btn-sm">FAQ</a>
          </div>

          <button className="gst-btn gst-btn-outline gst-btn-sm" onClick={() => navigate("/cropper")}>
            <Scissors size={14} /> <span style={{ display: "inline" }}>Cropper</span>
          </button>

          <button className="gst-nav-desktop gst-btn gst-btn-primary gst-btn-sm" onClick={() => navigate("/gst-tool")}>
            <FileText size={14} /> GST Tool
          </button>

          <button
            id="themeToggle"
            type="button"
            className="gst-btn gst-btn-ghost gst-btn-sm"
            onClick={toggleTheme}
            aria-label="Toggle light and dark theme"
            style={{ padding: "8px 10px", borderRadius: "8px", minWidth: 36 }}
          >
            {theme === "dark" ? <Sun size={16} color="#f5a623" /> : <Moon size={16} color="#0284c7" />}
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="gst-mobile-toggle gst-btn gst-btn-ghost gst-btn-sm"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            style={{ padding: "8px", borderRadius: "8px", minWidth: 36 }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {/* Mobile Slide-down Navigation Menu */}
      {mobileMenuOpen && (
        <div style={{
          position: "sticky", top: 64, zIndex: 99,
          background: theme === "dark" ? "rgba(10,15,30,0.98)" : "rgba(255,255,255,0.98)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--gst-border)",
          padding: `16px ${S.px} 24px`,
          display: "flex", flexDirection: "column", gap: 10,
          animation: "gst-fade-in 0.25s ease",
          boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
        }}>
          <a href="#cat-image" className="gst-btn gst-btn-ghost" style={{ justifyContent: "flex-start", padding: "12px 16px", minHeight: 44 }} onClick={() => { setSelectedCategory("all"); closeMobileMenu(); }}>
            <ImageIcon size={16} color="#00c9ff" /> Image Tools
          </a>
          <a href="#cat-pdf" className="gst-btn gst-btn-ghost" style={{ justifyContent: "flex-start", padding: "12px 16px", minHeight: 44 }} onClick={() => { setSelectedCategory("all"); closeMobileMenu(); }}>
            <FileText size={16} color="#a78bfa" /> PDF &amp; Document Tools
          </a>
          <a href="#cat-ecommerce" className="gst-btn gst-btn-ghost" style={{ justifyContent: "flex-start", padding: "12px 16px", minHeight: 44 }} onClick={() => { setSelectedCategory("all"); closeMobileMenu(); }}>
            <Package size={16} color="#00d68f" /> E-Commerce &amp; Seller Tools
          </a>
          <button className="gst-btn gst-btn-ghost" style={{ justifyContent: "flex-start", padding: "12px 16px", minHeight: 44 }} onClick={() => { closeMobileMenu(); navigate("/blog"); }}>
            <BookOpen size={16} color="#a78bfa" /> Seller Blog &amp; Guides
          </button>
          <a href="#faq" className="gst-btn gst-btn-ghost" style={{ justifyContent: "flex-start", padding: "12px 16px", minHeight: 44 }} onClick={closeMobileMenu}>
            <Users size={16} color="#f5a623" /> Frequently Asked Questions
          </a>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <button className="gst-btn gst-btn-outline" style={{ justifyContent: "center", minHeight: 44 }} onClick={() => { closeMobileMenu(); navigate("/cropper"); }}>
              <Scissors size={15} /> Cropper Studio
            </button>
            <button className="gst-btn gst-btn-primary" style={{ justifyContent: "center", minHeight: 44 }} onClick={() => { closeMobileMenu(); navigate("/gst-tool"); }}>
              <FileText size={15} /> GST Tool
            </button>
          </div>
        </div>
      )}

      {/* HERO */}
      <section style={{ textAlign: "center", padding: `clamp(50px,9vh,105px) ${S.px} clamp(36px,6vh,70px)`, position: "relative", overflow: "hidden" }}>
        {[{ t: "5%", l: "8%", w: 520, c: "rgba(0,201,255,0.07)" }, { t: "15%", r: "8%", w: 420, c: "rgba(167,139,250,0.07)" }, { b: "-5%", l: "38%", w: 340, c: "rgba(0,214,143,0.07)" }].map((o, i) => (
          <div key={i} style={{ position: "absolute", borderRadius: "50%", pointerEvents: "none", filter: "blur(70px)", width: o.w, height: o.w, background: `radial-gradient(circle,${o.c} 0%,transparent 70%)`, top: o.t, left: o.l, right: o.r, bottom: o.b }} />
        ))}
        <div className="gst-badge gst-badge-blue" style={{ margin: "0 auto 22px", display: "inline-flex" }}>
          <Sparkles size={11} /> Free browser-based tools • No signup required to start
        </div>
        <h1 style={{ fontSize: "clamp(2.2rem,5.2vw,4.2rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-2px", margin: "0 auto 22px", maxWidth: 900, color: "var(--gst-text)" }}>
          Tools that actually<br /><span className="gst-gradient-text">get work done.</span>
        </h1>
        <p style={{ fontSize: "clamp(0.98rem,1.8vw,1.16rem)", color: "var(--gst-text-sec)", maxWidth: 620, margin: "0 auto 36px", lineHeight: 1.75 }}>
          Fast, reliable everyday tools for images, PDFs, Word documents, and e-commerce sellers — simple enough for anyone, private right in your browser.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          <button className="gst-btn gst-btn-primary gst-btn-lg" onClick={() => document.querySelector("#tools").scrollIntoView({ behavior: "smooth" })}>Explore All Tools <ArrowRight size={18} /></button>
          <button className="gst-btn gst-btn-outline gst-btn-lg" onClick={() => navigate("/cropper")}><Scissors size={16} /> Open Cropper Studio</button>
        </div>
        <div style={{ display: "flex", gap: 26, justifyContent: "center", flexWrap: "wrap" }}>
          {[{ icon: ShieldCheck, text: "Private browser-side processing" }, { icon: Zap, text: "Fast bulk upload & ZIP download" }, { icon: Star, text: "No registration required" }].map(({ icon: Icon, text }) => (
            <span key={text} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.83rem", color: "var(--gst-text-sec)" }}><Icon size={14} color="var(--gst-emerald)" /> {text}</span>
          ))}
        </div>
      </section>

      {/* CATEGORIZED TOOLS DIRECTORY */}
      <section id="tools" style={{ padding: `clamp(36px,6vh,70px) ${S.px} clamp(50px,8vh,90px)` }}>
        <div className="hub-obs" style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="gst-badge gst-badge-gold" style={{ margin: "0 auto 14px", display: "inline-flex" }}><Layers size={11} /> Tool Categories</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 12px", color: "var(--gst-text)" }}>Pick your <span className="gst-gradient-text">tool</span></h2>
          <p style={{ color: "var(--gst-text-sec)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Browse tools organized by category, or search by task to jump straight in.
          </p>
        </div>

        {/* Category Filter Tabs & Quick Search */}
        <div style={{ maxWidth: 1200, margin: "0 auto 40px", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`gst-btn gst-btn-sm ${selectedCategory === "all" ? "gst-btn-primary" : "gst-btn-outline"}`}
              style={{ borderRadius: 99, padding: "8px 18px" }}
            >
              All Tools ({TOOLS_CATALOG.length})
            </button>
            {TOOL_CATEGORIES.map((cat) => {
              const count = TOOLS_CATALOG.filter((t) => t.categoryId === cat.id).length;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`gst-btn gst-btn-sm ${active ? "gst-btn-primary" : "gst-btn-outline"}`}
                  style={{ borderRadius: 99, padding: "8px 18px" }}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          <div style={{ position: "relative", width: "100%", maxWidth: 440 }}>
            <Search size={16} color="var(--gst-text-mute)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools (e.g. resize, compress, merge pdf, word, gst)..."
              aria-label="Search tools"
              className="gst-input"
              style={{ paddingLeft: 40, borderRadius: 99, height: 42, fontSize: "0.86rem" }}
            />
          </div>
        </div>

        {/* Categorized Multiple Lists */}
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 48 }}>
          {visibleCategories.length === 0 ? (
            <div className="gst-card" style={{ textAlign: "center", padding: "36px 20px" }}>
              <p style={{ margin: "0 0 12px", fontWeight: 700, color: "var(--gst-text)" }}>No tools match &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                className="gst-btn gst-btn-outline gst-btn-sm"
                onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
              >
                Show All Tools
              </button>
            </div>
          ) : (
            visibleCategories.map((category) => {
              const CatIcon = TOOL_ICON_MAP[category.iconName] || Layers;
              return (
                <div key={category.id} id={`cat-${category.id}`}>
                  {/* Category Header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
                    gap: 12, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid var(--gst-border)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 11,
                        background: `${category.accent}18`, border: `1px solid ${category.accent}35`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <CatIcon size={20} color={category.accent} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.3px", color: "var(--gst-text)" }}>
                          {category.name}
                        </h3>
                        <p style={{ margin: "2px 0 0", fontSize: "0.84rem", color: "var(--gst-text-sec)" }}>
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <span className="gst-badge gst-badge-blue" style={{ fontSize: "0.7rem" }}>
                      {category.tools.length} {category.tools.length === 1 ? "Tool" : "Tools"}
                    </span>
                  </div>

                  {/* Category Tool Cards Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 265px), 1fr))", gap: "clamp(16px, 2.2vw, 22px)" }}>
                    {category.tools.map((tool) => {
                      const Icon = TOOL_ICON_MAP[tool.iconName] || Sparkles;
                      const isH = hoveredTool === tool.id;
                      return (
                        <div key={tool.id} className="hub-obs"
                          style={{
                            background: isH ? (theme === "dark" ? "linear-gradient(160deg,rgba(14,22,40,0.98),rgba(10,15,30,0.9))" : "var(--gst-surface2)") : "var(--gst-surface)",
                            border: `1px solid ${isH ? tool.accent + "55" : "var(--gst-border)"}`,
                            borderRadius: 16,
                            padding: "18px 18px 16px",
                            cursor: "pointer",
                            transition: "all 0.25s ease",
                            boxShadow: isH ? `0 0 32px ${tool.glowColor}, var(--gst-shadow-lg)` : "var(--gst-shadow)",
                            transform: isH ? "translateY(-4px)" : "translateY(0)",
                            position: "relative",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                          }}
                          onMouseEnter={() => setHoveredTool(tool.id)}
                          onMouseLeave={() => setHoveredTool(null)}
                          onClick={() => navigate(tool.route)}
                        >
                          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${tool.accent},transparent)`, opacity: isH ? 1 : 0.25, transition: "opacity 0.25s" }} />

                          {/* Header: Icon + Title & Badges */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${tool.accent}15`, border: `1px solid ${tool.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: isH ? `0 0 16px ${tool.glowColor}` : "none", transition: "box-shadow 0.25s" }}>
                              <Icon size={20} color={tool.accent} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                                <div style={{ fontWeight: 800, fontSize: "1.02rem", letterSpacing: "-0.3px", color: "var(--gst-text)", lineHeight: 1.25 }}>
                                  {tool.name}
                                </div>
                                <span className={`gst-badge ${tool.badgeClass}`} style={{ fontSize: "0.62rem", padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0, marginTop: 1 }}>
                                  {tool.badge}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.75rem", color: tool.accent, fontWeight: 600 }}>{tool.tagline}</div>
                            </div>
                          </div>

                          {/* Short Description */}
                          <p style={{ fontSize: "0.8rem", color: "var(--gst-text-sec)", lineHeight: 1.5, margin: "0 0 10px", minHeight: 36 }}>
                            {tool.description}
                          </p>

                          {/* 3 Key Highlights */}
                          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                            {tool.features.map((f) => (
                              <li key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.76rem", color: "var(--gst-text-sec)" }}>
                                <CheckCircle2 size={13} color={tool.accent} style={{ flexShrink: 0 }} /> {f}
                              </li>
                            ))}
                          </ul>

                          {/* Action CTA Button */}
                          <button
                            type="button"
                            className="gst-btn"
                            style={{ width: "100%", marginTop: "auto", minHeight: 38, padding: "8px 14px", fontSize: "0.82rem", justifyContent: "center", background: `linear-gradient(135deg,${tool.accent},${tool.accentDim})`, color: "#0a0f1e", fontWeight: 800, borderRadius: 9, boxShadow: `0 4px 14px ${tool.glowColor}` }}
                            onClick={(e) => { e.stopPropagation(); navigate(tool.route); }}
                          >
                            {tool.cta} <ArrowRight size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: `clamp(60px,10vh,100px) ${S.px}`, background: "var(--gst-surface)", borderTop: "1px solid var(--gst-border)", borderBottom: "1px solid var(--gst-border)" }}>
        <div className="hub-obs" style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="gst-badge gst-badge-blue" style={{ margin: "0 auto 16px", display: "inline-flex" }}><Lightbulb size={11} /> Simple by design</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 14px" }}>How it <span className="gst-gradient-text">works</span></h2>
          <p style={{ color: "var(--gst-text-sec)", maxWidth: 480, margin: "0 auto", lineHeight: 1.75 }}>Every tool follows the same simple flow. No learning curve.</p>
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
          {WHY_LYZOV.map(({ icon: Icon, title, desc }) => (
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
                <button type="button" onClick={() => setOpenFaq(isOpen ? null : i)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "var(--gst-text)", fontFamily: "inherit" }}>
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
      <section style={{ margin: `0 ${S.px} clamp(40px,8vh,80px)`, background: "linear-gradient(135deg,rgba(0,201,255,0.07),rgba(167,139,250,0.05),rgba(0,214,143,0.06))", border: "1px solid rgba(0,201,255,0.16)", borderRadius: "var(--gst-radius-lg)", padding: "clamp(24px,5vw,64px) clamp(16px,4vw,48px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(167,139,250,0.1),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,214,143,0.08),transparent 70%)", pointerEvents: "none" }} />
        <div className="gst-badge gst-badge-green" style={{ margin: "0 auto 20px", display: "inline-flex" }}><Zap size={11} /> Open in seconds</div>
        <h2 style={{ fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: 800, letterSpacing: "-0.6px", marginBottom: 14 }}>Ready to get started?</h2>
        <p style={{ color: "var(--gst-text-sec)", maxWidth: 460, margin: "0 auto 36px", lineHeight: 1.75 }}>Open any tool instantly. No account needed for everyday image &amp; PDF tools, no installs, no waiting.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="gst-btn gst-btn-outline gst-btn-lg" onClick={() => navigate("/image-resizer")} style={{ borderColor: "rgba(0,201,255,0.4)", color: "#00c9ff" }}><Maximize2 size={18} /> Try Image Resizer</button>
          <button className="gst-btn gst-btn-primary gst-btn-lg" onClick={() => navigate("/merge-pdf")}><Layers size={18} /> Merge PDF <ArrowRight size={16} /></button>
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
          <div style={{ display: "flex", gap: "clamp(20px, 4vw, 48px)", flexWrap: "wrap" }}>
            {[
              { heading: "Image Tools", links: [{ label: "Image Resizer", route: "/image-resizer" }, { label: "Image Compressor", route: "/image-compressor" }, { label: "Image Converter", route: "/image-converter" }, { label: "Background Remover", route: "/background-remover" }] },
              { heading: "PDF & Seller", links: [{ label: "Merge PDF", route: "/merge-pdf" }, { label: "PDF to Word", route: "/pdf-to-word" }, { label: "Word to PDF", route: "/word-to-pdf" }, { label: "Cropper Studio", route: "/cropper" }, { label: "GST Tool", route: "/gst-tool" }] },
              { heading: "Legal & Info", links: [{ label: "About", route: "/about" }, { label: "Contact", route: "/contact" }, { label: "Privacy Policy", route: "/privacy-policy" }, { label: "Terms of Service", route: "/terms" }] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gst-text-sec)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>{heading}</div>
                {links.map(({ label, route }) => (
                  <a key={label} href={route} onClick={(e) => { e.preventDefault(); navigate(route); }} style={{ display: "block", fontSize: "0.85rem", color: "var(--gst-text-mute)", textDecoration: "none", marginBottom: 8 }}
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
