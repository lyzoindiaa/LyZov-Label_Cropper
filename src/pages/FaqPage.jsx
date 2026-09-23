import React, { useState } from 'react';
import { Box, Typography, Divider, Collapse, IconButton } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import PageLayout from '../components/PageLayout';

const faqs = [
  {
    q: 'Is LyZov Cropper Studio completely free?',
    a: 'Yes. LyZov Cropper Studio is entirely free to use, with no subscription, account, or payment required. The site displays ads via Google AdSense to support hosting and ongoing development.',
  },
  {
    q: 'Do my PDF files get uploaded to a server?',
    a: 'No. All file processing happens entirely inside your web browser using JavaScript. Your PDF files are never transmitted to any server — ours or anyone else\'s. When you close the browser tab, the files are automatically cleared from browser memory.',
  },
  {
    q: 'How many files can I process at once?',
    a: 'There is no hard limit imposed by the Tool itself. In practice, the number of files you can process simultaneously depends on your device\'s available memory (RAM) and browser. For very large batches (50+ PDFs), processing in smaller groups is recommended to avoid browser memory constraints.',
  },
  {
    q: 'What types of PDFs are supported?',
    a: 'LyZov Cropper Studio works with standard PDF files. It processes the first page of each uploaded PDF as the crop source. PDFs with complex layers, encryption/password protection, or very large file sizes may not be processed correctly — standard, non-encrypted PDFs work best.',
  },
  {
    q: 'Can I crop multi-page PDFs?',
    a: 'The Tool crops the first page of each uploaded PDF. If your label PDFs are single-page, this will cover the majority of use cases. Support for selecting specific pages or processing multi-page output is a potential future feature.',
  },
  {
    q: 'Will the crop region be exactly the same on every file?',
    a: 'Yes — the same pixel coordinates are applied to every file in the batch. For this reason, best results are achieved when all PDFs in a batch have the same page dimensions and label layout. If source files have different page sizes, the cropped output may vary.',
  },
  {
    q: 'What browsers are supported?',
    a: 'LyZov Cropper Studio works in all modern browsers that support the PDF.js and PDF-lib libraries — including Chrome, Edge, Firefox, and Safari. We recommend keeping your browser up to date for the best experience. Internet Explorer is not supported.',
  },
  {
    q: 'Can I use this on mobile or tablet?',
    a: 'The interface is responsive and will load on mobile browsers. However, the crop selection drawing workflow is optimised for mouse/trackpad use. On touch devices, the experience may be less precise. For production use, a desktop or laptop browser is strongly recommended.',
  },
  {
    q: 'How do I download all cropped files at once?',
    a: 'After processing, switch to the "Download & Print" tab. You will find a button to download all cropped PDFs as a single ZIP archive in addition to individual download buttons for each file.',
  },
  {
    q: 'Does the tool work offline?',
    a: 'The initial page load requires an internet connection to fetch the application files. Once the app is loaded in your browser, file processing itself happens locally and does not require an active internet connection. However, features that rely on third-party libraries (fonts, analytics, ads) may not function fully offline.',
  },
  {
    q: 'I found a bug — how do I report it?',
    a: 'Please open an issue on the GitHub repository with a description of the problem, which browser and OS you are using, and steps to reproduce the bug. See our Contact Us page for details.',
  },
  {
    q: 'Can I use the cropped PDFs commercially?',
    a: 'The output files belong entirely to you — you own the content you process. You are free to use the cropped PDFs for any purpose, including commercial label printing and distribution, subject to your rights over the original source files.',
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <Box
      sx={{
        bgcolor: '#0d131f',
        border: '1px solid',
        borderColor: open ? 'rgba(0,201,255,0.3)' : 'rgba(255,255,255,0.08)',
        borderRadius: 2.5,
        overflow: 'hidden',
        transition: 'border-color 0.25s',
      }}
    >
      <Box
        component="button"
        onClick={() => setOpen(v => !v)}
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
          p: 2.5,
          textAlign: 'left',
        }}
      >
        <Typography
          fontWeight={600}
          sx={{
            color: open ? '#00c9ff' : '#f1f5f9',
            fontSize: '0.92rem',
            lineHeight: 1.5,
            transition: 'color 0.2s',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          {question}
        </Typography>
        <Box
          sx={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s',
            color: '#94a3b8',
          }}
        >
          <ChevronDown size={18} />
        </Box>
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            {answer}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

export default function FaqPage() {
  return (
    <PageLayout
      title="FAQ"
      description="Frequently asked questions about LyZov Cropper Studio — file privacy, supported PDFs, browser compatibility, batch download, and more."
    >
      <Box sx={{ mb: 5 }}>
        <Typography
          component="h1"
          variant="h4"
          fontWeight={800}
          sx={{
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1.5,
          }}
        >
          Frequently Asked Questions
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.75, maxWidth: 580 }}>
          Everything you need to know about using LyZov Cropper Studio. Click any question
          to expand the answer.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 4 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {faqs.map(({ q, a }) => (
          <FaqItem key={q} question={q} answer={a} />
        ))}
      </Box>
    </PageLayout>
  );
}
