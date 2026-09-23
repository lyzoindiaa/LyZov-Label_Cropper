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

export default function DisclaimerPage() {
  return (
    <PageLayout
      title="Disclaimer"
      description="Read the Disclaimer for LyZov Cropper Studio. Understand the limitations of this free, browser-based PDF label cropper and what we are not responsible for."
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
          Disclaimer
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Last updated: {EFFECTIVE_DATE}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 4 }} />

      <Section title="1. General Disclaimer">
        <P>
          The information and tools provided by LyZov Cropper Studio are offered in good
          faith and on an "as is" basis, without any representation or warranty of any kind.
          We make no guarantee that the Tool will meet every user's requirements or that
          the output will be error-free.
        </P>
        <P>
          Users are solely responsible for verifying that the cropped PDF output is accurate
          and suitable for their intended purpose — particularly before committing to print
          runs, label production, or distribution.
        </P>
      </Section>

      <Section title="2. Accuracy of Output">
        <P>
          While LyZov Cropper Studio applies the crop region as defined by the user as
          precisely as the underlying PDF-lib library allows, slight variations may occur
          depending on the structure of the source PDF, embedded fonts, layers, and
          rendering specifics. Always check a sample output before processing a large batch.
        </P>
      </Section>

      <Section title="3. No Professional Advice">
        <P>
          Nothing on this website or within the Tool constitutes legal, financial, printing,
          or logistical advice. If your use case has compliance requirements (for example,
          regulated shipping labels or medical labelling), you should consult the appropriate
          professional or authority before relying solely on the Tool's output.
        </P>
      </Section>

      <Section title="4. Third-Party Files & Content">
        <P>
          LyZov Cropper Studio processes files that you upload. We are not responsible for
          the content of those files or any consequences arising from processing files that
          contain copyrighted, confidential, or otherwise protected material. You are
          responsible for ensuring you have the rights or permission to process and redistribute
          any file you upload.
        </P>
      </Section>

      <Section title="5. External Links">
        <P>
          This website may contain links to external websites for reference or convenience.
          These links do not constitute endorsement of the linked sites or their content.
          We have no control over the content, availability, or accuracy of external sites
          and accept no liability for any loss or damage arising from use of those sites.
        </P>
      </Section>

      <Section title="6. Availability">
        <P>
          We aim to keep LyZov Cropper Studio available at all times, but we do not guarantee
          uninterrupted access. The Tool may be temporarily unavailable due to maintenance,
          hosting outages, or other factors beyond our control. We are not liable for any
          inconvenience or loss caused by downtime.
        </P>
      </Section>

      <Section title="7. Advertising">
        <P>
          This website displays advertisements through Google AdSense. The presence of an
          advertisement does not constitute an endorsement of the advertised product or service
          by LyZov Cropper Studio. We are not responsible for the content of third-party
          advertisements.
        </P>
      </Section>
    </PageLayout>
  );
}
