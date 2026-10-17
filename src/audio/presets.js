// Presets de exportação. channels: 'source' | 'mono' | 'stereo'
export const PRESETS = [
  { id: 'cd-stereo', label: '44.1 kHz / 16-bit estéreo', sampleRate: 44100, bits: 16, channels: 'stereo' },
  { id: 'cd-mono', label: '44.1 kHz / 16-bit mono', sampleRate: 44100, bits: 16, channels: 'mono' },
  { id: '48-24', label: '48 kHz / 24-bit estéreo', sampleRate: 48000, bits: 24, channels: 'stereo' },
  { id: '22-16-mono', label: '22.05 kHz / 16-bit mono', sampleRate: 22050, bits: 16, channels: 'mono' },
  { id: '22-8-mono', label: '22.05 kHz / 8-bit mono', sampleRate: 22050, bits: 8, channels: 'mono' },
];
