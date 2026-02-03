import { useCallback } from 'react';

const createOscillator = (type: OscillatorType, frequency: number, duration: number, context: AudioContext) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);

    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + duration);
};

export const useGameSounds = () => {
    // Only create context on user interaction to handle browser autoplay policies
    const playSound = useCallback((type: 'pop' | 'click' | 'win' | 'lose' | 'draw') => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContextClass();

            switch (type) {
                case 'pop':
                    createOscillator('sine', 600, 0.1, context);
                    break;
                case 'click':
                    createOscillator('square', 400, 0.05, context);
                    break;
                case 'win': {
                    // Fanfare-ish sequence
                    const now = context.currentTime;
                    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                        const osc = context.createOscillator();
                        const gain = context.createGain();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(freq, now + i * 0.1);
                        gain.gain.setValueAtTime(0.1, now + i * 0.1);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
                        osc.connect(gain);
                        gain.connect(context.destination);
                        osc.start(now + i * 0.1);
                        osc.stop(now + i * 0.1 + 0.3);
                    });
                    break;
                }
                case 'lose':
                    createOscillator('sawtooth', 150, 0.4, context);
                    break;
                case 'draw':
                    createOscillator('triangle', 300, 0.2, context);
                    createOscillator('triangle', 200, 0.2, context);
                    break;
            }
        } catch (error) {
            console.error("Audio playback failed", error);
        }
    }, []);

    return playSound;
};
