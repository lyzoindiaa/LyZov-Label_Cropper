import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Chip, Button } from '@mui/material';
import {
  ShieldCheck,
  Lock,
  Trash2,
  UserX,
  ExternalLink,
  Sparkles,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';

const EFFECTIVE_DATE = 'September 23, 2026';

const SECTIONS = [
  { id: 'overview', number: '01', title: 'Overview' },
  { id: 'uploads', number: '02', title: 'File Uploads & Image Processing' },
  { id: 'no-collect', number: '03', title: 'Data We Do Not Collect' },
  { id: 'cookies', number: '04', title: 'Cookies & Storage' },
  { id: 'analytics', number: '05', title: 'Analytics Usage' },
  { id: 'advertising', number: '06', title: 'Advertising (Google AdSense)' },
  { id: 'third-party', number: '07', title: 'Third-Party Links' },
  { id: 'children', number: '08', title: "Children's Privacy" },
  { id: 'changes', number: '09', title: 'Changes to This Policy' },
  { id: 'contact', number: '10', title: 'Contact & Inquiries' },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <PageLayout
      title="Privacy Policy"
      description="Read the LyZov Cropper Studio Privacy Policy. All PDF processing is 100% client-side — zero files are uploaded to any server."
      maxWidth={1240}
    >
      {/* Hero Header */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: 3, md: 4 },
          p: { xs: 3, sm: 4, md: 5 },
          mb: 4,
          background: 'radial-gradient(ellipse at top left, rgba(16,185,129,0.12) 0%, rgba(0,201,255,0.06) 50%, rgba(0,0,0,0) 80%), rgba(255,255,255,0.02)',
          border: '1px solid',
          borderColor: 'rgba(16,185,129,0.25)',
        }}
      >
        <Box sx={{ maxWidth: 840 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<ShieldCheck size={14} color="#10b981" />}
              label="100% Client-Side Architecture"
              size="small"
              sx={{
                bgcolor: 'rgba(16,185,129,0.12)',
                color: '#10b981',
                fontWeight: 700,
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            />
            <Chip
              label={`Effective: ${EFFECTIVE_DATE}`}
              size="small"
              sx={{
                bgcolor: 'action.hover',
                fontWeight: 600,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          </Box>

          <Typography
            component="h1"
            variant="h3"
            fontWeight={900}
            sx={{
              letterSpacing: '-1px',
              color: 'text.primary',
              fontSize: { xs: '1.85rem', sm: '2.4rem', md: '2.8rem' },
              lineHeight: 1.2,
              mb: 1.5,
            }}
          >
            Privacy Policy &amp;{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #00c9ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Data Protection
            </span>
          </Typography>

          <Typography color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
            We believe your shipping documents and customer addresses belong exclusively to you.
            LyZov Cropper Studio executes entirely in your browser sandbox without ever transmitting
            document contents to any external server.
          </Typography>
        </Box>
      </Box>

      {/* 3 Key Privacy Pillars Highlights */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2.5,
          mb: 5,
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'rgba(16,185,129,0.2)',
            borderRadius: 3,
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: 'rgba(16,185,129,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0,
            }}
          >
            <Lock size={22} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
              Zero Server Uploads
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Files are processed in local JavaScript memory only
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'rgba(0,201,255,0.2)',
            borderRadius: 3,
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: 'rgba(0,201,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00c9ff',
              flexShrink: 0,
            }}
          >
            <Trash2 size={22} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
              Instant Memory Wipe
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All data is instantly wiped when tab closes
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'rgba(168,85,247,0.2)',
            borderRadius: 3,
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: 'rgba(168,85,247,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a855f7',
              flexShrink: 0,
            }}
          >
            <UserX size={22} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
              No Account or Login
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Zero storage of names, emails, or credentials
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 2-Column Responsive Layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '300px 1fr' },
          gap: 4,
          alignItems: 'start',
          mb: 6,
        }}
      >
        {/* Left Column: Sticky Table of Contents */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: { lg: 'sticky' }, top: { lg: 90 } }}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              p: 2.5,
            }}
          >
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', px: 1, mb: 1.5, display: 'block' }}>
              Table of Contents
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {SECTIONS.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <Box
                    key={sec.id}
                    component="button"
                    onClick={() => scrollToSection(sec.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      border: 'none',
                      bgcolor: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
                      color: isActive ? '#10b981' : 'text.primary',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isActive ? 'rgba(16,185,129,0.15)' : 'action.hover',
                      },
                    }}
                  >
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.6 }}>
                      {sec.number}
                    </Typography>
                    <Typography variant="inherit" sx={{ lineHeight: 1.3 }}>
                      {sec.title}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Quick Help Card */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              p: 2.5,
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.primary', mb: 1 }}>
              Questions about our privacy?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mb: 2 }}>
              If you have regulatory or enterprise compliance questions, reach our team directly.
            </Typography>
            <Button
              component={Link}
              to="/contact"
              variant="outlined"
              size="small"
              fullWidth
              endIcon={<ArrowRight size={14} />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Contact Privacy Team
            </Button>
          </Box>
        </Box>

        {/* Right Column: Structured Policy Cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 1. Overview */}
          <Box
            id="overview"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="01" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                1. Overview
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              LyZov Cropper Studio ("the Tool", "we", "our") is a free, browser-based PDF label cropping utility. This Privacy Policy explains what information is processed when you use the Tool and how we handle it. We are committed to your privacy and have designed the Tool from the ground up to eliminate any server-side data collection.
            </Typography>
          </Box>

          {/* 2. File Uploads */}
          <Box
            id="uploads"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'rgba(16,185,129,0.3)',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="02" size="small" sx={{ fontWeight: 800, bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                2. File Uploads &amp; Image Processing
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
              <strong style={{ color: '#10b981' }}>All file processing is 100% client-side.</strong> When you upload a PDF file to LyZov Cropper Studio, that file is loaded directly into your browser's local memory using JavaScript. It is processed locally on your device using the PDF-lib and React-PDF libraries.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
              No file content — including PDF pages, barcodes, buyer addresses, invoice amounts, or embedded metadata — is ever transmitted to any external server operated by us or any third party as part of the cropping process.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              When you close the browser tab or navigate away, any files you uploaded are automatically discarded from browser memory. We retain zero copies, logs, or records of any uploaded documents.
            </Typography>
          </Box>

          {/* 3. Data We Do Not Collect */}
          <Box
            id="no-collect"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="03" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                3. Data We Do Not Collect
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
              We explicitly do not collect, store, or process:
            </Typography>
            <Box
              component="ul"
              sx={{ pl: 2.5, m: 0, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.8 }}
            >
              <li>The content or images of any files you upload</li>
              <li>Customer personally identifiable information (PII) like names or phone numbers</li>
              <li>Payment or financial credentials</li>
              <li>User accounts, passwords, or emails</li>
              <li>Device fingerprinting or hardware identifiers</li>
              <li>The cropped output labels you download</li>
            </Box>
          </Box>

          {/* 4. Cookies */}
          <Box
            id="cookies"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="04" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                4. Cookies &amp; Storage
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
              LyZov Cropper Studio does not use first-party tracking cookies or session identifiers. Only UI preferences (such as your chosen Dark or Light mode) are saved in your browser's local storage so your theme persists between visits.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Third-party services embedded on the site (such as Google AdSense and Google Analytics, described below) may set their own cookies on your browser according to their respective policies.
            </Typography>
          </Box>

          {/* 5. Analytics */}
          <Box
            id="analytics"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="05" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                5. Analytics Usage
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
              We may use Google Analytics to understand aggregate usage trends — such as high-traffic hours, approximate visitor geographic regions, and browser versions. This data is collected in anonymised form and is used exclusively to optimize performance.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              You can opt out of Google Analytics at any time using the{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#00c9ff', textDecoration: 'underline' }}
              >
                Google Analytics Opt-out Browser Add-on
              </a>
              .
            </Typography>
          </Box>

          {/* 6. Advertising */}
          <Box
            id="advertising"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="06" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                6. Advertising (Google AdSense)
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
              LyZov Cropper Studio displays advertisements served by Google AdSense to help support the cost of hosting and ongoing platform maintenance and improvements. Google AdSense uses cookies to serve ads based on your visits to this and other websites.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              To adjust or opt out of personalized advertising preferences, visit{' '}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#00c9ff', textDecoration: 'underline' }}
              >
                Google Ad Settings
              </a>
              .
            </Typography>
          </Box>

          {/* 7. Third-Party Links */}
          <Box
            id="third-party"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="07" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                7. Third-Party Links
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Pages on this site may contain external links (for example, to courier or vendor documentation). We are not responsible for the privacy practices of external websites and recommend reviewing their independent policies.
            </Typography>
          </Box>

          {/* 8. Children's Privacy */}
          <Box
            id="children"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="08" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                8. Children's Privacy
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              LyZov Cropper Studio is a tool intended for business and logistics operators and is not directed at children under 13. We do not knowingly collect personal information from minors.
            </Typography>
          </Box>

          {/* 9. Changes */}
          <Box
            id="changes"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="09" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                9. Changes to This Policy
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              We may update this Privacy Policy periodically to reflect technological adjustments or legal requirements. Any modifications will be posted here with an updated effective date.
            </Typography>
          </Box>

          {/* 10. Contact */}
          <Box
            id="contact"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="10" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#10b981' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                10. Contact
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
              If you have questions or concerns about this policy or our data practices, reach us directly via our Contact Us page or support email.
            </Typography>
            <Button
              component={Link}
              to="/contact"
              variant="outlined"
              size="small"
              endIcon={<ArrowRight size={14} />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Visit Contact Desk
            </Button>
          </Box>
        </Box>
      </Box>
    </PageLayout>
  );
}
