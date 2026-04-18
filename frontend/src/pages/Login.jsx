import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectPath = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await login(formData.email, formData.password);

    if (!result.success) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    navigate(redirectPath, { replace: true });
  };

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-copy">
          <span className="auth-eyebrow">BookHaven Account</span>
          <h1>Login to continue reading, ordering, and tracking your library.</h1>
          <p>
            Your backend is already live. This page now posts directly to the Laravel
            auth API and keeps the returned token in local storage.
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Login</h2>
            <p>Use your email and password.</p>
          </div>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="admin@bookstore.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="auth-switch">
            Need an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Login;
