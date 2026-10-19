import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Collapse, Chip, Button, TextField, InputAdornment } from '@mui/material';
import {
  ChevronDown,
  Search,
  ShieldCheck,
  Zap,
  Printer,
  HelpCircle,
  Mail,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';

const CATEGORIES = [
  { id: 'all', label: 'All Questions', icon: <HelpCircle size={15} /> },
  { id: 'privacy', label: 'Privacy & Security', icon: <ShieldCheck size={15} /> },
  { id: 'batch', label: 'Batch Processing', icon: <Zap size={15} /> },
  { id: 'hardware', label: 'Printers & Formats', icon: <Printer size={15} /> },
];

const faqs = [
  {
    category: 'privacy',
    categoryLabel: 'Privacy & Security',
    badgeColor: '#10b981',
    q: 'Do my PDF files get uploaded to a server?',
    a: 'No. All file processing happens entirely inside your web browser using JavaScript and WebAssembly. Your PDF files are never transmitted to any server — ours or anyone else\'s. When you close the browser tab, the files are automatically cleared from browser memory.',
  },
  {
    category: 'privacy',
    categoryLabel: 'Privacy & Security',
    badgeColor: '#10b981',
    q: 'Is LyZov Cropper Studio completely free?',
    a: 'Yes. LyZov Cropper Studio is entirely free to use, with no subscription, account, or payment required. The site displays non-intrusive ads to support hosting and ongoing platform maintenance.',
  },
  {
    category: 'privacy',
    categoryLabel: 'Privacy & Security',
    badgeColor: '#10b981',
    q: 'Does the tool work offline?',
    a: 'The initial page load requires an internet connection to fetch the application files. Once the app is loaded in your browser, file processing itself happens locally and does not require an active internet connection.',
  },
  {
    category: 'privacy',
    categoryLabel: 'Privacy & Security',
    badgeColor: '#10b981',
    q: 'Can I use the cropped PDFs commercially?',
    a: 'The output files belong entirely to you — you own the content you process. You are free to use the cropped PDFs for any purpose, including commercial shipping label printing, warehouse logistics, and marketplace order fulfillment.',
  },
  {
    category: 'batch',
    categoryLabel: 'Batch Processing',
    badgeColor: '#00c9ff',
    q: 'How many files can I process at once?',
    a: 'There is no artificial limit imposed by the tool. In practice, the number of files you can process simultaneously depends on your device\'s available RAM. For very large batches (100+ PDFs), processing in batches of 50 is recommended for smooth performance.',
  },
  {
    category: 'batch',
    categoryLabel: 'Batch Processing',
    badgeColor: '#00c9ff',
    q: 'Will the crop region be exactly the same on every file?',
    a: 'Yes — the exact same pixel coordinates are applied to every file in the batch. For this reason, best results are achieved when all PDFs in a batch have the same page dimensions and label layout.',
  },
  {
    category: 'batch',
    categoryLabel: 'Batch Processing',
    badgeColor: '#00c9ff',
    q: 'How do I download all cropped files at once?',
    a: 'After processing, switch to the "Download & Print" tab in the Studio. You can download all cropped PDFs bundled together as a single ZIP archive, or click individual download buttons for specific files.',
  },
  {
    category: 'batch',
    categoryLabel: 'Batch Processing',
    badgeColor: '#00c9ff',
    q: 'Can I crop multi-page PDFs?',
    a: 'The tool extracts the first page of each uploaded PDF as the label crop source. For standard single-label e-commerce packing slips and shipping manifests, this handles 99% of marketplace workflows.',
  },
  {
    category: 'hardware',
    categoryLabel: 'Printers & Formats',
    badgeColor: '#a855f7',
    q: 'What types of PDFs are supported?',
    a: 'LyZov Cropper Studio works with standard vector and raster PDF documents. Standard, non-password-protected PDFs from Amazon, eBay, Shopify, Etsy, ShipStation, and couriers work out of the box.',
  },
  {
    category: 'hardware',
    categoryLabel: 'Printers & Formats',
    badgeColor: '#a855f7',
    q: 'What thermal printers are compatible?',
    a: 'Any standard direct thermal or thermal transfer printer! Tested models include Zebra (ZD420, ZP450), Munbyn (RealWriter 941), Rollo (USB and Wireless), Brother (QL Series), Dymo 4XL, and standard desktop inkjet printers.',
  },
  {
    category: 'hardware',
    categoryLabel: 'Printers & Formats',
    badgeColor: '#a855f7',
    q: 'What browsers are supported?',
    a: 'LyZov Cropper Studio runs on modern chromium and WebKit browsers including Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Opera, and Apple Safari.',
  },
  {
    category: 'hardware',
    categoryLabel: 'Printers & Formats',
    badgeColor: '#a855f7',
    q: 'Can I use this on mobile or tablet?',
    a: 'The interface is fully responsive. However, precision selection box dragging is optimized for mouse and trackpad controls. For production warehouse work, a laptop or desktop monitor is strongly recommended.',
  },
];

function FaqItem({ question, answer, categoryLabel, badgeColor }) {
  const [open, setOpen] = useState(false);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: open ? 'rgba(0,201,255,0.4)' : 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: open ? '0 8px 24px rgba(0,201,255,0.08)' : 'none',
      }}
    >
      <Box
        component="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          p: { xs: 2, sm: 2.5 },
          textAlign: 'left',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={categoryLabel}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.68rem',
                fontWeight: 700,
                color: badgeColor,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          </Box>
          <Typography
            fontWeight={700}
            sx={{
              color: open ? 'primary.main' : 'text.primary',
              fontSize: { xs: '0.92rem', sm: '1.02rem' },
              lineHeight: 1.45,
            }}
          >
            {question}
          </Typography>
        </Box>
        <Box
          sx={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 2,
            bgcolor: open ? 'rgba(0,201,255,0.1)' : 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'all 0.25s',
            color: open ? '#00c9ff' : 'text.secondary',
          }}
        >
          <ChevronDown size={18} />
        </Box>
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 0.5 }}>
          <Box sx={{ height: 1, bgcolor: 'divider', mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, fontSize: '0.92rem' }}>
            {answer}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

