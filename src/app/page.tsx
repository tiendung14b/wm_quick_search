'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Copy,
  Check,
  Plus,
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

type ViewMode = 'list' | 'grid' | 'table';

const CATEGORIES = [
  'Trái Cây Nội',
  'Trái Cây Nhập Khẩu',
  'Rau Củ',
  'Thuỷ Hải Sản',
  'Thịt & Món Chế Biến',
  'Bánh Kẹo & Thạch',
];

const UNITS = ['kg', 'quả', 'khay', 'gói', 'hộp', 'túi', 'con', 'cốc', 'phần'];

const EMPTY_FORM = {
  plu: '',
  name: '',
  category: 'Trái Cây Nội',
  unit: 'kg',
  note: '',
  image_url: '',
};

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

// Category colors
function getCategoryTheme(category: string) {
  switch (category) {
    case 'Trái Cây Nội':
      return { bg: '#ecfdf5', color: '#047857' };
    case 'Trái Cây Nhập Khẩu':
      return { bg: '#f5f3ff', color: '#6d28d9' };
    case 'Rau Củ':
      return { bg: '#f0fdf4', color: '#15803d' };
    case 'Thuỷ Hải Sản':
      return { bg: '#eff6ff', color: '#1d4ed8' };
    case 'Thịt & Món Chế Biến':
      return { bg: '#fffbeb', color: '#b45309' };
    case 'Bánh Kẹo & Thạch':
      return { bg: '#fdf2f8', color: '#be185d' };
    default:
      return { bg: '#f1f5f9', color: '#475569' };
  }
}

