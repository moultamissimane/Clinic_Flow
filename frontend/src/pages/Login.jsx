import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, HeartPulse, Lock, LogIn, Mail, ShieldCheck, SquarePlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  ['Admin', 'admin@clinicflow.ma', 'Admin@123'],
  ['Staff', 'staff1@clinicflow.ma', 'Staff@123'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password, remember);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-top">
        <div className="brand-inline">
          <span className="brand-mark sm">
            <SquarePlus size={18} />
          </span>
          <strong>ClinicFlow</strong>
          <span className="tag">SANTÉ MAROC</span>
        </div>
        <span className="pill pill-open">
          <span className="dot" /> Système opérationnel
        </span>
      </header>

      <main className="login-main">
        <form className="login-card" onSubmit={submit} noValidate>
          <span className="login-logo">
            <HeartPulse size={26} />
          </span>
          <div className="login-brand">
            <span className="text-primary">ClinicFlow</span> <span className="muted small">• Cabinet Médical</span>
          </div>
          <h1>Connexion</h1>
          <p className="muted center">Accédez à votre espace praticien et gestion de cabinet</p>

          {error && (
            <div className="alert alert-danger" role="alert">
              <AlertCircle size={18} />
              <div>
                <strong>{error.status === 401 ? 'Identifiants non reconnus' : 'Connexion impossible'}</strong>
                <p>{error.status === 400 ? 'Veuillez saisir un email valide et un mot de passe.' : error.message}</p>
              </div>
            </div>
          )}

          <label className="field">
            <span className="field-label">Adresse email professionnelle</span>
            <span className="input-wrap with-icon">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dr.alami@clinicflow.ma"
                required
                autoFocus
              />
            </span>
          </label>

          <label className="field">
            <span className="field-label">Mot de passe</span>
            <span className="input-wrap with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Mémoriser ma session
          </label>

          <button className="btn btn-dark btn-block" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'} <LogIn size={16} />
          </button>

          <div className="login-foot">
            <ShieldCheck size={14} className="text-primary" /> Espace réservé aux professionnels autorisés
          </div>

          <div className="demo">
            <span className="muted small">Comptes de démonstration :</span>
            {DEMO.map(([label, e, p]) => (
              <button
                type="button"
                key={e}
                className="demo-btn"
                onClick={() => {
                  setEmail(e);
                  setPassword(p);
                }}
              >
                <strong>{label}</strong> {e}
              </button>
            ))}
          </div>
        </form>
      </main>

      <footer className="login-footer muted small">© {new Date().getFullYear()} ClinicFlow. Tous droits réservés.</footer>
    </div>
  );
}