export default function FaqPage() {
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = useMemo(() => {
    return faqs.filter((item) => {
      const matchesCat = selectedCat === 'all' || item.category === selectedCat;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCat, searchQuery]);

  const faqSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }), []);

  return (
    <PageLayout
      title="FAQ & Help Center"
      description="Frequently asked questions about LyZov Cropper Studio — file privacy, supported thermal printers, batch limits, and troubleshooting."
      schema={faqSchema}
      maxWidth={1240}
    >
      {/* Hero Header */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: 3, md: 4 },
          p: { xs: 3, sm: 4, md: 5 },
          mb: 5,
          background: 'radial-gradient(ellipse at top left, rgba(0,201,255,0.1) 0%, rgba(16,185,129,0.06) 50%, rgba(0,0,0,0) 80%), rgba(255,255,255,0.02)',
          border: '1px solid',
          borderColor: 'rgba(0,201,255,0.2)',
        }}
      >
        <Box sx={{ maxWidth: 760 }}>
          <Chip
            icon={<Sparkles size={14} color="#00c9ff" />}
            label="Knowledge Base &amp; Help Desk"
            size="small"
            sx={{
              bgcolor: 'rgba(0,201,255,0.12)',
              color: '#00c9ff',
              fontWeight: 700,
              mb: 2,
              border: '1px solid rgba(0,201,255,0.3)',
            }}
          />
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
            Frequently Asked Questions
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.7, mb: 3 }}>
            Find immediate answers regarding client-side privacy, printer compatibility, batch sizes, and troubleshooting.
          </Typography>

          {/* Search Input Bar */}
          <TextField
            fullWidth
            placeholder="Search questions or keywords (e.g. 'privacy', 'thermal', 'limits')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} color="#00c9ff" />
                </InputAdornment>
              ),
            }}
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 3,
              maxWidth: 600,
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'rgba(0,201,255,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#00c9ff' },
              },
            }}
          />
        </Box>
      </Box>

      {/* 2-Column Responsive Workspace */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '300px 1fr' },
          gap: 4,
          alignItems: 'start',
          mb: 6,
        }}
      >
        {/* Left Column: Categories + Support Card */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: { lg: 'sticky' }, top: { lg: 90 } }}>
          {/* Category Filter Pills */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              p: 2,
            }}
          >
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', px: 1, mb: 1.5, display: 'block' }}>
              Filter by Category
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {CATEGORIES.map((cat) => {
                const isActive = selectedCat === cat.id;
                return (
                  <Box
                    key={cat.id}
                    component="button"
                    onClick={() => setSelectedCat(cat.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: isActive ? 'rgba(0,201,255,0.3)' : 'transparent',
                      bgcolor: isActive ? 'rgba(0,201,255,0.1)' : 'transparent',
                      color: isActive ? '#00c9ff' : 'text.primary',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isActive ? 'rgba(0,201,255,0.15)' : 'action.hover',
                      },
                    }}
                  >
                    {cat.icon}
                    <Typography variant="body2" fontWeight="inherit">
                      {cat.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Direct Support Card */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              p: 3,
              background: 'linear-gradient(180deg, rgba(0,201,255,0.04) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Mail size={20} color="#00c9ff" />
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'text.primary' }}>
                Need more help?
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
              Can't find what you are looking for? Reach out to our dedicated support team directly.
            </Typography>
            <Button
              component={Link}
              to="/contact"
              variant="outlined"
              fullWidth
              size="small"
              endIcon={<ArrowRight size={15} />}
              sx={{
                borderColor: 'divider',
                color: 'text.primary',
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#00c9ff',
                  bgcolor: 'rgba(0,201,255,0.05)',
                },
              }}
            >
              Contact Support Desk
            </Button>
          </Box>
        </Box>

        {/* Right Column: FAQ List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredFaqs.length === 0 ? (
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 3,
                p: 5,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>
                No questions found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Try searching with different terms or reset your category filter.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedCat('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
            </Box>
          ) : (
            filteredFaqs.map((faq) => (
              <FaqItem
                key={faq.q}
                question={faq.q}
                answer={faq.a}
                categoryLabel={faq.categoryLabel}
                badgeColor={faq.badgeColor}
              />
            ))
          )}
        </Box>
      </Box>
    </PageLayout>
  );
}