// Placeholder when product has no image: first letter on category color
function Avatar({ name, category }: { name: string; category: string }) {
  const theme = getCategoryTheme(category);
  const letter = (name || '?').trim().charAt(0);
  return (
    <div className="avatar" style={{ background: theme.bg, color: theme.color }}>
      {letter}
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<'plu_asc' | 'name_asc'>('plu_asc');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
  const [productForm, setProductForm] = useState(EMPTY_FORM);

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

  const [lightboxImage, setLightboxImage] = useState<Product | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toast Helper
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  // Detect mobile: default to list view on phones, grid on desktop.
  // Only autofocus search on desktop (on phones it would pop up the keyboard immediately).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    setViewMode(mq.matches ? 'list' : 'grid');
    if (!mq.matches) searchInputRef.current?.focus();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Table view is desktop-only
  useEffect(() => {
    if (isMobile && viewMode === 'table') setViewMode('list');
  }, [isMobile, viewMode]);

  // Scroll listener for Floating Scroll to Top button
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when a modal is open
  const anyModalOpen = !!(isLoginOpen || uploadProduct || isAddOpen || editProduct || isSettingsOpen || lightboxImage);
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [anyModalOpen]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (lightboxImage) setLightboxImage(null);
        else if (uploadProduct) setUploadProduct(null);
        else if (isLoginOpen) setIsLoginOpen(false);
        else if (isAddOpen || editProduct) closeProductModal();
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (searchQuery) setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      addToast('Đã đăng xuất', 'info');
    } catch {
      addToast('Lỗi khi đăng xuất', 'error');
    }
  };

  // Copy PLU with visual and toast feedback
  const handleCopyPlu = async (plu: string, name?: string) => {
    try {
      await navigator.clipboard.writeText(plu);
    } catch {
      // Fallback for non-secure contexts (e.g. http on LAN)
      const ta = document.createElement('textarea');
      ta.value = plu;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
    if (navigator.vibrate) navigator.vibrate(15);
    setCopiedPlu(plu);
    addToast(`Đã chép mã ${plu}${name ? ` · ${name}` : ''}`, 'success');
    setTimeout(() => setCopiedPlu((cur) => (cur === plu ? null : cur)), 1600);
  };

  // Test Cloudinary connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', ...settingsForm }),
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.message });
    } catch {
      setTestResult({ success: false, message: 'Lỗi kết nối kiểm tra Cloudinary' });
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
        addToast(data.message || 'Đã lưu cấu hình Cloudinary', 'success');
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
        addToast('Đã tự điền thông tin từ CLOUDINARY_URL', 'info');
        return;
      }
    }
    setSettingsForm({ ...settingsForm, cloudinary_url: url });
  };

  // Handle single image file selection (Upload modal) - Using ObjectURL (never Base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (uploadPreview?.startsWith('blob:')) URL.revokeObjectURL(uploadPreview);
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const closeUploadModal = () => {
    if (uploading) return;
    if (uploadPreview?.startsWith('blob:')) URL.revokeObjectURL(uploadPreview);
    setUploadProduct(null);
    setUploadFile(null);
    setUploadPreview(null);
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

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Tải ảnh lên thành công!', 'success');
        setProducts((prev) =>
          prev.map((p) =>
            p.id === uploadProduct.id ? { ...p, image_url: data.url, image_public_id: data.publicId } : p
          )
        );
        if (uploadPreview?.startsWith('blob:')) URL.revokeObjectURL(uploadPreview);
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

  // Open add / edit modal
  const openAddModal = () => {
    setEditProduct(null);
    setProductForm(EMPTY_FORM);
    setProductImageFile(null);
    setProductImagePreview(null);
    setProductImageMode('upload');
    setIsAddOpen(true);
  };

  const openEditModal = (p: Product) => {
    setIsAddOpen(false);
    setEditProduct(p);
    setProductForm({
      plu: p.plu,
      name: p.name,
      category: p.category,
      unit: p.unit,
      note: p.note || '',
      image_url: p.image_url || '',
    });
    setProductImageFile(null);
    setProductImagePreview(p.image_url || null);
    setProductImageMode(p.image_url ? 'url' : 'upload');
  };

  const closeProductModal = () => {
    if (savingProduct) return;
    if (productImagePreview?.startsWith('blob:')) URL.revokeObjectURL(productImagePreview);
    setIsAddOpen(false);
    setEditProduct(null);
    setProductImageFile(null);
    setProductImagePreview(null);
  };

  // Save new or edited product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalImageUrl = productForm.image_url.trim();

    // STRICTLY DISALLOW Base64 in image_url
    if (finalImageUrl.startsWith('data:')) {
      addToast('Không được lưu ảnh Base64. Hãy tải file ảnh lên Cloudinary.', 'error');
      return;
    }

    setSavingProduct(true);
    try {
      // If user picked a new image file, upload to Cloudinary first
      if (productImageFile) {
        setSaveStep('Đang tải ảnh...');
        const formData = new FormData();
        formData.append('file', productImageFile);
        if (editProduct) formData.append('productId', String(editProduct.id));

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          addToast(uploadData.message || 'Lỗi khi tải ảnh lên Cloudinary', 'error');
          return;
        }
        finalImageUrl = uploadData.url;
      }

      setSaveStep('Đang lưu...');
      const payload = { ...productForm, image_url: finalImageUrl };

      if (editProduct) {
        const res = await fetch(`/api/products/${editProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          addToast('Đã cập nhật sản phẩm', 'success');
          setProducts((prev) => prev.map((p) => (p.id === editProduct.id ? { ...p, ...payload } : p)));
          if (productImagePreview?.startsWith('blob:')) URL.revokeObjectURL(productImagePreview);
          setEditProduct(null);
          setProductImageFile(null);
          setProductImagePreview(null);
        } else {
          addToast(data.message || 'Lỗi cập nhật', 'error');
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          addToast('Đã thêm sản phẩm', 'success');
          if (productImagePreview?.startsWith('blob:')) URL.revokeObjectURL(productImagePreview);
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
    if (!confirm(`Xóa sản phẩm "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addToast('Đã xóa sản phẩm', 'success');
        setProducts((prev) => prev.filter((p) => p.id !== id));
        if (editProduct?.id === id) setEditProduct(null);
      } else {
        addToast(data.message || 'Lỗi khi xóa', 'error');
      }
    } catch {
      addToast('Lỗi kết nối', 'error');
    }
  };

  // Tap on product image / thumbnail
  const handleImageTap = (p: Product) => {
    if (p.image_url) {
      setLightboxImage(p);
    } else if (auth.authenticated) {
      setUploadProduct(p);
    }
  };

  // Filter & Search logic
  const filteredProducts = useMemo(() => {
    const normQuery = normalizeVN(searchQuery.trim());
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (!normQuery) return true;
      return (
        p.plu.toLowerCase().includes(normQuery) ||
        normalizeVN(p.name).includes(normQuery) ||
        normalizeVN(p.note || '').includes(normQuery)
      );
    });
  }, [products, searchQuery, selectedCategory]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === 'plu_asc') return a.plu.localeCompare(b.plu, undefined, { numeric: true });
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [filteredProducts, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  /* ------------------------------------------------------------------ */
  /* Render helpers                                                       */
  /* ------------------------------------------------------------------ */

  const renderList = () => (
    <div className="plist">
      {sortedProducts.map((p) => {
        const theme = getCategoryTheme(p.category);
        const isCopied = copiedPlu === p.plu;
        return (
          <div
            key={p.id}
            className={`prow ${auth.authenticated ? 'admin' : ''} ${isCopied ? 'copied' : ''}`}
            onClick={() => handleCopyPlu(p.plu, p.name)}
            role="button"
            aria-label={`Chép mã PLU ${p.plu} - ${p.name}`}
          >
            <div
              className="pthumb"
              onClick={(e) => {
                if (p.image_url || auth.authenticated) {
                  e.stopPropagation();
                  handleImageTap(p);
                }
              }}
            >
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} loading="lazy" />
              ) : (
                <Avatar name={p.name} category={p.category} />
              )}
            </div>

            <div className="pinfo">
              <div className="pname">{p.name}</div>
              <div className="pmeta">
                <span className="cat" style={{ color: theme.color }}>
                  {p.category}
                </span>
                <span className="sep" />
                <span>{p.unit}</span>
                {p.note && (
                  <>
                    <span className="sep" />
                    <span className="note">{p.note}</span>
                  </>
                )}
              </div>
            </div>

            <div className="pplu">
              <div className="pplu-code">{p.plu}</div>
              <div className="pplu-hint">
                {isCopied ? <Check size={11} /> : <Copy size={11} />}
                {isCopied ? 'Đã chép' : 'Chạm để chép'}
              </div>
            </div>

            {auth.authenticated && (
              <button
                type="button"
                className="icon-btn"
                aria-label="Sửa sản phẩm"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(p);
                }}
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderGrid = () => (
    <div className="pgrid">
      {sortedProducts.map((p) => {
        const isCopied = copiedPlu === p.plu;
        const theme = getCategoryTheme(p.category);
        return (
          <div key={p.id} className="pcard">
            <div className="pcard-media" onClick={() => handleImageTap(p)}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} loading="lazy" />
              ) : (
                <Avatar name={p.name} category={p.category} />
              )}
              {auth.authenticated && (
                <button
                  type="button"
                  className="media-btn"
                  aria-label="Tải ảnh"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadProduct(p);
                  }}
                >
                  <Camera size={15} />
                </button>
              )}
            </div>

            <div className="pcard-body">
              <div className="pmeta" style={{ marginTop: 0 }}>
                <span className="cat" style={{ color: theme.color }}>
                  {p.category}
                </span>
                <span className="sep" />
                <span>{p.unit}</span>
              </div>
              <div className="pcard-name">{p.name}</div>

              <button
                type="button"
                className={`pcard-plu ${isCopied ? 'copied' : ''}`}
                onClick={() => handleCopyPlu(p.plu, p.name)}
              >
                <div>
                  <div className="lbl">MÃ PLU</div>
                  <div className="code">{p.plu}</div>
                </div>
                <div className="act">
                  {isCopied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{isCopied ? 'Đã chép' : 'Chép'}</span>
                </div>
              </button>

              {auth.authenticated && (
                <div className="pcard-admin">
                  <button type="button" className="btn btn-ghost" onClick={() => openEditModal(p)}>
                    <Edit2 size={13} /> Sửa
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => handleDeleteProduct(p.id, p.name)}>
                    <Trash2 size={13} /> Xóa
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTable = () => (
    <div className="table-wrap">
      <table className="ptable">
        <thead>
          <tr>
            <th style={{ width: 64 }}>Ảnh</th>
            <th style={{ width: 110 }}>Mã PLU</th>
            <th>Tên sản phẩm</th>
            <th>Danh mục</th>
            <th style={{ width: 70 }}>ĐVT</th>
            <th>Ghi chú</th>
            <th style={{ width: 150, textAlign: 'right' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sortedProducts.map((p) => {
            const theme = getCategoryTheme(p.category);
            const isCopied = copiedPlu === p.plu;
            return (
              <tr key={p.id}>
                <td>
                  <div className="thumb" onClick={() => handleImageTap(p)}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} />
                    ) : (
                      <Avatar name={p.name} category={p.category} />
                    )}
                  </div>
                </td>
                <td className="plu">{p.plu}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>
                  <span className="cat-tag" style={{ background: theme.bg, color: theme.color }}>
                    {p.category}
                  </span>
                </td>
                <td>{p.unit}</td>
                <td style={{ color: p.note ? '#b45309' : '#cbd5e1', fontSize: 13 }}>{p.note || '—'}</td>
                <td>
                  <div className="actions">
                    <button
                      type="button"
                      className={`btn btn-sm ${isCopied ? 'btn-green' : 'btn-ghost'}`}
                      onClick={() => handleCopyPlu(p.plu, p.name)}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      {isCopied ? 'Đã chép' : 'Chép'}
                    </button>
                    {auth.authenticated && (
                      <>
                        <button type="button" className="icon-btn" title="Tải ảnh" onClick={() => setUploadProduct(p)}>
                          <Camera size={15} />
                        </button>
                        <button type="button" className="icon-btn" title="Sửa" onClick={() => openEditModal(p)}>
                          <Edit2 size={15} />
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
  );

  const renderSkeleton = () => (
    <div className="plist">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="prow" style={{ cursor: 'default' }}>
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <div>
            <div className="skeleton" style={{ width: '70%', height: 15, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '45%', height: 11 }} />
          </div>
          <div className="skeleton" style={{ width: 68, height: 24 }} />
        </div>
      ))}
    </div>
  );

  /* ------------------------------------------------------------------ */

  return (
    <div className="page">
      {/* Header */}
      <header className="app-header">
        <div className="wrap header-inner">
          <div className="brand">
            <div className="brand-logo">WM</div>
            <div className="brand-text">
              <div className="brand-title">WinMart PLU</div>
              <div className="brand-sub">Tra cứu nhanh mã cân sản phẩm</div>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn only-desktop"
              onClick={() => window.print()}
              title="In bảng mã PLU"
            >
              <Printer size={17} />
            </button>

            {auth.authenticated ? (
              <>
                <span className="admin-pill only-desktop">
                  <span className="dot" /> Admin
                </span>
                <button type="button" className="icon-btn green" onClick={openAddModal} title="Thêm mã PLU">
                  <Plus size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    setTestResult(null);
                    setIsSettingsOpen(true);
                  }}
                  title="Cấu hình Cloudinary"
                >
                  <Settings size={17} />
                </button>
                <button type="button" className="icon-btn" onClick={handleLogout} title="Đăng xuất">
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsLoginOpen(true)}>
                <LogIn size={15} />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sticky search + categories */}
      <div className="search-block">
        <div className="wrap">
          <div className="search-field">
            <Search className="s-icon" size={20} />
            <input
              ref={searchInputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập mã PLU hoặc tên sản phẩm"
              className="search-input"
              aria-label="Tìm kiếm sản phẩm"
            />
            {searchQuery ? (
              <button
                type="button"
                className="search-clear"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            ) : (
              <span className="kbd-hint only-desktop">/</span>
            )}
          </div>

          <div className="chips">
            <button
              type="button"
              className={`chip ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Tất cả <span className="count">{categoryCounts.all || 0}</span>
            </button>
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                className={`chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat} <span className="count">{categoryCounts[cat] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="main">
        <div className="wrap">
          <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Tra cứu mã PLU WinMart
          </h1>

          <div className="toolbar">
            <div className="result-count">
              <strong>{sortedProducts.length}</strong> sản phẩm
              {searchQuery && <> cho &ldquo;{searchQuery}&rdquo;</>}
            </div>
            <div className="toolbar-right">
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'plu_asc' | 'name_asc')}
                aria-label="Sắp xếp"
              >
                <option value="plu_asc">Theo mã</option>
                <option value="name_asc">Theo tên</option>
              </select>
              <div className="seg" role="tablist" aria-label="Kiểu hiển thị">
                <button
                  type="button"
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                  aria-label="Danh sách"
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  aria-label="Lưới ảnh"
                >
                  <LayoutGrid size={16} />
                </button>
                {!isMobile && (
                  <button
                    type="button"
                    className={viewMode === 'table' ? 'active' : ''}
                    onClick={() => setViewMode('table')}
                    aria-label="Bảng"
                  >
                    <TableIcon size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            renderSkeleton()
          ) : sortedProducts.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">
                <Search size={26} />
              </div>
              <h3>Không tìm thấy sản phẩm</h3>
              <p>
                {searchQuery
                  ? <>Không có mã hoặc tên nào khớp &ldquo;{searchQuery}&rdquo;.</>
                  : 'Danh mục này chưa có sản phẩm.'}
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : viewMode === 'list' ? (
            renderList()
          ) : viewMode === 'grid' ? (
            renderGrid()
          ) : (
            renderTable()
          )}

          {/* Print-only table */}
          <div className="print-only">
            <h2 style={{ textAlign: 'center', marginBottom: 12 }}>BẢNG TRA CỨU MÃ CÂN PLU WINMART</h2>
            <table>
              <thead>
                <tr>
                  <th>Mã PLU</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>ĐVT</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => (
                  <tr key={p.id}>
                    <td className="plu">{p.plu}</td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.unit}</td>
                    <td>{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="wrap">WinMart PLU Quick Search</div>
      </footer>

      {showScrollTop && !anyModalOpen && (
        <button
          type="button"
          className="fab-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Lên đầu trang"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* ---------------- MODALS ---------------- */}

      {/* Login */}
      {isLoginOpen && (
        <div className="overlay" onClick={() => setIsLoginOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="modal-head">
              <div>
                <div className="modal-title">Đăng nhập quản trị</div>
                <div className="modal-sub">Để thêm, sửa mã và tải ảnh sản phẩm</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsLoginOpen(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLogin}>
              <div className="info-box" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Clock size={15} style={{ flexShrink: 0, marginTop: 1 }} color="#059669" />
                <span>Phiên đăng nhập tự động kết thúc lúc 23:59 hôm nay.</span>
              </div>
              <div className="field">
                <label htmlFor="login-user">Tài khoản</label>
                <input
                  id="login-user"
                  className="input"
                  type="text"
                  required
                  autoComplete="username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="login-pass">Mật khẩu</label>
                <input
                  id="login-pass"
                  className="input"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setIsLoginOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={loginLoading}>
                  {loginLoading ? 'Đang xác thực...' : 'Đăng nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload image */}
      {uploadProduct && (
        <div className="overlay" onClick={closeUploadModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="modal-head">
              <div style={{ minWidth: 0 }}>
                <div className="modal-title">Ảnh sản phẩm</div>
                <div className="modal-sub">
                  {uploadProduct.name} · <strong style={{ color: '#be123c' }}>{uploadProduct.plu}</strong>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={closeUploadModal} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUploadImage}>
              <label className="dropzone">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageFileChange}
                  style={{ display: 'none' }}
                />
                {uploadPreview ? (
                  <>
                    <img src={uploadPreview} alt="Xem trước" className="dz-preview" />
                    <div className="dz-sub" style={{ color: '#059669', fontWeight: 600, marginTop: 8 }}>
                      Chạm để chọn ảnh khác
                    </div>
                  </>
                ) : (
                  <>
                    <Camera size={32} className="dz-icon" />
                    <div className="dz-title">Chụp hoặc chọn ảnh</div>
                    <div className="dz-sub">JPG, PNG, WEBP · tối đa 10MB</div>
                  </>
                )}
              </label>
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={closeUploadModal} disabled={uploading}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !uploadFile}>
                  {uploading ? 'Đang tải lên...' : 'Tải ảnh lên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit product */}
      {(isAddOpen || editProduct) && (
        <div className="overlay" onClick={closeProductModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="modal-head">
              <div className="modal-title">{editProduct ? 'Sửa sản phẩm' : 'Thêm mã PLU'}</div>
              <button type="button" className="modal-close" onClick={closeProductModal} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="row-plu">
                <div className="field">
                  <label htmlFor="f-plu">Mã PLU</label>
                  <input
                    id="f-plu"
                    className="input"
                    type="text"
                    inputMode="numeric"
                    required
                    value={productForm.plu}
                    onChange={(e) => setProductForm({ ...productForm, plu: e.target.value })}
                    placeholder="46040"
                  />
                </div>
                <div className="field">
                  <label htmlFor="f-name">Tên sản phẩm</label>
                  <input
                    id="f-name"
                    className="input"
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Bơ sáp (tròn)"
                  />
                </div>
              </div>

              <div className="row-2">
                <div className="field">
                  <label htmlFor="f-cat">Danh mục</label>
                  <select
                    id="f-cat"
                    className="select"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="f-unit">Đơn vị</label>
                  <select
                    id="f-unit"
                    className="select"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="f-note">Ghi chú</label>
                <input
                  id="f-note"
                  className="input"
                  type="text"
                  value={productForm.note}
                  onChange={(e) => setProductForm({ ...productForm, note: e.target.value })}
                  placeholder="Không bắt buộc"
                />
              </div>

              <div className="field">
                <label>Hình ảnh</label>
                <div className="tabs">
                  <button
                    type="button"
                    className={productImageMode === 'upload' ? 'active' : ''}
                    onClick={() => setProductImageMode('upload')}
                  >
                    <Camera size={14} /> Tải ảnh
                  </button>
                  <button
                    type="button"
                    className={productImageMode === 'url' ? 'active' : ''}
                    onClick={() => setProductImageMode('url')}
                  >
                    <ExternalLink size={14} /> Dán link
                  </button>
                </div>

                {productImageMode === 'upload' ? (
                  productImagePreview && productImageFile ? (
                    <div className="file-chip">
                      <img src={productImagePreview} alt="Xem trước" />
                      <div className="meta">
                        <div className="name">{productImageFile.name}</div>
                        <div className="sub">Sẽ tải lên Cloudinary khi lưu</div>
                      </div>
                      <button
                        type="button"
                        className="modal-close"
                        aria-label="Bỏ ảnh"
                        onClick={() => {
                          if (productImagePreview.startsWith('blob:')) URL.revokeObjectURL(productImagePreview);
                          setProductImageFile(null);
                          setProductImagePreview(null);
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="dropzone" style={{ padding: 16 }}>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (productImagePreview?.startsWith('blob:')) URL.revokeObjectURL(productImagePreview);
                            setProductImageFile(file);
                            setProductImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <Camera size={24} className="dz-icon" />
                      <div className="dz-title">Chụp hoặc chọn ảnh</div>
                      <div className="dz-sub">Tự tải lên Cloudinary khi lưu</div>
                    </label>
                  )
                ) : (
                  <>
                    <input
                      className="input"
                      type="url"
                      value={productForm.image_url}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.trim().startsWith('data:')) {
                          addToast('Không dùng ảnh Base64. Hãy tải file ảnh lên.', 'error');
                          return;
                        }
                        setProductForm({ ...productForm, image_url: val });
                      }}
                      placeholder="https://res.cloudinary.com/..."
                    />
                    {productForm.image_url.trim() && (
                      <div className="file-chip" style={{ marginTop: 8 }}>
                        <img src={productForm.image_url.trim()} alt="Xem trước" />
                        <div className="meta">
                          <div className="name">Ảnh từ link</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-foot">
                {editProduct ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: '0 0 auto', width: 46, padding: 0 }}
                    onClick={() => handleDeleteProduct(editProduct.id, editProduct.name)}
                    aria-label="Xóa sản phẩm"
                    disabled={savingProduct}
                  >
                    <Trash2 size={18} />
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={closeProductModal} disabled={savingProduct}>
                    Hủy
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={savingProduct}>
                  {savingProduct ? saveStep || 'Đang xử lý...' : editProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings */}
      {isSettingsOpen && (
        <div className="overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="modal-head">
              <div className="modal-title">Cấu hình Cloudinary</div>
              <button type="button" className="modal-close" onClick={() => setIsSettingsOpen(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className={`status-box ${cloudinaryConfigured ? 'ok' : 'warn'}`}>
                {cloudinaryConfigured ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>
                  {cloudinaryConfigured
                    ? `Đã kết nối cloud "${configuredCloudName || settingsForm.cloudinary_cloud_name}"`
                    : 'Chưa cấu hình — cần Cloud Name và API Key'}
                </span>
              </div>

              <div className="field">
                <label htmlFor="s-url">CLOUDINARY_URL (dán nhanh)</label>
                <input
                  id="s-url"
                  className="input"
                  type="text"
                  value={settingsForm.cloudinary_url}
                  onChange={(e) => handlePasteCloudinaryUrl(e.target.value)}
                  placeholder="cloudinary://key:secret@cloud"
                  style={{ fontSize: 14 }}
                />
                <div className="hint">Dán vào đây sẽ tự điền 3 ô bên dưới.</div>
              </div>
              <div className="field">
                <label htmlFor="s-cloud">Cloud Name</label>
                <input
                  id="s-cloud"
                  className="input"
                  type="text"
                  required
                  value={settingsForm.cloudinary_cloud_name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cloudinary_cloud_name: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="s-key">API Key</label>
                <input
                  id="s-key"
                  className="input"
                  type="text"
                  required
                  value={settingsForm.cloudinary_api_key}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cloudinary_api_key: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="s-secret">API Secret</label>
                <input
                  id="s-secret"
                  className="input"
                  type="text"
                  required
                  value={settingsForm.cloudinary_token}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cloudinary_token: e.target.value })}
                />
              </div>

              {testResult && (
                <div className={`status-box ${testResult.success ? 'ok' : 'err'}`}>{testResult.message}</div>
              )}

              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={handleTestConnection} disabled={testingConnection}>
                  <RefreshCw size={15} className={testingConnection ? 'spin' : ''} />
                  {testingConnection ? 'Đang thử...' : 'Kiểm tra'}
                </button>
                <button type="submit" className="btn btn-green" disabled={settingsLoading}>
                  {settingsLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lb-close" onClick={() => setLightboxImage(null)} aria-label="Đóng">
              <X size={18} />
            </button>
            <img src={lightboxImage.image_url} alt={lightboxImage.name} />
            <div className="lb-foot">
              <div style={{ minWidth: 0 }}>
                <div className="lb-name">{lightboxImage.name}</div>
                <div className="lb-plu">
                  Mã PLU <strong>{lightboxImage.plu}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {auth.authenticated && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Đổi ảnh"
                    onClick={() => {
                      const p = lightboxImage;
                      setLightboxImage(null);
                      setUploadProduct(p);
                    }}
                  >
                    <Camera size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleCopyPlu(lightboxImage.plu, lightboxImage.name)}
                >
                  <Copy size={14} /> Chép mã
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.type === 'success' ? (
              <Check size={18} color="#34d399" />
            ) : t.type === 'error' ? (
              <AlertCircle size={18} color="#f87171" />
            ) : (
              <Sparkles size={18} color="#60a5fa" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
