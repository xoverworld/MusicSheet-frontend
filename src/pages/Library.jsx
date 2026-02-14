import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Clock, Trash2, Eye } from 'lucide-react';
import axios from 'axios';
import { useAuth, API_URL } from '../contexts/AuthContext';
import './Library.css';

function Library() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchTranscriptions();
  }, [isAuthenticated, navigate]);

  const fetchTranscriptions = async () => {
    try {
      const response = await axios.get(`${API_URL}/transcriptions`);
      setTranscriptions(response.data.transcriptions);
    } catch (err) {
      setError('Failed to load transcriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transcription?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/transcriptions/${id}`);
      setTranscriptions(transcriptions.filter(t => t.id !== id));
    } catch (err) {
      alert('Failed to delete transcription');
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="library-page">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="library-page">
      <div className="library-container">
        <header className="library-header">
          <div>
            <h1>My Library</h1>
            <p>{transcriptions.length} saved transcription{transcriptions.length !== 1 ? 's' : ''}</p>
          </div>
        </header>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {transcriptions.length === 0 ? (
          <div className="empty-state">
            <Music size={64} className="empty-icon" />
            <h2>No transcriptions yet</h2>
            <p>Start by transcribing some piano music on the home page</p>
            <button onClick={() => navigate('/')} className="primary-button">
              Create Transcription
            </button>
          </div>
        ) : (
          <div className="transcriptions-grid">
            {transcriptions.map((transcription) => (
              <div key={transcription.id} className="transcription-card">
                <div className="card-header">
                  <Music className="card-icon" />
                  <h3>{transcription.title}</h3>
                </div>
                
                <div className="card-details">
                  <div className="detail-row">
                    <span className="label">Tempo:</span>
                    <span className="value">{transcription.transcription_data.tempo} BPM</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Key:</span>
                    <span className="value">{transcription.transcription_data.key}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Notes:</span>
                    <span className="value">{transcription.transcription_data.notes?.length || 0}</span>
                  </div>
                  <div className="detail-row">
                    <Clock size={14} />
                    <span className="date">{formatDate(transcription.created_at)}</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    onClick={() => navigate(`/sheet/${transcription.id}`)}
                    className="view-button"
                  >
                    <Eye size={18} />
                    View
                  </button>
                  <button 
                    onClick={() => handleDelete(transcription.id)}
                    className="delete-button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Library;