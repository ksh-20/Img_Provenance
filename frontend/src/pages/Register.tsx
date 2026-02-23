import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Fingerprint, AlertCircle, CheckCircle } from 'lucide-react';
import { register } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);

  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (username.length < 3)    errs.username = 'At least 3 characters';
    if (!email.includes('@'))   errs.email    = 'Valid email required';
    if (password.length < 6)    errs.password = 'At least 6 characters';
    if (password !== confirm)   errs.confirm  = 'Passwords do not match';
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await register({ username, email, password });
      setAuth(data.access_token, {
        user_id:  data.user_id,
        username: data.username,
        email:    data.email,
      });
      navigate('/');
    } catch (err: any) {
      setApiError(err?.response?.data?.detail ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (err?: string) =>
    `w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white bg-white/5 border focus:outline-none transition-colors placeholder:text-slate-600 ${
      err ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-cyan-500/50'
    }`;

  const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const pwColors   = ['', '#ef4444', '#f59e0b', '#10b981'];
  const pwLabels   = ['', 'Weak', 'Fair', 'Strong'];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8"
         style={{ background: 'linear-gradient(135deg, #020816 0%, #0a0f1e 50%, #050d1a 100%)' }}>
      {/* Ambient orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}>
            <Fingerprint size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">FakeLineage</h1>
          <p className="text-slate-400 text-sm mt-1">Create your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
             style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}>
          <h2 className="text-xl font-bold text-white mb-6">Get started for free</h2>

          {apiError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} className="flex-shrink-0" /> {apiError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="reg-username" type="text" required value={username}
                  onChange={(e) => { setUsername(e.target.value); setFieldErr(p => ({...p, username: undefined})); }}
                  placeholder="forensicsuser"
                  className={inputCls(fieldErr.username)} />
              </div>
              {fieldErr.username && <p className="text-xs text-red-400 mt-1">{fieldErr.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="reg-email" type="email" required value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErr(p => ({...p, email: undefined})); }}
                  placeholder="you@example.com"
                  className={inputCls(fieldErr.email)} />
              </div>
              {fieldErr.email && <p className="text-xs text-red-400 mt-1">{fieldErr.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="reg-password" type={showPwd ? 'text' : 'password'} required value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErr(p => ({...p, password: undefined})); }}
                  placeholder="••••••••"
                  className={inputCls(fieldErr.password)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                         style={{ width: `${(pwStrength / 3) * 100}%`, background: pwColors[pwStrength] }} />
                  </div>
                  <span className="text-[10px]" style={{ color: pwColors[pwStrength] }}>{pwLabels[pwStrength]}</span>
                </div>
              )}
              {fieldErr.password && <p className="text-xs text-red-400 mt-1">{fieldErr.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Confirm password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="reg-confirm" type={showPwd ? 'text' : 'password'} required value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setFieldErr(p => ({...p, confirm: undefined})); }}
                  placeholder="••••••••"
                  className={inputCls(fieldErr.confirm)} />
                {confirm.length > 0 && password === confirm && (
                  <CheckCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                )}
              </div>
              {fieldErr.confirm && <p className="text-xs text-red-400 mt-1">{fieldErr.confirm}</p>}
            </div>

            <button id="reg-submit" type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 mt-2"
              style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
