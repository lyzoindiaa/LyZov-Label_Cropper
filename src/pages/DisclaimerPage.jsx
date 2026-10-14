import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Chip, Button } from '@mui/material';
import {
  AlertTriangle,
  PrinterCheck,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';

const EFFECTIVE_DATE = 'September 23, 2026';

const SECTIONS = [
  { id: 'general', number: '01', title: 'General Disclaimer' },
  { id: 'accuracy', number: '02', title: 'Accuracy of Output' },
  { id: 'advice', number: '03', title: 'No Professional Advice' },
  { id: 'third-party-content', number: '04', title: 'Third-Party Files & Content' },
  { id: 'external-links', number: '05', title: 'External Links' },
  { id: 'availability', number: '06', title: 'Service Availability' },
  { id: 'advertising', number: '07', title: 'Advertising Notice' },
];

export default function DisclaimerPage() {
  const [activeSection, setActiveSection] = useState('general');

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
      title="Disclaimer"
      description="Read the Disclaimer for LyZov Cropper Studio. Understand operational guidelines, barcode verification recommendations, and printer compatibility notes."
      maxWidth={1240}
    >
      {/* Hero Header */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: 3, md: 4 },
          p: { xs: 3, sm: 4, md: 5 },
          mb: 4,
          background: 'radial-gradient(ellipse at top left, rgba(245,158,11,0.12) 0%, rgba(0,201,255,0.06) 50%, rgba(0,0,0,0) 80%), rgba(255,255,255,0.02)',
          border: '1px solid',
          borderColor: 'rgba(245,158,11,0.25)',
        }}
      >
        <Box sx={{ maxWidth: 840 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<ShieldAlert size={14} color="#f59e0b" />}
              label="Operational Guidelines &amp; Scope"
              size="small"
              sx={{
                bgcolor: 'rgba(245,158,11,0.12)',
                color: '#f59e0b',
                fontWeight: 700,
                border: '1px solid rgba(245,158,11,0.3)',
              }}
            />
            <Chip
              label={`Last updated: ${EFFECTIVE_DATE}`}
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
            Operational{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #00c9ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Disclaimer
            </span>
          </Typography>

          <Typography color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
            Important operational notices, recommendations for test prints, and technical limitations
            when using LyZov Cropper Studio for shipping and warehouse label preparation.
          </Typography>
        </Box>
      </Box>

      {/* 3 Notice Highlights */}
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
            borderColor: 'rgba(245,158,11,0.25)',
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
              bgcolor: 'rgba(245,158,11,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              flexShrink: 0,
            }}
          >
            <PrinterCheck size={22} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
              Always Test Print First
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Verify 1 label before sending 100+ to your thermal roll
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
            <Cpu size={22} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
              Vector Coordinate Engine
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Direct mathematical extraction preserving barcodes
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
            <Layers size={22} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
              Carrier Independent
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Independent utility, not affiliated with couriers
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
              Disclaimer Index
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
                      bgcolor: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                      color: isActive ? '#f59e0b' : 'text.primary',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isActive ? 'rgba(245,158,11,0.15)' : 'action.hover',
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
              Printer setup issue?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mb: 2 }}>
              Check our FAQ for thermal printer margin calibration and troubleshooting guides.
            </Typography>
            <Button
              component={Link}
              to="/faq"
              variant="outlined"
              size="small"
              fullWidth
              endIcon={<ArrowRight size={14} />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Browse Printer FAQ
            </Button>
          </Box>
        </Box>

        {/* Right Column: Structured Section Cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 1. General Disclaimer */}
          <Box
            id="general"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="01" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#f59e0b' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                1. General Disclaimer
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
              The software, tools, and technical documentation provided by LyZov Cropper Studio are offered in good faith and on an "as is" and "as available" basis, without any representation or warranty of any kind.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Users are solely responsible for verifying that the cropped PDF output matches their label size, barcode legibility, and carrier specifications before dispatching parcels or committing to bulk printing.
            </Typography>
          </Box>

          {/* 2. Accuracy of Output */}
          <Box
            id="accuracy"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'rgba(245,158,11,0.25)',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="02" size="small" sx={{ fontWeight: 800, bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                2. Accuracy of Output &amp; Barcode Scanning
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
              While LyZov Cropper Studio applies the crop coordinates mathematically using the underlying PDF-lib vector engine, slight variations may occur if source PDFs contain non-standard crop boxes, embedded rotating media boxes, or encrypted text streams.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              We strongly recommend scanning a test label with a 1D/2D handheld barcode scanner or smartphone camera app prior to bulk processing.
            </Typography>
          </Box>

          {/* 3. No Professional Advice */}
          <Box
            id="advice"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="03" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#f59e0b' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                3. No Professional Logistics or Legal Advice
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Nothing on this website or within the application constitutes formal logistics, customs compliance, or hazardous material labelling advice. If your shipments involve regulated dangerous goods, international customs declarations, or medical items, consult the appropriate regulatory carrier rules.
            </Typography>
          </Box>

          {/* 4. Third-Party Files & Content */}
          <Box
            id="third-party-content"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="04" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#f59e0b' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                4. Third-Party Files &amp; Content
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              LyZov Cropper Studio processes files chosen and uploaded by you. We are not responsible for the content of those files or any legal consequences arising from processing confidential or copyrighted materials. You are responsible for ensuring you possess the lawful right to process and distribute the documents you load.
            </Typography>
          </Box>

          {/* 5. External Links */}
          <Box
            id="external-links"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="05" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#f59e0b' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                5. External Links &amp; Third-Party Services
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              This application may provide reference links to third-party tools, repositories, or external websites. We do not endorse and assume no responsibility for the content, privacy policies, or availability of those external sites.
            </Typography>
          </Box>

          {/* 6. Availability */}
          <Box
            id="availability"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label="06" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#f59e0b' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                6. Service Availability
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              We strive to keep LyZov Cropper Studio accessible 24/7, but we do not guarantee uninterrupted availability. The website may experience occasional downtime for maintenance or hosting updates.
            </Typography>
          </Box>

          {/* 7. Advertising */}
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
              <Chip label="07" size="small" sx={{ fontWeight: 800, bgcolor: 'action.hover', color: '#f59e0b' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                7. Advertising Notice
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              This website displays non-intrusive advertisements served via Google AdSense to help cover ongoing operational hosting fees. The display of an advertisement does not represent an endorsement of the advertised product or service.
            </Typography>
          </Box>
        </Box>
      </Box>
    </PageLayout>
  );
}
