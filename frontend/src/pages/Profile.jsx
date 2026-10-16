import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { User, Lock, MapPin, Plus, Trash2, Star, ArrowLeft, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';

const TABS = [['profile', 'Profile', User], ['password', 'Password', Lock], ['addresses', 'Addresses', MapPin]];
const TAB_KEYS = TABS.map(([k]) => k);
const emptyAddr = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initial = TAB_KEYS.includes(params.get('tab')) ? params.get('tab') : 'profile';
  const [tab, setTab] = useState(initial);

  // Keep the active tab in the URL so it can be deep-linked (e.g. /profile?tab=addresses).
  const selectTab = (key) => { setTab(key); setParams(key === 'profile' ? {} : { tab: key }, { replace: true }); };

  // Sync when the URL changes while already on this page.
  useEffect(() => {
    const t = params.get('tab');
    if (TAB_KEYS.includes(t) && t !== tab) setTab(t);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gold transition">
          <ArrowLeft size={16} /> Back
        </button>
        {user?.role === 'admin' && (
          <Link to="/admin" className="text-sm font-medium text-gold hover:text-gold-light transition">
            Go to Admin Dashboard →
          </Link>
        )}
      </div>

      <h1 className="mb-8 font-display text-3xl font-bold">My Account</h1>

      {/* Mobile: horizontal scrollable tab bar (the desktop sidebar is hidden) */}
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:hidden">
        {TABS.map(([key, label, Icon]) => (
          <button key={key} onClick={() => selectTab(key)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${tab === key ? 'bg-gold text-ink' : 'border border-black/10 dark:border-white/10'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-48 shrink-0 sm:block">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} onClick={() => selectTab(key)}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${tab === key ? 'bg-gold/10 text-gold' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </aside>
        <div className="min-w-0 flex-1">
          {tab === 'profile' && <ProfileTab user={user} updateUser={updateUser} />}
          {tab === 'password' && <PasswordTab />}
          {tab === 'addresses' && <AddressTab />}
        </div>
      </div>
    </div>
  );
}

// Centre-crop to a square and scale to 400×400 WebP (JPEG fallback) — keeps the stored photo small.
function squareAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const out = Math.min(400, side);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = out;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, out, out);
        ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
        const webp = canvas.toDataURL('image/webp', 0.85);
        resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ProfilePhoto({ user, updateUser }) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const saveAvatar = async (avatar) => {
    setBusy(true);
    try {
      // name/phone are required by the endpoint — send the saved values so only the photo changes
      const body = { name: user?.name || '', phone: user?.phone || '', avatar };
      let res;
      try {
        res = await api.post('/api/profile', { ...body, _method: 'PUT' });
      } catch {
        res = await api.put('/api/profile', body);
      }
      updateUser({ avatar_url: res.data?.data?.avatar_url || null });
      toast.success(avatar ? 'Profile photo updated' : 'Profile photo removed');
    } catch (err) {
      toast.error(err.message || 'Could not update photo');
    } finally {
      setBusy(false);
    }
  };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image is too large (max 10 MB)'); return; }
    try {
      await saveAvatar(await squareAvatar(file));
    } catch {
      toast.error('Could not read that image');
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar user={user} size={88} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="absolute -bottom-1 -right-1 rounded-full bg-gold p-2 text-ink shadow-glass transition hover:bg-gold-light disabled:opacity-50"
          aria-label="Change profile photo">
          <Camera size={15} />
        </button>
      </div>
      <div>
        <p className="font-semibold">Profile photo</p>
        <p className="text-xs text-gray-400">Square photo works best — it's cropped to a circle. JPG, PNG or WebP.</p>
        <div className="mt-2 flex gap-3 text-sm">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="font-medium text-gold hover:underline disabled:opacity-50">
            {busy ? 'Saving…' : user?.avatar_url ? 'Change photo' : 'Upload photo'}
          </button>
          {user?.avatar_url && !busy && (
            <button type="button" onClick={() => saveAvatar('')} className="text-rose-500 hover:underline">Remove</button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
    </div>
  );
}

function ProfileTab({ user, updateUser }) {
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '' });
    }
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      try {
        res = await api.post('/api/profile', { ...form, _method: 'PUT' });
      } catch (e1) {
        res = await api.put('/api/profile', form);
      }
      const uData = res.data?.data || {};
      updateUser({ name: uData.name, phone: uData.phone });
      if (uData.token) {
        localStorage.setItem('cf_token', uData.token);
      }
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold">Edit Profile</h2>
      <ProfilePhoto user={user} updateUser={updateUser} />
      <div>
        <label className="text-sm text-gray-400">Name</label>
        <input required className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="text-sm text-gray-400">Email</label>
        <input className="input mt-1 opacity-60" value={user?.email || ''} disabled />
      </div>
      <div>
        <label className="text-sm text-gray-400">Phone</label>
        <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <button disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Changes'}</button>
    </form>
  );
}

function PasswordTab() {
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!form.current_password) {
      toast.error('Please enter your current password');
      return;
    }
    if (!form.password) {
      toast.error('Please enter a new password');
      return;
    }
    if (form.password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (form.password !== form.password_confirmation) {
      toast.error('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      let res;
      try {
        res = await api.post('/api/profile/password', { ...form, _method: 'PUT' });
      } catch (e1) {
        res = await api.put('/api/profile/password', form);
      }
      toast.success(res?.data?.message || 'Password changed successfully');
      setForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold">Change Password</h2>
      <PasswordInput placeholder="Current password" value={form.current_password}
        onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
      <PasswordInput placeholder="New password" value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <PasswordInput placeholder="Confirm new password" value={form.password_confirmation}
        onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
      <button disabled={saving} className="btn-gold">{saving ? 'Updating…' : 'Update Password'}</button>
    </form>
  );
}

function AddressTab() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyAddr);
  const [show, setShow] = useState(false);

  const load = () => api.get('/api/addresses').then((r) => setAddresses(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/addresses', form);
      toast.success('Address added');
      setForm(emptyAddr);
      setShow(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add address');
    }
  };
  const del = async (id) => {
    try {
      try {
        await api.post(`/api/addresses/${id}/delete`, { _method: 'DELETE' });
      } catch (e1) {
        await api.delete(`/api/addresses/${id}`);
      }
      toast.success('Address removed');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete address');
    }
  };
  const makeDefault = async (a) => {
    try {
      try {
        await api.put(`/api/addresses/${a.id}`, { ...a, is_default: 1 });
      } catch (e1) {
        await api.post(`/api/addresses/${a.id}`, { ...a, is_default: 1, _method: 'PUT' });
      }
      toast.success('Default address updated');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to set default address');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved Addresses</h2>
        <button onClick={() => setShow((s) => !s)} className="flex items-center gap-1 text-sm text-gold"><Plus size={16} /> Add</button>
      </div>
      {addresses.map((a) => (
        <div key={a.id} className="card flex items-start justify-between p-5">
          <div className="text-sm">
            <p className="font-semibold">{a.full_name} {a.is_default ? <span className="ml-2 rounded bg-gold/15 px-2 py-0.5 text-xs text-gold">Default</span> : null}</p>
            <p className="text-gray-400">{a.line1}, {a.city}, {a.state} - {a.pincode}</p>
            <p className="text-gray-400">{a.phone}</p>
          </div>
          <div className="flex gap-2">
            {!a.is_default && <button onClick={() => makeDefault(a)} title="Set default" className="text-gray-400 hover:text-gold"><Star size={18} /></button>}
            <button onClick={() => del(a.id)} className="text-gray-400 hover:text-rose-500"><Trash2 size={18} /></button>
          </div>
        </div>
      ))}
      {show && (
        <form onSubmit={save} className="card grid gap-3 p-6 sm:grid-cols-2">
          <input required className="input" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input required className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input required className="input sm:col-span-2" placeholder="Address Line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          <input required className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input required className="input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <input required className="input" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          <button className="btn-gold sm:col-span-2">Save Address</button>
        </form>
      )}
    </div>
  );
}
