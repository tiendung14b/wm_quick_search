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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'plu_asc' | 'name_asc'>('plu_asc');

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    cloudinary_cloud_name: '',
    cloudinary_api_key: '',
    cloudinary_token: 'WvyrN70XVe0uR1VFDJOdkzDX6iU',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

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
        });
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

  // Copy PLU
  const handleCopyPlu = (plu: string) => {
    navigator.clipboard.writeText(plu);
    setCopiedPlu(plu);
    addToast(`Đã sao chép mã PLU: ${plu}`, 'success');
    setTimeout(() => {
      setCopiedPlu(null);
    }, 1500);
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
        addToast('Đã lưu cấu hình Cloudinary thành công!', 'success');
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

  // Handle image file selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image
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
        addToast(data.message || 'Tải ảnh thành công!', 'success');
        // Update product in local state
        setProducts((prev) =>
          prev.map((p) => (p.id === uploadProduct.id ? { ...p, image_url: data.url } : p))
        );
        setUploadProduct(null);
        setUploadFile(null);
        setUploadPreview(null);
      } else {
        addToast(data.message || 'Lỗi tải ảnh', 'error');
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
    setSavingProduct(true);
    try {
      let finalImageUrl = productForm.image_url.trim();

      // Only upload to cloud when user submits!
      if (productImageFile) {
        setSaveStep('Đang tải ảnh lên Cloud...');
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
          addToast(uploadData.message || 'Lỗi khi tải ảnh lên Cloud', 'error');
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Header */}
      <header className="app-header">
        <div className="container header-content">
          <div className="brand-section">
            <div className="brand-logo">WM</div>
            <div>
              <div className="brand-title">WinMart PLU Search</div>
              <div className="brand-subtitle">Hệ Thống Tra Cứu Mã Cân Nhanh &middot; Dữ Liệu Turso SQL</div>
            </div>
          </div>

          <div className="header-actions">
            {/* Print button */}
            <button
              onClick={() => window.print()}
              className="btn btn-secondary btn-sm"
              title="In bảng tra cứu mã PLU"
            >
              <Printer size={15} />
              <span className="hide-on-mobile">In bảng mã</span>
            </button>

            {/* Admin status / Login */}
            {auth.authenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#ecfdf5',
                    borderRadius: '8px',
                    border: '1px solid #a7f3d0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#065f46',
                  }}
                  title="Phiên đăng nhập tự động kết thúc lúc 23:59 hôm nay"
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'inline-block',
                    }}
                  />
                  <span>wm_admin</span>
                  <span style={{ color: '#047857', opacity: 0.8 }}>(Phiên đến 23:59)</span>
                </div>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="btn btn-secondary btn-sm btn-icon"
                  title="Cấu hình Cloudinary"
                >
                  <Settings size={16} />
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
                >
                  <Plus size={15} />
                  <span>Thêm mã</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm btn-icon"
                  title="Đăng xuất"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <LogIn size={15} />
                <span>Đăng nhập Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1 }}>
        {/* Search Hero Section */}
        <div className="search-hero">
          <div className="search-input-wrapper">
            <Search className="search-icon-left" size={24} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập mã PLU (VD: 46040, 46543) hoặc Tên sản phẩm (VD: Táo, Bơ, Cá, Rau)..."
              className="search-input"
              autoFocus
            />
            <div className="search-shortcut-badge">
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '4px',
                    display: 'flex',
                  }}
                  title="Xóa tìm kiếm (ESC)"
                >
                  <X size={18} />
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="key-badge">Phím /</span>
                  <span className="key-badge">ESC</span>
                </div>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
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
              <span> trong danh mục <em>{selectedCategory}</em></span>
            )}
            {searchQuery && (
              <span> với từ khóa &ldquo;{searchQuery}&rdquo;</span>
            )}
          </div>

          <div className="view-controls">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '13px', width: 'auto' }}
            >
              <option value="plu_asc">Sắp xếp: Mã PLU tăng dần</option>
              <option value="name_asc">Sắp xếp: Tên A &rarr; Z</option>
            </select>

            {/* View toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`btn btn-sm btn-icon ${viewMode === 'grid' ? 'btn-secondary' : ''}`}
                style={{
                  background: viewMode === 'grid' ? 'white' : 'transparent',
                  border: 'none',
                  boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                }}
                title="Xem dạng thẻ lưới"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`btn btn-sm btn-icon ${viewMode === 'table' ? 'btn-secondary' : ''}`}
                style={{
                  background: viewMode === 'table' ? 'white' : 'transparent',
                  border: 'none',
                  boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                }}
                title="Xem dạng danh sách bảng"
              >
                <TableIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Product List Content */}
        {loading ? (
          /* Skeleton Loading */
          <div className="product-grid">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="product-card" style={{ height: '320px' }}>
                <div className="skeleton" style={{ width: '100%', height: '170px' }} />
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="skeleton" style={{ width: '50%', height: '18px' }} />
                  <div className="skeleton" style={{ width: '85%', height: '22px' }} />
                  <div className="skeleton" style={{ width: '100%', height: '48px', marginTop: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          /* Empty State */
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: 'white',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              margin: '20px 0 60px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                background: '#fef2f2',
                color: '#ef4444',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              Không tìm thấy sản phẩm phù hợp
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '420px', margin: '0 auto 16px' }}>
              Không có mã PLU hoặc tên sản phẩm nào khớp với &ldquo;{searchQuery}&rdquo;. Vui lòng thử lại với tên không dấu hoặc kiểm tra danh mục.
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
          /* Grid View */
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
                          addToast('Vui lòng đăng nhập để tải ảnh sản phẩm', 'info');
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
                        <ImageIcon size={32} />
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
                      <Camera size={14} />
                      <span>{p.image_url ? 'Đổi ảnh' : 'Up ảnh'}</span>
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
                      <div>
                        <span className="product-note-text">
                          &bull; {p.note}
                        </span>
                      </div>
                    )}

                    {/* Prominent PLU Box with 1-click copy */}
                    <div className="plu-box">
                      <div>
                        <div className="plu-label">MÃ CÂN PLU</div>
                        <div className="plu-code">{p.plu}</div>
                      </div>
                      <button
                        onClick={() => handleCopyPlu(p.plu)}
                        className={`plu-copy-btn ${isCopied ? 'copied' : ''}`}
                        title="Sao chép mã PLU"
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
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
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          title="Sửa thông tin"
                        >
                          <Edit2 size={13} />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '12px', color: '#e11d48' }}
                          title="Xóa mã này"
                        >
                          <Trash2 size={13} />
                          <span>Xóa</span>
                        </button>
                      </div>
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
                  <th style={{ width: '80px' }}>Ảnh</th>
                  <th style={{ width: '130px' }}>Mã PLU</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th style={{ width: '80px' }}>ĐVT</th>
                  <th>Ghi chú</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Thao tác</th>
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
                            width: '44px',
                            height: '44px',
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
                            <ImageIcon size={18} color="#94a3b8" />
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#0f172a',
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
                            onClick={() => handleCopyPlu(p.plu)}
                            className={`plu-copy-btn ${isCopied ? 'copied' : ''}`}
                            title="Sao chép PLU"
                          >
                            {isCopied ? <Check size={14} /> : <Copy size={14} />}
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
                            <Camera size={14} />
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
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="btn btn-secondary btn-sm btn-icon"
                                style={{ color: '#e11d48' }}
                                title="Xóa"
                              >
                                <Trash2 size={14} />
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
          padding: '20px 0',
          marginTop: 'auto',
          fontSize: '13px',
          color: '#64748b',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <p>
            WinMart PLU Quick Search &bull; Cơ sở dữ liệu đám mây Turso LibSQL &bull; Tích hợp hình ảnh Cloudinary
          </p>
          <p style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>
            Hỗ trợ hiển thị tối ưu trên thiết bị di động, máy tính bảng và màn hình thu ngân POS
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
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#475569',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0f172a' }}>
                  <Clock size={16} color="#059669" />
                  <span>Chính sách phiên đăng nhập trong ngày:</span>
                </div>
                <p style={{ marginTop: '4px' }}>
                  Sau khi đăng nhập thành công, phiên làm việc duy trì liên tục trong ngày và tự động kết thúc lúc 23:59:59.
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
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
                <h3 className="modal-title">Tải Ảnh Sản Phẩm</h3>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {uploadProduct.name} &bull; Mã PLU: <strong>{uploadProduct.plu}</strong>
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
              {/* Dropzone */}
              <label className="dropzone" style={{ display: 'block', marginBottom: '16px' }}>
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
                        maxHeight: '180px',
                        maxWidth: '100%',
                        borderRadius: '10px',
                        objectFit: 'contain',
                        margin: '0 auto',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    />
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                      Nhấp để chọn ảnh khác
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload size={36} color="#64748b" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                      Nhấp vào đây hoặc kéo thả ảnh vào để chọn
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Định dạng JPG, PNG, WEBP (Tối đa 8MB)
                    </div>
                  </div>
                )}
              </label>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#64748b',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                  Nơi lưu trữ ảnh:
                </div>
                Ảnh được tải lên Cloudinary an toàn thông qua server Next.js và tự động lưu liên kết vào cơ sở dữ liệu Turso.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
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
                  {uploading ? 'Đang tải lên...' : 'Xác nhận tải ảnh'}
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
                  setIsAddOpen(false);
                  setEditProduct(null);
                }}
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label className="form-label">Mã PLU (Mã cân)</label>
                <input
                  type="text"
                  required
                  value={productForm.plu}
                  onChange={(e) => setProductForm({ ...productForm, plu: e.target.value })}
                  placeholder="Ví dụ: 46040"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                  <label className="form-label">Đơn vị tính</label>
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

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
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
                    <Upload size={14} />
                    <span>Tải ảnh từ máy</span>
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
                    <ExternalLink size={14} />
                    <span>Dán URL ảnh</span>
                  </button>
                </div>

                {productImageMode === 'upload' ? (
                  <div>
                    <label className="dropzone" style={{ display: 'block', padding: '16px', cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setProductImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProductImagePreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      {productImagePreview ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
                          <img
                            src={productImagePreview}
                            alt="Preview"
                            style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {productImageFile?.name || 'Ảnh đã chọn'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#059669', fontWeight: 500 }}>
                              ✓ Đã chọn ảnh &bull; Chỉ tải lên Cloud khi bấm &ldquo;{editProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}&rdquo;
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
                              setProductImageFile(null);
                              setProductImagePreview(null);
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Bỏ chọn ảnh"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Camera size={26} color="#64748b" style={{ margin: '0 auto 6px' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                            Chọn ảnh hoặc chụp ảnh từ máy
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            (Chỉ tải lên Cloud khi bấm {editProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'})
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
                        setProductForm({ ...productForm, image_url: val });
                        if (val.trim()) {
                          setProductImagePreview(val.trim());
                        } else {
                          setProductImagePreview(null);
                        }
                      }}
                      placeholder="https://..."
                      className="form-input"
                    />
                    {productForm.image_url.trim() && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={productForm.image_url.trim()}
                          alt="Preview"
                          onError={() => {}}
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Xem trước ảnh từ đường dẫn URL</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  disabled={savingProduct}
                  onClick={() => {
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
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Thông tin kết nối tài khoản đám mây Cloudinary để lưu trữ ảnh tải lên từ nhân viên thu ngân / quản trị viên.
              </p>

              <div className="form-group">
                <label className="form-label">Cloud Name (Tên Cloud)</label>
                <input
                  type="text"
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
                  value={settingsForm.cloudinary_api_key}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, cloudinary_api_key: e.target.value })
                  }
                  placeholder="Ví dụ: 123456789012345"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cloudinary Token / API Secret</label>
                <input
                  type="text"
                  value={settingsForm.cloudinary_token}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, cloudinary_token: e.target.value })
                  }
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
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
              maxWidth: '90vw',
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
                top: '12px',
                right: '12px',
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
                maxWidth: '85vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />

            <div
              style={{
                padding: '14px 20px',
                background: 'white',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {lightboxImage.title}
                </h4>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Mã PLU: <strong style={{ color: '#e11d48' }}>{lightboxImage.plu}</strong>
                </div>
              </div>
              <button
                onClick={() => handleCopyPlu(lightboxImage.plu)}
                className="btn btn-secondary btn-sm"
              >
                <Copy size={14} />
                <span>Sao chép mã</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
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
