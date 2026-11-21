import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Box, Chip, Paper, Typography } from '@mui/material';
import { ArrowRight, BookOpen, CheckCircle2, HelpCircle } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { findToolById } from '../data/toolsCatalog';
import { BLOG_POSTS } from '../data/blogPosts';

/**
 * Compact, structured SEO overview, FAQs, and internal cross-links rendered
 * below interactive tool workspaces to support search crawlability and user guidance.
 */
export default function ToolSeoSection({ toolSeo, accentColor }) {
  const { theme } = useContext(AppContext);
  if (!toolSeo) return null;

  const isDark = theme === 'dark';
  const accent = accentColor || (isDark ? '#00c9ff' : '#0284c7');
  const relatedTools = (toolSeo.relatedToolIds || [])
    .map((id) => findToolById(id))
    .filter(Boolean);
  const relatedGuide = toolSeo.relatedGuideSlug
    ? BLOG_POSTS.find((p) => p.slug === toolSeo.relatedGuideSlug)
    : null;

  return (
    <Box
      component="section"
      aria-label={`About ${toolSeo.h1}`}
      sx={{
        mt: 3,
        pt: 3.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
      }}
    >
      {/* Overview & Highlights */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.25, sm: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.025)' : 'background.paper',
        }}
      >
        <Typography
          component="h2"
          variant="h6"
          sx={{ fontWeight: 800, fontSize: '1.08rem', mb: 1, color: 'text.primary' }}
        >
          About {toolSeo.h1}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', lineHeight: 1.75, mb: toolSeo.highlights?.length ? 2 : 0 }}
        >
          {toolSeo.overview}
        </Typography>

        {Array.isArray(toolSeo.highlights) && toolSeo.highlights.length > 0 && (
          <Box
            component="ul"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            {toolSeo.highlights.map((item) => (
              <Box
                component="li"
                key={item}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  p: 1.4,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CheckCircle2 size={15} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
                <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.5 }}>
                  {item}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Tool-specific FAQs */}
      {Array.isArray(toolSeo.faqs) && toolSeo.faqs.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.25, sm: 3 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.025)' : 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <HelpCircle size={17} color={accent} />
            <Typography
              component="h2"
              variant="subtitle1"
              sx={{ fontWeight: 800, color: 'text.primary' }}
            >
              Frequently Asked Questions
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: toolSeo.faqs.length > 1 ? '1fr 1fr' : '1fr' },
              gap: 2,
            }}
          >
            {toolSeo.faqs.map((faq) => (
              <Box
                key={faq.q}
                sx={{
                  p: 1.75,
                  borderRadius: 2.2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
                }}
              >
                <Typography
                  component="h3"
                  variant="body2"
                  sx={{ fontWeight: 700, color: 'text.primary', mb: 0.6 }}
                >
                  {faq.q}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.65, display: 'block' }}>
                  {faq.a}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Related Tools & Seller Guides Cross-Links */}
      {(relatedTools.length > 0 || relatedGuide) && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            px: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', mr: 0.5 }}>
              Related Tools:
            </Typography>
            {relatedTools.map((rel) => (
              <Chip
                key={rel.id}
                component={Link}
                to={rel.route}
                clickable
                size="small"
                label={rel.name}
                icon={<ArrowRight size={12} />}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'background.paper',
                  '&:hover': { borderColor: accent, color: accent },
                }}
              />
            ))}
          </Box>

          {relatedGuide && (
            <Chip
              component={Link}
              to={`/blog/${relatedGuide.slug}`}
              clickable
              size="small"
              icon={<BookOpen size={13} color={accent} />}
              label={`Guide: ${relatedGuide.title.slice(0, 48)}${relatedGuide.title.length > 48 ? '…' : ''}`}
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                border: '1px solid',
                borderColor: `${accent}44`,
                bgcolor: `${accent}12`,
                color: accent,
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
