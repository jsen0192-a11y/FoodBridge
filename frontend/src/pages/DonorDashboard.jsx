import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../context/AuthContext';
import { 
  PlusCircle, MapPin, Sparkles, CheckCircle2, 
  Upload, Compass, X, AlertTriangle, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DonorDashboard() {
  // Form states
  const [donorName, setDonorName] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [phone, setPhone] = useState('');
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState('Cooked Meals');
  const [quantity, setQuantity] = useState('');
  const [peopleServed, setPeopleServed] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Coordinates
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // Status/Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Camera states & refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError('Unable to access camera. Please check browser permissions.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setImage(dataUrl);
      setImagePreview(dataUrl);
      stopCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Capture GPS coordinates using browser Geolocation API
  const handleGPSLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setError('');
    setGpsLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat);
        setLongitude(lng);
        setGpsLoading(false);
        // Automatically set a description if blank
        if (!pickupAddress || pickupAddress.startsWith('GPS Coordinates:')) {
          setPickupAddress('Current Location (GPS Captured)');
        }
      },
      (err) => {
        console.error("GPS error:", err);
        setError("Unable to retrieve location. Please check your browser GPS permissions.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Convert image file to base64 string
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!donorName || !phone || !foodName || !quantity || !peopleServed || !pickupAddress || !pickupTime || !expiryTime) {
      setError('Please fill in all required fields.');
      return;
    }

    if (latitude === null || longitude === null) {
      setError('Please capture your current location using the GPS locator button.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        donorName,
        organisationName,
        phone,
        foodName,
        category,
        quantity,
        peopleServed: parseInt(peopleServed),
        pickupAddress,
        pickupTime,
        expiryTime,
        latitude,
        longitude,
        image,
        notes
      };

      const res = await fetch(`${API_URL}/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowSuccessModal(true);
        // Reset form fields
        setFoodName('');
        setQuantity('');
        setPeopleServed('');
        setNotes('');
        setImage('');
        setImagePreview('');
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to submit donation.');
      }
    } catch (err) {
      console.error(err);
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      
      {/* Title Header */}
      <div className="text-left mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <PlusCircle className="text-emerald-500" /> Donate Surplus Food
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Publish details about your surplus food to notify verified community NGOs.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Donation Form Card */}
      <div className="glass-panel p-8 rounded-2xl bg-white dark:bg-darkBg-secondary shadow-xl border border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Contact Details */}
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Donor Name *</label>
              <input 
                type="text" 
                required 
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Organisation Name (Optional)</label>
              <input 
                type="text" 
                value={organisationName}
                onChange={(e) => setOrganisationName(e.target.value)}
                placeholder="e.g. Grand Plaza Hotel"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Mobile Number *</label>
              <input 
                type="tel" 
                required 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 2: Food details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Food Item Name *</label>
              <input 
                type="text" 
                required 
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Rice & Veg Curry"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Food Category *</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Cooked Meals">Cooked Meals</option>
                <option value="Groceries">Groceries</option>
                <option value="Packaged Foods">Packaged Foods</option>
                <option value="Bakery Items">Bakery Items</option>
                <option value="Fruits & Veggies">Fruits & Vegetables</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Quantity (e.g. 5kg, 10 packs) *</label>
              <input 
                type="text" 
                required 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 15 kg"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Servings count (Est. People Served) *</label>
              <input 
                type="number" 
                required 
                value={peopleServed}
                onChange={(e) => setPeopleServed(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 3: Logistics details */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pickup Address *</label>
              
              {/* GPS Button */}
              <button
                type="button"
                onClick={handleGPSLocation}
                disabled={gpsLoading}
                className="text-xs font-extrabold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/25 transition-all"
              >
                <Compass size={14} className={gpsLoading ? 'animate-spin' : ''} />
                <span>{latitude ? '📍 Location Captured!' : '📍 Use Current Location'}</span>
              </button>
            </div>
            <textarea 
              required 
              rows={3}
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="e.g. 1st Floor, Block C, Grand Plaza Kitchens, Shamsabad road"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
            />
            {latitude && (
              <span className="text-[10px] text-emerald-500 font-bold block mt-1">
                📍 Live location captured successfully!
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Pickup Deadline Time *</label>
              <input 
                type="datetime-local" 
                required 
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Food Expiry Time *</label>
              <input 
                type="datetime-local" 
                required 
                value={expiryTime}
                onChange={(e) => setExpiryTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Additional Notes / Allergen Alerts</label>
            <input 
              type="text" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Keep refrigerated, contains dairy, ready to eat"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Section 4: Image Upload */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Upload Food Image</label>
              
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="text-xs font-extrabold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/25 transition-all"
                >
                  <Camera size={14} />
                  <span>Use Camera Scanner</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-xs font-extrabold text-red-500 hover:text-red-600 flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/25 transition-all"
                >
                  <X size={14} />
                  <span>Turn Off Camera</span>
                </button>
              )}
            </div>

            {cameraError && (
              <div className="p-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                {cameraError}
              </div>
            )}

            {isCameraActive ? (
              <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkBg-primary">
                {/* Hidden canvas for drawing frame */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-800" 
                />
                
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2"
                >
                  <Camera size={16} />
                  <span>Capture Live Photo</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer relative bg-slate-50 dark:bg-darkBg-primary">
                  <Upload className="text-slate-400 mb-2" size={28} />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Click to upload food photo</span>
                  <span className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG (Max 5MB)</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden" 
                  />
                </label>
                {imagePreview && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0 relative group">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImage(''); setImagePreview(''); }}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Submit Food Donation</span>
              </>
            )}
          </button>

        </form>
      </div>

      {/* Success Modal Popup */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-8 rounded-2xl bg-white dark:bg-darkBg-secondary border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full text-center relative"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">Donation Created!</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                Your food donation listing has been successfully saved in MongoDB. The active status is set to <b>Pending</b>. Nearby approved NGOs will receive real-time alerts.
              </p>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md"
              >
                Proceed
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
