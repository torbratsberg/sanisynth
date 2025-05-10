import { useEffect, useMemo, useState } from 'react'
import { useFormValue, useClient } from 'sanity';
import { noteNameToFrequency } from '../actions/melodyPreviewer';

let playing = false;

export function SynthPlayer() {
    const client = useClient({ apiVersion: "2025-02-10" });

    const patterns = useFormValue(['patterns']) as any[];
    const filterFrequency = useFormValue(['filterFrequency']) as number;
    const waveform = useFormValue(['waveform']) as string;
    const glide = useFormValue(['glide']) as number;
    const tempo = useFormValue(['tempo']) as number;
    const waveshaper = useFormValue(['waveshaper']) as boolean;
    const waveshaperCurve = useFormValue(['waveshaperCurve']) as number[];
    const delay = useFormValue(['delay']) as number;

    const [gate, setGate] = useState<boolean>(false);
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
        if (playing) return;
        playing = true;

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
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();

            while (playing) {
                for (let i = 0; i < notes.length; i++) {
                    const note = notes[i];
                    if (!playing) return;

                    setCurrentNoteIndex(i);

                    const frequency = noteNameToFrequency(note.note);
                    const noteDuration = (note.gate / 100) * beatDuration;
                    const oscillator = audioContext.createOscillator();

                    if (filterFrequency) {
                        filter.type = 'lowpass';
                        filter.frequency.value = filterFrequency || 0;
                        filter.connect(audioContext.destination);
                        oscillator.connect(filter);
                    } else {
                        gainNode.connect(audioContext.destination);
                    }

                    oscillator.connect(gainNode);
                    oscillator.type = (waveform as OscillatorType) || 'sine';

                    if (glide > 0) {
                        const glideDuration = noteDuration * (glide / 15000);
                        oscillator.frequency.linearRampToValueAtTime(frequency, audioContext.currentTime + glideDuration);
                        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + glideDuration);
                    } else {
                        oscillator.frequency.value = frequency;
                    }

                    const velocity = note.velocity / 100;
                    gainNode.gain.value = velocity;

                    if (waveshaper) {
                        const ws = audioContext.createWaveShaper();
                        ws.curve = new Float32Array(waveshaperCurve);
                        ws.connect(gainNode);
                        gainNode.connect(ws);
                        gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
                        gainNode.gain.linearRampToValueAtTime(velocity, audioContext.currentTime + 0.01);
                    }

                    if (delay) {
                        const delayNode = audioContext.createDelay(0.5);
                        delayNode.delayTime.value = noteDuration * (delay / 100);
                        filter.connect(delayNode);
                        // gainNode.connect(delayNode);
                        delayNode.connect(audioContext.destination);
                    }

                    setGate(true);
                    oscillator.start();
                    
                    setTimeout(() => {
                        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.02);
                        setGate(false);

                        setTimeout(() => {
                            oscillator.stop();
                            oscillator.disconnect();
                            gainNode.disconnect();
                        }, 20); // Increase for delay?
                    }, noteDuration);
                    
                    await new Promise<void>(resolve => setTimeout(resolve, beatDuration));
                }

                setCurrentNoteIndex(-1);
            }
        };

        playSequence();
    };

    const handleStop = async () => {
        playing = false;
        setCurrentNoteIndex(-1);
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
                    color: #dddddd;
                    border-radius: 4px;
                }

                .sequence-grid .note.active {
                    background-color: rgba(255, 200, 25, 0.2);
                }

                .sequence-grid .note.active::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    bottom: 0;
                    width: 100%;
                    height: 2px;
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
                    background-color: rgb(42, 45, 63);
                    color: #dddddd;
                    border: none;
                    cursor: pointer;
                }
                
                .control-buttons button:hover {
                    background-color: rgb(62, 65, 83);
                }
                
                .control-buttons button:active {
                    background-color: rgb(42, 45, 63);
                }
                
                .synth-info {
                    margin-top: 12px;
                    font-size: 0.875rem;
                    color: #718096;
                }

                .led-panel {
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    gap: 8px;
                    width: fit-content;
                    margin-bottom: 12px;
                    margin-top: 12px;
                }

                .led-panel .led {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    background-color: #2d3748;
                    border-radius: 50%;
                    position: relative;
                    color: #718096;
                }

                .led-panel .led .label {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 0.75rem;
                }

                .led-panel .led.active {
                    background-color: rgba(255, 200, 25, 0.2);
                    color: #dddddd;
                }

            `}
            </style>

            <div className="led-panel">
                <div className={`led ${playing ? 'active' : ''}`}>
                    <span className="label">ON</span>
                </div>
                <div className={`led ${gate ? 'active' : ''}`}>
                    <span className="label">GATE</span>
                </div>
            </div>

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
                <button type="button" onClick={handlePlay}>Play</button>
                <button type="button" onClick={handleStop}>Stop</button>
                <button type="button" onClick={handlePlayMidi}>MIDI</button>
            </div>
            
            <div className="synth-info">
                {tempo ? `Tempo: ${tempo} BPM` : 'No tempo set'}
                {` | Filter Freq: ${filterFrequency || 0} Hz`}
                {waveform ? ` | Waveform: ${waveform}` : ''}
                {glide > 0 && (' | Glide: ')}
                {glide > 0 && [0, glide].map((v, i) => <span style={{ display: 'inline-block', width: '4px', height: 1 + (v / 7) + 'px', backgroundColor: '#718096', marginLeft: '2px' }} key={v.toString() + i.toString()}></span>)}
                {glide > 0 && (' (' + glide + '%)')}
                {delay > 0 && (' | Delay: ' + delay + '%')}
                {waveshaper ? ' | Waveshaper: ' : '' }
                {waveshaper && waveshaperCurve.map((v, i) => <span style={{ display: 'inline-block', width: '4px', height: 5 + (v * 5) + 'px', backgroundColor: '#718096', marginLeft: '2px' }} key={v.toString() + i.toString()}></span>)}
            </div>
        </div>
    )
}
