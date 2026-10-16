import { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileDown, ChevronDown } from 'lucide-react';
import api from '../api/client';
import { inr, dateFmt } from '../utils/format';
import { exportCsv, exportExcel, exportPdf } from '../utils/csv';
import { Spinner } from '../components/ui';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState(null);
  const [detail, setDetail] = useState(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => { api.get('/api/admin/customers').then((r) => setCustomers(r.data.data)).catch(() => {}); }, []);
  const open = (id) => api.get(`/api/admin/customers/${id}`).then((r) => setDetail(r.data.data)).catch(() => {});

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isGeneratedEmail = (email, phone) => {
    return email && phone && email.startsWith(phone) && email.endsWith('@novoclothing.com');
  };

  const exportCols = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'orders', label: 'Orders' },
    { key: 'spent', label: 'Spent (₹)' },
    { key: 'joined', label: 'Joined' },
  ];
  const exportRows = () =>
    (customers || []).map((c) => ({
      name: c.name || '',
      email: isGeneratedEmail(c.email, c.phone) ? '' : (c.email || ''),
      phone: c.phone || '',
      orders: c.order_count ?? 0,
      spent: Number(c.total_spent || 0),
      joined: dateFmt(c.created_at),
    }));
  const doExport = (fmt) => {
    const rows = exportRows();
    if (!rows.length) return;
    if (fmt === 'csv') exportCsv('customers', rows, exportCols);
    if (fmt === 'excel') exportExcel('customers', rows, exportCols);
    if (fmt === 'pdf') exportPdf('Customers', rows, exportCols);
    setMenu(false);
  };

  if (!customers) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Customers</h1>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenu((v) => !v)} className="btn-outline !py-2 text-sm" disabled={!customers.length}>
            <Download size={16} /> Export <ChevronDown size={14} />
          </button>
          {menu && (
            <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-neutral-900">
              <button onClick={() => doExport('csv')} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gold/10">
                <FileText size={16} className="text-gray-400" /> CSV
              </button>
              <button onClick={() => doExport('excel')} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gold/10">
                <FileSpreadsheet size={16} className="text-gray-400" /> Excel
              </button>
              <button onClick={() => doExport('pdf')} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gold/10">
                <FileDown size={16} className="text-gray-400" /> PDF
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="p-4">Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Spent</th><th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} onClick={() => open(c.id)} className="cursor-pointer border-b border-black/5 last:border-0 hover:bg-gold/5 dark:border-white/10">
                <td className="p-4 font-medium">{c.name}</td>
                <td className="text-gray-400">{isGeneratedEmail(c.email, c.phone) ? '—' : c.email}</td>
                <td className="text-gray-400">{c.phone || '—'}</td>
                <td>{c.order_count}</td>
                <td className="font-semibold">{inr(c.total_spent)}</td>
                <td className="text-gray-400">{dateFmt(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="card relative max-h-[80vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold">{detail.name}</h3>
            <p className="text-gray-400">{isGeneratedEmail(detail.email, detail.phone) ? 'No email' : detail.email} · {detail.phone || 'No phone'}</p>
            <h4 className="mt-6 mb-2 font-semibold">Order History ({detail.orders.length})</h4>
            <div className="space-y-2">
              {detail.orders.map((o) => (
                <div key={o.id} className="flex justify-between rounded-xl bg-black/5 p-3 text-sm dark:bg-white/5">
                  <div className="flex flex-col">
                    <span className="font-semibold">{o.order_number}</span>
                    <span className="text-[11px] text-gray-400 font-normal">{o.channel === 'counter' ? 'In-Store POS' : 'Online Store'}</span>
                  </div>
                  <span className="capitalize text-gray-400 self-center">{o.status}</span>
                  <span className="font-semibold self-center">{inr(o.total)}</span>
                </div>
              ))}
              {detail.orders.length === 0 && <p className="text-sm text-gray-400">No orders yet.</p>}
            </div>
            <button onClick={() => setDetail(null)} className="btn-outline mt-6 w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
