export const noteNameToFrequency = (noteName: string): number => {
    const noteFrequencies: { [key: string]: number } = {
        'C4': 261,
        'C#4': 277,
        'D4': 293,
        'D#4': 311,
        'E4': 329,
        'F4': 349,
        'C5': 523,
        'C#5': 554,
        'D5': 587,
        'D#5': 622,
        'E5': 659,
        'F5': 698,
    }
    return noteFrequencies[noteName] || 440; // Default to A4 if not found
}

export function melodyPreviewer(props: any) {
    return {
        label: 'Melody Previewer',
        onHandle: () => {
            console.log(props);
            console.log('Previewing melody...');

            const tempo = props.published.tempo || 120;
            const actx = new AudioContext();

            props.published.notes.forEach((note: any, i: number) => {
                const frequency = noteNameToFrequency(note.note);
                const duration = (note.gate / 100) * (60 / tempo);
                const startTime = i * duration;
                const endTime = startTime + duration;
                const osc = actx.createOscillator();
                osc.type = 'sine';
                osc.connect(actx.destination);
                osc.frequency.setValueAtTime(frequency, startTime);
                osc.start(startTime);
                osc.stop(endTime);
            });
        }
    }
}

