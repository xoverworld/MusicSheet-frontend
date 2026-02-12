import React, { useState, useRef } from 'react';
import { Music, Upload, Mic, Square, Play, Pause, Download, Loader } from 'lucide-react';
import SheetMusicCanvas from './components/SheetMusicCanvas';
import './App.css';

const API_URL = 'http://localhost:3001';

function App() {
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  
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
        setError('Please upload a valid audio file (MP3, WAV, M4A, OGG, etc.)');
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
      
      // Use WAV format if available
      const options = { mimeType: 'audio/wav' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current.mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Convert to WAV if needed
        if (mimeType.includes('webm')) {
          try {
            const wavBlob = await convertToWav(audioBlob);
            setAudioFile(wavBlob);
            setAudioURL(URL.createObjectURL(wavBlob));
          } catch (err) {
            console.error('Conversion error:', err);
            setAudioFile(audioBlob);
            setAudioURL(URL.createObjectURL(audioBlob));
          }
        } else {
          setAudioFile(audioBlob);
          setAudioURL(URL.createObjectURL(audioBlob));
        }
        
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

  const convertToWav = async (blob) => {
    // Simple conversion using Web Audio API
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create WAV file
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const audioBufferToWav = (audioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    
    const data = audioBuffer.getChannelData(0);
    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    
    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    const offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset + i * 2, sample * 0x7FFF, true);
    }
    
    return buffer;
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
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

      setProgress('Analyzing audio...');
      
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const result = await response.json();
      
      setProgress('Generating sheet music...');
      
      if (result.success) {
        setTranscription(result.transcription);
        setProgress('');
      } else {
        throw new Error('Transcription failed');
      }

    } catch (err) {
      setError(`Transcription failed: ${err.message}`);
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
      setProgress('');
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <Music className="header-icon" />
            <h1>Piano Audio to Sheet Music</h1>
          </div>
          <p className="subtitle">Upload or record piano music to generate sheet music automatically</p>
        </header>

        <div className="content">
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
                  <span>Tempo: {transcription.tempo} BPM</span>
                  <span>Key: {transcription.key}</span>
                  <span>Time: {transcription.timeSignature}</span>
                </div>
              </div>
              <SheetMusicCanvas transcription={transcription} />
              <div className="note-list">
                <h3>Detected Notes ({transcription.notes.length})</h3>
                <div className="notes-grid">
                  {transcription.notes.slice(0, 20).map((note, idx) => (
                    <div key={idx} className="note-item">
                      <span className="note-name">{note.note}</span>
                      <span className="note-duration">{note.musicalDuration}</span>
                      <span className="note-time">{note.time.toFixed(2)}s</span>
                    </div>
                  ))}
                  {transcription.notes.length > 20 && (
                    <div className="note-item">... and {transcription.notes.length - 20} more</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!audioURL && !transcription && (
            <div className="instructions">
              <h3>How to use:</h3>
              <ol>
                <li>Upload a piano audio file (MP3, WAV, M4A, OGG, FLAC, etc.) or record yourself playing</li>
                <li>Preview the audio using the play button</li>
                <li>Click "Generate Sheet Music" to transcribe the audio</li>
                <li>View and download the generated sheet music</li>
              </ol>
              <div className="tech-note">
                <strong>Technical Note:</strong> This app uses custom-built signal processing algorithms 
                including FFT, autocorrelation-based pitch detection, spectral analysis, and onset detection 
                to transcribe piano audio into musical notation. All audio formats are automatically converted 
                to WAV for processing.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;