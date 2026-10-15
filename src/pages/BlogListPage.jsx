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
  Layers,
  Scissors,
  FileText,
  Tag,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { BLOG_POSTS } from '../data/blogPosts';
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
        // Retain fallback BLOG_POSTS
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

  const featuredPost = useMemo(() => {
    return posts.find((p) => p.featured) || posts[0];
  }, [posts]);

  return (
    <PageLayout
      title="E-Commerce Seller Blog & Guides"
      description="Practical guides, thermal printer setup tutorials, batch shipping label cropping tips, and GST return compliance guides for Amazon, Flipkart, and Meesho sellers."
      maxWidth={1240}
    >
      {/* Hero Header */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: 3, md: 4 },
          p: { xs: 3, sm: 4, md: 5 },
          mb: 4,
          background:
            'radial-gradient(ellipse at top left, rgba(0,201,255,0.12) 0%, rgba(168,85,247,0.08) 50%, rgba(0,0,0,0) 80%), rgba(255,255,255,0.02)',
          border: '1px solid',
          borderColor: 'rgba(0,201,255,0.2)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ maxWidth: 840 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<Sparkles size={14} color="#00c9ff" />}
              label="Seller Resource Center"
              size="small"
              sx={{
                bgcolor: 'rgba(0,201,255,0.12)',
                color: '#00c9ff',
                fontWeight: 700,
                border: '1px solid rgba(0,201,255,0.3)',
              }}
            />
            <Chip
              icon={<BookOpen size={14} color="#10b981" />}
              label="Shipping, Printing & Tax Guides"
              size="small"
              sx={{
                bgcolor: 'rgba(16,185,129,0.12)',
                color: '#10b981',
                fontWeight: 700,
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            />
            {isAdmin && (
              <Chip
                component={Link}
                to="/gst-tool/admin"
                label="🛡️ Open Admin CMS"
                size="small"
                clickable
                sx={{
                  bgcolor: 'rgba(239,68,68,0.15)',
                  color: '#fca5a5',
                  fontWeight: 800,
                  border: '1px solid rgba(239,68,68,0.4)',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(239,68,68,0.25)' },
                }}
              />
            )}
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
            Insights &amp; Guides for{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00c9ff 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Marketplace Sellers
            </span>
          </Typography>

          <Typography color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 680, mb: 3 }}>
            Actionable technical tutorials on thermal printer calibration, high-speed shipping label cropping, and statutory GST reconciliation for Indian marketplace merchants.
          </Typography>

          {/* Search bar */}
          <Box sx={{ maxWidth: 480 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search guides by topic, keyword, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} color="var(--gst-text-sec, #8896b3)" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                  fontSize: '0.9rem',
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Category Filter Tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap' }}>
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
                fontSize: '0.85rem',
                py: 0.75,
                px: 2,
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

      {/* Featured Article Card (shown when no active search query and on 'All' or match) */}
      {!searchQuery && selectedCategory === 'All' && featuredPost && (
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3.5,
            mb: 5,
            background: 'linear-gradient(135deg, rgba(0,201,255,0.08) 0%, rgba(168,85,247,0.06) 100%)',
            border: '1px solid rgba(0,201,255,0.3)',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.4fr 0.6fr' },
            gap: 3,
            alignItems: 'center',
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip
                label="Featured Guide"
                size="small"
                sx={{
                  bgcolor: 'rgba(0,201,255,0.15)',
                  color: '#00c9ff',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Clock size={13} /> {featuredPost.readTime}
              </Typography>
            </Box>

            <Typography
              component={Link}
              to={`/blog/${featuredPost.slug}`}
              variant="h5"
              fontWeight={900}
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                display: 'block',
                mb: 1.5,
                lineHeight: 1.3,
                '&:hover': { color: '#00c9ff' },
              }}
            >
              {featuredPost.title}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2.5 }}>
              {featuredPost.excerpt}
            </Typography>

            <Button
              component={Link}
              to={`/blog/${featuredPost.slug}`}
              variant="contained"
              endIcon={<ArrowRight size={16} />}
              sx={{
                bgcolor: '#00c9ff',
                color: '#000',
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2.5,
                px: 2.5,
                '&:hover': { bgcolor: '#38bdf8' },
              }}
            >
              Read Full Guide
            </Button>
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              gap: 1.5,
              p: 3,
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} color="text.primary">
              What you will learn:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', fontSize: '0.85rem', lineHeight: 1.8 }}>
              <li>203 vs 300 DPI printer head resolution</li>
              <li>Optimal thermal darkness & speed values</li>
              <li>Eliminating courier barcode scan failures</li>
              <li>Zero-ink economics and cost calculations</li>
            </Box>
          </Box>
        </Box>
      )}

      {/* Articles Grid */}
      <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5, color: 'text.primary' }}>
        {filteredPosts.length} {filteredPosts.length === 1 ? 'Article' : 'Articles'} Found
      </Typography>

      {filteredPosts.length === 0 ? (
        <Box
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: 'background.paper',
            borderRadius: 3.5,
            border: '1px solid',
            borderColor: 'divider',
            mb: 6,
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>
            No matching articles found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your search query or reset the category filter.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Reset Filters
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 6,
          }}
        >
          {filteredPosts.map((post) => (
            <Box
              key={post.id}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3.5,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: '#00c9ff',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 12px 28px -10px rgba(0,201,255,0.15)',
                },
              }}
            >
              <Box>
                {/* Meta pill & read time */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Chip
                    label={post.category}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(0,201,255,0.08)',
                      color: '#00c9ff',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.78rem' }}>
                    <Clock size={13} />
                    <span>{post.readTime}</span>
                  </Box>
                </Box>

                {/* Title */}
                <Typography
                  component={Link}
                  to={`/blog/${post.slug}`}
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    color: 'text.primary',
                    textDecoration: 'none',
                    lineHeight: 1.35,
                    fontSize: '1.05rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 1.5,
                    '&:hover': { color: '#00c9ff' },
                  }}
                >
                  {post.title}
                </Typography>

                {/* Excerpt */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.65,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 2.5,
                    fontSize: '0.88rem',
                  }}
                >
                  {post.excerpt}
                </Typography>

                {/* Tags */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3 }}>
                  {post.tags.slice(0, 3).map((tag) => (
                    <Chip
                      key={tag}
                      label={`#${tag}`}
                      size="small"
                      sx={{
                        fontSize: '0.68rem',
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                        height: 22,
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Author & Read Action */}
              <Box
                sx={{
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    {post.author.avatar}
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} sx={{ display: 'block', lineHeight: 1.1, color: 'text.primary' }}>
                      {post.author.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {new Date(post.publishedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  component={Link}
                  to={`/blog/${post.slug}`}
                  size="small"
                  endIcon={<ArrowRight size={14} />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    color: '#00c9ff',
                    p: 0,
                    minWidth: 'auto',
                    '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                  }}
                >
                  Read
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Bottom Tools Banner */}
      <Box
        sx={{
          borderRadius: 3.5,
          p: { xs: 3, sm: 4 },
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'rgba(0,201,255,0.2)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2.5,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ mb: 0.5 }}>
            Ready to speed up your packing &amp; filing?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use our free in-browser Label Cropper Studio or automate your marketplace GST compliance.
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
              '&:hover': { bgcolor: '#38bdf8' },
            }}
          >
            Open Cropper
          </Button>
          <Button
            component={Link}
            to="/gst-tool"
            variant="outlined"
            startIcon={<FileText size={16} />}
            sx={{
              borderColor: 'rgba(0,214,143,0.4)',
              color: 'var(--gst-emerald, #00d68f)',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2.5,
              '&:hover': { borderColor: '#00d68f', bgcolor: 'rgba(0,214,143,0.05)' },
            }}
          >
            GST Tool
          </Button>
        </Box>
      </Box>
    </PageLayout>
  );
}
