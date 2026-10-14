'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Copy,
  Check,
  Upload,
  Plus,
  Image as ImageIcon,
  LogIn,
  LogOut,
  Settings,
  X,
  LayoutGrid,
  List,
  Table as TableIcon,
  Printer,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  Camera,
  ExternalLink,
  ArrowUp,
  CloudCheck,
  ShieldAlert,
} from 'lucide-react';

interface Product {
  id: number;
  plu: string;
  name: string;
  category: string;
  unit: string;
  image_url: string;
  image_public_id: string;
  note: string;
  updated_at?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthState {
  authenticated: boolean;
  user: { username: string; role: string } | null;
  expiresAt: string | null;
  remainingSeconds: number;
}

// Accent remover for smooth Vietnamese searching
function normalizeVN(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'plu_asc' | 'name_asc'>('plu_asc');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Auth State
  const [auth, setAuth] = useState<AuthState>({
    authenticated: false,
    user: null,
    expiresAt: null,
    remainingSeconds: 0,
  });

  // UI States
  const [copiedPlu, setCopiedPlu] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: 'wm_admin', password: 'wm123' });
  const [loginLoading, setLoginLoading] = useState(false);

  const [uploadProduct, setUploadProduct] = useState<Product | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    plu: '',
    name: '',
    category: 'Trái Cây Nội',
    unit: 'kg',
    note: '',
    image_url: '',
  });

  const [productImageMode, setProductImageMode] = useState<'upload' | 'url'>('upload');
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [saveStep, setSaveStep] = useState('');

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    cloudinary_cloud_name: '',
    cloudinary_api_key: '',
    cloudinary_token: 'WvyrN70XVe0uR1VFDJOdkzDX6iU',
    cloudinary_url: '',
  });
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState(false);
  const [configuredCloudName, setConfiguredCloudName] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; plu: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toast Helper
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Scroll listener for Floating Scroll to Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 250);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (lightboxImage) setLightboxImage(null);
        else if (uploadProduct) setUploadProduct(null);
        else if (isLoginOpen) setIsLoginOpen(false);
        else if (isAddOpen) setIsAddOpen(false);
        else if (editProduct) setEditProduct(null);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (searchQuery) setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, uploadProduct, isLoginOpen, isAddOpen, editProduct, isSettingsOpen, searchQuery]);

  // Fetch initial data & auth check
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      } else {
        addToast(data.message || 'Lỗi tải dữ liệu', 'error');
      }
    } catch {
      addToast('Không thể kết nối đến máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setAuth({
          authenticated: true,
          user: data.user,
          expiresAt: data.expiresAt,
          remainingSeconds: data.remainingSeconds,
        });
      } else {
        setAuth({ authenticated: false, user: null, expiresAt: null, remainingSeconds: 0 });
      }
    } catch {
      // Ignored
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettingsForm({
          cloudinary_cloud_name: data.settings.cloudinary_cloud_name || '',
          cloudinary_api_key: data.settings.cloudinary_api_key || '',
          cloudinary_token: data.settings.cloudinary_token || 'WvyrN70XVe0uR1VFDJOdkzDX6iU',
          cloudinary_url: data.settings.cloudinary_url || '',
        });
        setCloudinaryConfigured(data.isConfigured || false);
        setConfiguredCloudName(data.configuredCloudName || null);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchProducts();
    checkAuth();
    fetchSettings();
  }, []);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.success) {
        setAuth({
          authenticated: true,
          user: data.user,
          expiresAt: data.expiresAt,
          remainingSeconds: 86400,
        });
        setIsLoginOpen(false);
        addToast(data.message || 'Đăng nhập thành công!', 'success');
      } else {
        addToast(data.message || 'Đăng nhập thất bại', 'error');
      }
    } catch {
      addToast('Lỗi máy chủ', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuth({ authenticated: false, user: null, expiresAt: null, remainingSeconds: 0 });
      addToast('Đã đăng xuất khỏi tài khoản quản trị', 'info');
    } catch {
      addToast('Lỗi khi đăng xuất', 'error');
    }
  };

  // Copy PLU with visual and toast feedback
  const handleCopyPlu = (plu: string, name?: string) => {
    navigator.clipboard.writeText(plu);
    setCopiedPlu(plu);
    addToast(`Đã sao chép PLU: ${plu}${name ? ` (${name})` : ''}`, 'success');
    setTimeout(() => {
      setCopiedPlu(null);
    }, 1800);
  };

  // Test Cloudinary connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          ...settingsForm,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
      });
      if (data.success) {
        addToast(data.message, 'success');
      } else {
        addToast(data.message, 'error');
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Lỗi kết nối kiểm tra Cloudinary',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Đã lưu cấu hình Cloudinary thành công!', 'success');
        setCloudinaryConfigured(data.isVerified);
        setConfiguredCloudName(data.cloudName);
        setIsSettingsOpen(false);
      } else {
        addToast(data.message || 'Lỗi khi lưu cấu hình', 'error');
      }
    } catch {
      addToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Parse CLOUDINARY_URL helper for user convenience
  const handlePasteCloudinaryUrl = (url: string) => {
    const trimmed = url.trim();
    if (trimmed.startsWith('cloudinary://')) {
      try {
        const clean = trimmed.replace('cloudinary://', '');
        const [authPart, cloudName] = clean.split('@');
        if (authPart && cloudName) {
          const [apiKey, apiSecret] = authPart.split(':');
          setSettingsForm({
            ...settingsForm,
            cloudinary_cloud_name: cloudName.trim(),
            cloudinary_api_key: apiKey?.trim() || '',
            cloudinary_token: apiSecret?.trim() || '',
            cloudinary_url: trimmed,
          });
          addToast('Đã tự động trích xuất thông tin từ URL Cloudinary!', 'info');
          return;
        }
      } catch {
        // Ignore parse error
      }
    }
    setSettingsForm({ ...settingsForm, cloudinary_url: url });
  };

  // Handle single image file selection (Upload modal) - Using ObjectURL (never Base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (uploadPreview && uploadPreview.startsWith('blob:')) {
        URL.revokeObjectURL(uploadPreview);
      }
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  // Upload image for a product
  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadProduct || !uploadFile) {
      addToast('Vui lòng chọn hình ảnh để tải lên', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('productId', String(uploadProduct.id));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Tải ảnh lên Cloudinary thành công!', 'success');
        // Update product in local state
        setProducts((prev) =>
          prev.map((p) => (p.id === uploadProduct.id ? { ...p, image_url: data.url, image_public_id: data.publicId } : p))
        );
        if (uploadPreview && uploadPreview.startsWith('blob:')) {
          URL.revokeObjectURL(uploadPreview);
        }
        setUploadProduct(null);
        setUploadFile(null);
        setUploadPreview(null);
      } else {
        addToast(data.message || 'Lỗi tải ảnh lên Cloudinary', 'error');
      }
    } catch {
      addToast('Lỗi kết nối khi tải ảnh', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Save new or edited product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalImageUrl = productForm.image_url.trim();

    // Check: STRICTLY DISALLOW Base64 in image_url
    if (finalImageUrl.startsWith('data:')) {
      addToast('Không được phép lưu ảnh Base64. Vui lòng tải file ảnh lên Cloudinary hoặc dùng link ảnh ngoài.', 'error');
      return;
    }

    setSavingProduct(true);
    try {
      // If user uploaded a new image file, upload to Cloudinary first
      if (productImageFile) {
        setSaveStep('Đang tải ảnh lên Cloudinary...');
        const formData = new FormData();
        formData.append('file', productImageFile);
        if (editProduct) {
          formData.append('productId', String(editProduct.id));
        }

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          addToast(uploadData.message || 'Lỗi khi tải ảnh lên Cloudinary', 'error');
          setSavingProduct(false);
          setSaveStep('');
          return;
        }

        finalImageUrl = uploadData.url;
      }

      setSaveStep('Đang lưu thông tin sản phẩm...');
      const payload = {
        ...productForm,
        image_url: finalImageUrl,
      };

      if (editProduct) {
        // Update
        const res = await fetch(`/api/products/${editProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          addToast('Cập nhật sản phẩm thành công', 'success');
          setProducts((prev) =>
            prev.map((p) => (p.id === editProduct.id ? { ...p, ...payload } : p))
          );
          if (productImagePreview && productImagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(productImagePreview);
          }
          setEditProduct(null);
          setProductImageFile(null);
          setProductImagePreview(null);
        } else {
          addToast(data.message || 'Lỗi cập nhật', 'error');
        }
      } else {
        // Create
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          addToast('Thêm sản phẩm thành công', 'success');
          if (productImagePreview && productImagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(productImagePreview);
          }
          setIsAddOpen(false);
          setProductImageFile(null);
          setProductImagePreview(null);
          fetchProducts();
        } else {
          addToast(data.message || 'Lỗi thêm sản phẩm', 'error');
        }
      }
    } catch {
      addToast('Lỗi kết nối khi lưu sản phẩm', 'error');
    } finally {
      setSavingProduct(false);
      setSaveStep('');
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addToast('Đã xóa sản phẩm', 'success');
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        addToast(data.message || 'Lỗi khi xóa', 'error');
      }
    } catch {
      addToast('Lỗi kết nối', 'error');
    }
  };

  // Filter & Search logic
  const filteredProducts = useMemo(() => {
    const normQuery = normalizeVN(searchQuery.trim());
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      // Query filter
      if (!normQuery) return true;
      const matchPlu = p.plu.toLowerCase().includes(normQuery);
      const matchName = normalizeVN(p.name).includes(normQuery);
      const matchNote = normalizeVN(p.note || '').includes(normQuery);
      return matchPlu || matchName || matchNote;
    });
  }, [products, searchQuery, selectedCategory]);

  // Sorted products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === 'plu_asc') {
        return a.plu.localeCompare(b.plu, undefined, { numeric: true });
      }
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [filteredProducts, sortBy]);

  // Unique categories count
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Category Badge Colors & Icon
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'Trái Cây Nội':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'Trái Cây Nhập Khẩu':
        return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
      case 'Rau Củ':
        return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
      case 'Thuỷ Hải Sản':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Thịt & Món Chế Biến':
        return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'Bánh Kẹo & Thạch':
        return { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Header */}
      <header className="app-header">
        <div className="container header-content">
          <div className="brand-section">
            <div className="brand-logo">WM</div>
            <div>
              <div className="brand-title">WinMart PLU</div>
              <div className="brand-subtitle">Tra cứu mã cân &middot; Turso LibSQL &middot; Cloudinary</div>
            </div>
          </div>

          <div className="header-actions">
            {/* Print button (desktop only) */}
            <button
              onClick={() => window.print()}
              className="btn btn-secondary btn-sm hide-on-mobile"
              title="In bảng tra cứu mã PLU"
            >
              <Printer size={15} />
              <span>In mã</span>
            </button>

            {/* Admin status / Login */}
            {auth.authenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 8px',
                    background: '#ecfdf5',
                    borderRadius: '8px',
                    border: '1px solid #a7f3d0',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#065f46',
                  }}
                  title="Phiên đăng nhập quản trị"
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'inline-block',
                    }}
                  />
                  <span>Admin</span>
                </div>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="btn btn-secondary btn-sm btn-icon"
                  title="Cấu hình Cloudinary"
                >
                  <Settings size={15} />
                </button>

                <button
                  onClick={() => {
                    setProductForm({
                      plu: '',
                      name: '',
                      category: 'Trái Cây Nội',
                      unit: 'kg',
                      note: '',
                      image_url: '',
                    });
                    setProductImageFile(null);
                    setProductImagePreview(null);
                    setProductImageMode('upload');
                    setIsAddOpen(true);
                  }}
                  className="btn btn-emerald btn-sm"
                  title="Thêm sản phẩm mới"
                >
                  <Plus size={15} />
                  <span className="hide-on-mobile">Thêm mã</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm btn-icon"
                  title="Đăng xuất"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <LogIn size={14} />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1 }}>
        {/* Search Hero Section (Sticky on mobile for instant reach) */}
        <div className="search-hero">
          <div className="search-input-wrapper">
            <Search className="search-icon-left" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã PLU hoặc tên (VD: 46040, bơ, táo)..."
              className="search-input"
              autoFocus
            />
            <div className="search-shortcut-badge">
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: '#64748b',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Xóa tìm kiếm (ESC)"
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={15} />
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="key-badge">Phím /</span>
                  <span className="key-badge">ESC</span>
                </div>
              )}
            </div>
          </div>

          {/* Category Filter Pills (Horizontal touch-friendly scroll) */}
          <div className="category-pills">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`pill-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            >
              <span>Tất cả</span>
              <span className="pill-count">{categoryCounts.all || 0}</span>
            </button>

            {[
              'Trái Cây Nội',
              'Trái Cây Nhập Khẩu',
              'Rau Củ',
              'Thuỷ Hải Sản',
              'Thịt & Món Chế Biến',
              'Bánh Kẹo & Thạch',
            ].map((cat) => {
              const count = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                >
                  <span>{cat}</span>
                  <span className="pill-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Controls Toolbar */}
        <div className="toolbar-row">
          <div className="result-count-text">
            Tìm thấy <strong>{sortedProducts.length}</strong> sản phẩm
            {selectedCategory !== 'all' && (
              <span className="hide-on-mobile"> trong <em>{selectedCategory}</em></span>
            )}
            {searchQuery && (
              <span> với &ldquo;{searchQuery}&rdquo;</span>
            )}
          </div>

          <div className="view-controls">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="form-select"
              style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
            >
              <option value="plu_asc">PLU tăng dần</option>
              <option value="name_asc">Tên A &rarr; Z</option>
            </select>

            {/* View toggle (Grid / List / Table) */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`btn btn-sm btn-icon ${viewMode === 'grid' ? 'btn-secondary' : ''}`}
                style={{
                  background: viewMode === 'grid' ? 'white' : 'transparent',
                  border: 'none',
                  boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                }}
                title="Dạng lưới"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`btn btn-sm btn-icon ${viewMode === 'list' ? 'btn-secondary' : ''}`}
                style={{
                  background: viewMode === 'list' ? 'white' : 'transparent',
                  border: 'none',
                  boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none',
                }}
                title="Dạng danh sách gọn"
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`btn btn-sm btn-icon hide-on-mobile ${viewMode === 'table' ? 'btn-secondary' : ''}`}
                style={{
                  background: viewMode === 'table' ? 'white' : 'transparent',
                  border: 'none',
                  boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                }}
                title="Dạng bảng chi tiết"
              >
                <TableIcon size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Product List Content */}
        {loading ? (
          /* Skeleton Loading */
          <div className="product-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="product-card" style={{ height: '240px' }}>
                <div className="skeleton" style={{ width: '100%', height: '120px' }} />
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="skeleton" style={{ width: '45%', height: '14px' }} />
                  <div className="skeleton" style={{ width: '80%', height: '18px' }} />
                  <div className="skeleton" style={{ width: '100%', height: '36px', marginTop: '6px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          /* Empty State */
          <div
            style={{
              padding: '50px 16px',
              textAlign: 'center',
              background: 'white',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              margin: '16px 0 40px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                background: '#fef2f2',
                color: '#ef4444',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Không tìm thấy sản phẩm phù hợp
            </h3>
            <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '380px', margin: '0 auto 16px' }}>
              Không có mã PLU hoặc tên sản phẩm nào khớp với &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="btn btn-secondary btn-sm"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View (2-Column on Mobile, 4+ on Desktop) */
          <div className="product-grid">
            {sortedProducts.map((p) => {
              const theme = getCategoryTheme(p.category);
              const isCopied = copiedPlu === p.plu;
              return (
                <div key={p.id} className="product-card">
                  {/* Image container */}
                  <div
                    className="card-image-box"
                    onClick={() => {
                      if (p.image_url) {
                        setLightboxImage({ url: p.image_url, title: p.name, plu: p.plu });
                      } else {
                        if (auth.authenticated) {
                          setUploadProduct(p);
                        } else {
                          setIsLoginOpen(true);
                          addToast('Vui lòng đăng nhập quản trị để tải ảnh sản phẩm', 'info');
                        }
                      }
                    }}
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="card-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="card-image-empty">
                        <ImageIcon size={26} />
                        <span>Chưa có ảnh</span>
                      </div>
                    )}

                    {/* Camera / Upload trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (auth.authenticated) {
                          setUploadProduct(p);
                        } else {
                          setIsLoginOpen(true);
                          addToast('Vui lòng đăng nhập quản trị để tải ảnh', 'info');
                        }
                      }}
                      className="card-upload-overlay"
                      title="Tải ảnh lên cho sản phẩm này"
                    >
                      <Camera size={13} />
                      <span>{p.image_url ? 'Đổi' : 'Up'}</span>
                    </button>
                  </div>

                  {/* Body */}
                  <div className="card-body">
                    <div className="card-header-meta">
                      <span
                        className="category-tag"
                        style={{
                          background: theme.bg,
                          color: theme.color,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        {p.category}
                      </span>
                      <span className="unit-tag">ĐVT: {p.unit}</span>
                    </div>

                    <h4 className="product-name-title" title={p.name}>
                      {p.name}
                    </h4>

                    {p.note && (
                      <div className="product-note-text" title={p.note}>
                        &bull; {p.note}
                      </div>
                    )}

                    {/* Prominent PLU Box with 1-click copy */}
                    <div
                      className="plu-box"
                      onClick={() => handleCopyPlu(p.plu, p.name)}
                      title="Chạm để sao chép mã PLU"
                    >
                      <div>
                        <div className="plu-label">MÃ CÂN PLU</div>
                        <div className="plu-code">{p.plu}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPlu(p.plu, p.name);
                        }}
                        className={`plu-copy-btn ${isCopied ? 'copied' : ''}`}
                        title="Sao chép mã PLU"
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? 'Đã chép' : 'Chép'}</span>
                      </button>
                    </div>

                    {/* Admin Actions */}
                    {auth.authenticated && (
                      <div className="card-admin-bar">
                        <button
                          onClick={() => {
                            setEditProduct(p);
                            setProductForm({
                              plu: p.plu,
                              name: p.name,
                              category: p.category,
                              unit: p.unit,
                              note: p.note,
                              image_url: p.image_url,
                            });
                            setProductImageFile(null);
                            setProductImagePreview(p.image_url || null);
                            setProductImageMode(p.image_url ? 'url' : 'upload');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 7px', fontSize: '11px' }}
                          title="Sửa thông tin"
                        >
                          <Edit2 size={12} />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 7px', fontSize: '11px', color: '#e11d48' }}
                          title="Xóa mã này"
                        >
                          <Trash2 size={12} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'list' ? (
          /* Dense Mobile List View (Super fast for cashiers) */
          <div className="product-list-view">
            {sortedProducts.map((p) => {
              const theme = getCategoryTheme(p.category);
              const isCopied = copiedPlu === p.plu;
              return (
                <div
                  key={p.id}
                  className="list-row-card"
                  onClick={() => handleCopyPlu(p.plu, p.name)}
                >
                  {/* Thumbnail */}
                  <div
                    className="list-thumbnail"
                    onClick={(e) => {
                      if (p.image_url) {
                        e.stopPropagation();
                        setLightboxImage({ url: p.image_url, title: p.name, plu: p.plu });
                      } else if (auth.authenticated) {
                        e.stopPropagation();
                        setUploadProduct(p);
                      }
                    }}
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" />
                    ) : (
                      <ImageIcon size={18} color="#94a3b8" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="list-info">
                    <div className="list-title" title={p.name}>
                      {p.name}
                    </div>
                    <div className="list-meta">
                      <span
                        className="category-tag"
                        style={{
                          background: theme.bg,
                          color: theme.color,
                          border: `1px solid ${theme.border}`,
                          fontSize: '10px',
                          padding: '1px 5px',
                        }}
                      >
                        {p.category}
                      </span>
                      <span className="unit-tag" style={{ fontSize: '10px' }}>{p.unit}</span>
                      {p.note && (
                        <span className="product-note-text" style={{ fontSize: '10px' }}>
                          {p.note}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PLU Badge & Action */}
                  <div className="list-plu-section">
                    <div
                      className="list-plu-badge"
                      style={{
                        background: isCopied ? '#ecfdf5' : '#fff1f2',
                        borderColor: isCopied ? '#a7f3d0' : '#fecdd3',
                        color: isCopied ? '#059669' : '#e11d48',
                      }}
                      title="Nhấn để sao chép mã"
                    >
                      {p.plu}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyPlu(p.plu, p.name);
                      }}
                      className={`plu-copy-btn ${isCopied ? 'copied' : ''}`}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>

                    {auth.authenticated && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditProduct(p);
                          setProductForm({
                            plu: p.plu,
                            name: p.name,
                            category: p.category,
                            unit: p.unit,
                            note: p.note,
                            image_url: p.image_url,
                          });
                          setProductImageFile(null);
                          setProductImagePreview(p.image_url || null);
                          setProductImageMode(p.image_url ? 'url' : 'upload');
                        }}
                        className="btn btn-secondary btn-sm btn-icon"
                        title="Sửa"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="table-wrapper">
            <table className="quick-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Ảnh</th>
                  <th style={{ width: '110px' }}>Mã PLU</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th style={{ width: '70px' }}>ĐVT</th>
                  <th>Ghi chú</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => {
                  const theme = getCategoryTheme(p.category);
                  const isCopied = copiedPlu === p.plu;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: '#f1f5f9',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            if (p.image_url) {
                              setLightboxImage({ url: p.image_url, title: p.name, plu: p.plu });
                            } else if (auth.authenticated) {
                              setUploadProduct(p);
                            } else {
                              setIsLoginOpen(true);
                            }
                          }}
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <ImageIcon size={16} color="#94a3b8" />
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '17px',
                            fontWeight: 800,
                            color: '#e11d48',
                            letterSpacing: '0.5px',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {p.plu}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</span>
                      </td>
                      <td>
                        <span
                          className="category-tag"
                          style={{
                            background: theme.bg,
                            color: theme.color,
                            border: `1px solid ${theme.border}`,
                          }}
                        >
                          {p.category}
                        </span>
                      </td>
                      <td>
                        <span className="unit-tag">{p.unit}</span>
                      </td>
                      <td>
                        {p.note ? (
                          <span className="product-note-text">{p.note}</span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleCopyPlu(p.plu, p.name)}
                            className={`plu-copy-btn ${isCopied ? 'copied' : ''}`}
                            title="Sao chép PLU"
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span className="hide-on-mobile">{isCopied ? 'Đã chép' : 'Chép'}</span>
                          </button>

                          <button
                            onClick={() => {
                              if (auth.authenticated) {
                                setUploadProduct(p);
                              } else {
                                setIsLoginOpen(true);
                                addToast('Cần đăng nhập để tải ảnh', 'info');
                              }
                            }}
                            className="btn btn-secondary btn-sm btn-icon"
                            title="Tải ảnh lên"
                          >
                            <Camera size={13} />
                          </button>

                          {auth.authenticated && (
                            <>
                              <button
                                onClick={() => {
                                  setEditProduct(p);
                                  setProductForm({
                                    plu: p.plu,
                                    name: p.name,
                                    category: p.category,
                                    unit: p.unit,
                                    note: p.note,
                                    image_url: p.image_url,
                                  });
                                  setProductImageFile(null);
                                  setProductImagePreview(p.image_url || null);
                                  setProductImageMode(p.image_url ? 'url' : 'upload');
                                }}
                                className="btn btn-secondary btn-sm btn-icon"
                                title="Sửa"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="btn btn-secondary btn-sm btn-icon"
                                style={{ color: '#e11d48' }}
                                title="Xóa"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fab-top-btn"
          title="Lên đầu trang"
          aria-label="Lên đầu trang"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* Hidden Print Table for clean paper printing */}
      <div className="print-table" style={{ display: 'none' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>BẢNG TRA CỨU MÃ CÂN PLU SIÊU THỊ WINMART</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', padding: '6px' }}>Mã PLU</th>
              <th style={{ border: '1px solid black', padding: '6px' }}>Tên Sản Phẩm</th>
              <th style={{ border: '1px solid black', padding: '6px' }}>Danh Mục</th>
              <th style={{ border: '1px solid black', padding: '6px' }}>ĐVT</th>
              <th style={{ border: '1px solid black', padding: '6px' }}>Ghi Chú</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((p) => (
              <tr key={p.id}>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold', fontSize: '14pt' }}>{p.plu}</td>
                <td style={{ border: '1px solid black', padding: '6px' }}>{p.name}</td>
                <td style={{ border: '1px solid black', padding: '6px' }}>{p.category}</td>
                <td style={{ border: '1px solid black', padding: '6px' }}>{p.unit}</td>
                <td style={{ border: '1px solid black', padding: '6px' }}>{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <footer
        style={{
          background: 'white',
          borderTop: '1px solid var(--border-subtle)',
          padding: '16px 0',
          marginTop: 'auto',
          fontSize: '12px',
          color: '#64748b',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <p>
            WinMart PLU Quick Search &bull; Turso LibSQL Cloud &bull; Cloudinary Image Storage
          </p>
          <p style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
            Thiết kế tối ưu cho điện thoại di động & màn hình thu ngân POS
          </p>
        </div>
      </footer>

      {/* --- MODALS --- */}

      {/* 1. Login Modal */}
      {isLoginOpen && (
        <div className="modal-overlay" onClick={() => setIsLoginOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Đăng Nhập Quản Trị Viên</h3>
              <button onClick={() => setIsLoginOpen(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLogin}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0f172a' }}>
                  <Clock size={15} color="#059669" />
                  <span>Phiên đăng nhập:</span>
                </div>
                <p style={{ marginTop: '2px' }}>
                  Phiên đăng nhập duy trì liên tục và tự động kết thúc lúc 23:59:59 của ngày hôm nay.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Tài khoản</label>
                <input
                  type="text"
                  required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="wm_admin"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Mật khẩu"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="btn btn-primary"
                >
                  {loginLoading ? 'Đang xác thực...' : 'Đăng nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Image Upload Modal */}
      {uploadProduct && (
        <div className="modal-overlay" onClick={() => !uploading && setUploadProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Tải Ảnh Lên Cloudinary</h3>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {uploadProduct.name} &bull; Mã PLU: <strong style={{ color: '#e11d48' }}>{uploadProduct.plu}</strong>
                </div>
              </div>
              <button
                onClick={() => !uploading && setUploadProduct(null)}
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadImage}>
              {/* Dropzone with photo/camera support */}
              <label className="dropzone" style={{ display: 'block', marginBottom: '14px' }}>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageFileChange}
                  style={{ display: 'none' }}
                />
                {uploadPreview ? (
                  <div>
                    <img
                      src={uploadPreview}
                      alt="Preview"
                      style={{
                        maxHeight: '170px',
                        maxWidth: '100%',
                        borderRadius: '10px',
                        objectFit: 'contain',
                        margin: '0 auto',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    />
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                      Nhấp để chọn hoặc chụp ảnh khác
                    </div>
                  </div>
                ) : (
                  <div>
                    <Camera size={34} color="#64748b" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                      Chụp ảnh hoặc chọn ảnh từ máy
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      JPG, PNG, WEBP &bull; Tải trực tiếp lên Cloudinary
                    </div>
                  </div>
                )}
              </label>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#64748b',
                  marginBottom: '18px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                  Lưu trữ đám mây Cloudinary:
                </div>
                Ảnh được tải lên máy chủ Cloudinary và liên kết URL tự động lưu vào cơ sở dữ liệu Turso.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    if (uploadPreview && uploadPreview.startsWith('blob:')) {
                      URL.revokeObjectURL(uploadPreview);
                    }
                    setUploadProduct(null);
                    setUploadFile(null);
                    setUploadPreview(null);
                  }}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="btn btn-primary"
                >
                  {uploading ? 'Đang tải lên Cloud...' : 'Xác nhận tải ảnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add / Edit Product Modal */}
      {(isAddOpen || editProduct) && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (productImagePreview && productImagePreview.startsWith('blob:')) {
              URL.revokeObjectURL(productImagePreview);
            }
            setIsAddOpen(false);
            setEditProduct(null);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Mã PLU Mới'}
              </h3>
              <button
                onClick={() => {
                  if (productImagePreview && productImagePreview.startsWith('blob:')) {
                    URL.revokeObjectURL(productImagePreview);
                  }
                  setIsAddOpen(false);
                  setEditProduct(null);
                }}
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Mã PLU</label>
                  <input
                    type="text"
                    required
                    value={productForm.plu}
                    onChange={(e) => setProductForm({ ...productForm, plu: e.target.value })}
                    placeholder="46040"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tên sản phẩm</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Ví dụ: Bơ sáp (tròn)"
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Danh mục</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="form-select"
                  >
                    <option value="Trái Cây Nội">Trái Cây Nội</option>
                    <option value="Trái Cây Nhập Khẩu">Trái Cây Nhập Khẩu</option>
                    <option value="Rau Củ">Rau Củ</option>
                    <option value="Thuỷ Hải Sản">Thuỷ Hải Sản</option>
                    <option value="Thịt & Món Chế Biến">Thịt & Món Chế Biến</option>
                    <option value="Bánh Kẹo & Thạch">Bánh Kẹo & Thạch</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Đơn vị</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="form-select"
                  >
                    <option value="kg">kg</option>
                    <option value="quả">quả</option>
                    <option value="khay">khay</option>
                    <option value="gói">gói</option>
                    <option value="hộp">hộp</option>
                    <option value="túi">túi</option>
                    <option value="con">con</option>
                    <option value="cốc">cốc</option>
                    <option value="phần">phần</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú (Tùy chọn)</label>
                <input
                  type="text"
                  value={productForm.note}
                  onChange={(e) => setProductForm({ ...productForm, note: e.target.value })}
                  placeholder="Ví dụ: Hàng tươi, size lớn, mã phụ..."
                  className="form-input"
                />
              </div>

              {/* Product Image Selection */}
              <div className="form-group">
                <label className="form-label">Hình ảnh sản phẩm</label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setProductImageMode('upload')}
                    className="btn btn-sm"
                    style={{
                      background: productImageMode === 'upload' ? '#f1f5f9' : 'transparent',
                      border: '1.5px solid',
                      borderColor: productImageMode === 'upload' ? '#0f172a' : '#e2e8f0',
                      fontWeight: productImageMode === 'upload' ? 700 : 500,
                      color: productImageMode === 'upload' ? '#0f172a' : '#64748b',
                    }}
                  >
                    <Camera size={13} />
                    <span>Tải ảnh / Chụp ảnh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductImageMode('url')}
                    className="btn btn-sm"
                    style={{
                      background: productImageMode === 'url' ? '#f1f5f9' : 'transparent',
                      border: '1.5px solid',
                      borderColor: productImageMode === 'url' ? '#0f172a' : '#e2e8f0',
                      fontWeight: productImageMode === 'url' ? 700 : 500,
                      color: productImageMode === 'url' ? '#0f172a' : '#64748b',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Dán URL ảnh</span>
                  </button>
                </div>

                {productImageMode === 'upload' ? (
                  <div>
                    <label className="dropzone" style={{ display: 'block', padding: '14px', cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (productImagePreview && productImagePreview.startsWith('blob:')) {
                              URL.revokeObjectURL(productImagePreview);
                            }
                            setProductImageFile(file);
                            setProductImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      {productImagePreview ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                          <img
                            src={productImagePreview}
                            alt="Preview"
                            style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {productImageFile?.name || 'Ảnh sản phẩm'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                              ✓ Sẽ tải lên Cloudinary khi bấm Lưu
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              Nhấp để đổi ảnh khác
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (productImagePreview && productImagePreview.startsWith('blob:')) {
                                URL.revokeObjectURL(productImagePreview);
                              }
                              setProductImageFile(null);
                              setProductImagePreview(null);
                              setProductForm({ ...productForm, image_url: '' });
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Bỏ chọn ảnh"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Camera size={24} color="#64748b" style={{ margin: '0 auto 4px' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                            Chọn ảnh hoặc chụp ảnh từ điện thoại
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Tự động tải lên Cloudinary khi lưu
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={productForm.image_url}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.trim().startsWith('data:')) {
                          addToast('Không được dán ảnh dạng Base64. Vui lòng tải file ảnh lên để lưu Cloudinary.', 'error');
                          return;
                        }
                        setProductForm({ ...productForm, image_url: val });
                        setProductImagePreview(val.trim() || null);
                      }}
                      placeholder="https://res.cloudinary.com/..."
                      className="form-input"
                    />
                    {productForm.image_url.trim() && (
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={productForm.image_url.trim()}
                          alt="Preview"
                          onError={() => {}}
                          style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Xem trước ảnh liên kết URL</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  disabled={savingProduct}
                  onClick={() => {
                    if (productImagePreview && productImagePreview.startsWith('blob:')) {
                      URL.revokeObjectURL(productImagePreview);
                    }
                    setIsAddOpen(false);
                    setEditProduct(null);
                    setProductImageFile(null);
                    setProductImagePreview(null);
                  }}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
                <button type="submit" disabled={savingProduct} className="btn btn-primary">
                  {savingProduct
                    ? saveStep || 'Đang xử lý...'
                    : editProduct
                    ? 'Lưu thay đổi'
                    : 'Thêm sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Settings Modal (Cloudinary) */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Cấu Hình Cloudinary</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSettings}>
              {/* Connection Status Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: cloudinaryConfigured ? '#ecfdf5' : '#fffbeb',
                  border: `1px solid ${cloudinaryConfigured ? '#a7f3d0' : '#fde68a'}`,
                  borderRadius: '10px',
                  marginBottom: '14px',
                  fontSize: '12px',
                  color: cloudinaryConfigured ? '#047857' : '#b45309',
                  fontWeight: 600,
                }}
              >
                {cloudinaryConfigured ? <Check size={16} color="#059669" /> : <AlertCircle size={16} color="#d97706" />}
                <span>
                  {cloudinaryConfigured
                    ? `Đang kết nối: Cloud "${configuredCloudName || settingsForm.cloudinary_cloud_name}"`
                    : 'Chưa cấu hình Cloudinary (Cần Cloud Name & API Key)'}
                </span>
              </div>

              {/* Cloudinary URL quick helper */}
              <div className="form-group">
                <label className="form-label">
                  Dán nhanh CLOUDINARY_URL (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={settingsForm.cloudinary_url}
                  onChange={(e) => handlePasteCloudinaryUrl(e.target.value)}
                  placeholder="cloudinary://<api_key>:<api_secret>@<cloud_name>"
                  className="form-input"
                  style={{ fontSize: '13px' }}
                />
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Nếu dán CLOUDINARY_URL, hệ thống sẽ tự động trích xuất các ô bên dưới.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cloud Name (Tên Cloud)</label>
                <input
                  type="text"
                  required
                  value={settingsForm.cloudinary_cloud_name}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, cloudinary_cloud_name: e.target.value })
                  }
                  placeholder="Ví dụ: my-cloud-name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="text"
                  required
                  value={settingsForm.cloudinary_api_key}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, cloudinary_api_key: e.target.value })
                  }
                  placeholder="Ví dụ: 123456789012345"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">API Secret / Token</label>
                <input
                  type="text"
                  required
                  value={settingsForm.cloudinary_token}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, cloudinary_token: e.target.value })
                  }
                  placeholder="WvyrN70XVe0uR1VFDJOdkzDX6iU"
                  className="form-input"
                />
              </div>

              {/* Test feedback */}
              {testResult && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    marginBottom: '14px',
                    background: testResult.success ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
                    color: testResult.success ? '#047857' : '#b91c1c',
                    fontWeight: 500,
                  }}
                >
                  {testResult.message}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
                <button
                  type="button"
                  disabled={testingConnection}
                  onClick={handleTestConnection}
                  className="btn btn-secondary btn-sm"
                  title="Kiểm tra kết nối đến tài khoản Cloudinary"
                >
                  <RefreshCw size={14} className={testingConnection ? 'animate-spin' : ''} />
                  <span>{testingConnection ? 'Đang test...' : 'Kiểm tra kết nối'}</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="btn btn-secondary"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="btn btn-emerald"
                  >
                    {settingsLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Lightbox Modal */}
      {lightboxImage && (
        <div className="modal-overlay" onClick={() => setLightboxImage(null)}>
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '90vh',
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xl)',
              animation: 'slideUp 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 10,
              }}
            >
              <button
                onClick={() => setLightboxImage(null)}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              style={{
                maxWidth: '88vw',
                maxHeight: '70vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />

            <div
              style={{
                padding: '12px 16px',
                background: 'white',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lightboxImage.title}
                </h4>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Mã PLU: <strong style={{ color: '#e11d48' }}>{lightboxImage.plu}</strong>
                </div>
              </div>
              <button
                onClick={() => handleCopyPlu(lightboxImage.plu, lightboxImage.title)}
                className="btn btn-secondary btn-sm"
              >
                <Copy size={13} />
                <span>Sao chép mã</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${
              t.type === 'success'
                ? 'toast-success'
                : t.type === 'error'
                ? 'toast-error'
                : 'toast-info'
            }`}
          >
            {t.type === 'success' ? (
              <Check size={18} color="#10b981" />
            ) : t.type === 'error' ? (
              <AlertCircle size={18} color="#ef4444" />
            ) : (
              <Sparkles size={18} color="#3b82f6" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
