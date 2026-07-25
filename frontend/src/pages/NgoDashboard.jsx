import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { 
  Building, MapPin, Eye, EyeOff, Check, X, Compass, ExternalLink,
  Flame, Bell, Sparkles, Navigation, Clock, ShieldAlert,
  User, Phone, Hash, KeyRound, Building2, LogOut 
} from 'lucide-react';
import Map from '../components/Map';
import { motion, AnimatePresence } from 'framer-motion';

// Client-side Haversine formula to compute distance from NGO
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return parseFloat((R * c).toFixed(1));
};

export default function NgoDashboard() {
  const { socket } = useAuth();

  // Local state for verified NGO session
  const [verifiedNgo, setVerifiedNgo] = useState(() => {
    const cached = localStorage.getItem('foodbridge-verified-ngo');
    return cached ? JSON.parse(cached) : null;
  });

  // Auth/PIN Form states
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [ngoRegName, setNgoRegName] = useState('');
  const [ngoRegNo, setNgoRegNo] = useState('');
  const [ngoContact, setNgoContact] = useState('');
  const [ngoPhone, setNgoPhone] = useState('');
  const [ngoPin, setNgoPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Dashboard states
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // NGO current location coordinates
  const [ngoLat, setNgoLat] = useState(12.9716);
  const [ngoLng, setNgoLng] = useState(77.5946);
  const [gpsCaptured, setGpsCaptured] = useState(false);

  // Selected donation for map / details view
  const [selectedDonation, setSelectedDonation] = useState(null);
  
  // Real-Time Notification Toast State
  const [toastNotification, setToastNotification] = useState(null);

  // Fetch NGO current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNgoLat(pos.coords.latitude);
          setNgoLng(pos.coords.longitude);
          setGpsCaptured(true);
        },
        (err) => {
          console.warn("NGO GPS acquisition bypassed/denied, using default coordinates.");
        }
      );
    }
  }, []);

  // Fetch available donations (only if verified)
  const fetchDonations = async () => {
    if (!verifiedNgo) return;
    try {
      const res = await fetch(`${API_URL}/donations`);
      if (res.ok) {
        const data = await res.json();
        setDonations(data);
      }
    } catch (err) {
      console.error("Fetch donations failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (verifiedNgo) {
      fetchDonations();
    }
  }, [verifiedNgo]);

  // Set up socket listeners for real-time alerts
  useEffect(() => {
    if (!socket || !verifiedNgo) return;

    socket.on('new_food_donation', (newDonation) => {
      const dist = getDistance(ngoLat, ngoLng, newDonation.latitude, newDonation.longitude);
      
      setToastNotification({
        id: newDonation.id || newDonation.donationId,
        foodName: newDonation.foodName,
        quantity: newDonation.quantity,
        distance: dist,
        data: newDonation
      });

      setDonations(prev => {
        if (prev.some(d => (d._id || d.id) === (newDonation.id || newDonation.donationId))) return prev;
        return [newDonation, ...prev];
      });
    });

    socket.on('donation_accepted_broadcast', (update) => {
      setDonations(prev => prev.map(d => {
        if ((d._id || d.id) === update.id) {
          return { ...d, status: update.status, acceptedBy: update.acceptedBy };
        }
        return d;
      }));
    });

    return () => {
      socket.off('new_food_donation');
      socket.off('donation_accepted_broadcast');
    };
  }, [socket, ngoLat, ngoLng, verifiedNgo]);

  // Handle NGO Registration with 6-Digit PIN
  const handleNgoRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!ngoRegName || !ngoRegNo || !ngoContact || !ngoPhone || !ngoPin) {
      setAuthError('All registration fields are required.');
      return;
    }

    if (ngoPin.length !== 6 || isNaN(ngoPin)) {
      setAuthError('Security PIN must be exactly 6 digits.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/donations/ngo/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ngoName: ngoRegName,
          regNo: ngoRegNo,
          contactPerson: ngoContact,
          phone: ngoPhone,
          securityPin: ngoPin
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAuthSuccess('✓ NGO Registered successfully! Please sign in using your registration number and PIN.');
        // Reset form inputs except registration number for login convenience
        setNgoRegName('');
        setNgoContact('');
        setNgoPhone('');
        setNgoPin('');
        
        setTimeout(() => {
          setAuthTab('login');
          setAuthSuccess('');
        }, 2000);
      } else {
        setAuthError(data.message || 'Registration failed.');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Server connection error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle NGO Login / PIN Verification
  const handleNgoLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!ngoRegNo || !ngoPin) {
      setAuthError('Registration Number and 6-Digit PIN are required.');
      return;
    }

    if (ngoPin.length !== 6 || isNaN(ngoPin)) {
      setAuthError('Security PIN must be exactly 6 digits.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/donations/ngo/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regNo: ngoRegNo,
          securityPin: ngoPin
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAuthSuccess('✓ PIN Verification successful! Opening Dashboard...');
        localStorage.setItem('foodbridge-verified-ngo', JSON.stringify(data.ngo));
        setTimeout(() => {
          setVerifiedNgo(data.ngo);
        }, 1500);
      } else {
        setAuthError(data.message || 'PIN Verification failed. Invalid registration number or PIN.');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Server connection error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Accept Donation
  const handleAccept = async (id) => {
    try {
      const res = await fetch(`${API_URL}/donations/${id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedBy: verifiedNgo.ngoName })
      });

      if (res.ok) {
        const updated = await res.json();
        setDonations(prev => prev.map(d => ((d._id || d.id) === id ? updated : d)));
        if (selectedDonation && (selectedDonation._id || selectedDonation.id) === id) {
          setSelectedDonation(updated);
        }
      } else {
        alert("Failed to claim donation. It might have already been accepted.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Reject Donation
  const handleReject = async (id) => {
    try {
      const res = await fetch(`${API_URL}/donations/${id}/reject`, {
        method: 'PUT'
      });
      if (res.ok) {
        setDonations(prev => prev.map(d => ((d._id || d.id) === id ? { ...d, status: 'rejected' } : d)));
        if (selectedDonation && (selectedDonation._id || selectedDonation.id) === id) {
          setSelectedDonation(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Google Maps external navigation routing link
  const openExternalNavigation = (destLat, destLng) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${ngoLat},${ngoLng}&destination=${destLat},${destLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // NGO Logout (Remove session)
  const handleNgoLogout = () => {
    localStorage.removeItem('foodbridge-verified-ngo');
    setVerifiedNgo(null);
    setSelectedDonation(null);
  };

  // If NGO is NOT verified yet, render the PIN verification login screen!
  if (!verifiedNgo) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col justify-center min-h-[80vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-200 dark:border-slate-800 shadow-2xl text-left"
        >
          {/* Header branding */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3 border border-indigo-500/20">
              <Building size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">NGO Portal Access</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verify your agency 6-Digit security PIN to claim food distributions.
            </p>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-darkBg-primary p-1 rounded-xl mb-6">
            <button
              onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
              className={`py-2 text-xs font-black rounded-lg transition-all ${
                authTab === 'login' 
                  ? 'bg-white dark:bg-darkBg-secondary text-indigo-500 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              PIN Login
            </button>
            <button
              onClick={() => { setAuthTab('register'); setAuthError(''); setAuthSuccess(''); }}
              className={`py-2 text-xs font-black rounded-lg transition-all ${
                authTab === 'register' 
                  ? 'bg-white dark:bg-darkBg-secondary text-indigo-500 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              NGO Register
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-1.5">
              <ShieldAlert size={16} />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-1.5">
              <Check size={16} />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* Forms */}
          {authTab === 'login' ? (
            <form onSubmit={handleNgoLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Registration Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    required
                    value={ngoRegNo}
                    onChange={(e) => setNgoRegNo(e.target.value)}
                    placeholder="e.g. NGO-88219"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">6-Digit Security PIN</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type={showPin ? "text" : "password"}
                    required
                    maxLength={6}
                    value={ngoPin}
                    onChange={(e) => setNgoPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit security code"
                    className="w-full pl-10 pr-12 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 text-center tracking-widest font-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {authLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Verify PIN & Access</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleNgoRegister} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">NGO Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    required
                    value={ngoRegName}
                    onChange={(e) => setNgoRegName(e.target.value)}
                    placeholder="e.g. Care Food Foundation"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Reg Number</label>
                  <input
                    type="text"
                    required
                    value={ngoRegNo}
                    onChange={(e) => setNgoRegNo(e.target.value)}
                    placeholder="e.g. REG-1234"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={ngoContact}
                    onChange={(e) => setNgoContact(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="tel"
                    required
                    value={ngoPhone}
                    onChange={(e) => setNgoPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Choose 6-Digit PIN</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type={showPin ? "text" : "password"}
                    required
                    maxLength={6}
                    value={ngoPin}
                    onChange={(e) => setNgoPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Set a 6-digit access PIN"
                    className="w-full pl-10 pr-12 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 text-center tracking-widest font-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {authLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Register Agency & PIN</span>
                  </>
                )}
              </button>
            </form>
          )}

        </motion.div>
      </div>
    );
  }

  // Filter lists: Available means status is pending. Claimed means accepted by this agency.
  const availableDonations = donations.filter(d => d.status === 'pending');
  const claimedDonations = donations.filter(d => d.status === 'accepted' && d.acceptedBy === verifiedNgo.ngoName);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      
      {/* Settings bar containing NGO profile name */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Building className="text-indigo-500" /> NGO Claims Board
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Claim available surplus food, calculate pickup routes, and view distances.
          </p>
        </div>
        
        {/* NGO Profile Details and Logout */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-darkBg-secondary border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl w-full md:w-auto">
          <div className="text-left">
            <span className="text-[10px] font-black text-indigo-500 block uppercase">NGO Verified</span>
            <span className="text-sm font-extrabold text-slate-800 dark:text-white">{verifiedNgo.ngoName}</span>
          </div>
          <button
            onClick={handleNgoLogout}
            className="text-xs font-black text-red-500 hover:text-red-600 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20 flex items-center gap-1.5 transition-all"
            title="Log Out Session"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Grid: Listings vs Map detail viewer panel */}
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left column: available and claimed lists */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Section: Available surplus listings */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Flame className="text-orange-500" /> Available Donations ({availableDonations.length})
            </h3>

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500">Querying available food donations...</p>
              </div>
            ) : availableDonations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-darkBg-secondary rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
                No active food donations available right now. Check back shortly.
              </div>
            ) : (
              <div className="grid gap-4">
                {availableDonations.map(donation => {
                  const dist = getDistance(ngoLat, ngoLng, donation.latitude, donation.longitude);
                  return (
                    <div 
                      key={donation._id || donation.id}
                      className="p-6 rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 shadow-md hover:shadow-lg transition-all flex flex-col md:flex-row gap-6 relative"
                    >
                      {/* Donation Image */}
                      {donation.image ? (
                        <img 
                          src={donation.image} 
                          alt="Surplus Food" 
                          className="w-full md:w-32 h-32 object-cover rounded-xl border border-slate-100 dark:border-slate-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-full md:w-32 h-32 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center rounded-xl font-black text-3xl border border-indigo-500/20 flex-shrink-0">
                          🥗
                        </div>
                      )}

                      {/* Content details */}
                      <div className="flex-1 space-y-2 text-left">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 mb-1">
                              {donation.category}
                            </span>
                            <h4 className="text-lg font-black text-slate-800 dark:text-white">{donation.foodName}</h4>
                          </div>
                          
                          {/* Distance badge */}
                          <div className="text-right">
                            <span className="text-xs font-black text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 flex items-center gap-1">
                              <MapPin size={12} /> {dist} km away
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <p><b>Donor:</b> {donation.donorName}</p>
                          <p><b>Quantity:</b> {donation.quantity}</p>
                          <p><b>Serves:</b> {donation.peopleServed} Meals</p>
                          <p><b>Phone:</b> {donation.phone}</p>
                        </div>
                        
                        <p className="text-xs text-slate-400 truncate">
                          <b>Address:</b> {donation.pickupAddress}
                        </p>

                        <div className="flex items-center gap-2 pt-2 text-[10px] text-slate-400">
                          <Clock size={12} />
                          <span>Deadline: {new Date(donation.pickupTime).toLocaleTimeString()}</span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setSelectedDonation(donation)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-darkBg-primary rounded-lg flex items-center gap-1 hover:bg-slate-200"
                          >
                            <Eye size={14} /> View Location
                          </button>
                          <button
                            onClick={() => handleAccept(donation._id || donation.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg flex items-center gap-1"
                          >
                            <Check size={14} /> Accept Claim
                          </button>
                          <button
                            onClick={() => handleReject(donation._id || donation.id)}
                            className="px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-1"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Claims History (Accepted by this agency) */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Check size={18} className="text-emerald-500" /> Claims History ({claimedDonations.length})
            </h3>
            
            {claimedDonations.length === 0 ? (
              <p className="text-xs text-slate-400">No active claimed distributions currently.</p>
            ) : (
              <div className="grid gap-3">
                {claimedDonations.map(donation => (
                  <div 
                    key={donation._id || donation.id}
                    className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex justify-between items-center text-left"
                  >
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">{donation.foodName}</h4>
                      <p className="text-xs text-slate-400 mt-1">Accepted by you. Ready for pickup at: {donation.pickupAddress}</p>
                    </div>
                    <button
                      onClick={() => setSelectedDonation(donation)}
                      className="px-3 py-1 bg-emerald-500 text-white font-bold text-xs rounded hover:bg-emerald-600"
                    >
                      Inspect Route
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right column: Interactive Map detail panel viewer */}
        <div className="lg:col-span-5 relative">
          <div className="sticky top-24 space-y-4">
            
            {selectedDonation ? (
              <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 shadow-xl text-left">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-extrabold text-slate-800 dark:text-white">Route Navigation</h4>
                  <button 
                    onClick={() => setSelectedDonation(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Map box */}
                  <div className="h-64 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-100 relative animate-fade-in">
                    <Map 
                      center={[selectedDonation.latitude, selectedDonation.longitude]}
                      zoom={14}
                      markers={[
                        { lat: ngoLat, lng: ngoLng, iconType: 'ngo', popupText: verifiedNgo.ngoName },
                        { lat: selectedDonation.latitude, lng: selectedDonation.longitude, iconType: 'donor', popupText: selectedDonation.foodName }
                      ]}
                      routeCoordinates={[[ngoLat, ngoLng], [selectedDonation.latitude, selectedDonation.longitude]]}
                    />
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <p><b>Target:</b> {selectedDonation.foodName} ({selectedDonation.quantity})</p>
                    <p><b>Address:</b> {selectedDonation.pickupAddress}</p>
                    <p><b>Estimated Distance:</b> {getDistance(ngoLat, ngoLng, selectedDonation.latitude, selectedDonation.longitude)} km</p>
                  </div>

                  <button
                    onClick={() => openExternalNavigation(selectedDonation.latitude, selectedDonation.longitude)}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md"
                  >
                    <Navigation size={16} />
                    <span>Launch GPS Navigation</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-8 rounded-2xl bg-white dark:bg-darkBg-secondary border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 py-24">
                <MapPin className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={40} />
                <p className="text-sm">Click "View Location" on any food donation card to inspect geocoding maps and trigger route optimization calculations.</p>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Real-Time Notification Toast Alert */}
      <AnimatePresence>
        {toastNotification && (
          <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full animate-slide-up">
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="p-5 rounded-2xl bg-indigo-950 text-white border border-indigo-500/30 shadow-2xl space-y-3 relative text-left"
            >
              <button 
                onClick={() => setToastNotification(null)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
              
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Bell size={14} className="animate-bounce" />
                <span>New Food Donation Available!</span>
              </div>
              
              <div className="space-y-1 text-sm">
                <p><b>Food:</b> {toastNotification.foodName}</p>
                <p><b>Quantity:</b> {toastNotification.quantity}</p>
                <p><b>Distance:</b> {toastNotification.distance} km away</p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedDonation(toastNotification.data);
                    setToastNotification(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg flex-1"
                >
                  View Details
                </button>
                <button
                  onClick={() => {
                    handleAccept(toastNotification.id);
                    setToastNotification(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex-1"
                >
                  Accept Donation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
