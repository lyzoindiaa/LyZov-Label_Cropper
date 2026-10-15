import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Chip, Button } from '@mui/material';
import {
  FileText,
  CheckCircle,
  Briefcase,
  Code2,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';

const EFFECTIVE_DATE = 'September 23, 2026';

const SECTIONS = [
  { id: 'acceptance', number: '01', title: 'Acceptance of Terms' },
  { id: 'service', number: '02', title: 'Description of Service' },
  { id: 'permitted-use', number: '03', title: 'Permitted Use' },
  { id: 'intellectual-property', number: '04', title: 'Intellectual Property' },
  { id: 'warranties', number: '05', title: 'Disclaimer of Warranties' },
  { id: 'liability', number: '06', title: 'Limitation of Liability' },
  { id: 'third-party', number: '07', title: 'Third-Party Services' },
  { id: 'modifications', number: '08', title: 'Modifications to Service' },
  { id: 'governing-law', number: '09', title: 'Governing Law' },
  { id: 'contact', number: '10', title: 'Contact Information' },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance');

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
      title="Terms & Conditions"
      description="Read the Terms and Conditions for using LyZov Cropper Studio — client-side browser PDF label cropping with full commercial rights."
      maxWidth={1240}
    >
      {/* Hero Header */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: 3, md: 4 },
          p: { xs: 3, sm: 4, md: 5 },
          mb: 4,
          background: 'radial-gradient(ellipse at top left, rgba(0,201,255,0.12) 0%, rgba(168,85,247,0.06) 50%, rgba(0,0,0,0) 80%), rgba(255,255,255,0.02)',
          border: '1px solid',
          borderColor: 'rgba(0,201,255,0.25)',
        }}
      >
        <Box sx={{ maxWidth: 840 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<FileText size={14} color="#00c9ff" />}
              label="User Agreement &amp; Rights"
              size="small"
              sx={{
                bgcolor: 'rgba(0,201,255,0.12)',
                color: '#00c9ff',
                fontWeight: 700,
                border: '1px solid rgba(0,201,255,0.3)',
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
            Terms &amp;{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00c9ff 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Conditions
            </span>
          </Typography>

          <Typography color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
            Clear, transparent guidelines governing the use of LyZov Cropper Studio. All PDF processing
            is performed locally in your browser with zero document retention.
          </Typography>
        </Box>
      </Box>

      {/* 3 Core Principles Highlights */}
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
            <Briefcase size={22} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
              Full Commercial Rights
            </Typography>
            <Typography variant="caption" color="text.secondary">
              You own 100% of your generated cropped outputs
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
            <Code2 size={22} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
              Independent Platform
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Direct in-browser execution, no vendor lock-in
            </Typography>
          </Box>
        </Box>

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
            <CheckCircle size={22} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
              No Account Required
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Instant access without subscription traps
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
              Terms Index
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
                      bgcolor: isActive ? 'rgba(0,201,255,0.1)' : 'transparent',
                      color: isActive ? '#00c9ff' : 'text.primary',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isActive ? 'rgba(0,201,255,0.15)' : 'action.hover',
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

          {/* Contact Assistance Card */}
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
              Questions about our terms?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mb: 2 }}>
              If you need an enterprise evaluation or commercial assistance, get in touch.
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
              Contact Legal Desk
            </Button>
          </Box>
        </Box>

        {/* Right Column: Structured Section Cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 1. Acceptance */}
          <Box
            id="acceptance"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="01" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                1. Acceptance of Terms
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              By accessing or using LyZov Cropper Studio ("the Tool"), you agree to be bound by these Terms &amp; Conditions. If you do not agree to these terms, please do not use the Tool.
            </Typography>
          </Box>

          {/* 2. Service Description */}
          <Box
            id="service"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="02" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                2. Description of Service
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              LyZov Cropper Studio is a free, browser-based utility that allows users to upload PDF files, define a crop region, and download cropped PDF files. All processing takes place entirely within the user's web browser. The Tool does not require account registration and does not transmit files to any server.
            </Typography>
          </Box>

          {/* 3. Permitted Use */}
          <Box
            id="permitted-use"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="03" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                3. Permitted Use
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
              You may use LyZov Cropper Studio for lawful personal, commercial, or educational purposes. You agree not to use the Tool to:
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, m: 0, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.8 }}>
              <li>Process files containing content that is unlawful or promotes illegal acts</li>
              <li>Infringe upon the intellectual property or copyright of third parties</li>
              <li>Attempt to reverse-engineer, disrupt, or introduce malicious payloads</li>
              <li>Circumvent any browser security sandboxes or technical measures</li>
            </Box>
          </Box>

          {/* 4. Intellectual Property */}
          <Box
            id="intellectual-property"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'rgba(0,201,255,0.25)',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="04" size="small" sx={{ fontWeight: 800, bgcolor: 'rgba(0,201,255,0.1)', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                4. Intellectual Property &amp; Output Ownership
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
              The LyZov Cropper Studio software, branding, and user interface are the proprietary intellectual property of LyZov India. All rights reserved.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              <strong style={{ color: '#00c9ff' }}>You retain 100% full ownership</strong> of all files you upload and all cropped label PDFs you export. We make zero claims of ownership, royalty, or rights over your files or their contents.
            </Typography>
          </Box>

          {/* 5. Disclaimer of Warranties */}
          <Box
            id="warranties"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="05" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                5. Disclaimer of Warranties
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              The Tool is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Tool will operate completely uninterrupted, error-free, or meet every custom printer firmware specification.
            </Typography>
          </Box>

          {/* 6. Limitation of Liability */}
          <Box
            id="liability"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="06" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                6. Limitation of Liability
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
              To the fullest extent permitted by applicable law, LyZov Cropper Studio and its contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from the use of the Tool.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Because all file processing occurs inside your device, you are solely responsible for verifying that your cropped shipping labels are scanned and test-printed accurately before applying them to physical parcels.
            </Typography>
          </Box>

          {/* 7. Third-Party Services */}
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
              <Chip label="07" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                7. Third-Party Services
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              The Tool may display advertising served by Google AdSense and utilize aggregate analytics. These third-party services operate under their own independent terms of service and privacy agreements.
            </Typography>
          </Box>

          {/* 8. Modifications */}
          <Box
            id="modifications"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="08" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                8. Modifications to Service
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              We reserve the right to modify, upgrade, or temporarily suspend the Tool at any time without prior individual notice. Updated terms will be published on this page with a revised effective date.
            </Typography>
          </Box>

          {/* 9. Governing Law */}
          <Box
            id="governing-law"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="09" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                9. Governing Law
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              These Terms &amp; Conditions shall be governed by and construed in accordance with applicable laws. Any questions or disputes shall be addressed through good-faith communication in the first instance.
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
              <Chip label="10" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#00c9ff' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                10. Contact Information
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
              For legal inquiries, copyright concerns, or license clarifications, please reach our team through our Contact Us page.
            </Typography>
            <Button
              component={Link}
              to="/contact"
              variant="outlined"
              size="small"
              endIcon={<ArrowRight size={14} />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Contact Support Desk
            </Button>
          </Box>
        </Box>
      </Box>
    </PageLayout>
  );
}
