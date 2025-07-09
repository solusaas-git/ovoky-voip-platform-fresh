import { NotificationSoundType } from '@/types/notifications';

// Interface for webkit browser compatibility
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export class NotificationSoundService {
  private static instance: NotificationSoundService;
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<NotificationSoundType, AudioBuffer> = new Map();
  private volume: number = 0.7;
  private enabled: boolean = true;
  private isClient: boolean = false;

  // Sound URLs - these will be generated programmatically or use presets
  private soundUrls: Record<NotificationSoundType, string> = {
    default: '/sounds/notification-default.mp3',
    subtle: '/sounds/notification-subtle.mp3',
    success: '/sounds/notification-success.mp3',
    warning: '/sounds/notification-warning.mp3',
    error: '/sounds/notification-error.mp3',
    urgent: '/sounds/notification-urgent.mp3',
    ticket: '/sounds/notification-ticket.mp3',
    payment: '/sounds/notification-payment.mp3',
    chime: '/sounds/notification-chime.mp3',
    bell: '/sounds/notification-bell.mp3',
    piano: '/sounds/notification-piano.mp3',
    none: ''
  };

  // Better, more pleasant sound frequencies and patterns
  private static readonly SOUND_FREQUENCIES: Record<NotificationSoundType, number[]> = {
    default: [523.25, 659.25], // C5, E5 - gentle major third
    subtle: [261.63, 293.66], // C4, D4 - very soft whole tone
    success: [523.25, 659.25, 783.99], // C5, E5, G5 - major chord (pleasant)
    warning: [493.88, 587.33], // B4, D5 - gentle alert without harshness
    error: [349.23, 415.30], // F4, G#4 - lower, less aggressive
    urgent: [698.46, 830.61], // F5, G#5 - higher but musical
    ticket: [440.00, 554.37], // A4, C#5 - pleasant interval
    payment: [523.25, 698.46, 880.00], // C5, F5, A5 - major sixth chord
    chime: [523.25, 659.25, 783.99, 1046.50], // C5, E5, G5, C6 - ascending major chord
    bell: [880.00, 1108.73, 1318.51], // A5, C#6, E6 - bell-like harmonics
    piano: [261.63], // C4 - single clean piano-like note
    none: []
  };

  private constructor() {
    // Check if we're in a browser environment
    this.isClient = typeof window !== 'undefined';
    if (this.isClient) {
      this.initializeAudioContext();
    }
  }

  public static getInstance(): NotificationSoundService {
    if (!NotificationSoundService.instance) {
      NotificationSoundService.instance = new NotificationSoundService();
    }
    return NotificationSoundService.instance;
  }

  private async initializeAudioContext(): Promise<void> {
    if (!this.isClient) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as WebkitWindow).webkitAudioContext)();
      await this.preloadSounds();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.audioContext = null;
    }
  }

  private async preloadSounds(): Promise<void> {
    if (!this.audioContext || !this.isClient) return;

    const loadPromises = Object.entries(this.soundUrls).map(async ([type, url]) => {
      if (type === 'none' || !url) return;

      // Generate high-quality synthetic sounds
      console.log(`Generating high-quality sound for ${type}`);
      
      // Use specialized generation for certain types
      if (['chime', 'bell', 'piano'].includes(type)) {
        const buffer = this.generateSpecialSound(type as NotificationSoundType);
        this.soundBuffers.set(type as NotificationSoundType, buffer);
      } else {
        // Use regular synthetic sound generation
        const frequencies = NotificationSoundService.SOUND_FREQUENCIES[type as NotificationSoundType];
        if (frequencies && frequencies.length > 0) {
          const buffer = this.generateSyntheticSound(frequencies);
          this.soundBuffers.set(type as NotificationSoundType, buffer);
        }
      }
    });

    await Promise.allSettled(loadPromises);
  }

  private generateSyntheticSound(frequencies: number[]): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not available');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.25; // Shorter, 250ms duration
    const fadeTime = 0.05; // 50ms fade in/out
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    frequencies.forEach((freq, index) => {
      const startTime = index * (duration / frequencies.length);
      const endTime = (index + 1) * (duration / frequencies.length);
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);

      for (let i = startSample; i < endSample; i++) {
        const time = i / sampleRate;
        const relativeTime = (time - startTime) / (endTime - startTime);
        
        // Create a warmer sound with multiple harmonics
        const fundamental = Math.sin(2 * Math.PI * freq * time);
        const harmonic2 = Math.sin(2 * Math.PI * freq * 2 * time) * 0.3; // Second harmonic (octave)
        const harmonic3 = Math.sin(2 * Math.PI * freq * 3 * time) * 0.1; // Third harmonic
        
        // Combine harmonics for a warmer, less harsh sound
        let amplitude = (fundamental + harmonic2 + harmonic3) * 0.15; // Reduced volume
        
        // Apply smooth envelope (attack, sustain, release)
        if (relativeTime < fadeTime) {
          // Smooth attack
          amplitude *= Math.sin((relativeTime / fadeTime) * Math.PI / 2);
        } else if (relativeTime > 1 - fadeTime) {
          // Smooth release
          amplitude *= Math.sin(((1 - relativeTime) / fadeTime) * Math.PI / 2);
        } else {
          // Sustain with slight decay
          const sustainTime = relativeTime - fadeTime;
          const sustainLength = 1 - 2 * fadeTime;
          amplitude *= (1 - sustainTime / sustainLength * 0.2); // 20% decay during sustain
        }

        data[i] += amplitude;
      }
    });

    // Apply soft limiting to prevent clipping
    const maxValue = Math.max(...Array.from(data).map(Math.abs));
    if (maxValue > 0.8) {
      const scale = 0.8 / maxValue;
      for (let i = 0; i < data.length; i++) {
        data[i] *= scale;
      }
    }

    return buffer;
  }

  // Specialized sound generation for specific types
  private generateSpecialSound(soundType: NotificationSoundType): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not available');

    const sampleRate = this.audioContext.sampleRate;
    let duration = 0.4; // Longer for special sounds
    
    switch (soundType) {
      case 'chime':
        return this.generateChimeSound(sampleRate, duration);
      case 'bell':
        return this.generateBellSound(sampleRate, duration);
      case 'piano':
        return this.generatePianoSound(sampleRate, duration * 1.5); // Longer for piano
      default:
        return this.generateSyntheticSound(NotificationSoundService.SOUND_FREQUENCIES[soundType]);
    }
  }

  private generateChimeSound(sampleRate: number, duration: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C major arpeggio

    frequencies.forEach((freq, index) => {
      const noteStart = index * 0.1; // Stagger notes by 100ms
      const noteDuration = duration - noteStart;
      
      for (let i = 0; i < data.length; i++) {
        const time = i / sampleRate;
        if (time < noteStart || time > noteStart + noteDuration) continue;
        
        const relativeTime = (time - noteStart) / noteDuration;
        const envelope = Math.exp(-relativeTime * 4); // Exponential decay like a real chime
        
        // Clean sine wave with subtle harmonics
        const fundamental = Math.sin(2 * Math.PI * freq * time);
        const harmonic = Math.sin(2 * Math.PI * freq * 2 * time) * 0.2;
        
        data[i] += (fundamental + harmonic) * envelope * 0.1;
      }
    });

    return buffer;
  }

  private generateBellSound(sampleRate: number, duration: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    const baseFreq = 880; // A5

    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      const envelope = Math.exp(-time * 3); // Bell-like decay
      
      // Bell has inharmonic partials
      const partial1 = Math.sin(2 * Math.PI * baseFreq * time);
      const partial2 = Math.sin(2 * Math.PI * baseFreq * 1.19 * time) * 0.6;
      const partial3 = Math.sin(2 * Math.PI * baseFreq * 1.56 * time) * 0.4;
      const partial4 = Math.sin(2 * Math.PI * baseFreq * 2.0 * time) * 0.2;
      
      data[i] = (partial1 + partial2 + partial3 + partial4) * envelope * 0.08;
    }

    return buffer;
  }

  private generatePianoSound(sampleRate: number, duration: number): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    const freq = 261.63; // C4

    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      
      // Piano-like envelope: quick attack, slow decay
      let envelope;
      if (time < 0.01) {
        envelope = time / 0.01; // Quick attack
      } else {
        envelope = Math.exp(-(time - 0.01) * 2); // Slow decay
      }
      
      // Piano has rich harmonic content
      const fundamental = Math.sin(2 * Math.PI * freq * time);
      const harmonic2 = Math.sin(2 * Math.PI * freq * 2 * time) * 0.5;
      const harmonic3 = Math.sin(2 * Math.PI * freq * 3 * time) * 0.3;
      const harmonic4 = Math.sin(2 * Math.PI * freq * 4 * time) * 0.2;
      const harmonic5 = Math.sin(2 * Math.PI * freq * 5 * time) * 0.1;
      
      data[i] = (fundamental + harmonic2 + harmonic3 + harmonic4 + harmonic5) * envelope * 0.06;
    }

    return buffer;
  }

  public async playSound(
    soundType: NotificationSoundType, 
    customVolume?: number
  ): Promise<void> {
    if (!this.enabled || soundType === 'none' || !this.audioContext || !this.isClient) {
      return;
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
        return;
      }
    }

    const buffer = this.soundBuffers.get(soundType);
    if (!buffer) {
      console.warn(`Sound buffer not found for type: ${soundType}`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Set volume
      const volume = customVolume !== undefined ? customVolume : this.volume;
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      
      source.start(0);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public getVolume(): number {
    return this.volume;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async testSound(soundType: NotificationSoundType): Promise<void> {
    await this.playSound(soundType);
  }

  public getSupportedSounds(): NotificationSoundType[] {
    return Object.keys(this.soundUrls) as NotificationSoundType[];
  }

  public async addCustomSound(
    type: NotificationSoundType, 
    audioBuffer: ArrayBuffer
  ): Promise<void> {
    if (!this.audioContext || !this.isClient) {
      throw new Error('Audio context not available');
    }

    try {
      const buffer = await this.audioContext.decodeAudioData(audioBuffer);
      this.soundBuffers.set(type, buffer);
    } catch (error) {
      console.error('Failed to add custom sound:', error);
      throw error;
    }
  }

  // Helper method to request audio permission for iOS/Safari
  public async requestAudioPermission(): Promise<boolean> {
    if (!this.audioContext || !this.isClient) return false;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Play a very short, silent sound to "unlock" audio
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      return true;
    } catch (error) {
      console.warn('Failed to request audio permission:', error);
      return false;
    }
  }

  // Clean up resources
  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.soundBuffers.clear();
  }
}

export default NotificationSoundService; 