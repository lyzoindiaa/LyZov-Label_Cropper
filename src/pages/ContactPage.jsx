import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Chip, Tooltip } from '@mui/material';
import {
  Mail,
  Clock,
  Headphones,
  Bug,
  Copy,
  Check,
  Send,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Building2,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';

const SUPPORT_EMAIL = 'lyzovindia@gmail.com';

export default function ContactPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <PageLayout
      title="Contact Us"
      description="Get in touch with the LyZov Cropper Studio team for bug reports, thermal printer compatibility help, or feature suggestions."
      maxWidth={1240}
    >
      {/* Hero Header */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: 3, md: 4 },
          p: { xs: 3, sm: 4, md: 5 },
          mb: 5,
          background: 'radial-gradient(ellipse at top left, rgba(0,201,255,0.12) 0%, rgba(168,85,247,0.06) 50%, rgba(0,0,0,0) 80%), rgba(255,255,255,0.02)',
          border: '1px solid',
          borderColor: 'rgba(0,201,255,0.2)',
        }}
      >
        <Box sx={{ maxWidth: 800 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<Sparkles size={14} color="#00c9ff" />}
              label="Customer &amp; Seller Support"
              size="small"
              sx={{
                bgcolor: 'rgba(0,201,255,0.12)',
                color: '#00c9ff',
                fontWeight: 700,
                border: '1px solid rgba(0,201,255,0.3)',
              }}
            />
            <Chip
              icon={<Clock size={14} color="#10b981" />}
              label="Response Time: Within 24-48 Hours"
              size="small"
              sx={{
                bgcolor: 'rgba(16,185,129,0.12)',
                color: '#10b981',
                fontWeight: 700,
                border: '1px solid rgba(16,185,129,0.3)',
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
            We're Here to Help You{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00c9ff 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Ship Faster
            </span>
          </Typography>

          <Typography color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 660 }}>
            Have a question, spotted a weird PDF format that doesn't crop properly, or have an idea to make the tool faster? Reach our team directly.
          </Typography>
        </Box>
      </Box>

      {/* 2-Column Responsive Contact Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
          gap: 3.5,
          mb: 6,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Direct Communication Card & Bug Report Format */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Main Email Card */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'rgba(0,201,255,0.25)',
              borderRadius: 3.5,
              p: { xs: 3, sm: 4 },
              boxShadow: '0 12px 30px -10px rgba(0,0,0,0.15)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #00c9ff 0%, #0284c7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 6px 16px rgba(0,201,255,0.3)',
                }}
              >
                <Mail size={24} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                  Direct Email Support
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Official correspondence channel
                </Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, mb: 3 }}>
              Write to our team for questions, partnership inquiries, or custom label layout requests.
              We are active Monday to Saturday from 10:00 AM to 5:00 PM IST.
            </Typography>

            {/* Email Action Bar */}
            <Box
              sx={{
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2.5,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
                mb: 3,
              }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  color: '#00c9ff',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  px: 1,
                }}
              >
                {SUPPORT_EMAIL}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCopyEmail}
                  startIcon={copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    borderColor: copied ? '#10b981' : 'divider',
                    color: copied ? '#10b981' : 'text.primary',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  component="a"
                  href={`mailto:${SUPPORT_EMAIL}?subject=LyZov%20Cropper%20Inquiry`}
                  size="small"
                  variant="contained"
                  endIcon={<Send size={14} />}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #00c9ff 0%, #0284c7 100%)',
                    color: '#000',
                    fontWeight: 700,
                  }}
                >
                  Open Mail Client
                </Button>
              </Box>
            </Box>

            {/* Operating Hours Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Clock size={16} color="#94a3b8" />
              <Typography variant="caption" color="text.secondary">
                Operating Hours: Monday – Saturday, 10:00 AM – 5:00 PM IST (GMT +5:30)
              </Typography>
            </Box>
          </Box>

          {/* Bug Reporting Guidelines Card */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Bug size={20} color="#f59e0b" />
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'text.primary' }}>
                How to File an Effective Bug Report
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
              If a specific courier's PDF doesn't render or behaves oddly, help us debug by including:
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, m: 0, mb: 2, color: 'text.secondary', fontSize: '0.88rem', lineHeight: 1.7 }}>
              <li>Your operating system (Windows, macOS, Linux, ChromeOS)</li>
              <li>Your web browser & version (Chrome 125, Safari 17, etc.)</li>
              <li>A description of what happened vs what you expected</li>
              <li>A sample redacted PDF (remember to black out sensitive buyer names or addresses)</li>
            </Box>
          </Box>
        </Box>

        {/* Right Column: Business & Seller Support, Privacy Reminder, Quick Jump */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Business & Support Details Card */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'rgba(0, 201, 255, 0.25)',
              borderRadius: 3.5,
              p: 3.5,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(0, 201, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00c9ff',
                }}
              >
                <Headphones size={22} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                  Business &amp; Seller Support
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  LyZov India · tools.lyzov.com
                </Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, mb: 2.5 }}>
              Need assistance with batch label cropping, custom marketplace label dimensions, thermal printer setups, or GST filing tools? Our support desk is directly reachable for all inquiries.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Organization:</Typography>
                <Typography variant="caption" fontWeight={700} color="text.primary">LyZov India</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Official Website:</Typography>
                <Typography variant="caption" fontWeight={700} color="text.primary">tools.lyzov.com</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Support Email:</Typography>
                <Typography variant="caption" fontWeight={700} color="text.primary">lyzovindia@gmail.com</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Operating Hours:</Typography>
                <Typography variant="caption" fontWeight={700} color="text.primary">Mon – Sat, 9:00 AM – 6:00 PM IST</Typography>
              </Box>
            </Box>

            <Button
              component="a"
              href="mailto:lyzovindia@gmail.com?subject=Support%20Inquiry%20-%20LyZov%20Tools"
              variant="outlined"
              fullWidth
              endIcon={<Send size={16} />}
              sx={{
                borderColor: 'rgba(0, 201, 255, 0.4)',
                color: '#00c9ff',
                fontWeight: 700,
                borderRadius: 2.5,
                textTransform: 'none',
                py: 1,
                '&:hover': {
                  borderColor: '#00c9ff',
                  bgcolor: 'rgba(0, 201, 255, 0.05)',
                },
              }}
            >
              Email Support Team
            </Button>
          </Box>

          {/* Privacy Notice Alert */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              gap: 1.75,
              alignItems: 'flex-start',
            }}
          >
            <ShieldAlert size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <Box>
              <Typography fontWeight={700} sx={{ color: 'text.primary', fontSize: '0.9rem', mb: 0.5 }}>
                Protect Buyer Privacy
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
                When sharing sample PDF files for bug reproduction, ensure you blackout or redact customer addresses, phone numbers, and payment details before attaching.
              </Typography>
            </Box>
          </Box>

          {/* Quick Links Card */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3.5,
              p: 3,
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.primary', mb: 2 }}>
              Looking for Immediate Answers?
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                component={Link}
                to="/faq"
                variant="text"
                endIcon={<ArrowRight size={15} />}
                sx={{
                  justifyContent: 'space-between',
                  textTransform: 'none',
                  color: 'text.primary',
                  fontWeight: 600,
                  p: 1.25,
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'action.hover', color: '#00c9ff' },
                }}
              >
                Browse Frequently Asked Questions
              </Button>
              <Button
                component={Link}
                to="/how-to-use"
                variant="text"
                endIcon={<ArrowRight size={15} />}
                sx={{
                  justifyContent: 'space-between',
                  textTransform: 'none',
                  color: 'text.primary',
                  fontWeight: 600,
                  p: 1.25,
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'action.hover', color: '#00c9ff' },
                }}
              >
                Read the Step-by-Step Guide
              </Button>
              <Button
                component={Link}
                to="/"
                variant="text"
                endIcon={<ArrowRight size={15} />}
                sx={{
                  justifyContent: 'space-between',
                  textTransform: 'none',
                  color: 'text.primary',
                  fontWeight: 600,
                  p: 1.25,
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'action.hover', color: '#00c9ff' },
                }}
              >
                Open Cropper Studio Canvas
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </PageLayout>
  );
}
