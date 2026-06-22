import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useShop } from '../context/ShopContext.jsx';
import { Mail, Lock, LogIn, Sparkles } from 'lucide-react';
import AlertPopup from '../components/AlertPopup.jsx';

const Login = () => {
  const { login } = useAuth();
  const { shopInfo } = useShop();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Alert settings
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  const triggerAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      triggerAlert('warning', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        triggerAlert('error', result.message || 'Login failed.');
      }
    } catch (error) {
      triggerAlert('error', 'Something went wrong. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden font-sans">
      {/* Background ambient light effects */}
      <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-amber-600/10 blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* Branding header */}
        <div className="text-center mb-8">
          {shopInfo.logo ? (
            <img src={shopInfo.logo} alt="Logo" className="mx-auto h-14 w-14 rounded-2xl object-cover shadow-xl shadow-amber-500/20 mb-4" />
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xl shadow-amber-500/20 mb-4 animate-pulse">
              <Sparkles className="h-7 w-7" />
            </div>
          )}
          <h2 className="text-3xl font-extrabold tracking-tight text-white">{shopInfo.shopName || 'STN MOTORS'}</h2>
          <p className="mt-1.5 text-sm font-semibold tracking-wider text-amber-500 uppercase">{shopInfo.shopTagline || 'Tractor Parts & Oils POS'}</p>
        </div>

        {/* Glassmorphic Login Form Container */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-lg">
          <h3 className="text-lg font-bold text-white mb-6">User Sign In</h3>
          
          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-350 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@stnmotors.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm transition-all font-semibold"
                />
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-350 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm transition-all font-semibold"
                />
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-lg shadow-amber-500/20 transition-all duration-150 disabled:opacity-50 mt-6"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Enter POS Terminal</span>
                  <LogIn className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          {/* Quick instructions / Demo Info */}
          <div className="mt-8 rounded-xl bg-white/5 border border-white/5 p-4 text-[11px] leading-relaxed text-slate-400">
            <span className="block font-bold text-amber-500 uppercase tracking-wide mb-1">Demo Credentials:</span>
            <div className="flex justify-between">
              <span>Admin: <strong className="text-white">admin@stnmotors.com</strong></span>
              <span>Pass: <strong className="text-white">admin123</strong></span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Cashier: <strong className="text-white">cashier@stnmotors.com</strong></span>
              <span>Pass: <strong className="text-white">cashier123</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating alert */}
      <AlertPopup 
        isOpen={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default Login;
