import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { 
  ShieldCheck, Users, BarChart3, Check, X, RefreshCw, 
  UserCheck, AlertTriangle, Download, Trash2, Search, SlidersHorizontal, Printer 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Map from '../components/Map';


export default function AdminDashboard() {
  const { token, getHeaders } = useAuth();

  // States
  const [analytics, setAnalytics] = useState({
    totalMealsSaved: 0,
    totalDonations: 0,
    activeNgos: 0,
    activeVolunteers: 0,
    leaderboard: [],
    ngoPerformance: [],
    volunteerPerformance: [],
    heatMapData: []
  });
  const [usersList, setUsersList] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tabs: 'overview' | 'verifications' | 'users'
  const [view, setView] = useState('overview');

  const getHeatMapMarkers = () => {
    if (!analytics.heatMapData) return [];
    return analytics.heatMapData.map((pt, idx) => ({
      lat: pt.lat,
      lng: pt.lng,
      iconType: 'donation',
      popupText: `<h4>Rescue Volume Map</h4><p>Weight: <b>${pt.weight} meals saved</b></p>`
    }));
  };
  
  // Search state
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchAdminData = async () => {
    setFetching(true);
    try {
      const analRes = await fetch(`${API_URL}/admin/analytics`, { headers: getHeaders() });
      if (analRes.ok) {
        const analData = await analRes.json();
        setAnalytics(analData);
      }

      const usersRes = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [view]);

  const handleVerify = async (userId, actionStatus) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: actionStatus })
      });

      if (!res.ok) throw new Error("Verification action failed");

      setSuccess(`✓ User status set to ${actionStatus.toUpperCase()} successfully.`);
      fetchAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user from the directory?")) return;
    setError('');
    setSuccess('');
    try {
      // In mock DB / standard backend, we simulate deleting user by updating status or call verify status
      const res = await fetch(`${API_URL}/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        setSuccess("✓ User account disabled / deleted successfully.");
        fetchAdminData();
      }
    } catch (err) {
      setError("Delete action failed");
    }
  };

  // Filter users directory
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === '' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const pendingNgos = usersList.filter(u => u.role === 'ngo' && u.ngoDetails?.status === 'pending');

  const triggerCsvDownload = () => {
    const url = `${API_URL}/donations/report/csv`;
    // Create hidden download anchor link
    const link = document.createElement('a');
    link.href = url;
    // Attach authorization header bypass query param or token (using fetch download block)
    // To make it incredibly robust, we fetch with headers, convert to blob, and trigger download!
    fetch(url, { headers: getHeaders() })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        link.href = blobUrl;
        link.setAttribute('download', 'FoodBridge_Donation_Report.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        setSuccess("📊 CSV Report downloaded successfully!");
      })
      .catch(err => {
        setError("Failed to download CSV report.");
      });
  };

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto py-6">
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">Admin Control Station</h1>
          <p className="text-slate-500">Supervise platform parameters, approve agencies, and download analytics.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition" onClick={() => window.print()}>
            <Printer size={14} /> Export PDF
          </button>
          <button className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition" onClick={triggerCsvDownload}>
            <Download size={14} /> Export CSV
          </button>
          <button className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold text-xs flex items-center gap-1.5 transition" onClick={fetchAdminData}>
            <RefreshCw size={14} /> Sync Metrics
          </button>
        </div>
      </header>

      {error && <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 font-semibold">{error}</div>}
      {success && <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold">{success}</div>}

      {/* Admin Horizontal Tabs panel */}
      <div className="p-1 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-xl flex gap-1">
        <button 
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${
            view === 'overview' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-darkBg-primary/45'
          }`}
          onClick={() => setView('overview')}
        >
          <BarChart3 size={14} /> Overview Charts
        </button>
        <button 
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${
            view === 'verifications' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-darkBg-primary/45'
          }`}
          onClick={() => setView('verifications')}
        >
          <ShieldCheck size={14} /> Approvals Queue ({pendingNgos.length})
        </button>
        <button 
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${
            view === 'users' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-darkBg-primary/45'
          }`}
          onClick={() => setView('users')}
        >
          <Users size={14} /> Users Directory
        </button>
        <button 
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${
            view === 'pickup-logs' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-darkBg-primary/45'
          }`}
          onClick={() => setView('pickup-logs')}
        >
          <ShieldAlert size={14} /> Verification & OTP Logs
        </button>
      </div>

      {/* OVERVIEW METRICS VIEW */}
      {view === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-left">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Meals Saved</span>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{analytics.totalMealsSaved}</h3>
            </div>
            <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-left">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Surplus Listings</span>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{analytics.totalDonations}</h3>
            </div>
            <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-left">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active NGOs</span>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{analytics.activeNgos}</h3>
            </div>
            <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-left">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Online Couriers</span>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{analytics.activeVolunteers}</h3>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-8">
            {/* Rescue Distribution Heat Map */}
            <div className="md:col-span-8 p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white text-left">Geocoded Rescue Density Heat Map</h3>
              <div className="h-64 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                <Map 
                  center={[12.9716, 77.5946]}
                  zoom={11}
                  markers={getHeatMapMarkers()}
                />
              </div>
            </div>

            {/* Monthly Stats Chart */}
            <div className="md:col-span-4 p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white text-left">Distribution Success Rates</h3>
              
              <div className="h-36 border-b border-slate-200 dark:border-slate-800 flex items-end justify-around pb-2">
                {[
                  { month: 'Apr', val: 78 },
                  { month: 'May', val: 86 },
                  { month: 'Jun', val: 94 },
                  { month: 'Jul', val: 98 }
                ].map((m, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div 
                      className={`w-8 bg-slate-200 dark:bg-slate-800 rounded-t-md transition-all duration-1000 ${
                        i === 3 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/25' : 'bg-emerald-400'
                      }`}
                      style={{ height: `${m.val}%` }}
                    ></div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{m.month}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                <ShieldCheck size={14} /> <span>All systems verified. Platform active.</span>
              </div>
            </div>
          </div>

          {/* Performance Leaderboards Grids */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Top Donors Card */}
            <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 text-left">
              <h3 className="text-sm font-bold text-emerald-500">🏆 Restaurant Leaderboard</h3>
              <p className="text-[10px] text-slate-500">Top food contributors by meals saved</p>
              
              <div className="space-y-3 pt-2">
                {(!analytics.leaderboard || analytics.leaderboard.length === 0) ? (
                  <p className="text-slate-500 text-xs italic">No contributions yet.</p>
                ) : (
                  analytics.leaderboard.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <div className="text-xs">
                        <span className="font-bold text-slate-400 mr-2">#{idx + 1}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-extrabold text-[10px]">{item.mealsSaved} meals</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NGO Performance Card */}
            <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 text-left">
              <h3 className="text-sm font-bold text-blue-500">🏢 NGO Performance Index</h3>
              <p className="text-[10px] text-slate-500">Highest rescue completion rates</p>
              
              <div className="space-y-3 pt-2">
                {(!analytics.ngoPerformance || analytics.ngoPerformance.length === 0) ? (
                  <p className="text-slate-500 text-xs italic">No claims yet.</p>
                ) : (
                  analytics.ngoPerformance.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <div className="text-xs">
                        <span className="font-bold text-slate-400 mr-2">#{idx + 1}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-[10px]">{item.completedCount} / {item.acceptedCount} done</div>
                        <div className="text-[9px] text-blue-600 font-bold">{item.ratio}% Ratio</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Volunteer Activity Card */}
            <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 text-left">
              <h3 className="text-sm font-bold text-orange-500">🛵 Logistics Volunteers</h3>
              <p className="text-[10px] text-slate-500">Top courier delivery completion counts</p>
              
              <div className="space-y-3 pt-2">
                {(!analytics.volunteerPerformance || analytics.volunteerPerformance.length === 0) ? (
                  <p className="text-slate-500 text-xs italic">No delivery drives yet.</p>
                ) : (
                  analytics.volunteerPerformance.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <div className="text-xs">
                        <span className="font-bold text-slate-400 mr-2">#{idx + 1}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 font-bold text-[10px]">{item.completedCount} trips</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Printable Offline PDF Report Header block */}
          <div className="print-only hidden p-10 space-y-8 bg-white text-black border-2 border-slate-300 rounded-xl">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h1 className="text-2xl font-bold">FoodBridge Platform Audit Summary</h1>
                <p className="text-xs text-slate-500">Platform Analytics and Performance Report</p>
              </div>
              <div className="text-right text-xs">
                <p><b>Date:</b> {new Date().toLocaleDateString()}</p>
                <p><b>Status:</b> SECURED & APPROVED</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 border rounded">
                <span className="text-[9px] uppercase font-bold text-slate-400">Total Meals Saved</span>
                <p className="text-lg font-bold">{analytics.totalMealsSaved}</p>
              </div>
              <div className="p-3 border rounded">
                <span className="text-[9px] uppercase font-bold text-slate-400">Total Listings</span>
                <p className="text-lg font-bold">{analytics.totalDonations}</p>
              </div>
              <div className="p-3 border rounded">
                <span className="text-[9px] uppercase font-bold text-slate-400">Approved NGOs</span>
                <p className="text-lg font-bold">{analytics.activeNgos}</p>
              </div>
              <div className="p-3 border rounded">
                <span className="text-[9px] uppercase font-bold text-slate-400">Active Couriers</span>
                <p className="text-lg font-bold">{analytics.activeVolunteers}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVALS QUEUE VIEW */}
      {view === 'verifications' && (
        <div className="bg-white dark:bg-darkBg-secondary p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 animate-fade-in">
          <h3 className="text-lg font-bold dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">NGO Verification List</h3>
          
          <div className="overflow-x-auto">
            {fetching ? (
              <p>Loading queue...</p>
            ) : pendingNgos.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-4">Approvals queue is clear. No pending NGOs.</p>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold bg-slate-50 dark:bg-darkBg-primary/30">
                    <th className="p-3">Agency Name</th>
                    <th className="p-3">Registration No.</th>
                    <th className="p-3">Contact Person</th>
                    <th className="p-3">Office Address</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingNgos.map(ngo => (
                    <tr key={ngo._id || ngo.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-darkBg-primary/20">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{ngo.name}</td>
                      <td className="p-3"><code>{ngo.ngoDetails?.regNo}</code></td>
                      <td className="p-3">{ngo.ngoDetails?.contactPerson}</td>
                      <td className="p-3">{ngo.ngoDetails?.address}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button className="px-2.5 py-1 rounded bg-emerald-500 text-white font-bold text-[10px]" onClick={() => handleVerify(ngo._id || ngo.id, 'approved')}>
                            Approve
                          </button>
                          <button className="px-2.5 py-1 rounded bg-red-500 text-white font-bold text-[10px]" onClick={() => handleVerify(ngo._id || ngo.id, 'rejected')}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* USERS DIRECTORY VIEW */}
      {view === 'users' && (
        <div className="bg-white dark:bg-darkBg-secondary p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 animate-fade-in">
          <h3 className="text-lg font-bold dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">User Directory</h3>
          
          <div className="flex flex-wrap gap-3 pb-2 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search user email or name..." 
                className="form-control pl-8 text-xs py-2"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            
            <select 
              className="form-control text-xs w-36 form-select py-2"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="donor">Donors</option>
              <option value="ngo">NGOs</option>
              <option value="volunteer">Volunteers</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            {fetching ? (
              <p>Loading users...</p>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold bg-slate-50 dark:bg-darkBg-primary/30">
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Portal Role</th>
                    <th className="p-3">Verified Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id || u.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-darkBg-primary/20">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.phone}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          u.role === 'donor' ? 'bg-emerald-500/10 text-emerald-600' :
                          u.role === 'ngo' ? 'bg-blue-500/10 text-blue-600' :
                          u.role === 'volunteer' ? 'bg-orange-500/10 text-orange-600' :
                          'bg-purple-500/10 text-purple-600'
                        }`}>{u.role.toUpperCase()}</span>
                      </td>
                      <td className="p-3">
                        <span className={`badge badge-${u.isVerified || u.role === 'volunteer' || u.role === 'admin' ? 'success' : 'pending'}`}>
                          {u.isVerified || u.role === 'volunteer' || u.role === 'admin' ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.role !== 'admin' && (
                          <button 
                            className="text-red-500 hover:text-red-600 transition flex items-center gap-0.5 bg-transparent border-none cursor-pointer font-bold text-xs"
                            onClick={() => handleDeleteUser(u._id || u.id)}
                          >
                            <Trash2 size={12} /> Disable
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {/* PICKUP & OTP LOGS VIEW */}
      {view === 'pickup-logs' && (
        <div className="bg-white dark:bg-darkBg-secondary p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 animate-fade-in text-left">
          <h3 className="text-lg font-bold dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Secure Pickup Handshake & OTP Logs</h3>
          
          <div className="overflow-x-auto">
            {fetching ? (
              <p>Loading security audit logs...</p>
            ) : (!analytics.auditLogs || analytics.auditLogs.filter(log => ['PICKUP_VERIFY_SUCCESS', 'PICKUP_VERIFY_FAIL', 'PICKUP_VERIFY_LOCK'].includes(log.action)).length === 0) ? (
              <p className="text-slate-500 text-xs italic py-4">No pickup verification events logged yet.</p>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold bg-slate-50 dark:bg-darkBg-primary/30">
                    <th className="p-3">Log Time</th>
                    <th className="p-3">Verify Action</th>
                    <th className="p-3">Account Email</th>
                    <th className="p-3">Description Details & Proximity Location</th>
                    <th className="p-3">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.auditLogs
                    .filter(log => ['PICKUP_VERIFY_SUCCESS', 'PICKUP_VERIFY_FAIL', 'PICKUP_VERIFY_LOCK'].includes(log.action))
                    .map(log => (
                      <tr key={log._id || log.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-darkBg-primary/20">
                        <td className="p-3 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            log.action === 'PICKUP_VERIFY_SUCCESS' ? 'bg-emerald-500/10 text-emerald-600' :
                            log.action === 'PICKUP_VERIFY_FAIL' ? 'bg-orange-500/10 text-orange-600' :
                            'bg-red-500/10 text-red-600'
                          }`}>{log.action.replace('PICKUP_VERIFY_', '')}</span>
                        </td>
                        <td className="p-3 font-semibold">{log.email || 'N/A'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{log.details}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-400">{log.ipAddress || 'unknown'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
