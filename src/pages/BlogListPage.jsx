import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Chip, TextField, InputAdornment, Button, CircularProgress } from '@mui/material';
import {
  Search,
  Clock,
  Calendar,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { BLOG_POSTS } from '../data/blogPosts.js';
import { gstApi, getActiveUser } from '../gst-tool/api/client';

const CATEGORIES = ['All', 'Shipping & Printing', 'E-Commerce', 'GST & Taxes'];

export default function BlogListPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState(BLOG_POSTS);
  const [loading, setLoading] = useState(false);

  const currentUser = useMemo(() => getActiveUser(), []);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await gstApi.getBlogPosts();
        if (isMounted && res?.posts && res.posts.length > 0) {
          setPosts(res.posts);
        }
      } catch (err) {
        // Retain fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchCategory =
        selectedCategory === 'All' || post.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.tags && post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchCategory && matchSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  return (
    <PageLayout
      title="E-Commerce Seller Blog & Guides"
      description="Practical guides, thermal printer setup tutorials, batch shipping label cropping tips, and GST return compliance guides for Amazon, Flipkart, and Meesho sellers."
      maxWidth={{ xs: '100%', sm: 840, md: 1040, lg: 1240 }}
    >
      {/* Simple, Elegant Header */}
      <Box sx={{ pt: 2, pb: 4, mb: 4, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<BookOpen size={14} color="#00c9ff" />}
              label="Seller Resource Center"
              size="small"
              sx={{
                bgcolor: 'rgba(0, 201, 255, 0.1)',
                color: '#00c9ff',
                fontWeight: 700,
                fontSize: '0.78rem',
                border: '1px solid rgba(0, 201, 255, 0.25)',
              }}
            />
            {isAdmin && (
              <Chip
                component={Link}
                to="/gst-tool/admin"
                label="🛡️ Admin CMS"
                size="small"
                clickable
                sx={{
                  bgcolor: 'rgba(239, 68, 68, 0.15)',
                  color: '#fca5a5',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.25)' },
                }}
              />
            )}
          </Box>
        </Box>

        <Typography
          component="h1"
          variant="h3"
          fontWeight={900}
          sx={{
            letterSpacing: '-0.8px',
            color: 'text.primary',
            fontSize: { xs: '2rem', sm: '2.6rem', md: '3rem' },
            lineHeight: 1.2,
            mb: 1.5,
          }}
        >
          Guides &amp; Insights for{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #00c9ff 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Online Sellers
          </span>
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            fontSize: { xs: '1.05rem', sm: '1.15rem' },
            lineHeight: 1.7,
            maxWidth: 720,
            mb: 3.5,
          }}
        >
          Practical tutorials on 4x6 thermal printer setups, batch courier label cropping, and statutory GST return reconciliation.
        </Typography>

        {/* Filter Pills & Search in One Row */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          {/* Category Tabs */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <Button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  variant={active ? 'contained' : 'outlined'}
                  size="small"
                  sx={{
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.88rem',
                    py: 0.6,
                    px: 1.8,
                    borderColor: active ? 'transparent' : 'divider',
                    color: active ? '#000' : 'text.secondary',
                    bgcolor: active ? '#00c9ff' : 'transparent',
                    '&:hover': {
                      bgcolor: active ? '#38bdf8' : 'action.hover',
                      borderColor: active ? 'transparent' : '#00c9ff',
                    },
                  }}
                >
                  {cat}
                </Button>
              );
            })}
          </Box>

          {/* Search Box */}
          <Box sx={{ width: { xs: '100%', md: 280 } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="var(--gst-text-sec, #8896b3)" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  fontSize: '0.9rem',
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Clean Article Cards Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} sx={{ color: '#00c9ff' }} />
        </Box>
      ) : filteredPosts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            No matching guides found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try another search term or reset your category filter.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Reset Filters
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            mb: 8,
          }}
        >
          {filteredPosts.map((post) => (
            <Box
              key={post.id || post.slug}
              component={Link}
              to={`/blog/${post.slug}`}
              sx={{
                p: { xs: 3, sm: 3.5 },
                borderRadius: 3.5,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.22s ease',
                '&:hover': {
                  borderColor: '#00c9ff',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 24px -6px rgba(0,201,255,0.12)',
                },
              }}
            >
              <Box>
                {/* Meta Row: Category & Read Time */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Chip
                    label={post.category}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      bgcolor: 'rgba(0, 201, 255, 0.08)',
                      color: '#00c9ff',
                      border: '1px solid rgba(0, 201, 255, 0.2)',
                    }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.82rem' }}
                  >
                    <Clock size={13} /> {post.readTime}
                  </Typography>
                </Box>

                {/* Big Readable Title */}
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    color: 'text.primary',
                    fontSize: { xs: '1.15rem', sm: '1.25rem' },
                    lineHeight: 1.35,
                    mb: 1.5,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {post.title}
                </Typography>

                {/* Readable Excerpt with larger font */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: '0.98rem',
                    lineHeight: 1.65,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 3,
                  }}
                >
                  {post.excerpt}
                </Typography>
              </Box>

              {/* Bottom Row: Author & Read Link */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  By <strong style={{ color: 'var(--gst-text, #f0f4ff)' }}>LyZov</strong>
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#00c9ff', fontWeight: 700, fontSize: '0.88rem' }}>
                  Read guide <ArrowRight size={14} />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </PageLayout>
  );
}
