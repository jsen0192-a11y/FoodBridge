import React, { useState, useEffect } from 'react';
import { API_URL } from '../context/AuthContext';
import { 
  ShieldCheck, BarChart3, Clock, CheckCircle2, 
  XCircle, Building2, RefreshCw, ClipboardList 
} from 'lucide-react';

export default function AdminDashboard() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all donations
  const fetchDonations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/donations`);
      if (res.ok) {
        const data = await res.json();
        setDonations(data);
      }
    } catch (err) {
      console.error("Admin failed to load donations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  // Compute Aggregated Statistics
  const totalDonations = donations.length;
  const pendingCount = donations.filter(d => d.status === 'pending').length;
  const acceptedCount = donations.filter(d => d.status === 'accepted').length;
  const rejectedCount = donations.filter(d => d.status === 'rejected').length;

  // Extrapolate unique NGO names from claims
  const uniqueNgos = Array.from(
    new Set(donations.filter(d => d.status === 'accepted' && d.acceptedBy).map(d => d.acceptedBy))
  );
  // Add a default base NGO count (fallback)
  const ngoCount = Math.max(uniqueNgos.length, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      
      {/* Title Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" /> Admin Control Panel
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Overview statistics and direct logs directory for all FoodBridge activities.
          </p>
        </div>
        
        <button
          onClick={fetchDonations}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-darkBg-secondary text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-darkBg-primary transition-all"
          title="Refresh Data"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        
        {/* Metric 1: Total */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 shadow-md flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-darkBg-primary text-slate-500 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={24} />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-800 dark:text-white block">{totalDonations}</span>
            <span className="text-xs text-slate-400 font-bold uppercase">Total Donations</span>
          </div>
        </div>

        {/* Metric 2: Pending */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 shadow-md flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center flex-shrink-0 border border-yellow-500/20">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-800 dark:text-white block">{pendingCount}</span>
            <span className="text-xs text-slate-400 font-bold uppercase">Pending</span>
          </div>
        </div>

        {/* Metric 3: Accepted */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 shadow-md flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-800 dark:text-white block">{acceptedCount}</span>
            <span className="text-xs text-slate-400 font-bold uppercase">Accepted</span>
          </div>
        </div>

        {/* Metric 4: Rejected */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 shadow-md flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0 border border-red-500/20">
            <XCircle size={24} />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-800 dark:text-white block">{rejectedCount}</span>
            <span className="text-xs text-slate-400 font-bold uppercase">Rejected</span>
          </div>
        </div>

        {/* Metric 5: NGOs */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 shadow-md flex items-center gap-4 text-left col-span-2 lg:col-span-1">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
            <Building2 size={24} />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-800 dark:text-white block">{ngoCount}</span>
            <span className="text-xs text-slate-400 font-bold uppercase">Total NGOs</span>
          </div>
        </div>

      </div>

      {/* Donation History Table */}
      <div className="glass-panel rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden transition-all duration-300">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 text-left flex items-center gap-2">
          <ClipboardList className="text-indigo-500" size={20} />
          <h3 className="font-extrabold text-slate-800 dark:text-white">Donation History Directory</h3>
        </div>

        {loading ? (
          <div className="p-24 text-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs text-slate-500">Querying MongoDB documents...</p>
          </div>
        ) : donations.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            No history logs registered in database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-darkBg-primary text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4">Date</th>
                  <th className="p-4">Donor Details</th>
                  <th className="p-4">Food & Quantity</th>
                  <th className="p-4">NGO Claim Status</th>
                  <th className="p-4">Claimed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {donations.map(d => {
                  const createdDate = new Date(d.createdAt).toLocaleDateString();
                  return (
                    <tr key={d._id || d.id} className="hover:bg-slate-50/50 dark:hover:bg-darkBg-primary/20 transition-colors">
                      <td className="p-4 text-xs font-medium text-slate-400">{createdDate}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 dark:text-white">{d.donorName}</div>
                        <div className="text-xs text-slate-400">{d.phone} {d.organisationName && `| ${d.organisationName}`}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-extrabold text-slate-800 dark:text-white">{d.foodName}</div>
                        <div className="text-xs text-slate-400">{d.quantity} (Serves {d.peopleServed})</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          d.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          d.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-indigo-500 dark:text-indigo-400">
                        {d.acceptedBy || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
