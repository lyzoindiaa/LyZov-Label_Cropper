import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import PageLayout from '../components/PageLayout';

const EFFECTIVE_DATE = 'September 23, 2026';

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" fontWeight={700} sx={{ color: '#f1f5f9', mb: 1.25 }}>
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

export default function TermsPage() {
  return (
    <PageLayout
      title="Terms & Conditions"
      description="Read the Terms and Conditions for using LyZov Cropper Studio. By using this free browser-based PDF label cropper, you agree to these terms."
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
          Terms &amp; Conditions
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Effective date: {EFFECTIVE_DATE}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 4 }} />

      <Section title="1. Acceptance of Terms">
        <P>
          By accessing or using LyZov Cropper Studio ("the Tool"), you agree to be bound
          by these Terms &amp; Conditions. If you do not agree to these terms, please do not
          use the Tool.
        </P>
      </Section>

      <Section title="2. Description of Service">
        <P>
          LyZov Cropper Studio is a free, browser-based utility that allows users to upload
          PDF files, define a crop region, and download cropped PDF files. All processing
          takes place entirely within the user's web browser. The Tool does not require
          account registration and does not transmit files to any server.
        </P>
      </Section>

      <Section title="3. Permitted Use">
        <P>
          You may use LyZov Cropper Studio for lawful personal, commercial, or educational
          purposes. You agree not to use the Tool to:
        </P>
        <Box
          component="ul"
          sx={{ pl: 2.5, color: 'text.secondary', '& li': { mb: 0.75, lineHeight: 1.75 } }}
        >
          <li>Process files containing content that is illegal under applicable law</li>
          <li>Infringe the intellectual property rights of any third party</li>
          <li>Attempt to reverse-engineer, disrupt, or abuse the Tool in any way</li>
          <li>Circumvent any usage restrictions or technical measures</li>
        </Box>
      </Section>

      <Section title="4. Intellectual Property">
        <P>
          The LyZov Cropper Studio source code, user interface, and branding are the
          intellectual property of their respective authors. The Tool is made available
          as an open-source project. Please refer to the project repository for the
          specific open-source licence that governs use and redistribution of the source code.
        </P>
        <P>
          You retain full ownership of all files you upload and any cropped outputs you
          download. We make no claim of ownership over your files or their contents.
        </P>
      </Section>

      <Section title="5. Disclaimer of Warranties">
        <P>
          The Tool is provided "as is" and "as available" without any warranties of any kind,
          express or implied, including but not limited to warranties of merchantability,
          fitness for a particular purpose, or non-infringement. We do not warrant that the
          Tool will be error-free, uninterrupted, or produce results that meet your specific
          requirements.
        </P>
      </Section>

      <Section title="6. Limitation of Liability">
        <P>
          To the fullest extent permitted by applicable law, LyZov Cropper Studio and its
          authors shall not be liable for any indirect, incidental, special, consequential,
          or punitive damages arising from your use of or inability to use the Tool —
          including but not limited to loss of data, loss of profits, or business interruption
          — even if advised of the possibility of such damages.
        </P>
        <P>
          Because all file processing occurs in your browser, you are solely responsible for
          ensuring that the files you process and the cropped outputs you download are
          accurate and suitable for your intended purpose before printing or distribution.
        </P>
      </Section>

      <Section title="7. Third-Party Services">
        <P>
          The Tool may display advertising served by Google AdSense and use Google Analytics
          for aggregate usage statistics. These services are governed by their own terms of
          service and privacy policies, and we are not responsible for their behaviour or data
          practices.
        </P>
      </Section>

      <Section title="8. Modifications to the Service">
        <P>
          We reserve the right to modify, suspend, or discontinue the Tool at any time
          without prior notice. We also reserve the right to update these Terms &amp; Conditions
          at any time. The updated terms will be posted on this page with a revised effective
          date. Your continued use of the Tool constitutes acceptance of the updated terms.
        </P>
      </Section>

      <Section title="9. Governing Law">
        <P>
          These Terms &amp; Conditions shall be governed by and construed in accordance with
          applicable laws. Any disputes arising from these terms or your use of the Tool
          shall be resolved through good-faith negotiation in the first instance.
        </P>
      </Section>

      <Section title="10. Contact">
        <P>
          For questions about these Terms &amp; Conditions, please see our Contact Us page.
        </P>
      </Section>
    </PageLayout>
  );
}
