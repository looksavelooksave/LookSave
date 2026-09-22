import { Navigate, Route, Routes } from 'react-router-dom';

import { Spinner } from './components/Spinner';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/Login';
import { QueuePage } from './pages/Queue';

/**
 * Yetkazib berish paneli — bitta dostavka firmasi.
 *
 * ⚠️ ALOHIDA ROL. Do'kon TAYYOR qilgan delivery buyurtmalar shu yerga
 * tushadi; firma operatori ularni qabul qiladi, kuryerga biriktiradi va
 * yetkazadi. Server `courier` rolini talab qiladi — ajratish interfeysda
 * ham shu yerdan boshlanadi.
 */
export function App(): JSX.Element {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner label="Sessiya tekshirilmoqda" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.role !== 'courier') {
    return (
      <main className="flex min-h-full items-center justify-center px-4 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="text-lg font-semibold text-foreground">Bu panel dostavka firmasi uchun</h1>
          <p className="text-sm text-dim">
            Siz <span className="text-foreground">{user.fullName ?? 'boshqa akkaunt'}</span> bilan
            kirgansiz — bu dostavka logini emas. Chiqib, firma login/paroli bilan kiring.
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Chiqish va qayta kirish
          </button>
        </div>
      </main>
    );
  }

  return (
    <Routes>
      <Route index element={<QueuePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
