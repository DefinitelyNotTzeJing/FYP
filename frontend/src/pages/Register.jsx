import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
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

    if (formData.password !== formData.passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    const result = await register(formData);

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
          <span className="auth-eyebrow">Create Account</span>
          <h1>Register a reader profile and start browsing the catalog.</h1>
          <p>
            The form now matches the backend contract and sends
            `username` with `password_confirmation`.
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Register</h2>
            <p>Create your BookHaven account.</p>
          </div>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className="form-input"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                placeholder="reader123"
                minLength={3}
                maxLength={50}
                required
              />
            </div>

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
                placeholder="reader@example.com"
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
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="passwordConfirmation" className="form-label">
                Confirm Password
              </label>
              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                className="form-input"
                value={formData.passwordConfirmation}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Repeat your password"
                minLength={8}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Register;
