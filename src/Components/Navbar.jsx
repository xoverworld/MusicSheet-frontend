import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Library, LogIn, LogOut, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <Music size={28} />
          <span>Piano Transcription</span>
        </Link>

        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <Link to="/library" className="nav-link">
                <Library size={20} />
                <span>My Library</span>
              </Link>
              
              <div className="nav-divider"></div>
              
              <span className="user-email">{user?.email}</span>
              
              <button onClick={handleLogout} className="nav-button logout">
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                <LogIn size={20} />
                <span>Login</span>
              </Link>
              
              <Link to="/register" className="nav-button register">
                <UserPlus size={20} />
                <span>Register</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;