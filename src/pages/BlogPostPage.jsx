import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Breadcrumbs,
  CircularProgress,
} from '@mui/material';
import {
  Clock,
  Calendar,
  ArrowLeft,
  Share2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Scissors,
  FileSpreadsheet,
  ArrowRight,
  BookOpen,
  Tag,
  List,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { BLOG_POSTS } from '../data/blogPosts';
import { gstApi } from '../gst-tool/api/client';

export default function BlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadPost() {
      try {
        const res = await gstApi.getBlogPostBySlug(slug);
        if (isMounted && res?.post) {
          setPost(res.post);
          if (res.relatedPosts && res.relatedPosts.length > 0) {
            setRelatedPosts(res.relatedPosts);
          } else {
            // Find related locally
            const localRelated = BLOG_POSTS.filter(
              (p) => p.slug !== slug && p.category === res.post.category
            ).slice(0, 3);
            setRelatedPosts(localRelated);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
        // Fallback to local data
      }

      // Local fallback
      const found = BLOG_POSTS.find((p) => p.slug === slug || p.id === slug);
      if (isMounted) {
        if (found) {
          setPost(found);
          const related = BLOG_POSTS.filter(
            (p) => p.slug !== slug && p.category === found.category
          ).slice(0, 3);
          setRelatedPosts(related);
        } else {
          setPost(null);
        }
        setLoading(false);
      }
    }

    loadPost();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Extract table of contents from headings
  const headings = useMemo(() => {
    if (!post?.content) return [];
    return post.content
      .filter((block) => block.type === 'heading')
      .map((block, idx) => ({
        id: `section-${idx + 1}`,
        title: block.text,
      }));
  }, [post]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Loading Guide..." maxWidth={900}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12 }}>
          <CircularProgress size={40} sx={{ color: '#00c9ff', mb: 2 }} />
          <Typography color="text.secondary">Fetching article details...</Typography>
        </Box>
      </PageLayout>
    );
  }

  if (!post) {
    return (
      <PageLayout title="Article Not Found" maxWidth={800}>
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>
            Article Not Found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            The guide or tutorial you requested could not be located. It may have been updated or moved.
          </Typography>
          <Button
            component={Link}
            to="/blog"
            variant="contained"
            startIcon={<ArrowLeft size={16} />}
            sx={{
              bgcolor: '#00c9ff',
              color: '#000',
              fontWeight: 700,
              borderRadius: 2.5,
              textTransform: 'none',
              '&:hover': { bgcolor: '#38bdf8' },
            }}
          >
            Back to All Guides
          </Button>
        </Box>
      </PageLayout>
    );
  }

  // Schema Markup for Google SEO & AdSense compliance
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'LyZov',
    },
    publisher: {
      '@type': 'Organization',
      name: 'LyZov India',
      url: 'https://tools.lyzov.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://tools.lyzov.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://tools.lyzov.com/blog/${post.slug}`,
    },
  };

  return (
    <PageLayout
      title={`${post.title} | LyZov Seller Guides`}
      description={post.excerpt}
      maxWidth={1080}
    >
      {/* Inject JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      {/* Navigation Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ fontSize: '0.85rem' }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            Home
          </Link>
          <Link to="/blog" style={{ color: 'inherit', textDecoration: 'none' }}>
            Blog &amp; Guides
          </Link>
          <Typography color="text.primary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {post.category}
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Header / Meta */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label={post.category}
            size="small"
            sx={{
              bgcolor: 'rgba(0, 201, 255, 0.12)',
              color: '#00c9ff',
              fontWeight: 800,
              fontSize: '0.75rem',
              border: '1px solid rgba(0, 201, 255, 0.3)',
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Clock size={13} /> {post.readTime}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Calendar size={13} />{' '}
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Typography>
        </Box>

        <Typography
          component="h1"
          variant="h3"
          fontWeight={900}
          sx={{
            letterSpacing: '-0.8px',
            color: 'text.primary',
            fontSize: { xs: '1.75rem', sm: '2.3rem', md: '2.7rem' },
            lineHeight: 1.25,
            mb: 2.5,
          }}
        >
          {post.title}
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            fontSize: { xs: '1rem', md: '1.15rem' },
            lineHeight: 1.7,
            mb: 3,
            maxWidth: 900,
          }}
        >
          {post.excerpt}
        </Typography>

        {/* Author & Share Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            pt: 2.5,
            pb: 2.5,
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'rgba(0,201,255,0.1)',
                border: '1px solid rgba(0,201,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
              }}
            >
              {post.author?.avatar || '✍️'}
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={800} color="text.primary">
                {post.author?.name || 'LyZov'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {post.author?.role || 'Staff Specialist'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              onClick={handleShare}
              variant="outlined"
              size="small"
              startIcon={<Share2 size={15} />}
              sx={{
                borderColor: copied ? '#10b981' : 'divider',
                color: copied ? '#10b981' : 'text.primary',
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              {copied ? 'Link Copied!' : 'Share Guide'}
            </Button>
            <Button
              component={Link}
              to="/blog"
              variant="text"
              size="small"
              startIcon={<ArrowLeft size={15} />}
              sx={{
                color: 'text.secondary',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                '&:hover': { color: 'text.primary' },
              }}
            >
              All Articles
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Body + Sidebar */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 280px' },
          gap: 5,
          alignItems: 'start',
        }}
      >
        {/* Article Content */}
        <Box sx={{ minWidth: 0 }}>
          {post.content &&
            post.content.map((block, idx) => {
              // INTRO BLOCK
              if (block.type === 'intro') {
                return (
                  <Typography
                    key={idx}
                    sx={{
                      fontSize: '1.15rem',
                      lineHeight: 1.8,
                      color: 'text.primary',
                      mb: 3.5,
                      fontStyle: 'normal',
                      fontWeight: 500,
                    }}
                  >
                    {block.text}
                  </Typography>
                );
              }

              // HEADING BLOCK
              if (block.type === 'heading') {
                const headingIdx = headings.findIndex((h) => h.title === block.text);
                const sectionId = headingIdx !== -1 ? headings[headingIdx].id : `heading-${idx}`;

                return (
                  <Typography
                    key={idx}
                    id={sectionId}
                    component="h2"
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      color: 'text.primary',
                      mt: 4,
                      mb: 2,
                      pt: 1,
                      letterSpacing: '-0.4px',
                      scrollMarginTop: '100px',
                    }}
                  >
                    {block.text}
                  </Typography>
                );
              }

              // PARAGRAPH BLOCK
              if (block.type === 'paragraph') {
                return (
                  <Typography
                    key={idx}
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.85,
                      fontSize: '1rem',
                      mb: 3,
                    }}
                  >
                    {block.text}
                  </Typography>
                );
              }

              // CALLOUT BLOCK
              if (block.type === 'callout') {
                const isWarning = block.variant === 'warning';
                const borderColor = isWarning ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 201, 255, 0.4)';
                const bgColor = isWarning ? 'rgba(239, 68, 68, 0.06)' : 'rgba(0, 201, 255, 0.06)';
                const iconColor = isWarning ? '#ef4444' : '#00c9ff';

                return (
                  <Box
                    key={idx}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor,
                      bgcolor: bgColor,
                      mb: 3.5,
                      display: 'flex',
                      gap: 2,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ mt: 0.3, flexShrink: 0 }}>
                      {isWarning ? (
                        <AlertCircle size={20} color={iconColor} />
                      ) : (
                        <Lightbulb size={20} color={iconColor} />
                      )}
                    </Box>
                    <Box>
                      {block.title && (
                        <Typography
                          variant="subtitle2"
                          fontWeight={800}
                          sx={{ color: isWarning ? '#ef4444' : '#00c9ff', mb: 0.5 }}
                        >
                          {block.title}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {block.text}
                      </Typography>
                    </Box>
                  </Box>
                );
              }

              // STEPS BLOCK
              if (block.type === 'steps' && block.items) {
                return (
                  <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                    {block.items.map((step, sIdx) => (
                      <Box
                        key={sIdx}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          gap: 2,
                          alignItems: 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: 'rgba(0, 201, 255, 0.15)',
                            color: '#00c9ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            flexShrink: 0,
                          }}
                        >
                          {sIdx + 1}
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mb: 0.5 }}>
                            {step.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                            {step.desc}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                );
              }

              // TABLE BLOCK
              if (block.type === 'table' && block.headers && block.rows) {
                return (
                  <TableContainer
                    key={idx}
                    component={Paper}
                    sx={{
                      mb: 4,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: 'none',
                      overflowX: 'auto',
                    }}
                  >
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'rgba(0, 201, 255, 0.05)' }}>
                        <TableRow>
                          {block.headers.map((h, hIdx) => (
                            <TableCell key={hIdx} sx={{ fontWeight: 800, color: 'text.primary', py: 1.5 }}>
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {block.rows.map((row, rIdx) => (
                          <TableRow key={rIdx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            {row.map((cell, cIdx) => (
                              <TableCell
                                key={cIdx}
                                sx={{
                                  color: cIdx === 0 ? 'text.primary' : 'text.secondary',
                                  fontWeight: cIdx === 0 ? 600 : 400,
                                  py: 1.5,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                );
              }

              return null;
            })}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 4, mb: 5 }}>
              <Tag size={15} color="#8896b3" />
              {post.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    bgcolor: 'rgba(255,255,255,0.04)',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              ))}
            </Box>
          )}

          {/* Interactive Tool CTA Box */}
          <Box
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(0, 201, 255, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
              border: '1px solid rgba(0, 201, 255, 0.3)',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 3,
              mb: 6,
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ mb: 0.5 }}>
                Try LyZov Studio Tools Today
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, lineHeight: 1.6 }}>
                Crop 500+ marketplace shipping labels in seconds or automate GSTR-1 and GSTR-3B monthly tax reconciliation directly from your browser.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                component={Link}
                to="/cropper"
                variant="contained"
                startIcon={<Scissors size={16} />}
                sx={{
                  bgcolor: '#00c9ff',
                  color: '#000',
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 2.5,
                  px: 2,
                  '&:hover': { bgcolor: '#38bdf8' },
                }}
              >
                Label Cropper
              </Button>
              <Button
                component={Link}
                to="/gst-tool"
                variant="outlined"
                startIcon={<FileSpreadsheet size={16} />}
                sx={{
                  borderColor: 'rgba(0, 201, 255, 0.4)',
                  color: '#00c9ff',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2.5,
                  px: 2,
                  '&:hover': {
                    borderColor: '#00c9ff',
                    bgcolor: 'rgba(0, 201, 255, 0.05)',
                  },
                }}
              >
                GST Tool
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Sidebar: Table of Contents & Quick Links */}
        <Box
          sx={{
            position: { lg: 'sticky' },
            top: { lg: 100 },
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {headings.length > 0 && (
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                color="text.primary"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <List size={16} color="#00c9ff" /> Table of Contents
              </Typography>
              <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {headings.map((h) => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    style={{
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      lineHeight: 1.4,
                      color: 'var(--gst-text-sec, #8896b3)',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.target.style.color = '#00c9ff')}
                    onMouseLeave={(e) => (e.target.style.color = 'var(--gst-text-sec, #8896b3)')}
                  >
                    {h.title}
                  </a>
                ))}
              </Box>
            </Box>
          )}

          {/* Quick Support / Contact Card */}
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
              Questions about this setup?
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.6 }}>
              Our operations team helps marketplace merchants optimize packaging setups and tax workflows.
            </Typography>
            <Button
              component={Link}
              to="/contact"
              variant="outlined"
              size="small"
              fullWidth
              sx={{
                borderColor: 'divider',
                color: 'text.primary',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
              }}
            >
              Contact Support
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Related Articles Section */}
      {relatedPosts.length > 0 && (
        <Box sx={{ mt: 6, pt: 5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" fontWeight={900} color="text.primary" sx={{ mb: 3 }}>
            Related Guides &amp; Articles
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {relatedPosts.map((rel) => (
              <Box
                key={rel.slug}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, border-color 0.2s',
                  '&:hover': {
                    borderColor: 'rgba(0, 201, 255, 0.4)',
                    transform: 'translateY(-3px)',
                  },
                }}
              >
                <Chip
                  label={rel.category}
                  size="small"
                  sx={{
                    alignSelf: 'flex-start',
                    mb: 1.5,
                    fontSize: '0.7rem',
                    bgcolor: 'rgba(0,201,255,0.08)',
                    color: '#00c9ff',
                    fontWeight: 700,
                  }}
                />
                <Typography
                  component={Link}
                  to={`/blog/${rel.slug}`}
                  variant="subtitle1"
                  fontWeight={800}
                  sx={{
                    color: 'text.primary',
                    textDecoration: 'none',
                    lineHeight: 1.35,
                    mb: 1.5,
                    '&:hover': { color: '#00c9ff' },
                  }}
                >
                  {rel.title}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.6,
                    mb: 2,
                    flexGrow: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {rel.excerpt}
                </Typography>
                <Button
                  component={Link}
                  to={`/blog/${rel.slug}`}
                  size="small"
                  endIcon={<ArrowRight size={14} />}
                  sx={{
                    alignSelf: 'flex-start',
                    color: '#00c9ff',
                    fontWeight: 700,
                    textTransform: 'none',
                    p: 0,
                    '&:hover': { bgcolor: 'transparent', color: '#38bdf8' },
                  }}
                >
                  Read guide
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </PageLayout>
  );
}
