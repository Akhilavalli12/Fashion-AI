import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api.js';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());
  useEffect(() => { if (tokenStore.get()) api('/auth/me').then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false)); }, []);
  const finish = ({ token, user }) => { tokenStore.set(token); setUser(user); return user; };
  return (
    <Ctx.Provider value={{
      user, loading,
      login: async (email, password) => finish(await api('/auth/login', { method: 'POST', body: { email, password } })),
      register: async (b) => finish(await api('/auth/register', { method: 'POST', body: b })),
      logout: () => { tokenStore.clear(); setUser(null); },
    }}>{children}</Ctx.Provider>
  );
}
