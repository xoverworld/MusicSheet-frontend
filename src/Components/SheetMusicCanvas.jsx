import React, { useRef, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import './SheetMusicCanvas.css';

const SheetMusicCanvas = ({ transcription }) => {
  const canvasRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    if (transcription && canvasRef.current) {
      drawSheetMusic();
      setCanvasReady(true);
    }
  }, [transcription]);

  const drawSheetMusic = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(transcription.title || 'Piano Transcription', width / 2, 35);

    // Draw tempo and key
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`♩ = ${transcription.tempo}`, 30, 70);
    ctx.fillText(`${transcription.key}`, 30, 90);
    ctx.textAlign = 'right';
    ctx.fillText(transcription.timeSignature, width - 30, 70);

    // Staff parameters
    const staffTop = 130;
    const lineSpacing = 12;
    const staffLines = 5;
    const staffWidth = width - 80;
    const staffLeft = 40;

    // Draw multiple staves if needed
    const measuresPerStaff = 4;
    const staffSpacing = 140;
    const numStaves = Math.ceil(transcription.measures.length / measuresPerStaff);

    for (let staffIdx = 0; staffIdx < numStaves; staffIdx++) {
      const currentStaffTop = staffTop + staffIdx * staffSpacing;
      
      // Draw staff lines
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;

      for (let i = 0; i < staffLines; i++) {
        const y = currentStaffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(staffLeft, y);
        ctx.lineTo(staffLeft + staffWidth, y);
        ctx.stroke();
      }

      // Draw treble clef
      ctx.font = 'bold 70px serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText('𝄞', staffLeft + 5, currentStaffTop + 52);

      // Draw time signature (only on first staff)
      if (staffIdx === 0) {
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        const timeSigParts = transcription.timeSignature.split('/');
        ctx.fillText(timeSigParts[0], staffLeft + 85, currentStaffTop + 20);
        ctx.fillText(timeSigParts[1], staffLeft + 85, currentStaffTop + 40);
      }

      // Draw measures for this staff
      const startMeasure = staffIdx * measuresPerStaff;
      const endMeasure = Math.min(startMeasure + measuresPerStaff, transcription.measures.length);
      const measureWidth = (staffWidth - 120) / measuresPerStaff;

      for (let m = startMeasure; m < endMeasure; m++) {
        const measure = transcription.measures[m];
        const measureX = staffLeft + 110 + (m - startMeasure) * measureWidth;

        // Draw notes in measure
        if (measure.notes && measure.notes.length > 0) {
          const noteSpacing = (measureWidth - 20) / Math.max(measure.notes.length, 4);

          measure.notes.forEach((note, noteIdx) => {
            const x = measureX + 10 + noteIdx * noteSpacing;
            drawNote(ctx, x, currentStaffTop, note, lineSpacing);
          });
        }

        // Draw bar line
        const barX = measureX + measureWidth;
        ctx.beginPath();
        ctx.moveTo(barX, currentStaffTop);
        ctx.lineTo(barX, currentStaffTop + (staffLines - 1) * lineSpacing);
        ctx.stroke();
      }

      // Draw final double bar line on last staff
      if (staffIdx === numStaves - 1) {
        const finalX = staffLeft + staffWidth;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(finalX - 4, currentStaffTop);
        ctx.lineTo(finalX - 4, currentStaffTop + (staffLines - 1) * lineSpacing);
        ctx.stroke();
        
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(finalX, currentStaffTop);
        ctx.lineTo(finalX, currentStaffTop + (staffLines - 1) * lineSpacing);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  };

  const drawNote = (ctx, x, staffTop, note, lineSpacing) => {
    const staffPosition = getStaffPosition(note.note);
    const y = staffTop + staffPosition * (lineSpacing / 2);

    // Draw ledger lines if needed
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    
    if (staffPosition < 0) {
      for (let i = 0; i >= staffPosition; i -= 2) {
        const ledgerY = staffTop + i * (lineSpacing / 2);
        ctx.beginPath();
        ctx.moveTo(x - 8, ledgerY);
        ctx.lineTo(x + 8, ledgerY);
        ctx.stroke();
      }
    } else if (staffPosition > 8) {
      for (let i = 8; i <= staffPosition; i += 2) {
        const ledgerY = staffTop + i * (lineSpacing / 2);
        ctx.beginPath();
        ctx.moveTo(x - 8, ledgerY);
        ctx.lineTo(x + 8, ledgerY);
        ctx.stroke();
      }
    }

    // Draw note head
    ctx.fillStyle = '#000000';
    
    if (note.musicalDuration === 'whole') {
      // Whole note (hollow)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 4, -0.3, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (note.musicalDuration === 'half') {
      // Half note (hollow with stem)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 4, -0.3, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Stem
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 5, y);
      ctx.lineTo(x + 5, y - 32);
      ctx.stroke();
    } else {
      // Quarter, eighth, sixteenth notes (filled)
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 4, -0.3, 0, 2 * Math.PI);
      ctx.fill();

      // Stem
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 5, y);
      ctx.lineTo(x + 5, y - 32);
      ctx.stroke();

      // Flags for eighth and sixteenth notes
      if (note.musicalDuration === 'eighth') {
        drawFlag(ctx, x + 5, y - 32);
      } else if (note.musicalDuration === 'sixteenth') {
        drawFlag(ctx, x + 5, y - 32);
        drawFlag(ctx, x + 5, y - 27);
      }
    }
  };

  const drawFlag = (ctx, x, y) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 8, y + 3, x + 8, y + 8, x, y + 12);
    ctx.fill();
  };

  const getStaffPosition = (noteName) => {
    // Map note names to staff positions
    // Position 0 = top line (F5), position 8 = bottom line (E4)
    const noteMap = {
      'C8': -14, 'B7': -13, 'A7': -12, 'G7': -11, 'F7': -10, 'E7': -9, 'D7': -8,
      'C7': -7, 'B6': -6, 'A6': -5, 'G6': -4, 'F6': -3, 'E6': -2, 'D6': -1,
      'C6': 0, 'B5': 1, 'A5': 2, 'G5': 3, 'F5': 4, 'E5': 5, 'D5': 6,
      'C5': 7, 'B4': 8, 'A4': 9, 'G4': 10, 'F4': 11, 'E4': 12, 'D4': 13,
      'C4': 14, 'B3': 15, 'A3': 16, 'G3': 17, 'F3': 18, 'E3': 19, 'D3': 20,
      'C3': 21, 'B2': 22, 'A2': 23
    };

    // Handle sharp/flat notes by using the base note
    const baseNote = noteName.replace('#', '').replace('b', '');
    return noteMap[baseNote] !== undefined ? noteMap[baseNote] : 7; // Default to middle C
  };

  const downloadSheetMusic = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'piano-sheet-music.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="sheet-music-canvas-container">
      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        className="sheet-music-canvas"
      />
      {canvasReady && (
        <button onClick={downloadSheetMusic} className="download-button">
          <Download size={20} />
          Download Sheet Music
        </button>
      )}
    </div>
  );
};

export default SheetMusicCanvas;