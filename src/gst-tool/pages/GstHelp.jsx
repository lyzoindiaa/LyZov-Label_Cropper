import React, { useState } from 'react';
import '../gst.css';
import { ChevronDown, ChevronUp, HelpCircle, ExternalLink, BookOpen, FileText } from 'lucide-react';

const FAQS = [
  {
    q: 'How do I download the Amazon MTR report?',
    a: 'Go to Seller Central → Reports → Tax → Tax Document Library → Select "MTR" and the month. Download as Excel. Make sure you select the correct date range (full calendar month).',
  },
  {
    q: 'How do I download the Flipkart GST report?',
    a: 'Go to Seller Hub → Reports → Tax Reports → Select "GST / Sales Tax Report" → Choose month → Download. The file is usually an Excel with a main sales sheet.',
  },
  {
    q: 'What columns does the tool need from Amazon MTR?',
    a: 'The tool needs: Invoice Number, Invoice Date, Order Id, Transaction Type, GSTIN of Recipient, Ship From State, Bill To State, HSN/SAC, Tax Rate, Taxable Amount, CGST, SGST, IGST. If any of these columns are missing, the tool will tell you exactly which one.',
  },
  {
    q: 'What if the report column names have changed?',
    a: 'Amazon and Flipkart change their report formats from time to time. If the tool cannot find a required column, it shows a clear error message. Contact support with a sample row (with values anonymised) and we will update the parser.',
  },
  {
    q: 'Is B2B correctly handled — are invoice-level details preserved?',
    a: 'Yes. For buyers with a valid GSTIN, the tool outputs invoice-by-invoice B2B entries as required by GSTR-1. For consumers (no GSTIN), totals are grouped by state and rate in B2CS.',
  },
  {
    q: 'What is Table 14 and why do I need it?',
    a: 'Table 14 (Supplies through E-Commerce Operator) is required when you sell through Amazon or Flipkart. The tool groups your sales by the platform\'s GSTIN (called ETIN) and fills Table 14 automatically.',
  },
  {
    q: 'Does the GSTR-1 JSON work with the official offline tool?',
    a: 'The JSON is built to match the official GSTR-1 offline utility format. We strongly recommend importing the JSON into the official GST offline tool and validating it before uploading to the portal. This is also a required step in our own testing process.',
  },
  {
    q: 'Does the tool file on the GST portal on my behalf?',
    a: 'No. You download the JSON and upload it yourself on the portal. We never ask for your portal credentials. Filing is always in your hands.',
  },
  {
    q: 'What happens to my uploaded files?',
    a: 'Your files are processed in your browser as much as possible. Server-side files are deleted after 60 days. We never share your data. See our Privacy Policy for full details.',
  },
  {
    q: 'Can I add multiple GSTINs?',
    a: 'The free trial supports 1 GSTIN. The Monthly plan supports unlimited GSTINs. The CA Plan supports up to 25 GSTINs with team access.',
  },
];

const RESOURCES = [
  { icon: ExternalLink, label: 'Official GST Portal', href: 'https://www.gst.gov.in/', desc: 'Download the GSTR-1 offline utility here' },
  { icon: FileText, label: 'GSTR-1 Format (Government)', href: 'https://www.gst.gov.in/download/returns', desc: 'Official form and instructions' },
  { icon: BookOpen, label: 'Amazon MTR Help', href: 'https://sellercentral.amazon.in/', desc: 'Amazon Seller Central reporting docs' },
  { icon: BookOpen, label: 'Flipkart Report Help', href: 'https://seller.flipkart.com/', desc: 'Flipkart Seller Hub reporting docs' },
];

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: 'var(--gst-surface)', border: '1px solid var(--gst-border)',
      borderRadius: 'var(--gst-radius)', overflow: 'hidden',
      transition: 'border 0.2s',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', gap: 12,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--gst-text)', lineHeight: 1.5 }}>{q}</span>
        {open ? <ChevronUp size={16} color="var(--gst-emerald)" style={{ flexShrink: 0 }} />
               : <ChevronDown size={16} color="var(--gst-text-mute)" style={{ flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{
          padding: '0 20px 18px',
          fontSize: '0.87rem', color: 'var(--gst-text-sec)', lineHeight: 1.7,
          borderTop: '1px solid var(--gst-border)',
          paddingTop: 14,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function GstHelp() {
  return (
    <div className="gst-animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Help & FAQ</h1>
        <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>
          Answers to the most common questions about reports, filing, and the tool.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 280px', gap: 24, alignItems: 'start' }}>
        {/* FAQ list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: 'var(--gst-text-sec)' }}>Frequently Asked Questions</h2>
          {FAQS.map((f, i) => <FAQ key={i} q={f.q} a={f.a} />)}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Contact */}
          <div className="gst-card">
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={16} color="var(--gst-emerald)" /> Still need help?
            </h3>
            <p style={{ fontSize: '0.83rem', color: 'var(--gst-text-sec)', lineHeight: 1.6, marginBottom: 14 }}>
              Send us your question with a screenshot or a sample row (values anonymised) and we'll reply within 24 hours.
            </p>
            <a href="mailto:support@lyzov.com" className="gst-btn gst-btn-primary gst-btn-sm"
              style={{ display: 'flex', justifyContent: 'center' }}>
              Email Support
            </a>
          </div>

          {/* Resources */}
          <div className="gst-card">
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14 }}>Official Resources</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {RESOURCES.map(({ icon: Icon, label, href, desc }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0' }}>
                  <Icon size={14} color="var(--gst-blue)" style={{ flexShrink: 0, marginTop: 3 }} />
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--gst-blue)' }}>{label}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--gst-text-mute)' }}>{desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Important note */}
          <div style={{
            background: 'rgba(255,165,2,0.06)', border: '1px solid rgba(255,165,2,0.2)',
            borderRadius: 'var(--gst-radius)', padding: '14px 16px',
            fontSize: '0.8rem', color: 'var(--gst-text-sec)', lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--gst-warn)' }}>⚠ Important:</strong> GST rules and report formats change. Always confirm your GSTR-1 totals with a CA and validate the JSON in the official offline tool before filing.
          </div>
        </div>
      </div>
    </div>
  );
}
