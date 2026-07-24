import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { 
  MapPin, Check, X, ShieldAlert, Heart, Truck, 
  Phone, ChevronRight, MessageSquare, Search, SlidersHorizontal, Send 
} from 'lucide-react';
import Map from '../components/Map';
import { motion, AnimatePresence } from 'framer-motion';

export default function NgoDashboard() {
  const { token, getHeaders, user } = useAuth();

  // States
  const [nearbyDonations, setNearbyDonations] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [selectedDonation, setSelectedDonation] = useState(null);
  
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [assigningVehicle, setAssigningVehicle] = useState(false);
  
  // Search & Filters
  const [searchKey, setSearchKey] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState('');
  
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Interactive Chat Drawer States
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'donor', text: 'Hello! The packaging is completed. The curry is packed in clean containers.', time: '10:30 AM' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);

  const fetchNearbyDonations = async () => {
    try {
      const res = await fetch(`${API_URL}/donations/nearby?category=${categoryFilter}&search=${searchKey}&foodType=${foodTypeFilter}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setNearbyDonations(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyDonations = async () => {
    try {
      const res = await fetch(`${API_URL}/donations`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter(d => d.assignedNGO === (user?.id || user?._id) || (d.assignedNGO && d.assignedNGO._id === (user?.id || user?._id)));
        setMyDonations(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNearbyDonations();
      fetchMyDonations();
    }
  }, [user?._id, searchKey, categoryFilter, foodTypeFilter]);

  // Scroll chat drawer to bottom on new messages
  useEffect(() => {
    if (showChat && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  const handleAcceptDonation = async (donationId) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/donations/${donationId}/accept`, {
        method: 'PUT',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error("Failed to accept donation");
      
      setSuccess("🎉 Donation accepted! Select a carrier below to execute pickup.");
      fetchNearbyDonations();
      fetchMyDonations();
      setSelectedDonation(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignVehicle = async (e) => {
    e.preventDefault();
    if (!selectedDonation) return;

    setError('');
    setSuccess('');
    setAssigningVehicle(true);

    try {
      const res = await fetch(`${API_URL}/donations/${selectedDonation._id || selectedDonation.id}/assign-volunteer`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ 
          driverName, 
          driverPhone, 
          vehicleNumber 
        })
      });
      
      if (!res.ok) throw new Error("Failed to register self vehicle details");

      setSuccess("🚙 Vehicle arranged successfully! The donor has been notified of the driver's arrival.");
      setDriverName('');
      setDriverPhone('');
      setVehicleNumber('');
      fetchMyDonations();
      setSelectedDonation(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigningVehicle(false);
    }
  };

  const handleVerifyPickupOtp = async (donationId, otp) => {
    if (!otp || otp.trim().length !== 6) {
      setError("Please enter a valid 6-digit OTP code.");
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/donations/${donationId}/pickup/verify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ otp: otp.trim() })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to verify OTP");

      setSuccess("🎉 Pickup verified successfully! Food status is updated to Picked Up.");
      fetchMyDonations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = { sender: 'ngo', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');

    // Trigger mock auto-reply after 1.5s representing live coordination chat
    setTimeout(() => {
      const replies = [
        "Sounds good! We have set it near the receptionist.",
        "Understood. Our volunteer can park in the main gate loading bay.",
        "Perfect. Please ask the driver to mention code 'FB-MOCK' upon arrival.",
        "Sure, the food was prepared fresh today."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setChatMessages(prev => [...prev, {
        sender: 'donor',
        text: randomReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  const getMapMarkers = () => {
    const markers = [];
    const ngoLat = user?.profile?.coordinates?.lat || 12.9716;
    const ngoLng = user?.profile?.coordinates?.lng || 77.5946;
    
    markers.push({
      lat: ngoLat,
      lng: ngoLng,
      iconType: 'ngo',
      popupText: `<h4>NGO Distribution Hub</h4><p>${user?.name}</p>`
    });

    nearbyDonations.forEach(d => {
      markers.push({
        lat: d.coordinates.lat,
        lng: d.coordinates.lng,
        iconType: 'donation',
        popupText: `<h4>${d.foodName}</h4><p>Qty: ${d.quantity}</p><p>${d.distance} km</p>`
      });
    });

    return markers;
  };

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto py-6 relative">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">NGO Command Center</h1>
        <p className="text-slate-500">Coordinate food surplus collection and routing logisitics.</p>
      </header>

      {error && <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 font-semibold">{error}</div>}
      {success && <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold">{success}</div>}

      {/* SEARCH AND FILTER CRITERIA */}
      <div className="p-4 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-xl flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search active donations..." 
            className="form-control pl-10"
            value={searchKey}
            onChange={e => setSearchKey(e.target.value)}
          />
        </div>
        
        <select 
          className="form-control w-40 form-select"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Cooked Meals">Cooked Meals</option>
          <option value="Vegetables & Fruits">Vegetables & Fruits</option>
          <option value="Bakery Items">Bakery Items</option>
          <option value="Canned Foods">Canned Foods</option>
          <option value="Raw Groceries">Raw Groceries</option>
        </select>

        <select 
          className="form-control w-40 form-select"
          value={foodTypeFilter}
          onChange={e => setFoodTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="veg">Vegetarian 🟢</option>
          <option value="non-veg">Non-Vegetarian 🔴</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* LEFT LIST PANEL */}
        <div className="lg:col-span-6 space-y-6">
          {/* Section 1: Nearby Food Surplus */}
          <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-3 dark:text-white">Nearby Pending Claims</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {nearbyDonations.length === 0 ? (
                <p className="text-slate-500 text-xs italic">No matching pending donations found nearby.</p>
              ) : (
                nearbyDonations.map(d => (
                  <div key={d._id || d.id} className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-darkBg-primary/20 rounded-xl space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{d.foodName}</h4>
                        <span className="text-[10px] font-bold text-emerald-500">📍 {d.distance} km away</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.foodType === 'non-veg' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      }`}>{(d.foodType || 'veg').toUpperCase()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div>Qty: <b>{d.quantity}</b></div>
                      <div>Category: <b>{d.aiMetadata?.category || 'General'}</b></div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[10px] text-slate-400">Freshness Score: <b className="text-emerald-500">{d.aiMetadata?.freshnessScore || 85}%</b></span>
                      <button 
                        className="px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition"
                        onClick={() => handleAcceptDonation(d._id || d.id)}
                      >
                        Accept Donation
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: Claimed & active routing deliveries */}
          <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-3 dark:text-white">Distribution Logistics Control</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {fetching ? (
                <p className="text-slate-500 text-sm">Loading claimed items...</p>
              ) : myDonations.length === 0 ? (
                <p className="text-slate-500 text-xs italic">No claimed items. Accept pending food listings to start.</p>
              ) : (
                myDonations.map(d => (
                  <div 
                    key={d._id || d.id} 
                    className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedDonation?._id === d._id || selectedDonation?.id === d.id
                        ? 'border-emerald-500 bg-emerald-500/5 shadow-sm'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-darkBg-primary/20 hover:border-emerald-400'
                    }`}
                    onClick={() => setSelectedDonation(d)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{d.foodName}</h4>
                      <span className={`badge badge-${
                        d.status === 'accepted' ? 'info' : 
                        d.status === 'picked_up' ? 'warning' : 'success'
                      }`}>{d.status ? d.status.toUpperCase() : 'PENDING'}</span>
                    </div>

                    <div className="text-xs text-slate-500 mt-2 space-y-1">
                      <p><b>Kitchen Donor:</b> {d.donorDetails?.name || d.donor?.name || 'Partner'}</p>
                      <p><b>Address:</b> {d.address}</p>
                    </div>

                    {d.status === 'accepted' && !d.assignedVehicle && (
                      <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 text-orange-600 rounded text-center text-[10px] font-bold">
                        ⚠️ Vehicle details required. Click card to arrange.
                      </div>
                    )}
                    {d.status === 'accepted' && d.assignedVehicle && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="text-xs space-y-1">
                          <div>🚙 Vehicle: <b>{d.assignedVehicle}</b></div>
                          {d.driverName && <div>Driver: <b>{d.driverName}</b></div>}
                          {d.driverPhone && <div>Phone: <b>{d.driverPhone}</b></div>}
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          <input 
                            type="text" 
                            placeholder="6-digit OTP" 
                            maxLength={6}
                            className="px-2 py-1 rounded border border-emerald-500/25 bg-white text-xs dark:bg-darkBg-secondary dark:text-white w-28 text-center font-bold tracking-widest"
                            id={`otp-input-${d._id || d.id}`}
                          />
                          <button 
                            className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              const otpVal = document.getElementById(`otp-input-${d._id || d.id}`)?.value;
                              handleVerifyPickupOtp(d._id || d.id, otpVal);
                            }}
                          >
                            Verify OTP
                          </button>
                        </div>
                      </div>
                    )}
                    {d.status === 'picked_up' && (
                      <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 rounded text-center text-[10px] font-semibold">
                        📦 Food Picked Up & In Transit (OTP Verified)
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: INTERACTIVE MAP & CARRIER APPOINTMENT */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-3 dark:text-white">Active Geolocation Map</h3>
            <div className="h-[380px] rounded-xl overflow-hidden">
              <Map 
                center={[user?.profile?.coordinates?.lat || 12.9716, user?.profile?.coordinates?.lng || 77.5946]}
                zoom={12}
                markers={getMapMarkers()}
              />
            </div>
          </div>

          {/* VEHICLE ARRANGER POPUP PANEL */}
          <AnimatePresence>
            {selectedDonation && selectedDonation.status === 'accepted' && !selectedDonation.assignedVehicle && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 bg-white dark:bg-darkBg-secondary border border-emerald-500/30 rounded-2xl shadow-lg space-y-4"
              >
                <h3 className="text-lg font-bold text-emerald-500">Arrange Vehicle: {selectedDonation.foodName}</h3>
                
                <form onSubmit={handleAssignVehicle} className="space-y-4">
                  <div className="form-group">
                    <label className="form-label font-bold text-xs dark:text-slate-200">Driver Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rahul Sharma"
                      className="form-control"
                      required
                      value={driverName}
                      onChange={e => setDriverName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold text-xs dark:text-slate-200">Driver Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 9876543210"
                      className="form-control"
                      required
                      value={driverPhone}
                      onChange={e => setDriverPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold text-xs dark:text-slate-200">Vehicle Number Plate / Info</label>
                    <input 
                      type="text" 
                      placeholder="e.g. DL-3C-1234 (Eco-Van)"
                      className="form-control"
                      required
                      value={vehicleNumber}
                      onChange={e => setVehicleNumber(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary flex-1 font-bold text-xs py-2" disabled={assigningVehicle}>
                      {assigningVehicle ? 'Registering...' : 'Register Vehicle & Driver'}
                    </button>
                    <button type="button" className="btn btn-secondary font-bold text-xs py-2" onClick={() => setSelectedDonation(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FLOATING CHAT DRAWER SIMULATOR */}
      <AnimatePresence>
        {showChat && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-6 right-6 w-80 h-96 bg-white dark:bg-darkBg-secondary border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl z-[9999] overflow-hidden flex flex-col justify-between"
          >
            <div className="p-4 bg-emerald-500 text-white font-bold flex justify-between items-center">
              <span className="flex items-center gap-1.5"><MessageSquare size={16} /> Live Coordination Chat</span>
              <button className="text-white hover:opacity-85 bg-transparent border-none cursor-pointer" onClick={() => setShowChat(false)}><X size={18} /></button>
            </div>

            {/* Chat message body list */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-slate-50 dark:bg-darkBg-primary">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.sender === 'ngo' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-2.5 rounded-xl max-w-[85%] text-xs text-left ${
                    m.sender === 'ngo' ? 'bg-emerald-500 text-white rounded-br-none' : 'bg-white dark:bg-darkBg-secondary text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-800'
                  }`}>
                    {m.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1">{m.time}</span>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat typing footer form */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 bg-white dark:bg-darkBg-secondary">
              <input 
                type="text" 
                placeholder="Type message..." 
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-xs bg-transparent dark:text-white"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition flex items-center justify-center">
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
