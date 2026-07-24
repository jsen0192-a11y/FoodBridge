import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Truck, Navigation, Scan, CheckCircle2, ShieldCheck, Phone, Check, RefreshCw, ChevronRight, X, AlertTriangle } from 'lucide-react';
import Map from '../components/Map';
import { motion, AnimatePresence } from 'framer-motion';

export default function VolunteerDashboard() {
  const { token, getHeaders, user, socket } = useAuth();

  // Lists
  const [deliveries, setDeliveries] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [trackingData, setTrackingData] = useState(null);

  const [qrCodeInput, setQrCodeInput] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanAction, setScanAction] = useState('pickup'); // 'pickup' or 'delivery'
  
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Secure Pickup Verification Modal states
  const [showPickupOtpModal, setShowPickupOtpModal] = useState(false);
  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [pickupError, setPickupError] = useState('');
  const [pickupSuccess, setPickupSuccess] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [isLocked, setIsLocked] = useState(false);

  const fetchDeliveries = async () => {
    try {
      const res = await fetch(`${API_URL}/donations`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data);
        if (selectedJob) {
          const fresh = data.find(d => (d._id || d.id) === (selectedJob._id || selectedJob.id));
          if (fresh) setSelectedJob(fresh);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const fetchTracking = async () => {
    if (!selectedJob) return;
    try {
      const res = await fetch(`${API_URL}/donations/${selectedJob._id || selectedJob.id}/tracking`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTrackingData(data);
      }
    } catch (err) {
      console.error("Tracking fetch failed:", err);
    }
  };

  const toggleAvailability = async () => {
    const nextVal = !isAvailable;
    setIsAvailable(nextVal);
    try {
      await fetch(`${API_URL}/volunteers/availability`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ isAvailable: nextVal })
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDeliveries();
      const fetchProfile = async () => {
        const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
        if (res.ok) {
          const d = await res.json();
          if (d.profile) setIsAvailable(d.profile.isAvailable);
        }
      };
      fetchProfile();
    }
  }, [user?._id, user?.id]);

  // Query live tracking data periodically
  useEffect(() => {
    fetchTracking();
    if (!selectedJob || selectedJob.status === 'delivered' || selectedJob.status === 'cancelled') {
      setTrackingData(null);
      return;
    }
    const interval = setInterval(fetchTracking, 8000);
    return () => clearInterval(interval);
  }, [selectedJob?._id, selectedJob?.id]);

  // Broadcast volunteer location coordinates updates to Socket.io server
  useEffect(() => {
    if (!socket || !user || !selectedJob) return;
    if (selectedJob.status === 'delivered' || selectedJob.status === 'cancelled') return;

    let simOffset = 0;
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            simOffset += 0.0001; // simulate movement towards destination
            const liveLat = pos.coords.latitude + (selectedJob.status === 'accepted' ? -0.005 + simOffset : 0.005 - simOffset);
            const liveLng = pos.coords.longitude;

            socket.emit('update_location', {
              volunteerId: user.id || user._id,
              lat: liveLat,
              lng: liveLng
            });
            console.log("⚡ Broadcasted live coordinate track:", liveLat, liveLng);
          }
        );
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedJob?._id, selectedJob?.id, socket, user]);

  const handleVerifyCode = async (action) => {
    if (!qrCodeInput || !selectedJob) return;

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/donations/${selectedJob._id || selectedJob.id}/verify-code`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          verificationCode: qrCodeInput,
          action
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification code does not match');

      setSuccess(`🎉 Successfully verified and marked as ${action === 'pickup' ? 'PICKED UP' : 'DELIVERED'}!`);
      setQrCodeInput('');
      setShowScanner(false);
      fetchDeliveries();
      
      if (action === 'delivery') {
        setSelectedJob(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const triggerMockScan = (correctCode, action) => {
    setQrCodeInput(correctCode);
    setTimeout(async () => {
      setError('');
      setSuccess('');
      setActionLoading(true);
      try {
        const res = await fetch(`${API_URL}/donations/${selectedJob._id || selectedJob.id}/verify-code`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            verificationCode: correctCode,
            action
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setSuccess(`🎉 [QR Scan Successful] Verified: Marked as ${action === 'pickup' ? 'Picked Up' : 'Delivered'}.`);
        setQrCodeInput('');
        setShowScanner(false);
        fetchDeliveries();
        if (action === 'delivery') setSelectedJob(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setActionLoading(false);
      }
    }, 800);
  };
  const handleVerifyPickupOtp = async () => {
    if (!pickupOtpInput || !selectedJob) return;

    setPickupError('');
    setPickupSuccess('');
    setActionLoading(true);

    if (!navigator.geolocation) {
      setPickupError("GPS coordinates required for verification proximity checks. Geolocation is not supported by your browser.");
      setActionLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const res = await fetch(`${API_URL}/donations/${selectedJob._id || selectedJob.id}/pickup/verify`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
              otp: pickupOtpInput,
              lat: parseFloat(lat),
              lng: parseFloat(lng)
            })
          });

          const data = await res.json();
          if (res.ok) {
            setPickupSuccess("🎉 Handshake OTP Verified Successfully! Food Collected.");
            setTimeout(() => {
              setShowPickupOtpModal(false);
              setPickupOtpInput('');
              setPickupSuccess('');
              fetchDeliveries();
            }, 2000);
          } else {
            setPickupError(data.message || "Invalid OTP code.");
            if (data.message && data.message.includes('locked')) {
              setIsLocked(true);
            }
          }
        } catch (err) {
          setPickupError("Verification request failed. Server offline.");
        } finally {
          setActionLoading(false);
        }
      },
      (geoErr) => {
        setPickupError("Failed to retrieve GPS location. Please allow location access to run distance proximity checks.");
        setActionLoading(false);
      }
    );
  };

  const getRouteCoordinates = () => {
    if (trackingData && trackingData.route) return trackingData.route;
    if (!selectedJob) return null;
    const donorLat = selectedJob.coordinates.lat;
    const donorLng = selectedJob.coordinates.lng;
    const ngoLat = selectedJob.ngoDetails?.coordinates?.lat || 12.9716;
    const ngoLng = selectedJob.ngoDetails?.coordinates?.lng || 77.5946;
    return [
      [donorLat, donorLng],
      [ngoLat, ngoLng]
    ];
  };

  const getMapMarkers = () => {
    if (!selectedJob) return [];
    const markers = [];
    
    // Donor location
    markers.push({
      lat: selectedJob.coordinates.lat,
      lng: selectedJob.coordinates.lng,
      iconType: 'donor',
      popupText: `<h4>Pickup Location</h4><p>${selectedJob.address}</p>`
    });

    // NGO location
    const ngoLat = selectedJob.ngoDetails?.coordinates?.lat || 12.9716;
    const ngoLng = selectedJob.ngoDetails?.coordinates?.lng || 77.5946;
    markers.push({
      lat: ngoLat,
      lng: ngoLng,
      iconType: 'ngo',
      popupText: `<h4>Drop-off NGO</h4><p>${selectedJob.ngoDetails?.name || 'NGO Destination'}</p>`
    });

    // Volunteer live marker
    if (trackingData && trackingData.volunteerLocation) {
      markers.push({
        lat: trackingData.volunteerLocation.lat,
        lng: trackingData.volunteerLocation.lng,
        iconType: 'volunteer',
        popupText: `<h4>Live Courier (You)</h4>`
      });
    }

    return markers;
  };



  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto py-6">
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">Volunteer Transport Portal</h1>
          <p className="text-slate-500">Deliver hope and meals. Maintain active availability to claim routes.</p>
        </div>
        
        {/* Availability Switch */}
        <div className="p-4 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-4">
          <span className="text-sm font-semibold dark:text-slate-300">Duty Status:</span>
          <button 
            className={`px-4 py-1.5 rounded-lg font-bold text-xs border transition-all duration-300 ${
              isAvailable 
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500 hover:bg-emerald-500/25' 
                : 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20'
            }`}
            onClick={toggleAvailability}
          >
            {isAvailable ? '🟢 Online & Available' : '🔴 Offline'}
          </button>
        </div>
      </header>

      {error && <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 font-semibold">{error}</div>}
      {success && <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold">{success}</div>}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* LEFT CARD: ASSIGNED LIST */}
        <div className="lg:col-span-5 bg-white dark:bg-darkBg-secondary p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Truck className="text-emerald-500" />
            <h3 className="text-lg font-bold dark:text-white">Active Assignments</h3>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {fetching ? (
              <p className="text-slate-500 text-sm">Loading jobs...</p>
            ) : deliveries.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No pickups assigned. Connect with local NGOs to claim coordinates.</p>
            ) : (
              deliveries.map(job => (
                <div 
                  key={job._id || job.id} 
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedJob?._id === job._id || selectedJob?.id === job.id
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-sm'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-darkBg-primary/20 hover:border-emerald-400'
                  }`}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex justify-between items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{job.foodName}</h4>
                    <span className={`badge badge-${
                      job.status === 'accepted' ? 'info' : 
                      job.status === 'picked_up' ? 'warning' : 'success'
                    }`}>{job.status === 'accepted' ? 'PENDING PICKUP' : job.status.toUpperCase()}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2 space-y-1">
                    <p><b>From:</b> {job.donorDetails?.name || 'Catering Partner'}</p>
                    <p><b>To NGO:</b> {job.ngoDetails?.name || 'Agency'}</p>
                    <p><b>Qty:</b> {job.quantity}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 mt-3 text-[10px] text-slate-400">
                    <span>Category: <b>{job.aiMetadata?.category || 'Cooked meals'}</b></span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT CARD: MAP GUIDANCE DIRECTIONS & QR */}
        <div className="lg:col-span-7">
          {selectedJob ? (
            <div className="bg-white dark:bg-darkBg-secondary p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-bold text-emerald-500">Route Direction Guidance</h3>
                  <p className="text-xs text-slate-500">Delivering: <b>{selectedJob.foodName}</b></p>
                </div>
                {trackingData && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs">
                    ⏱️ ETA: {trackingData.eta} mins ({selectedJob.status === 'accepted' ? 'to pickup' : 'to drop-off'})
                  </div>
                )}
              </div>

              {/* Map with polyline path */}
              <div className="h-[280px] rounded-xl overflow-hidden">
                <Map 
                  center={[selectedJob.coordinates.lat, selectedJob.coordinates.lng]}
                  zoom={13}
                  markers={getMapMarkers()}
                  routeCoordinates={getRouteCoordinates()}
                />
              </div>

              {/* Secure QR / Code handshake controls */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Delivery verification checks</h4>
                <p className="text-xs text-slate-500">Submit security codes to authorize transit milestones.</p>
                
                {selectedJob.status === 'accepted' && (
                  <div className="p-4 bg-slate-50 dark:bg-darkBg-primary border border-slate-100 dark:border-slate-800 rounded-xl space-y-4">
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck size={14} /> Milestone 1: Verify Pickup (Pickup ID: {selectedJob.pickupId})
                    </span>
                    <p className="text-[11px] text-slate-500 text-left">Arrive at Donor location: <b>{selectedJob.address}</b> and verify secure handshake code.</p>
                    
                    <button 
                      className="btn btn-primary w-full py-2 flex items-center justify-center gap-1.5" 
                      onClick={() => { 
                        setPickupOtpInput(''); 
                        setPickupError(''); 
                        setPickupSuccess(''); 
                        setShowPickupOtpModal(true); 
                      }}
                    >
                      <Scan size={16} /> Enter Pickup Handshake OTP
                    </button>
                  </div>
                )}

                {selectedJob.status === 'picked_up' && (
                  <div className="p-4 bg-slate-50 dark:bg-darkBg-primary border border-slate-100 dark:border-slate-800 rounded-xl space-y-4">
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck size={14} /> Milestone 2: Verify Drop-off
                    </span>
                    <p className="text-[11px] text-slate-500">Deliver food packages to NGO center and scan their verification handshake code.</p>
                    
                    {showScanner ? (
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="Type code (e.g. FB-XXXXXX)" 
                          className="form-control"
                          value={qrCodeInput}
                          onChange={e => setQrCodeInput(e.target.value)}
                        />
                        <div className="flex gap-2 flex-wrap">
                          <button 
                            className="px-4 py-2 rounded bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition"
                            onClick={() => handleVerifyCode('delivery')}
                            disabled={actionLoading}
                          >
                            Verify Drop-off
                          </button>
                          <button 
                            className="px-4 py-2 rounded bg-blue-500 text-white font-bold text-xs hover:bg-blue-600 transition"
                            onClick={() => triggerMockScan('FB-MOCK', 'delivery')}
                            disabled={actionLoading}
                          >
                            📸 Mock QR Scan
                          </button>
                          <button className="px-4 py-2 rounded border text-slate-500 text-xs" onClick={() => setShowScanner(false)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn-primary w-full py-2 flex items-center justify-center gap-1.5" onClick={() => { setShowScanner(true); setScanAction('delivery'); }}>
                        <Scan size={16} /> Verify Handshake Code
                      </button>
                    )}
                  </div>
                )}

                {selectedJob.status === 'delivered' && (
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center flex flex-col items-center gap-2 text-emerald-600">
                    <CheckCircle2 size={36} />
                    <h4 className="font-extrabold">Delivery Drive Completed!</h4>
                    <p className="text-xs">Amazing job! The food has been delivered and distributed safely.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-20 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
              <Navigation size={48} className="text-emerald-500 opacity-40 animate-pulse" />
              <h3 className="font-bold text-lg dark:text-white">No Active Route</h3>
              <p className="text-xs text-slate-500 max-w-xs">Select a claimed pickup drive from the sidebar panel to draw map navigation polylines.</p>
            </div>
          )}
        </div>
      </div>

      {/* SECURE OTP MODAL POPUP */}
      <AnimatePresence>
        {showPickupOtpModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-darkBg-secondary p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-sm w-full space-y-6 relative text-left"
            >
              <button 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-500 bg-transparent border-none cursor-pointer"
                onClick={() => setShowPickupOtpModal(false)}
              >
                <X size={18} />
              </button>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Secure Pickup Verification</h3>
                <p className="text-xs text-slate-500">Pickup ID: <b className="font-mono">{selectedJob?.pickupId}</b></p>
              </div>

              {pickupError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-semibold animate-pulse text-center">
                  ⚠️ {pickupError}
                </div>
              )}

              {pickupSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold text-center">
                  {pickupSuccess}
                </div>
              )}

              {!pickupSuccess && (
                <div className="space-y-4">
                  <div className="form-group">
                    <label className="form-label text-center block">Enter 6-Digit Pickup OTP</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="e.g. 483921"
                      className="form-control text-center text-xl font-extrabold tracking-widest font-mono"
                      value={pickupOtpInput}
                      onChange={e => setPickupOtpInput(e.target.value.replace(/\D/g, ''))}
                      disabled={actionLoading || isLocked}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      className="flex-1 btn btn-primary py-2 font-bold text-xs"
                      onClick={handleVerifyPickupOtp}
                      disabled={actionLoading || pickupOtpInput.length !== 6 || isLocked}
                    >
                      {actionLoading ? 'Verifying Coordinates...' : 'Confirm Verification'}
                    </button>
                    <button 
                      type="button" 
                      className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs"
                      onClick={() => {
                        // Pre-fill mock OTP or scan override
                        setPickupOtpInput(selectedJob?.pickupOTP || '483921');
                      }}
                      disabled={actionLoading || isLocked}
                    >
                      📸 QR Override
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-500 flex justify-between items-center">
                    <span>Verification Time Limit:</span>
                    <span className="font-bold">
                      <OtpCountdown expiryTime={selectedJob?.otpExpiry} />
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Otp Countdown helper subcomponent
function OtpCountdown({ expiryTime }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!expiryTime) return;
    
    const calculateTimeLeft = () => {
      const diff = new Date(expiryTime) - new Date();
      return diff > 0 ? Math.floor(diff / 1000) : 0;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryTime]);

  if (timeLeft <= 0) {
    return <span className="text-red-500 font-bold">Expired</span>;
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return (
    <span className="text-emerald-500 font-bold">
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </span>
  );
}
