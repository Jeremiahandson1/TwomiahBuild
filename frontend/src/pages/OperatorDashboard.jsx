import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Package, DollarSign, ArrowRight, Factory, 
  TrendingUp, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalBuilds: 0,
    monthlyRevenue: 0,
    recentBuilds: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      // Stats endpoint may not exist yet - use defaults
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { 
      label: 'Total Customers', 
      value: stats.totalCustomers, 
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    { 
      label: 'Packages Built', 
      value: stats.totalBuilds, 
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    { 
      label: 'Monthly Revenue', 
      value: `$${stats.monthlyRevenue.toLocaleString()}`, 
      icon: DollarSign,
      color: 'bg-orange-50 text-orange-600',
      iconBg: 'bg-orange-100',
    },
    { 
      label: 'Active Instances', 
      value: stats.totalCustomers, 
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage your software business</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.color.split(' ')[1]}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{loading ? '—' : card.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* New Build */}
        <div 
          onClick={() => navigate('/factory')}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Factory className="w-5 h-5" />
                <span className="text-sm font-medium text-orange-200">Quick Action</span>
              </div>
              <h3 className="text-xl font-bold mb-1">Generate New Package</h3>
              <p className="text-orange-100 text-sm">Create a website, CMS, or CRM for a new customer</p>
            </div>
            <ArrowRight className="w-6 h-6 text-orange-200 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Manage Customers */}
        <div 
          onClick={() => navigate('/customers')}
          className="bg-white rounded-xl border border-slate-200 p-6 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-400">Quick Action</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Manage Customers</h3>
              <p className="text-slate-500 text-sm">View and manage your customer accounts</p>
            </div>
            <ArrowRight className="w-6 h-6 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Recent Builds */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Builds</h3>
          <button 
            onClick={() => navigate('/factory')}
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            View all
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.recentBuilds.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Factory className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No packages built yet</p>
              <p className="text-slate-400 text-sm mt-1">Use the Factory to generate your first customer package</p>
              <button
                onClick={() => navigate('/factory')}
                className="mt-4 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Open Factory
              </button>
            </div>
          ) : (
            stats.recentBuilds.map((build, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    build.status === 'complete' ? 'bg-emerald-100' : 'bg-amber-100'
                  }`}>
                    {build.status === 'complete' 
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      : <Clock className="w-4 h-4 text-amber-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{build.companyName}</p>
                    <p className="text-xs text-slate-500">{build.products?.join(', ')}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(build.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
