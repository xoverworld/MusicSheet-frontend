import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Download, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth, API_URL } from '../contexts/AuthContext';
import SheetMusicCanvas from '../Components/SheetMusicCanvas';
import './SheetView.css';

function SheetView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const audioRef = useRef(null);
  
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchTranscription();
  }, [id, isAuthenticated, navigate]);

  const fetchTranscription = async () => {
    try {
      const response = await axios.get(`${API_URL}/transcriptions/${id}`);
      setTranscription(response.data);
    } catch (err) {
      setError('Failed to load transcription');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this transcription?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/transcriptions/${id}`);
      navigate('/library');
    } catch (err) {
      alert('Failed to delete transcription');
      console.error(err);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="sheet-view-page">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading transcription...</p>
        </div>
      </div>
    );
  }

  if (error || !transcription) {
    return (
      <div className="sheet-view-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error || 'Transcription not found'}</p>
          <button onClick={() => navigate('/library')} className="back-button">
            <ArrowLeft size={20} />
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const audioUrl = `${API_URL}${transcription.audio_url}`;

  return (
    <div className="sheet-view-page">
      <div className="sheet-view-container">
        {/* Header */}
        <header className="sheet-header">
          <button onClick={() => navigate('/library')} className="back-button">
            <ArrowLeft size={20} />
            Back to Library
          </button>
          
          <div className="sheet-title-section">
            <h1>{transcription.title}</h1>
            <div className="sheet-meta">
              <span>{transcription.transcription_data.tempo} BPM</span>
              <span>•</span>
              <span>{transcription.transcription_data.key}</span>
              <span>•</span>
              <span>{transcription.transcription_data.timeSignature}</span>
            </div>
          </div>

          <button onClick={handleDelete} className="delete-button-header">
            <Trash2 size={20} />
            Delete
          </button>
        </header>

        {/* Audio Player */}
        <div className="audio-player-section">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
          
          <div className="player-container">
            <button onClick={togglePlayback} className="play-button-large">
              {isPlaying ? <Pause size={28} /> : <Play size={28} />}
            </button>
            
            <div className="player-info">
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
              
              <div className="progress-bar" onClick={handleSeek}>
                <div 
                  className="progress-fill" 
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sheet Music */}
        <div className="sheet-music-display">
          <SheetMusicCanvas transcription={transcription.transcription_data} />
        </div>

        {/* Note List */}
        <div className="notes-section">
          <h3>Detected Notes ({transcription.transcription_data.notes?.length || 0})</h3>
          <div className="notes-grid">
            {transcription.transcription_data.notes?.slice(0, 20).map((note, idx) => (
              <div key={idx} className="note-badge">
                <span className="note-name">{note.note}</span>
                <span className="note-duration">{note.musicalDuration}</span>
              </div>
            ))}
            {transcription.transcription_data.notes?.length > 20 && (
              <div className="note-badge more">
                +{transcription.transcription_data.notes.length - 20} more
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SheetView;