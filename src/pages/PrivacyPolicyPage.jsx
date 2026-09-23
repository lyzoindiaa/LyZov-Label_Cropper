import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import PageLayout from '../components/PageLayout';

const EFFECTIVE_DATE = 'September 23, 2026';

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ color: '#f1f5f9', mb: 1.25 }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function P({ children }) {
  return (
    <Typography color="text.secondary" sx={{ lineHeight: 1.8, mb: 1.5 }}>
      {children}
    </Typography>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <PageLayout
      title="Privacy Policy"
      description="Read the LyZov Cropper Studio Privacy Policy to understand how your data is handled. All PDF processing is 100% client-side — no files are ever uploaded to any server."
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
            mb: 1,
          }}
        >
          Privacy Policy
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Effective date: {EFFECTIVE_DATE}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 4 }} />

      <Section title="1. Overview">
        <P>
          LyZov Cropper Studio ("the Tool", "we", "our") is a free, browser-based PDF label
          cropping utility. This Privacy Policy explains what information is processed when you
          use the Tool and how we handle it. We are committed to your privacy and have designed
          the Tool from the ground up to minimise any data collection.
        </P>
      </Section>

      <Section title="2. File Uploads & Image Processing">
        <P>
          <strong style={{ color: '#f1f5f9' }}>All file processing is entirely client-side.</strong>{' '}
          When you upload a PDF or image file to LyZov Cropper Studio, that file is loaded
          directly into your browser's memory using JavaScript. It is processed locally on
          your device using the PDF-lib and React-PDF libraries.
        </P>
        <P>
          No file content — including PDF pages, images, text, or metadata — is ever
          transmitted to any external server operated by us or any third party as part of the
          cropping process. Your files stay on your device at all times.
        </P>
        <P>
          When you close the browser tab or navigate away, any files you uploaded are
          automatically discarded from browser memory. We retain no copies, logs, or records
          of any uploaded files.
        </P>
      </Section>

      <Section title="3. Data We Do Not Collect">
        <P>We do not collect, store, or process:</P>
        <Box
          component="ul"
          sx={{ pl: 2.5, color: 'text.secondary', '& li': { mb: 0.75, lineHeight: 1.75 } }}
        >
          <li>The content of any files you upload</li>
          <li>Personally identifiable information (name, email, address)</li>
          <li>Payment or financial information of any kind</li>
          <li>Account or login credentials (no account system exists)</li>
          <li>Device fingerprinting data</li>
          <li>The output files or cropped PDFs you download</li>
        </Box>
      </Section>

      <Section title="4. Cookies">
        <P>
          LyZov Cropper Studio does not use first-party cookies for tracking, personalisation,
          or session management purposes. The Tool functions without any login session and does
          not store persistent user-specific data in cookies.
        </P>
        <P>
          Third-party services embedded on the site (such as Google AdSense and Google
          Analytics, described below) may set their own cookies on your browser. These cookies
          are governed by the respective third parties' privacy policies and are outside our
          direct control.
        </P>
      </Section>

      <Section title="5. Analytics">
        <P>
          We may use Google Analytics to understand aggregate usage patterns — for example,
          which pages are visited most frequently, approximate geographic distribution of
          visitors, and what browsers or devices are used. This data is collected in anonymised,
          aggregated form and is used solely to improve the Tool.
        </P>
        <P>
          Google Analytics may use cookies and similar technologies to collect this data.
          You can opt out of Google Analytics tracking by installing the{' '}
          <a
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#00c9ff' }}
          >
            Google Analytics Opt-out Browser Add-on
          </a>
          .
        </P>
      </Section>

      <Section title="6. Advertising (Google AdSense)">
        <P>
          LyZov Cropper Studio displays advertisements served by Google AdSense to help
          support the cost of hosting and ongoing development. Google AdSense uses cookies
          and similar tracking technologies to serve ads that may be relevant to your
          interests based on your browsing activity across websites.
        </P>
        <P>
          We do not control the specific advertisements shown or the data collected by
          Google for ad personalisation. To learn more about how Google uses your data for
          advertising, or to opt out of personalised ads, please visit:{' '}
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#00c9ff' }}
          >
            Google Ad Settings
          </a>
          .
        </P>
      </Section>

      <Section title="7. Third-Party Links">
        <P>
          Pages on this site may contain links to external websites (for example, GitHub).
          We are not responsible for the privacy practices of those external sites and
          encourage you to review their respective privacy policies before providing any
          personal information.
        </P>
      </Section>

      <Section title="8. Children's Privacy">
        <P>
          LyZov Cropper Studio is not directed at children under the age of 13, and we do
          not knowingly collect personal information from children. If you believe a child
          has provided personal information through this site, please contact us so we can
          take appropriate action.
        </P>
      </Section>

      <Section title="9. Changes to This Policy">
        <P>
          We may update this Privacy Policy from time to time to reflect changes in our
          practices or applicable law. When we do, we will update the effective date at the
          top of this page. Continued use of the Tool after any changes constitutes your
          acceptance of the updated policy.
        </P>
      </Section>

      <Section title="10. Contact">
        <P>
          If you have any questions or concerns about this Privacy Policy or our data
          practices, please open an issue or discussion on our GitHub repository. See
          our Contact Us page for details.
        </P>
      </Section>
    </PageLayout>
  );
}
