import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { Building2, User, Lock, Users, Trash2 } from 'lucide-react';
import { Input } from '../components/ui/Input';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function SettingsPage() {
  const { user, company, updateCompany } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('company');
  const [companyForm, setCompanyForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', website: '', licenseNumber: '' });
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);

  useEffect(() => {
    if (company) {
      setCompanyForm({ name: company.name || '', email: company.email || '', phone: company.phone || '', address: company.address || '', city: company.city || '', state: company.state || '', zip: company.zip || '', website: company.website || '', licenseNumber: company.licenseNumber || '' });
    }
    if (user) {
      setProfileForm({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', phone: user.phone || '' });
    }
    loadUsers();
  }, [company, user]);

  const loadUsers = async () => {
    try { const data = await api.company.users(); setUsers(data); }
    catch (err) { console.error('Failed to load users'); }
  };

  const handleSaveCompany = async () => {
    setSaving(true);
    try { const updated = await api.company.update(companyForm); updateCompany(updated); toast.success('Company updated'); }
    catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/api/company/users/${user.userId || user.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: profileForm.firstName, lastName: profileForm.lastName, phone: profileForm.phone }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      toast.success('Profile updated');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passwordForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await api.request('/api/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }) });
      toast.success('Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteUser = async (u) => {
    if (!confirm(`Delete ${u.firstName} ${u.lastName} (${u.email})? This cannot be undone.`)) return;
    setDeletingUser(u.id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/api/company/users/${u.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success('User deleted');
    } catch (err) { toast.error(err.message); }
    finally { setDeletingUser(null); }
  };

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'users', label: 'Users', icon: Users },
  ];

  const saveBtn = (label, onClick) => (
    <button onClick={onClick} disabled={saving}
      className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors">
      {saving ? 'Saving...' : label}
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex gap-6">
        <div className="w-48 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left text-sm font-medium transition-colors ${tab === t.id ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-100'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6">

          {tab === 'company' && (
            <div className="space-y-4 max-w-xl">
              <h2 className="text-lg font-semibold text-slate-900">Company Information</h2>
              <Input label="Company Name" value={companyForm.name} onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Email" type="email" value={companyForm.email} onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} />
                <Input label="Phone" value={companyForm.phone} onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} />
              </div>
              <Input label="Address" value={companyForm.address} onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})} />
              <div className="grid grid-cols-3 gap-4">
                <Input label="City" value={companyForm.city} onChange={(e) => setCompanyForm({...companyForm, city: e.target.value})} />
                <Input label="State" value={companyForm.state} onChange={(e) => setCompanyForm({...companyForm, state: e.target.value})} />
                <Input label="ZIP" value={companyForm.zip} onChange={(e) => setCompanyForm({...companyForm, zip: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Website" value={companyForm.website} onChange={(e) => setCompanyForm({...companyForm, website: e.target.value})} />
                <Input label="License #" value={companyForm.licenseNumber} onChange={(e) => setCompanyForm({...companyForm, licenseNumber: e.target.value})} />
              </div>
              {saveBtn('Save Changes', handleSaveCompany)}
            </div>
          )}

          {tab === 'profile' && (
            <div className="space-y-4 max-w-xl">
              <h2 className="text-lg font-semibold text-slate-900">Your Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" value={profileForm.firstName} onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})} />
                <Input label="Last Name" value={profileForm.lastName} onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})} />
              </div>
              <Input label="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} />
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
                Email: <span className="text-slate-700 font-medium">{profileForm.email}</span> — contact support to change your login email.
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
                Role: <span className="text-slate-700 font-medium capitalize">{user?.role}</span>
              </div>
              {saveBtn('Save Profile', handleSaveProfile)}
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-4 max-w-xl">
              <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
              <Input label="Current Password" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
              <Input label="New Password" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
              <Input label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
              {saveBtn('Change Password', handleChangePassword)}
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Users</h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900 font-medium">{u.firstName} {u.lastName}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{u.role}</td>
                        <td className="px-4 py-3">{u.isActive ? <span className="text-emerald-600 font-medium">Active</span> : <span className="text-slate-400">Inactive</span>}</td>
                        <td className="px-4 py-3 text-right">
                          {u.id !== (user?.userId || user?.id) && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={deletingUser === u.id}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete user"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
