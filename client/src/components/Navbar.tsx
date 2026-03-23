import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/',         label: 'Dashboard' },
  { to: '/tasks',    label: 'Tasks'     },
  { to: '/board',    label: 'Board'     },
  { to: '/insights', label: 'Insights'  },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-mark">
              <span>C</span>
            </div>
            <span className="navbar-logo-text">Context Engine</span>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="navbar-links">
              {NAV_LINKS.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`navbar-link ${isActive(l.to) ? 'navbar-link-active' : ''}`}
                >
                  {l.label}
                  {isActive(l.to) && <span className="navbar-link-dot" />}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          {user && (
            <div className="navbar-right">
              <span className="navbar-email">{user.email}</span>
              <div className="navbar-divider" />
              <button onClick={handleLogout} className="navbar-logout">Log out</button>

              {/* Mobile burger */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="navbar-burger"
                aria-label="Toggle menu"
              >
                <span className={`burger-bar ${isMenuOpen ? 'bar-open-1' : ''}`} />
                <span className={`burger-bar ${isMenuOpen ? 'bar-open-2' : ''}`} />
                <span className={`burger-bar ${isMenuOpen ? 'bar-open-3' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {user && isMenuOpen && (
          <div className="navbar-mobile">
            {NAV_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setIsMenuOpen(false)}
                className={`navbar-mobile-link ${isActive(l.to) ? 'navbar-mobile-link-active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="navbar-mobile-sep" />
            <div className="navbar-mobile-email">{user.email}</div>
            <button onClick={handleLogout} className="navbar-mobile-logout">Log out</button>
          </div>
        )}
      </nav>

      <style>{NAV_STYLES}</style>
    </>
  );
}

const NAV_STYLES = `
  .navbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(8,10,14,0.88);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .navbar-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.25rem;
    height: 56px;
    display: flex;
    align-items: center;
    gap: 2rem;
  }
  .navbar-logo {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    text-decoration: none;
    flex-shrink: 0;
  }
  .navbar-logo-mark {
    width: 30px; height: 30px;
    border-radius: 7px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dim) 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(212,168,83,0.25);
  }
  .navbar-logo-mark span {
    font-family: var(--font-display, sans-serif);
    font-weight: 700;
    font-size: 0.875rem;
    color: #0a0704;
  }
  .navbar-logo-text {
    font-family: var(--font-display, sans-serif);
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--text-primary);
    display: none;
  }
  @media (min-width: 480px) { .navbar-logo-text { display: block; } }

  .navbar-links {
    display: none;
    align-items: center;
    gap: 0;
    flex: 1;
  }
  @media (min-width: 768px) { .navbar-links { display: flex; } }

  .navbar-link {
    position: relative;
    padding: 0.375rem 0.875rem;
    font-family: var(--font-display, sans-serif);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--text-muted);
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .navbar-link:hover { color: var(--text-secondary); background: var(--bg-raised); }
  .navbar-link-active { color: var(--text-primary) !important; background: var(--bg-raised) !important; }
  .navbar-link-dot {
    width: 3px; height: 3px;
    border-radius: 50%;
    background: var(--accent);
  }

  .navbar-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .navbar-email {
    font-size: 0.75rem;
    color: var(--text-muted);
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: none;
  }
  @media (min-width: 900px) { .navbar-email { display: block; } }
  .navbar-divider { width: 1px; height: 16px; background: var(--border-mid); display: none; }
  @media (min-width: 900px) { .navbar-divider { display: block; } }
  .navbar-logout {
    font-family: var(--font-display, sans-serif);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
    background: none;
    border: 1px solid var(--border-subtle);
    border-radius: 5px;
    padding: 0.3125rem 0.625rem;
    cursor: pointer;
    transition: all 0.15s;
    display: none;
  }
  @media (min-width: 768px) { .navbar-logout { display: block; } }
  .navbar-logout:hover { color: var(--text-primary); border-color: var(--border-mid); background: var(--bg-raised); }

  /* Burger */
  .navbar-burger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }
  @media (min-width: 768px) { .navbar-burger { display: none; } }
  .burger-bar {
    display: block;
    width: 20px; height: 1.5px;
    background: var(--text-muted);
    border-radius: 2px;
    transition: transform 0.2s, opacity 0.2s;
    transform-origin: center;
  }
  .bar-open-1 { transform: translateY(6.5px) rotate(45deg); }
  .bar-open-2 { opacity: 0; }
  .bar-open-3 { transform: translateY(-6.5px) rotate(-45deg); }

  /* Mobile menu */
  .navbar-mobile {
    border-top: 1px solid var(--border-subtle);
    padding: 0.75rem 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: rgba(8,10,14,0.97);
  }
  .navbar-mobile-link {
    padding: 0.625rem 0.75rem;
    font-family: var(--font-display, sans-serif);
    font-size: 0.8125rem;
    font-weight: 500;
    text-decoration: none;
    color: var(--text-secondary);
    border-radius: 6px;
    transition: all 0.12s;
  }
  .navbar-mobile-link:hover { background: var(--bg-raised); color: var(--text-primary); }
  .navbar-mobile-link-active { color: var(--accent) !important; background: var(--accent-subtle) !important; }
  .navbar-mobile-sep { height: 1px; background: var(--border-subtle); margin: 0.5rem 0; }
  .navbar-mobile-email { font-size: 0.75rem; color: var(--text-muted); padding: 0.25rem 0.75rem; }
  .navbar-mobile-logout {
    text-align: left;
    padding: 0.625rem 0.75rem;
    background: none;
    border: none;
    color: var(--energy-hi-text);
    font-size: 0.8125rem;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.12s;
  }
  .navbar-mobile-logout:hover { background: var(--energy-hi-bg); }
`;
