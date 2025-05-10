import { useEffect, useMemo, useState } from 'react'
import { useFormValue, useClient } from 'sanity';
import { noteNameToFrequency } from '../actions/melodyPreviewer';

export function SynthPlayer() {
    const client = useClient({ apiVersion: "2025-02-10" });

    const patterns = useFormValue(['patterns']) as any[];
    const waveform = useFormValue(['waveform']) as string;
    const tempo = useFormValue(['tempo']) as number;
    const waveshaper = useFormValue(['waveshaper']) as boolean;
    const waveshaperCurve = useFormValue(['waveshaperCurve']) as number[];
    const delay = useFormValue(['delay']) as number;

    const [playing, setPlaying] = useState<boolean>(false);
    const [notes, setNotes] = useState<{ note: string, velocity: number, gate: number, active?: boolean }[]>([]);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [currentNoteIndex, setCurrentNoteIndex] = useState<number>(-1);

    useMemo(async () => {
        const data = await client.fetch(`*[_type == "pattern" && _id in $patternIds] {
            _id,
            name,
            notes[] {
                note,
                velocity,
                gate,
            }
        }`, { patternIds: patterns.map(pattern => pattern._ref) });

        const notes = patterns.map(pattern => {
            const patternData = data.find((patternData: any) => patternData._id === pattern._ref);

            if (patternData) {
                return patternData.notes.map((note: any) => ({
                    note: note.note,
                    velocity: note.velocity,
                    gate: note.gate,
                }));
            }
            return [];
        }).flat();

        setNotes(notes);
    }, [patterns, client]);

    useEffect(() => {
        if (!audioContext) {
            const newAudioContext = new window.AudioContext();
            setAudioContext(newAudioContext);
        }
    }, []);

    const handlePlayMidi = async () => {
        try {
            const midiAccess = await navigator.requestMIDIAccess();
            if (!midiAccess) {
                console.error('No MIDI access');
                return;
            }
            console.log('MIDI access:', midiAccess);
        } catch (error) {
            console.error('MIDI access error:', error);
        }
    }

    const handlePlay = async () => {
        setPlaying(true);

        if (!audioContext) {
            setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
            return;
        }

        await new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, 1);
        });

        const beatDuration = 60000 / (tempo as number || 120);
        
        const playSequence = async () => {
            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];

                setCurrentNoteIndex(i);

                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                const frequency = noteNameToFrequency(note.note);
                oscillator.frequency.value = frequency;
                oscillator.type = (waveform as OscillatorType) || 'sine';

                const velocity = note.velocity / 100;
                gainNode.gain.value = velocity;

                const noteDuration = (note.gate / 100) * beatDuration;

                if (waveshaper) {
                    const ws = audioContext.createWaveShaper();
                    ws.curve = new Float32Array(waveshaperCurve);
                    ws.connect(gainNode);
                    gainNode.connect(ws);
                    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(velocity, audioContext.currentTime + 0.01);
                }

                if (delay) {
                    const delayNode = audioContext.createDelay();
                    delayNode.delayTime.value = noteDuration * (delay / 100);
                    gainNode.connect(delayNode);
                    delayNode.connect(audioContext.destination);
                }

                oscillator.start();
                
                setTimeout(() => {
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.02);

                    setTimeout(() => {
                        oscillator.stop();
                        oscillator.disconnect();
                        gainNode.disconnect();
                    }, 500); // Was 20
                }, noteDuration);
                
                await new Promise<void>(resolve => setTimeout(resolve, beatDuration));
            }

            setCurrentNoteIndex(-1);
        };

        playSequence();
    };

    const handleStop = () => {
        setPlaying(false);
    };

    return (
        <div className="synth-player">
            <style>
            {`
                .sequence-grid {
                    margin: 16px 0;
                    display: grid;
                    grid-template-columns: repeat(8, 1fr);
                    width: fit-content;
                    gap: 8px;
                }

                .sequence-grid .note {
                    padding: 8px 4px;
                    width: 30px;
                    font-size: 0.875rem;
                    text-align: center;
                    position: relative;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                }

                .sequence-grid .note.active {
                    background-color: rgba(255, 200, 25, 0.2);
                    border-color: rgba(255, 200, 25, 1);
                }

                .sequence-grid .note.active::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    bottom: 0;
                    width: 100%;
                    height: 3px;
                    background-color: rgba(255, 200, 25, 1);
                    border-radius: 0 0 4px 4px;
                }
                
                .control-buttons {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                
                .control-buttons button {
                    padding: 6px 12px;
                    border-radius: 4px;
                    background-color: #e2e8f0;
                    color: black;
                    border: none;
                    cursor: pointer;
                }
                
                .control-buttons button:hover {
                    background-color: #cbd5e0;
                }
                
                .control-buttons button:active {
                    background-color: #a0aec0;
                }
                
                .synth-info {
                    margin-top: 12px;
                    font-size: 0.875rem;
                    color: #718096;
                }
            `}
            </style>

            <div className="sequence-grid">
                {notes && notes.map((note, index: number) => (
                    <div 
                        key={index.toString() + note.note} 
                        className={`note ${index === currentNoteIndex ? 'active' : ''}`}
                    >
                        {note.note}
                    </div>
                ))}
            </div>

            <div className="control-buttons">
                <button type="button" onClick={handlePlayMidi}>MIDI</button>
                <button type="button" onClick={handlePlay}>Play</button>
                <button type="button" onClick={handleStop}>Stop</button>
            </div>
            
            <div className="synth-info">
                {tempo ? `Tempo: ${tempo} BPM` : 'No tempo set'}
                {waveform ? ` · Waveform: ${waveform}` : ''}
            </div>
        </div>
    )
}
