import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, ArrowUpRight, Mail, Phone, MapPin, Leaf, ShieldCheck, Truck } from 'lucide-react';
import Logo from '../../components/Logo';
import { useStore } from '../../context/StoreContext';

// Official WhatsApp glyph (lucide has no brand icon for it).
const WhatsApp = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const COLS = [
  ['Company', [['About', '/about'], ['Shop All', '/shop'], ['New Arrivals', '/shop'], ['Best Sellers', '/shop']]],
  ['Support', [['Contact', '/contact'], ['Orders', '/orders'], ['Wishlist', '/wishlist'], ['FAQ', '/contact']]],
  ['Policies', [['Privacy', '/privacy'], ['Terms', '/terms'], ['Returns & Refund', '/returns'], ['Shipping', '/shipping']]],
];

const TRUST = [
  [Leaf, 'Handpicked & fresh'],
  [ShieldCheck, 'No preservatives'],
  [Truck, 'Delivered across India'],
];

export default function LandingFooter() {
  const store = useStore();
  // Live social links + contact details from Admin → Settings (only filled ones show).
  const SOCIALS = [
    [Instagram, store.instagram],
    [Facebook, store.facebook],
    [Twitter, store.twitter],
    [WhatsApp, store.whatsapp ? `https://wa.me/${store.whatsapp}` : ''],
  ].filter(([, href]) => href);
  const CONTACT = [
    [Phone, store.phone, store.phone && `tel:${store.phone.replace(/\s/g, '')}`],
    [Mail, store.email, store.email && `mailto:${store.email}`],
    [MapPin, store.address, null],
  ].filter(([, v]) => v);

  return (
    // Cream strip behind so the footer's rounded top reads as a separate panel.
    <div className="bg-luxe-bg dark:bg-ink">
      <footer data-nav="dark" className="relative overflow-hidden rounded-t-[32px] bg-luxe-ink text-white sm:rounded-t-[48px]">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-luxe-gold/15 blur-3xl" />

        {/* trust strip */}
        <div className="relative border-b border-white/10">
          <ul className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-6 text-sm text-white/75 sm:px-10 lg:justify-between lg:px-12">
            {TRUST.map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-luxe-gold/15 text-luxe-gold"><Icon size={15} /></span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto max-w-[1400px] px-6 pb-8 pt-14 sm:px-10 lg:px-12">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            {/* Brand + contact */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo white className="h-20" />
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
                Premium nuts & dry fruits, packed fresh in India for every occasion.
              </p>
              {CONTACT.length > 0 && (
                <ul className="mt-6 space-y-2.5 text-sm text-white/70">
                  {CONTACT.map(([Icon, value, href]) => (
                    <li key={value} className="flex items-start gap-2.5">
                      <Icon size={16} className="mt-0.5 shrink-0 text-luxe-gold" />
                      {href ? <a href={href} className="transition hover:text-white">{value}</a> : <span>{value}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {SOCIALS.length > 0 && (
                <div className="mt-6 flex gap-3">
                  {SOCIALS.map(([Icon, href], i) => (
                    <a key={i} href={href} target="_blank" rel="noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition hover:border-luxe-cream hover:bg-luxe-cream hover:text-luxe-ink">
                      <Icon size={17} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {COLS.map(([title, links]) => (
              <div key={title}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-luxe-gold">{title}</h4>
                <ul className="mt-5 space-y-3">
                  {links.map(([label, to]) => (
                    <li key={label}>
                      <Link to={to} className="group inline-flex items-center gap-1 text-sm text-white/70 transition hover:text-white">
                        {label}
                        <ArrowUpRight size={13} className="opacity-0 transition group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* oversized wordmark */}
          <p aria-hidden className="pointer-events-none mt-14 select-none text-center font-display text-[18vw] font-bold leading-none text-luxe-cream lg:text-[200px]">
            NutValley
          </p>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-7 text-sm text-white/45 sm:flex-row">
            <p>© {new Date().getFullYear()} NutValley. All rights reserved.</p>
            <p>Designed and Developed By <a href="https://cloudhawk.in/" className="text-luxe-gold transition hover:text-white">CloudHawk</a>.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
