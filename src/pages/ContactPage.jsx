import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { Mail, Clock, GitFork, Bug } from 'lucide-react';
import PageLayout from '../components/PageLayout';

const channels = [
  {
    icon: <Mail size={22} color="#00c9ff" />,
    title: 'Email Us',
    body: (
      <>
        Write to{' '}
        <a href="mailto:lyzovindia@gmail.com" style={{ color: '#00c9ff' }}>
          lyzovindia@gmail.com
        </a>
        . We are available Monday to Saturday, 10 AM to 5 PM.
      </>
    ),
  },
  {
    icon: <Clock size={22} color="#94a3b8" />,
    title: 'Support Hours',
    body: 'Monday to Saturday, 10 AM to 5 PM.',
  },
  {
    icon: <Bug size={22} color="#ff6ec7" />,
    title: 'Bug Reports',
    body: 'Email us with what happened, the browser and OS you use, and steps to reproduce the issue.',
  },
  {
    icon: <GitFork size={22} color="#94a3b8" />,
    title: 'Open Source Contributions',
    body: 'LyZov Cropper Studio is open-source. You are welcome to review the code, suggest improvements, or fork the project.',
  },
];

export default function ContactPage() {
  return (
    <PageLayout
      title="Contact Us"
      description="Get in touch with the LyZov Cropper Studio team for bug reports, feature requests, or general feedback about our free PDF label cropping tool."
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
          Contact Us
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.75, maxWidth: 600 }}>
          Have a question, spotted a bug, or want to share feedback? Reach us by email during
          our support hours.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 4 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {channels.map(({ icon, title, body }) => (
          <Box
            key={title}
            sx={{
              bgcolor: '#0d131f',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3,
              p: 2.5,
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              transition: 'border-color 0.25s',
              '&:hover': { borderColor: 'rgba(0,201,255,0.2)' },
            }}
          >
            <Box sx={{ mt: 0.25, flexShrink: 0 }}>{icon}</Box>
            <Box>
              <Typography fontWeight={700} sx={{ color: '#f1f5f9', mb: 0.75 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </PageLayout>
  );
}
