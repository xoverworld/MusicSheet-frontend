import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Upload, Mic, Square, Play, Pause, Loader, Save } from 'lucide-react';
import axios from 'axios';
import { useAuth, API_URL } from '../contexts/AuthContext';
import SheetMusicCanvas from '../Components/SheetMusicCanvas';
import './Home.css';

function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioElementRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
        setAudioURL(URL.createObjectURL(file));
        setTranscription(null);
        setError(null);
      } else {
        setError('Please upload a valid audio file');
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 44100
        } 
      });
      
      const options = { mimeType: 'audio/webm' };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioFile(audioBlob);
        setAudioURL(URL.createObjectURL(audioBlob));
        setTranscription(null);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Could not access microphone. Please grant permission.');
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
      } else {
        audioElementRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const transcribeAudio = async () => {
    if (!audioFile) {
      setError('Please upload or record audio first');
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setProgress('Uploading audio...');

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('title', 'Temporary Transcription');

      setProgress('Analyzing audio...');
      
      const response = await axios.post(`${API_URL}/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setProgress('Generating sheet music...');
      
      if (response.data.success) {
        setTranscription(response.data);
        setProgress('');
      } else {
        throw new Error('Transcription failed');
      }

    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please login to transcribe audio');
      } else {
        setError(`Transcription failed: ${err.response?.data?.detail || err.message}`);
      }
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
      setProgress('');
    }
  };

  const handleSave = () => {
    if (!isAuthenticated) {
      setError('Please login to save transcriptions');
      navigate('/login');
      return;
    }
    setShowSaveDialog(true);
  };

  const saveTranscription = async () => {
    if (!saveTitle.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('title', saveTitle);

      const response = await axios.post(`${API_URL}/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setShowSaveDialog(false);
        setSaveTitle('');
        alert('Transcription saved successfully!');
        navigate('/library');
      }
    } catch (err) {
      setError(`Failed to save: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="home-page">
      <div className="home-container">
        <header className="home-header">
          <Music className="header-icon" />
          <h1>Piano Audio to Sheet Music</h1>
          <p className="subtitle">Upload or record piano music to generate sheet music</p>
        </header>

        <div className="transcriber-content">
          {/* Upload Section */}
          <div className="upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="file-input"
            />
            <button 
              className="upload-button"
              onClick={() => fileInputRef.current.click()}
            >
              <Upload className="button-icon" />
              <div>
                <div className="button-title">Upload Audio File</div>
                <div className="button-subtitle">MP3, WAV, M4A, OGG, and more</div>
              </div>
            </button>
          </div>

          {/* Recording Section */}
          <div className="recording-section">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`record-button ${isRecording ? 'recording' : ''}`}
            >
              {isRecording ? (
                <>
                  <Square className="button-icon" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="button-icon" />
                  Record Piano
                </>
              )}
            </button>
            {isRecording && <div className="recording-indicator">● Recording...</div>}
          </div>

          {/* Audio Player */}
          {audioURL && (
            <div className="audio-player">
              <audio
                ref={audioElementRef}
                src={audioURL}
                onEnded={() => setIsPlaying(false)}
              />
              <div className="player-controls">
                <button onClick={togglePlayback} className="play-button">
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <div className="waveform">
                  <div className="waveform-bar" style={{ width: isPlaying ? '60%' : '0%' }}></div>
                </div>
                <button
                  onClick={transcribeAudio}
                  disabled={isTranscribing}
                  className="transcribe-button"
                >
                  {isTranscribing ? (
                    <>
                      <Loader className="button-icon spinning" />
                      Transcribing...
                    </>
                  ) : (
                    'Generate Sheet Music'
                  )}
                </button>
              </div>
              {progress && <div className="progress-text">{progress}</div>}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Sheet Music Display */}
          {transcription && (
            <div className="sheet-music-section">
              <div className="sheet-music-header">
                <h2>Generated Sheet Music</h2>
                <div className="music-info">
                  <span>Tempo: {transcription.transcription.tempo} BPM</span>
                  <span>Key: {transcription.transcription.key}</span>
                  <span>Time: {transcription.transcription.timeSignature}</span>
                </div>
                {isAuthenticated && (
                  <button onClick={handleSave} className="save-button">
                    <Save size={20} />
                    Save Transcription
                  </button>
                )}
              </div>
              <SheetMusicCanvas transcription={transcription.transcription} />
            </div>
          )}

          {/* Instructions */}
          {!audioURL && !transcription && (
            <div className="instructions">
              <h3>How to use:</h3>
              <ol>
                <li>Upload a piano audio file or record yourself playing</li>
                <li>Preview the audio using the play button</li>
                <li>Click "Generate Sheet Music" to transcribe</li>
                <li>{isAuthenticated ? 'Save your transcription to your library' : 'Login to save transcriptions'}</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="modal-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Save Transcription</h3>
            <input
              type="text"
              placeholder="Enter a title..."
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              className="title-input"
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={() => setShowSaveDialog(false)} className="cancel-button">
                Cancel
              </button>
              <button onClick={saveTranscription} className="confirm-button" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;