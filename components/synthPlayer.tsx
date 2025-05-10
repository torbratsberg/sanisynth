import { useEffect, useMemo, useState } from 'react'
import { useFormValue, useClient } from 'sanity';
import { noteNameToFrequency } from '../actions/melodyPreviewer';

export function SynthPlayer(props: any) {
    const melodies = useFormValue(['melodies']);
    const waveform = useFormValue(['waveform']);
    const tempo = useFormValue(['tempo']);
    // const baseFrequency = useFormValue(['baseFrequency']);
    const client = useClient({ apiVersion: "2025-02-10" });
    const [notes, setNotes] = useState<{ note: string, velocity: number, gate: number, active?: boolean }[]>([]);
    const [running, setRunning] = useState<boolean>(false);

    useMemo(async () => {
        const data = await client.fetch(`*[_type == "melody" && _id in $melodyIds] {
            _id,
            name,
            notes[] {
                note,
                velocity,
                gate,
            }
        }`, { melodyIds: (melodies as any).map((melody: any) => melody._ref) });

        const notes = data.map((melody_1: any) => {
            return melody_1.notes;
        }).flat();

        console.log('Notes:', notes);
        setNotes(notes);
    }, [melodies]);

    useEffect(() => {
        console.log(props);
    }, [running]);

    const handlePlayMidi = async () => {
        // Get MIDI access
        const midiAccess = await navigator.requestMIDIAccess();
        if (!midiAccess) {
            console.error('No MIDI access');
            return;
        }
    }

    const handlePlay = () => {
        new Promise((resolve) => {
            handlePlay1();
            resolve(null);
        });
    }
    const handlePlay1 = async () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        let rounds = 1;
        while (rounds--) {
            let i = 0;
            for (const note of notes) {

                console.log('Playing note:', note.note);
                note.active = true;
                const oscillator = audioContext.createOscillator();
                const frequency = noteNameToFrequency(note.note);

                console.log(audioContext.currentTime + i * 1.0, audioContext.currentTime + i * 1.0 + 1);
                oscillator.connect(audioContext.destination);
                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + i * 1.0);
                oscillator.type = (waveform as any) || 'sine';
                oscillator.start(audioContext.currentTime + i * 1.0);
                oscillator.stop(audioContext.currentTime + i * 1.0 + note.gate / 100);

                await new Promise((resolve) => {
                    setTimeout(() => {
                    //     oscillator.stop();
                        resolve(null);
                    }, 1000);
                });

                oscillator.disconnect();
                note.active = false;
                i++;
            }
        }
    }

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
                }

                .sequence-grid .note.active {
                    position: relative;
                }

                .sequence-grid .note.active::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    bottom: 0;
                    width: 100%;
                    height: 3px;
                    border-radius: 10px;
                    background-color: rgba(255, 200, 25, 1);
                    border-radius: 4px;
                }
            `}
            </style>

            <div className="sequence-grid">
                { notes && notes.map((note, index: number) => (
                    <div key={index.toString() + note} className={'note ' + (note.active ? 'active' : '')}>{note.note}</div>
                )) }
            </div>

            <button type="button" onClick={handlePlayMidi}>Start MIDI</button>
            <button type="button" onClick={handlePlay}>Start Synth</button>

            <br/>

            <button type="button" onClick={() => setRunning(false)}>Stop</button>
        </div>
    )
}
