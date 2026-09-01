import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchCurrentUser, loginUser, registerUser } from '../api/authApi.js';
import { AuthContext } from './AuthContext.js';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!localStorage.getItem('accessToken')) {
        setLoading(false);
        return;
      }
      try {
        setUser(await fetchCurrentUser());
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    void restoreSession();
  }, [logout]);

  const authenticate = async (request, credentials) => {
    const result = await request(credentials);
    localStorage.setItem('accessToken', result.token);
    setUser(result.user);
    return result.user;
  };

  const value = useMemo(() => ({
    user,
    loading,
    login: (credentials) => authenticate(loginUser, credentials),
    register: (credentials) => authenticate(registerUser, credentials),
    logout,
    setUser,
  }), [loading, logout, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
