import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import { Spinner, Empty, SectionTitle } from '../components/ui';
import { Search } from 'lucide-react';
import Seo from '../components/Seo';

const SORTS = [
  ['newest', 'Newest'], ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'], ['popularity', 'Popularity'], ['rating', 'Top Rated'],
  ['discount', 'Biggest Discount'],
];

export default function Shop() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  // Filter options (sizes/colors/price) come live from the backend, derived
  // from the actual products in this category/search — not a hardcoded list.
  const [facets, setFacets] = useState({ sizes: [], colors: [], price: { min: 0, max: 0 } });
  const [filters, setFilters] = useState({
    sort: params.get('sort') || 'newest',
    sizes: [], colors: [], min: '', max: '',
  });

  const search = params.get('search') || '';
  const onSale = !!params.get('on_sale'); // "Shop the Sale" entry point

  // Categories drive the sidebar filter and resolve the real category name from
  // its slug (slugs can carry a suffix, e.g. "jewellery-3c4a").
  useEffect(() => {
    api.get('/api/categories')
      .then((r) => setCategories(r.data.data || []))
      .catch(() => setCategories([]));
  }, []);
  const categoryName = categories.find((c) => c.slug === slug)?.name || '';
  const totalCount = categories.reduce((n, c) => n + Number(c.product_count || 0), 0);

  // Keep search / sale query params when switching category.
  const categoryLink = (s) => {
    const qs = params.toString();
    return `${s ? `/category/${s}` : '/shop'}${qs ? `?${qs}` : ''}`;
  };

  // Load the available filter facets for the current category/search.
  useEffect(() => {
    const qp = new URLSearchParams();
    if (slug) qp.set('category', slug);
    if (search) qp.set('search', search);
    api.get(`/api/products/filters?${qp.toString()}`)
      .then((r) => setFacets(r.data.data))
      .catch(() => setFacets({ sizes: [], colors: [], price: { min: 0, max: 0 } }));
  }, [slug, search]);

  const fetchProducts = useCallback(async (pageNum, append) => {
    append ? setLoadingMore(true) : setLoading(true);
    const qp = new URLSearchParams();
    if (slug) qp.set('category', slug);
    if (search) qp.set('search', search);
    if (filters.sort) qp.set('sort', filters.sort);
    if (filters.sizes.length) qp.set('size', filters.sizes.join(','));
    if (filters.colors.length) qp.set('color', filters.colors.join(','));
    if (filters.min) qp.set('min_price', filters.min);
    if (filters.max) qp.set('max_price', filters.max);
    if (onSale) qp.set('on_sale', '1'); // only discounted products
    qp.set('per_page', '12');
    qp.set('page', String(pageNum));
    try {
      const { data } = await api.get(`/api/products?${qp.toString()}`);
      setPagination(data.data.pagination);
      setItems((prev) => (append ? [...prev, ...data.data.products] : data.data.products));
    } finally { append ? setLoadingMore(false) : setLoading(false); }
  }, [slug, search, onSale, filters]);

  // Reset to page 1 whenever the category, search, or filters change.
  useEffect(() => { setPage(1); fetchProducts(1, false); }, [fetchProducts]);

  const loadMore = () => { const next = page + 1; setPage(next); fetchProducts(next, true); };

  const toggleArr = (key, val) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));

  const title = onSale ? 'Sale'
    : slug
      ? (categoryName || slug.replace(/-[a-z0-9]{4}$/i, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      : search ? `Results for "${search}"` : 'All Products';
  const eyebrow = onSale ? 'Limited Offer' : 'Collection';

  const FilterPanel = (
    <div className="space-y-7">
      <FilterGroup title="Price Range">
        <div className="flex items-center gap-2">
          <input type="number" placeholder={facets.price.min ? `₹${facets.price.min}` : 'Min'} aria-label="Minimum price" value={filters.min}
            onChange={(e) => setFilters((f) => ({ ...f, min: e.target.value }))} className="input min-w-0 flex-1 !px-3 !py-2 text-sm" />
          <span>–</span>
          <input type="number" placeholder={facets.price.max ? `₹${facets.price.max}` : 'Max'} aria-label="Maximum price" value={filters.max}
            onChange={(e) => setFilters((f) => ({ ...f, max: e.target.value }))} className="input min-w-0 flex-1 !px-3 !py-2 text-sm" />
        </div>
      </FilterGroup>
      {categories.length > 0 && (
        <FilterGroup title="Categories">
          <ul className="space-y-1">
            {[{ slug: '', name: 'All Products', product_count: totalCount }, ...categories].map((c) => {
              const active = (slug || '') === c.slug;
              return (
                <li key={c.slug || 'all'}>
                  <Link to={categoryLink(c.slug)} onClick={() => setShowFilters(false)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-gold/10 font-semibold text-gold' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    <span>{c.name}</span>
                    {c.product_count != null && <span className="text-xs text-gray-400">{c.product_count}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      )}
      {facets.sizes.length > 0 && (
        <FilterGroup title="Size">
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <button key={s} onClick={() => toggleArr('sizes', s)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${filters.sizes.includes(s) ? 'border-gold bg-gold/10 text-gold' : 'border-black/10 dark:border-white/10'}`}>
                {s}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}
      {facets.colors.length > 0 && (
        <FilterGroup title="Color">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => (
              <button key={c.name} onClick={() => toggleArr('colors', c.name)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${filters.colors.includes(c.name) ? 'border-gold bg-gold/10 text-gold' : 'border-black/10 dark:border-white/10'}`}>
                {c.hex && <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />}
                {c.name}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Seo title={title} description={`Shop ${title} at Beadsboutique. ${pagination?.total ?? ''} curated jewellery pieces with filters for size, colour, brand and price.`} />
      <SectionTitle eyebrow={eyebrow} title={title} />

      <div className="mb-6 flex items-center justify-between gap-3">
        <button onClick={() => setShowFilters(true)} className="btn-outline !py-2 text-sm lg:hidden">
          <SlidersHorizontal size={16} /> Filters
        </button>
        <p className="whitespace-nowrap text-sm text-gray-400">{pagination?.total ?? 0} products</p>
        <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
          aria-label="Sort products"
          className="input !w-auto min-w-0 max-w-[42vw] !py-2 text-sm sm:max-w-none">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-60 shrink-0 lg:block">{FilterPanel}</aside>

        <div className="flex-1">
          {loading ? <Spinner /> : items.length ? (
            <>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {pagination && page < pagination.pages && (
                <div className="mt-10 flex flex-col items-center gap-2">
                  <button onClick={loadMore} disabled={loadingMore} className="btn-outline">
                    {loadingMore ? 'Loading…' : 'Load More'}
                  </button>
                  <p className="text-xs text-gray-400">Showing {items.length} of {pagination.total}</p>
                </div>
              )}
            </>
          ) : (
            <Empty icon={Search} title="No products found" subtitle="Try adjusting your filters or search." />
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-white p-6 dark:bg-ink">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button onClick={() => setShowFilters(false)}><X /></button>
            </div>
            {FilterPanel}
            <button onClick={() => setShowFilters(false)} className="btn-gold mt-8 w-full">Apply Filters</button>
          </div>
        </div>
      )}
    </div>
  );
}

const FilterGroup = ({ title, children }) => (
  <div>
    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">{title}</h4>
    {children}
  </div>
);
