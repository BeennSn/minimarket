import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../../utils/axios';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);

  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [showPasswordNueva, setShowPasswordNueva] = useState(false);
  const [showPasswordConfirmar, setShowPasswordConfirmar] = useState(false);

  const validatePassword = (pw) => {
    if (pw.length < 7) return 'Debe tener al menos 7 caracteres';
    if (!/[A-Z]/.test(pw)) return 'Debe contener una mayúscula';
    if (!/[a-z]/.test(pw)) return 'Debe contener una minúscula';
    if (!/\d/.test(pw)) return 'Debe contener un dígito';
    return null;
  };

  const handleSolicitar = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setPaso(2);
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordNueva !== passwordConfirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const pwError = validatePassword(passwordNueva);
    if (pwError) {
      setError(`Contraseña inválida: ${pwError}`);
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email,
        codigo,
        password_nueva: passwordNueva,
      });
      setExito(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  const volverAlEnvio = () => {
    setError('');
    setCodigo('');
    setPasswordNueva('');
    setPasswordConfirmar('');
    setPaso(1);
  };

  if (exito) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-800">Contraseña actualizada</h2>
          <p className="mt-2 text-sm text-gray-500">
            Serás redirigido al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {paso === 1 ? (
          <>
            <div className="mb-6 text-center">
              <KeyRound className="mx-auto h-10 w-10 text-[#6366f1]" />
              <h1 className="mt-3 text-2xl font-bold text-gray-800">Recuperar contraseña</h1>
              <p className="mt-1 text-sm text-gray-500">
                Ingresa tu correo y te enviaremos un código
              </p>
            </div>

            <form onSubmit={handleSolicitar} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="correo@ejemplo.com"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366f1] py-2 text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar código'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="flex items-center justify-center gap-1 text-sm text-indigo-500 hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                Volver al login
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-[#6366f1]" />
              <h1 className="mt-3 text-2xl font-bold text-gray-800">Ingresa el código</h1>
              <p className="mt-1 text-sm text-gray-500">
                Revisa tu correo, el código expira en 15 minutos
              </p>
            </div>

            <form onSubmit={handleConfirmar} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Código de 4 dígitos
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  maxLength={4}
                  placeholder="0000"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPasswordNueva ? 'text' : 'password'}
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordNueva(!showPasswordNueva)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswordNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPasswordConfirmar ? 'text' : 'password'}
                    value={passwordConfirmar}
                    onChange={(e) => setPasswordConfirmar(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirmar(!showPasswordConfirmar)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswordConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366f1] py-2 text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  'Cambiar contraseña'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={volverAlEnvio}
                className="flex items-center justify-center gap-1 text-sm text-indigo-500 hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                Reenviar código
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
