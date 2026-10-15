import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../gst.css';
import {
  Users, Shield, Search, RefreshCw, Building2,
  FileText, CheckCircle2, Clock, Crown, Mail,
  Phone, Trash2, Edit3, ArrowUpDown, AlertTriangle,
  X, BookOpen, Plus, Eye, ExternalLink, Sparkles
} from 'lucide-react';
import { gstApi, getActiveUser } from '../api/client';

export default function GstAdminPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [adminTab, setAdminTab] = useState('customers'); // 'customers' | 'blogs'
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  // Plan Edit Modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editPlan, setEditPlan] = useState('trial');
  const [extendDays, setExtendDays] = useState(0);
  const [savingPlan, setSavingPlan] = useState(false);
  const [modalSuccess, setModalSuccess] = useState('');

  // Blog CMS state
  const [blogs, setBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [savingBlog, setSavingBlog] = useState(false);
  const [seedingBlogs, setSeedingBlogs] = useState(false);
  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    category: 'Shipping & Printing',
    readTime: '5 min read',
    excerpt: '',
    authorName: 'LyZov',
    tags: 'Shipping, Thermal Printing',
    featured: false,
    isPublished: true,
    paragraphsText: '',
  });

  useEffect(() => {
    const user = getActiveUser();
    setCurrentUser(user);

    if (!user || user.role !== 'admin') {
      // If not admin, redirect to regular dashboard
      navigate('/gst-tool/dashboard');
      return;
    }

    loadAdminData();
  }, [navigate]);

  async function loadAdminData() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, customersRes] = await Promise.all([
        gstApi.getAdminStats(),
        gstApi.getAdminCustomers(),
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (customersRes?.customers) setCustomers(customersRes.customers);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError(err.message || 'Failed to fetch admin data. Check permissions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePlan(e) {
    e.preventDefault();
    if (!selectedCustomer) return;

    setSavingPlan(true);
    setModalSuccess('');
    try {
      await gstApi.updateCustomerPlan(selectedCustomer.id, {
        plan: editPlan,
        extendDays: parseInt(extendDays, 10) || 0,
      });

      setModalSuccess('Customer plan updated successfully!');
      setTimeout(() => {
        setSelectedCustomer(null);
        setModalSuccess('');
        loadAdminData();
      }, 1000);
    } catch (err) {
      alert(err.message || 'Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleDeleteCustomer(cust) {
    if (!window.confirm(`Are you sure you want to permanently delete customer "${cust.name}" (${cust.email})? This removes all their businesses and return filings.`)) {
      return;
    }

    try {
      await gstApi.deleteCustomer(cust.id);
      loadAdminData();
    } catch (err) {
      alert(err.message || 'Failed to delete customer');
    }
  }

  // --- Blog CMS Handlers ---
  async function loadBlogPosts() {
    setLoadingBlogs(true);
    try {
      const res = await gstApi.getAdminBlogPosts();
      if (res?.posts) setBlogs(res.posts);
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setLoadingBlogs(false);
    }
  }

  function openCreateBlogModal() {
    setEditingBlog(null);
    setBlogForm({
      title: '',
      slug: '',
      category: 'Shipping & Printing',
      readTime: '5 min read',
      excerpt: '',
      authorName: 'LyZov',
      tags: 'Shipping, Thermal Printing',
      featured: false,
      isPublished: true,
      paragraphsText: '',
    });
    setBlogModalOpen(true);
  }

  function openEditBlogModal(blog) {
    setEditingBlog(blog);
    const bodyText = blog.content
      ? blog.content.map(b => b.text || '').filter(Boolean).join('\n\n')
      : '';

    setBlogForm({
      title: blog.title || '',
      slug: blog.slug || '',
      category: blog.category || 'Shipping & Printing',
      readTime: blog.readTime || '5 min read',
      excerpt: blog.excerpt || '',
      authorName: blog.author?.name || 'LyZov',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
      featured: Boolean(blog.featured),
      isPublished: blog.isPublished !== undefined ? Boolean(blog.isPublished) : true,
      paragraphsText: bodyText,
    });
    setBlogModalOpen(true);
  }

  async function handleSaveBlog(e) {
    e.preventDefault();
    if (!blogForm.title.trim()) {
      alert('Please enter an article title.');
      return;
    }

    const slug = blogForm.slug.trim()
      ? blogForm.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : blogForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const paragraphs = blogForm.paragraphsText
      .split('\n\n')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => ({
        type: 'paragraph',
        text: p,
      }));

    const payload = {
      title: blogForm.title.trim(),
      slug,
      category: blogForm.category,
      readTime: blogForm.readTime.trim(),
      excerpt: blogForm.excerpt.trim(),
      author: {
        name: blogForm.authorName.trim() || 'LyZov',
        role: 'Logistics Specialist',
        avatar: '📦',
      },
      tags: blogForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      featured: blogForm.featured,
      isPublished: blogForm.isPublished,
      content: editingBlog?.content?.length ? editingBlog.content : paragraphs,
    };

    setSavingBlog(true);
    try {
      if (editingBlog) {
        await gstApi.updateBlogPost(editingBlog._id, payload);
      } else {
        await gstApi.createBlogPost(payload);
      }
      setBlogModalOpen(false);
      loadBlogPosts();
    } catch (err) {
      alert(err.message || 'Failed to save blog post');
    } finally {
      setSavingBlog(false);
    }
  }

  async function handleDeleteBlog(blog) {
    if (!window.confirm(`Are you sure you want to delete article "${blog.title}"?`)) return;
    try {
      await gstApi.deleteBlogPost(blog._id);
      loadBlogPosts();
    } catch (err) {
      alert(err.message || 'Failed to delete article');
    }
  }

  async function handleTogglePublish(blog) {
    try {
      await gstApi.updateBlogPost(blog._id, { isPublished: !blog.isPublished });
      loadBlogPosts();
    } catch (err) {
      alert(err.message || 'Failed to update publication status');
    }
  }

  async function handleSeedBlogs() {
    setSeedingBlogs(true);
    try {
      const res = await gstApi.seedBlogPosts();
      alert(res.message || 'Seeded successfully!');
      loadBlogPosts();
    } catch (err) {
      alert(err.message || 'Failed to seed blog articles');
    } finally {
      setSeedingBlogs(false);
    }
  }

  const filteredCustomers = customers.filter(c => {
    const matchSearch =
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.businesses?.some(b => b.gstin?.toLowerCase().includes(searchQuery.toLowerCase()) || b.legalName?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchPlan = planFilter === 'all' || c.plan === planFilter;

    return matchSearch && matchPlan;
  });

  return (
    <div className="gst-animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(245,166,35,0.2))',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#fca5a5', fontSize: '0.75rem', fontWeight: 800,
              padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              Super Admin Console
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            {adminTab === 'customers' ? 'Customer Management & System Directory' : 'Blog & Guides CMS Manager'}
          </h1>
          <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.88rem' }}>
            {adminTab === 'customers'
              ? 'Restricted administrative view — Manage registered sellers, monitor contact details, subscriptions, and filings.'
              : 'Publish, edit, and optimize SEO guide articles for marketplace sellers directly into MongoDB.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {adminTab === 'blogs' && (
            <>
              <button
                className="gst-btn gst-btn-outline"
                onClick={handleSeedBlogs}
                disabled={seedingBlogs}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
              >
                <Sparkles size={14} color="#00c9ff" />
                {seedingBlogs ? 'Seeding...' : 'Seed Default Articles'}
              </button>
              <button
                className="gst-btn gst-btn-primary"
                onClick={openCreateBlogModal}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
              >
                <Plus size={15} />
                New Guide
              </button>
            </>
          )}

          <button
            className="gst-btn gst-btn-outline"
            onClick={adminTab === 'customers' ? loadAdminData : loadBlogPosts}
            disabled={loading || loadingBlogs}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={14} className={(loading || loadingBlogs) ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Admin Section Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--gst-border)', paddingBottom: 14 }}>
        <button
          className={`gst-btn ${adminTab === 'customers' ? 'gst-btn-primary' : 'gst-btn-outline'}`}
          onClick={() => setAdminTab('customers')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}
        >
          <Users size={16} />
          Sellers Directory ({customers.length})
        </button>
        <button
          className={`gst-btn ${adminTab === 'blogs' ? 'gst-btn-primary' : 'gst-btn-outline'}`}
          onClick={() => {
            setAdminTab('blogs');
            loadBlogPosts();
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}
        >
          <BookOpen size={16} />
          Blog & Guides CMS ({blogs.length || '...'})
        </button>
      </div>

      {error && (
        <div style={{
          padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--gst-radius)', color: '#fca5a5', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW 1: CUSTOMERS DIRECTORY */}
      {adminTab === 'customers' && (
        <>
          {/* KPI Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Registered Sellers', value: stats?.totalUsers ?? '...', color: 'var(--gst-emerald)', icon: Users },
              { label: 'Active Trial Sellers', value: stats?.trialUsers ?? '...', color: 'var(--gst-gold)', icon: Clock },
              { label: 'Paid Subscribers', value: stats?.paidUsers ?? '...', color: 'var(--gst-purple)', icon: Crown },
              { label: 'Business GSTINs Added', value: stats?.totalBusinesses ?? '...', color: 'var(--gst-blue)', icon: Building2 },
              { label: 'Returns Processed', value: stats?.totalReturns ?? '...', color: 'var(--gst-emerald)', icon: FileText },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="gst-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--gst-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={18} color={s.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gst-text-sec)', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

      {/* Filters and Search Bar */}
      <div className="gst-card" style={{ marginBottom: 24, padding: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={16} color="var(--gst-text-sec)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="gst-input"
              placeholder="Search by customer name, email, phone, or GSTIN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          {/* Plan Filter */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gst-text-sec)', fontWeight: 600 }}>Plan:</span>
            {['all', 'trial', 'starter', 'pro'].map(p => (
              <button
                key={p}
                className={`gst-btn gst-btn-sm ${planFilter === p ? 'gst-btn-primary' : 'gst-btn-outline'}`}
                onClick={() => setPlanFilter(p)}
                style={{ textTransform: 'capitalize' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="gst-card" style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Registered Sellers Directory ({filteredCustomers.length})
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--gst-text-sec)' }}>
            Strict privacy active — Only admins can see this directory
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gst-text-sec)' }}>
            Loading customer accounts...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gst-text-sec)' }}>
            No customer accounts matched your search.
          </div>
        ) : (
          <div className="gst-table-wrap">
            <table className="gst-table">
              <thead>
                <tr>
                  <th>Customer / Contact</th>
                  <th>Business & GSTIN</th>
                  <th>Role</th>
                  <th>Subscription Plan</th>
                  <th>Filings</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(cust => (
                  <tr key={cust.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gst-text)' }}>{cust.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--gst-text-sec)', marginTop: 2 }}>
                        <Mail size={12} /> {cust.email}
                      </div>
                      {cust.phone && cust.phone !== '—' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--gst-text-sec)', marginTop: 2 }}>
                          <Phone size={12} /> {cust.phone}
                        </div>
                      )}
                    </td>

                    <td>
                      {cust.businesses?.length > 0 ? (
                        cust.businesses.map(b => (
                          <div key={b.id || b.gstin} style={{ marginBottom: 4 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.legalName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--gst-gold)', fontFamily: 'monospace' }}>
                              {b.gstin} ({b.stateName || b.stateCode})
                            </div>
                          </div>
                        ))
                      ) : (
                        <span style={{ color: 'var(--gst-text-sec)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                          No GSTIN added yet
                        </span>
                      )}
                    </td>

                    <td>
                      {cust.role === 'admin' ? (
                        <span style={{
                          background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
                          border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px',
                          borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                        }}>
                          Admin
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(59,130,246,0.1)', color: '#93c5fd',
                          border: '1px solid rgba(59,130,246,0.2)', padding: '2px 8px',
                          borderRadius: 6, fontSize: '0.75rem', fontWeight: 600
                        }}>
                          Seller
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`gst-tag ${cust.plan === 'pro' ? 'gst-tag-success' : cust.plan === 'starter' ? 'gst-tag-warning' : 'gst-tag-info'}`} style={{ textTransform: 'capitalize' }}>
                        {cust.plan}
                      </span>
                      {cust.plan === 'trial' && cust.trialEndsAt && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--gst-text-sec)', marginTop: 4 }}>
                          Expires: {new Date(cust.trialEndsAt).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, color: cust.returnsCount > 0 ? 'var(--gst-emerald)' : 'var(--gst-text-sec)' }}>
                        {cust.returnsCount} returns
                      </span>
                    </td>

                    <td style={{ color: 'var(--gst-text-sec)', fontSize: '0.82rem' }}>
                      {new Date(cust.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="gst-btn gst-btn-sm gst-btn-outline"
                          title="Manage Plan / Extend Trial"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setEditPlan(cust.plan || 'trial');
                            setExtendDays(0);
                            setModalSuccess('');
                          }}
                        >
                          <Edit3 size={12} /> Edit Plan
                        </button>
                        {cust.id !== currentUser?.id && cust.role !== 'admin' && (
                          <button
                            className="gst-btn gst-btn-sm"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                            title="Delete User"
                            onClick={() => handleDeleteCustomer(cust)}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* VIEW 2: BLOG & GUIDES CMS */}
      {adminTab === 'blogs' && (
        <div>
          {/* Blog KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
            <div className="gst-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'rgba(0,201,255,0.1)', border: '1px solid rgba(0,201,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <BookOpen size={18} color="#00c9ff" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gst-text-sec)', marginBottom: 2 }}>Total Articles</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00c9ff', lineHeight: 1 }}>{blogs.length}</div>
              </div>
            </div>

            <div className="gst-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <CheckCircle2 size={18} color="var(--gst-emerald)" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gst-text-sec)', marginBottom: 2 }}>Published Active</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gst-emerald)', lineHeight: 1 }}>
                  {blogs.filter(b => b.isPublished).length}
                </div>
              </div>
            </div>

            <div className="gst-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Eye size={18} color="#a855f7" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gst-text-sec)', marginBottom: 2 }}>Total Reader Views</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a855f7', lineHeight: 1 }}>
                  {blogs.reduce((acc, b) => acc + (b.views || 0), 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Blog Table Card */}
          <div className="gst-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Marketplace Guides &amp; Articles</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--gst-text-sec)' }}>
                  All published guides are instantly available at <code>/blog</code> and individual URLs at <code>/blog/:slug</code>.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  to="/blog"
                  target="_blank"
                  className="gst-btn gst-btn-outline gst-btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <ExternalLink size={14} /> View Public Blog
                </Link>
                <button
                  className="gst-btn gst-btn-primary gst-btn-sm"
                  onClick={openCreateBlogModal}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={14} /> Add Article
                </button>
              </div>
            </div>

            {loadingBlogs ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gst-text-sec)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                <p>Loading blog articles from database...</p>
              </div>
            ) : blogs.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <BookOpen size={36} color="var(--gst-text-sec)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>No Articles in Database Yet</h3>
                <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.85rem', marginBottom: 18 }}>
                  Click below to seed default high-ranking SEO guides into MongoDB automatically.
                </p>
                <button
                  className="gst-btn gst-btn-primary"
                  onClick={handleSeedBlogs}
                  disabled={seedingBlogs}
                >
                  <Sparkles size={15} style={{ marginRight: 6 }} />
                  {seedingBlogs ? 'Seeding...' : 'Seed 4 Production Guides Now'}
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="gst-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Article Title &amp; Slug</th>
                      <th>Category</th>
                      <th>Read Time</th>
                      <th>Views</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogs.map(b => (
                      <tr key={b._id || b.slug}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--gst-text)', fontSize: '0.9rem', marginBottom: 2 }}>
                            {b.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gst-text-sec)', fontFamily: 'monospace' }}>
                            /blog/{b.slug}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                            background: 'rgba(0,201,255,0.1)', color: '#00c9ff', border: '1px solid rgba(0,201,255,0.2)'
                          }}>
                            {b.category}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--gst-text-sec)' }}>
                          {b.readTime || '5 min read'}
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gst-text)' }}>
                          {b.views || 0}
                        </td>
                        <td>
                          <button
                            onClick={() => handleTogglePublish(b)}
                            style={{
                              border: 'none', background: 'none', cursor: 'pointer', padding: 0
                            }}
                            title="Click to toggle status"
                          >
                            <span style={{
                              padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800,
                              background: b.isPublished ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: b.isPublished ? 'var(--gst-emerald)' : '#fca5a5',
                              border: `1px solid ${b.isPublished ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                              cursor: 'pointer'
                            }}>
                              {b.isPublished ? '● Published' : '○ Draft'}
                            </span>
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Link
                              to={`/blog/${b.slug}`}
                              target="_blank"
                              title="Preview Article"
                              style={{ color: 'var(--gst-text-sec)', padding: 4 }}
                            >
                              <ExternalLink size={15} />
                            </Link>
                            <button
                              onClick={() => openEditBlogModal(b)}
                              title="Edit Article"
                              style={{ background: 'none', border: 'none', color: '#00c9ff', cursor: 'pointer', padding: 4 }}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteBlog(b)}
                              title="Delete Article"
                              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 4 }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blog Create / Edit Modal */}
      {blogModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div className="gst-card gst-animate-in" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => setBlogModalOpen(false)}
              style={{
                position: 'absolute', right: 16, top: 16, background: 'none',
                border: 'none', color: 'var(--gst-text-sec)', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>
              {editingBlog ? 'Edit Marketplace Guide' : 'Create New Marketplace Guide'}
            </h3>
            <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.85rem', marginBottom: 20 }}>
              Published articles are automatically indexed and available to sellers.
            </p>

            <form onSubmit={handleSaveBlog}>
              <div className="gst-form-group">
                <label className="gst-label">Article Title *</label>
                <input
                  type="text"
                  className="gst-input"
                  required
                  placeholder="e.g., The Ultimate Guide to Thermal Printing for E-Commerce..."
                  value={blogForm.title}
                  onChange={e => setBlogForm({ ...blogForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="gst-form-group">
                  <label className="gst-label">URL Slug (leave blank to auto-generate)</label>
                  <input
                    type="text"
                    className="gst-input"
                    placeholder="e.g., thermal-printer-guide"
                    value={blogForm.slug}
                    onChange={e => setBlogForm({ ...blogForm, slug: e.target.value })}
                  />
                </div>

                <div className="gst-form-group">
                  <label className="gst-label">Category</label>
                  <select
                    className="gst-input"
                    value={blogForm.category}
                    onChange={e => setBlogForm({ ...blogForm, category: e.target.value })}
                  >
                    <option value="Shipping & Printing">Shipping &amp; Printing</option>
                    <option value="E-Commerce">E-Commerce</option>
                    <option value="GST & Taxes">GST &amp; Taxes</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="gst-form-group">
                  <label className="gst-label">Read Time</label>
                  <input
                    type="text"
                    className="gst-input"
                    placeholder="e.g., 5 min read"
                    value={blogForm.readTime}
                    onChange={e => setBlogForm({ ...blogForm, readTime: e.target.value })}
                  />
                </div>

                <div className="gst-form-group">
                  <label className="gst-label">Author Name</label>
                  <input
                    type="text"
                    className="gst-input"
                    value={blogForm.authorName}
                    onChange={e => setBlogForm({ ...blogForm, authorName: e.target.value })}
                  />
                </div>
              </div>

              <div className="gst-form-group">
                <label className="gst-label">Summary / Excerpt (SEO Meta Description) *</label>
                <textarea
                  className="gst-input"
                  rows={2}
                  required
                  placeholder="Short, compelling 1-2 sentence preview..."
                  value={blogForm.excerpt}
                  onChange={e => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                />
              </div>

              <div className="gst-form-group">
                <label className="gst-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  className="gst-input"
                  placeholder="Thermal, 4x6, Amazon, Meesho"
                  value={blogForm.tags}
                  onChange={e => setBlogForm({ ...blogForm, tags: e.target.value })}
                />
              </div>

              <div className="gst-form-group">
                <label className="gst-label">Article Paragraphs (separate paragraphs with blank line)</label>
                <textarea
                  className="gst-input"
                  rows={6}
                  placeholder="Write your article text here. Double line breaks create separate paragraphs..."
                  value={blogForm.paragraphsText}
                  onChange={e => setBlogForm({ ...blogForm, paragraphsText: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={blogForm.isPublished}
                    onChange={e => setBlogForm({ ...blogForm, isPublished: e.target.checked })}
                  />
                  <span>Publish Article Immediately</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={blogForm.featured}
                    onChange={e => setBlogForm({ ...blogForm, featured: e.target.checked })}
                  />
                  <span>Mark as Featured Guide</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="gst-btn gst-btn-ghost"
                  onClick={() => setBlogModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gst-btn gst-btn-primary"
                  disabled={savingBlog}
                >
                  {savingBlog ? 'Saving...' : editingBlog ? 'Update Article' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan / Trial Edit Modal */}
      {selectedCustomer && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div className="gst-card gst-animate-in" style={{ width: '100%', maxWidth: 460, position: 'relative' }}>
            <button
              onClick={() => setSelectedCustomer(null)}
              style={{
                position: 'absolute', right: 16, top: 16, background: 'none',
                border: 'none', color: 'var(--gst-text-sec)', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>
              Manage Customer Subscription
            </h3>
            <p style={{ color: 'var(--gst-text-sec)', fontSize: '0.85rem', marginBottom: 20 }}>
              Adjust plan and trial period for <strong>{selectedCustomer.name}</strong> ({selectedCustomer.email}).
            </p>

            {modalSuccess && (
              <div style={{
                padding: '10px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 8, color: 'var(--gst-emerald)', fontSize: '0.85rem', marginBottom: 16
              }}>
                ✓ {modalSuccess}
              </div>
            )}

            <form onSubmit={handleUpdatePlan}>
              <div className="gst-form-group">
                <label className="gst-label">Subscription Plan</label>
                <select
                  className="gst-input"
                  value={editPlan}
                  onChange={e => setEditPlan(e.target.value)}
                >
                  <option value="trial">Trial (Free 30-Day Evaluation)</option>
                  <option value="starter">Starter (Single GSTIN - ₹149/mo)</option>
                  <option value="pro">Pro (Unlimited GSTINs - ₹499/mo)</option>
                </select>
              </div>

              <div className="gst-form-group">
                <label className="gst-label">Extend Trial By (Days)</label>
                <select
                  className="gst-input"
                  value={extendDays}
                  onChange={e => setExtendDays(Number(e.target.value))}
                >
                  <option value={0}>Do not extend</option>
                  <option value={15}>+ 15 Days</option>
                  <option value={30}>+ 30 Days (1 Month)</option>
                  <option value={60}>+ 60 Days (2 Months)</option>
                  <option value={365}>+ 365 Days (1 Year)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  className="gst-btn gst-btn-ghost"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gst-btn gst-btn-primary"
                  disabled={savingPlan}
                >
                  {savingPlan ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
