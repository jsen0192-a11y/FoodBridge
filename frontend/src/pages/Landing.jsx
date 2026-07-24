import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Heart, 
  MapPin, 
  Truck, 
  ShieldCheck, 
  ChevronRight, 
  Mail, 
  Phone, 
  Globe, 
  Flame, 
  HeartHandshake, 
  ArrowRight,
  TrendingUp,
  Award,
  Users,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  ThumbsUp
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ meals: 12450, co2: 4980, donations: 3410 });
  
  // Newsletter
  const [newsEmail, setNewsEmail] = useState('');
  const [newsSubscribed, setNewsSubscribed] = useState(false);
  
  // Contact
  const [contactData, setContactData] = useState({ name: '', email: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  
  // FAQ active state
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => ({
        meals: prev.meals + Math.floor(Math.random() * 3),
        co2: prev.co2 + Math.floor(Math.random() * 2),
        donations: prev.donations + (Math.random() > 0.7 ? 1 : 0)
      }));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleNewsletter = (e) => {
    e.preventDefault();
    setNewsSubscribed(true);
    setNewsEmail('');
    setTimeout(() => setNewsSubscribed(false), 5000);
  };

  const handleContact = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    setContactData({ name: '', email: '', message: '' });
    setTimeout(() => setContactSubmitted(false), 5000);
  };

  const faqs = [
    {
      q: "How does FoodBridge verify food safety?",
      a: "Our Google Gemini AI analyzes every uploaded food image for visible quality, freshness indicators, and category, prompting donors for verification if a safety concern is flagged."
    },
    {
      q: "What types of organizations can join as Donors?",
      a: "Hotels, wedding banquets, caterers, corporate kitchens, restaurants, and individuals with clean kitchen licenses can register as verified food donors."
    },
    {
      q: "Are volunteers compensated?",
      a: "Volunteers participate as community logistics heroes. The platform provides optimized mapping directions and coordinate routes to make volunteering fast and rewarding."
    },
    {
      q: "How do you coordinate secure handshakes?",
      a: "When an NGO accepts food and assigns a courier, the donor's dashboard generates a secure QR verification code. The volunteer scans this code using their mobile camera at the pickup location to confirm the handover."
    }
  ];

  return (
    <div className="landing-wrapper bg-slate-50 dark:bg-darkBg-primary transition-colors duration-300">
      
      {/* 1. HERO SECTION WITH ANIMATED BACKDROP */}
      <section className="relative overflow-hidden bg-slate-900 text-white py-24 lg:py-32">
        {/* Animated Background Overlay */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.15),transparent_50%)] animate-pulse-slow"></div>
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.08),transparent_50%)]"></div>

        <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 space-y-6 text-left"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
              <Flame size={12} className="animate-bounce" /> Connect surplus with empty plates
            </span>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Bridging the Gap Between <span className="text-emerald-400">Food Surplus</span> & <span className="text-emerald-400">NGOs</span>
            </h1>
            <p className="text-slate-400 text-lg lg:text-xl max-w-2xl font-light">
              Transforming leftover catering meals, hotel surpluses, and retail groceries into secure community feeds using geocoding logistics maps and Google Gemini AI freshness diagnostics.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              {user ? (
                <Link to={`/dashboard/${user.role}`} className="px-6 py-3 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition flex items-center gap-2 shadow-lg shadow-emerald-500/25">
                  Go to Portal <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="px-6 py-3 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition flex items-center gap-2 shadow-lg shadow-emerald-500/25">
                    Register to Donate <HeartHandshake size={18} />
                  </Link>
                  <Link to="/login" className="px-6 py-3 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition font-bold">
                    Claim as NGO / Volunteer
                  </Link>
                </>
              )}
            </div>
          </motion.div>

          {/* Floating UI mockups visual panel */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative hidden lg:flex h-[400px] items-center justify-center"
          >
            <div className="absolute w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
            
            <div className="absolute top-10 left-0 p-5 w-64 rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-md shadow-2xl text-left">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mb-1">
                <Sparkles size={12} /> Gemini Freshness Check
              </span>
              <h4 className="text-sm font-bold text-white">Rice & Vegetable Curry</h4>
              <p className="text-xs text-slate-400 mt-1">Freshness score: <b>94%</b></p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-400 h-full w-[94%]"></div>
              </div>
            </div>

            <div className="absolute bottom-10 right-0 p-5 w-64 rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-md shadow-2xl text-left">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1 mb-1">
                <Truck size={12} /> Live Route Assigned
              </span>
              <h4 className="text-sm font-bold text-white">Volunteer Courier On Route</h4>
              <p className="text-xs text-slate-400 mt-1">Transit code: <b>FB-8842</b></p>
              <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold mt-2 border border-blue-500/20">
                Tracking Enabled
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. DYNAMIC STATISTICS SECTION */}
      <section className="relative z-20 -mt-10 max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-darkBg-secondary rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-colors">
            <TrendingUp className="w-12 h-12 text-emerald-500 flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.meals.toLocaleString()}</h3>
              <p className="text-slate-500 text-sm">Meals Saved & Shared</p>
            </div>
          </div>
          <div className="p-6 bg-white dark:bg-darkBg-secondary rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-colors">
            <Award className="w-12 h-12 text-emerald-500 flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.co2.toLocaleString()} kg</h3>
              <p className="text-slate-500 text-sm">CO₂ Emissions Prevented</p>
            </div>
          </div>
          <div className="p-6 bg-white dark:bg-darkBg-secondary rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-colors">
            <Users className="w-12 h-12 text-emerald-500 flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.donations.toLocaleString()}</h3>
              <p className="text-slate-500 text-sm">Active Distributions</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white">Seamless Distribution Model</h2>
          <p className="text-slate-500 mt-2">Connecting kitchens, drivers, and welfare centers in under 60 minutes.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 bg-white dark:bg-darkBg-secondary rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center relative transition-transform duration-300 hover:-translate-y-2">
            <span className="absolute top-4 left-4 text-4xl font-black text-slate-100 dark:text-slate-800 select-none">01</span>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
              <Heart size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Upload surplus</h3>
            <p className="text-slate-500 text-sm">Caterers or hotels input available dishes, address, and upload photos analyzed instantly by our AI.</p>
          </div>

          <div className="p-8 bg-white dark:bg-darkBg-secondary rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center relative transition-transform duration-300 hover:-translate-y-2">
            <span className="absolute top-4 left-4 text-4xl font-black text-slate-100 dark:text-slate-800 select-none">02</span>
            <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6">
              <MapPin size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Claim location</h3>
            <p className="text-slate-500 text-sm">Nearby NGOs view listing coordinates in real-time, click to accept, and coordinate delivery routes.</p>
          </div>

          <div className="p-8 bg-white dark:bg-darkBg-secondary rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center relative transition-transform duration-300 hover:-translate-y-2">
            <span className="absolute top-4 left-4 text-4xl font-black text-slate-100 dark:text-slate-800 select-none">03</span>
            <div className="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6">
              <Truck size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. QR Handshake</h3>
            <p className="text-slate-500 text-sm">Volunteers collect and deliver surplus, confirming handshakes via secure scanning code validation.</p>
          </div>
        </div>
      </section>

      {/* 4. PARTNERS & DONORS SPLIT GRID */}
      <section className="bg-white dark:bg-darkBg-secondary py-16 border-t border-b border-slate-100 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-left space-y-4">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Supported Restaurant & Hotel Networks</h2>
            <p className="text-slate-500">
              Leading culinary kitchens and banquets upload surplus resources daily, helping feed thousands and preventing hundreds of kilograms of organic carbon waste.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4 opacity-75">
              <div className="p-3 bg-slate-50 dark:bg-darkBg-primary border border-slate-200 dark:border-slate-800 text-center rounded font-extrabold text-xs text-slate-600 dark:text-slate-400">BANQUETS</div>
              <div className="p-3 bg-slate-50 dark:bg-darkBg-primary border border-slate-200 dark:border-slate-800 text-center rounded font-extrabold text-xs text-slate-600 dark:text-slate-400">HOTELS</div>
              <div className="p-3 bg-slate-50 dark:bg-darkBg-primary border border-slate-200 dark:border-slate-800 text-center rounded font-extrabold text-xs text-slate-600 dark:text-slate-400">CATERERS</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-darkBg-primary border border-slate-100 dark:border-slate-800 flex flex-col justify-center text-left">
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">80+ NGOs</h4>
              <p className="text-slate-500 text-xs mt-1">Shelters and distribution agencies connected.</p>
            </div>
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-darkBg-primary border border-slate-100 dark:border-slate-800 flex flex-col justify-center text-left">
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">200+ Kitchens</h4>
              <p className="text-slate-500 text-xs mt-1">Registered hotel and caterers partners.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SUCCESS STORIES / TESTIMONIALS */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white">Voices from our Community</h2>
          <p className="text-slate-500 mt-2">Check how coordinators and donors are making a difference.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between text-left">
            <p className="text-slate-600 dark:text-slate-400 italic text-lg">
              "We used to throw out catering leftovers from grand wedding halls. Now we list it on FoodBridge and an NGO collects it within the hour. It saves money and feeds people!"
            </p>
            <div className="flex items-center gap-3 mt-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">RK</div>
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white">Rajesh Kumar</h5>
                <span className="text-xs text-slate-500">Owner, Banquet Palace</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between text-left">
            <p className="text-slate-600 dark:text-slate-400 italic text-lg">
              "Providing logistics help on weekends has been extremely rewarding. The map route guidance and donor QR codes make pick-ups smooth and completely professional."
            </p>
            <div className="flex items-center gap-3 mt-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">AS</div>
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white">Anita Sharma</h5>
                <span className="text-xs text-slate-500">Logistics Carrier</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQS ACCORDION */}
      <section className="py-20 bg-white dark:bg-darkBg-secondary border-t border-b border-slate-100 dark:border-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="text-slate-500 mt-1">Have doubts? We have answers.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <button 
                  className="w-full p-5 text-left font-bold text-slate-900 dark:text-white flex justify-between items-center bg-slate-50/50 dark:bg-darkBg-primary/20 hover:bg-slate-50 dark:hover:bg-darkBg-primary/40 transition"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                >
                  <span>{faq.q}</span>
                  <HelpCircle size={18} className="text-emerald-500" />
                </button>
                {activeFaq === idx && (
                  <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-darkBg-secondary text-slate-600 dark:text-slate-400 text-sm leading-relaxed text-left animate-slide-up">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CONTACT & NEWSLETTER SUBSCRIPTION */}
      <section className="py-20 max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-12">
        <div className="md:col-span-7 p-8 bg-white dark:bg-darkBg-secondary border border-slate-100 dark:border-slate-800 rounded-2xl text-left space-y-6">
          <h3>Get In Touch</h3>
          <p className="text-slate-500 text-sm">Need help verifying credentials or organizing massive donor partnerships? Drop us a line.</p>
          
          {contactSubmitted && (
            <div className="alert-success">
              🎉 Message sent successfully! Our coordinators will reply shortly.
            </div>
          )}

          <form onSubmit={handleContact} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={contactData.name}
                  onChange={e => setContactData({...contactData, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required 
                  value={contactData.email}
                  onChange={e => setContactData({...contactData, email: e.target.value})}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Your Message</label>
              <textarea 
                rows="4" 
                className="form-control" 
                required 
                value={contactData.message}
                onChange={e => setContactData({...contactData, message: e.target.value})}
              ></textarea>
            </div>
            <button type="submit" className="px-6 py-2.5 rounded bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition">
              Send Message
            </button>
          </form>
        </div>

        {/* Newsletter Subscribe card */}
        <div className="md:col-span-5 flex flex-col justify-between p-8 bg-emerald-950 text-white rounded-2xl text-left relative overflow-hidden">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.3),transparent_60%)] animate-pulse-slow"></div>
          
          <div className="space-y-4 relative z-10">
            <Mail size={32} className="text-emerald-400" />
            <h3 className="text-2xl font-black">Subscribe to Newsletter</h3>
            <p className="text-emerald-200/80 text-sm">Stay updated with fresh rescue alerts, partner rankings, and food waste insights.</p>
          </div>

          <div className="relative z-10 pt-8">
            {newsSubscribed ? (
              <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold text-center text-xs">
                ✓ Registered! Thank you for subscribing.
              </div>
            ) : (
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="name@email.com" 
                  className="flex-1 px-4 py-2.5 rounded bg-white/10 text-white placeholder-emerald-200/50 border border-white/10 focus:outline-none focus:border-emerald-400 text-sm"
                  required
                  value={newsEmail}
                  onChange={e => setNewsEmail(e.target.value)}
                />
                <button type="submit" className="px-4 py-2.5 rounded bg-emerald-500 text-white hover:bg-emerald-400 transition font-bold text-sm">
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 8. LANDING FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-white/5 text-left">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="text-white font-extrabold text-xl flex items-center gap-2">
              <HeartHandshake className="text-emerald-400" /> FoodBridge
            </div>
            <p className="text-xs font-light text-slate-500">Reducing global food waste and supporting local hunger distribution agency networks.</p>
          </div>
          <div>
            <h5 className="text-white font-bold mb-3 text-sm">Campaigns</h5>
            <ul className="space-y-2 text-xs">
              <li><Link to="/register" className="hover:text-white transition">Become a Donor</Link></li>
              <li><Link to="/register" className="hover:text-white transition">NGO Distributions</Link></li>
              <li><Link to="/register" className="hover:text-white transition">Volunteer Carriers</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold mb-3 text-sm">Support</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#how-it-works" className="hover:text-white transition">How it Works</a></li>
              <li><a href="#features" className="hover:text-white transition">Features Map</a></li>
              <li><Link to="/login" className="hover:text-white transition">Terms & Privacy</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h5 className="text-white font-bold text-sm">Contacts</h5>
            <div className="text-xs space-y-1">
              <p>📍 Bengaluru Headquarters, India</p>
              <p>📨 team@foodbridge.org</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 border-t border-white/5 pt-8 text-center text-xs text-slate-600">
          &copy; 2026 FoodBridge Foundation. All rights reserved. Made for clean climates.
        </div>
      </footer>
    </div>
  );
}
