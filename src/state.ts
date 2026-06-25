import type { Instrument, InstrumentId, Grid, AppState } from './types'

export const DEFAULT_INSTRUMENTS: Instrument[] = [
  { id: 'kick',    label: 'Kick',     color: '#ff6b6b', colorHover: '#ff8787', type: 'synth' },
  { id: 'snare',   label: 'Snare',    color: '#4ecdc4', colorHover: '#7edcd5', type: 'synth' },
  { id: 'hihat',   label: 'Hi-Hat',   color: '#fbd850', colorHover: '#fce38a', type: 'synth' },
  { id: 'clap',    label: 'Clap',     color: '#45aaf2', colorHover: '#77c8f9', type: 'synth' },
  { id: 'crash',   label: 'Crash',    color: '#f0932b', colorHover: '#f2a856', type: 'synth' },
  { id: 'tomHigh', label: 'High Tom', color: '#6ab04c', colorHover: '#87bf6d', type: 'synth' },
  { id: 'tomLow',  label: 'Low Tom',  color: '#badc58', colorHover: '#c8e278', type: 'synth' },
  { id: 'bass',    label: 'Bass',     color: '#4a69bd', colorHover: '#6a89cc', type: 'synth' },
  { id: 'pluck',   label: 'Pluck',    color: '#22a6b3', colorHover: '#4bb8c2', type: 'synth' },
  { id: 'lead',    label: 'Lead',     color: '#be2edd', colorHover: '#ca58e4', type: 'synth' },
  { id: 'pad',     label: 'Pad',      color: '#ff7979', colorHover: '#ff9797', type: 'synth' },
  { id: 'piano',   label: 'Piano',    color: '#a29bfe', colorHover: '#b5b0fc', type: 'synth' },
  { id: 'violin',  label: 'Strings',  color: '#fd79a8', colorHover: '#fc9abf', type: 'synth' },
]

export const PHONK_INSTRUMENTS: Instrument[] = [
  { id: 'phonk_1', label: 'Bark Fart', color: '#ff6b6b', colorHover: '#ff8787', type: 'sampler', audioData: '/phonk/bark-fart-sound.mp3', volume: 0.8, playbackMode: 'oneshot' },
  { id: 'phonk_2', label: 'Bone Crack', color: '#4ecdc4', colorHover: '#7edcd5', type: 'sampler', audioData: '/phonk/bone-crack.mp3', volume: 0.8, playbackMode: 'oneshot' },
  { id: 'phonk_3', label: 'Brasil Sil', color: '#fbd850', colorHover: '#fce38a', type: 'sampler', audioData: '/phonk/efeitos-sonoros-brasil-sil-sil-rede-globo.mp3', volume: 0.8, playbackMode: 'oneshot' },
  { id: 'phonk_4', label: 'Grrrrr', color: '#45aaf2', colorHover: '#77c8f9', type: 'sampler', audioData: '/phonk/grrrrr_xqutAq3.mp3', volume: 0.8, playbackMode: 'oneshot' },
  { id: 'phonk_5', label: 'Hardtekk', color: '#f0932b', colorHover: '#f2a856', type: 'sampler', audioData: '/phonk/hardtekk(1).mp3', volume: 0.8, playbackMode: 'oneshot' },
  { id: 'phonk_6', label: 'Raw Style', color: '#6ab04c', colorHover: '#87bf6d', type: 'sampler', audioData: '/phonk/linia_raw_style.mp3', volume: 0.8, playbackMode: 'oneshot' },
  { id: 'phonk_7', label: 'Low Honor', color: '#badc58', colorHover: '#c8e278', type: 'sampler', audioData: '/phonk/low-honor-rdr-2.mp3', volume: 0.8, playbackMode: 'oneshot' },
  { id: 'phonk_8', label: 'Deep Meow', color: '#4a69bd', colorHover: '#6a89cc', type: 'sampler', audioData: '/phonk/m-e-o-w.mp3', volume: 0.8, playbackMode: 'oneshot' },
  { id: 'phonk_9', label: 'Meow Burp', color: '#22a6b3', colorHover: '#4bb8c2', type: 'sampler', audioData: '/phonk/meow-burp-combo.mp3', volume: 0.8, playbackMode: 'oneshot' },
  { id: 'phonk_10', label: 'Whistle', color: '#be2edd', colorHover: '#ca58e4', type: 'sampler', audioData: '/phonk/som-apito-do-juiz-mp3cut.mp3', volume: 0.8, playbackMode: 'oneshot' },
  ...DEFAULT_INSTRUMENTS.slice(10)
]

export const STORAGE_KEY = 'minimusiclab_v2'

const DEFAULT_BPM = 120
const DEFAULT_STEPS = 16

function makeEmptyGrid(instruments: Instrument[], steps: number): Grid {
  return instruments.map(() => Array(steps).fill(false))
}

export function createDefaultState(): AppState {
  return {
    bpm: DEFAULT_BPM,
    instruments: [...DEFAULT_INSTRUMENTS],
    selectedInstrument: 'kick',
    grid: makeEmptyGrid(DEFAULT_INSTRUMENTS, DEFAULT_STEPS),
    playing: false,
    currentStep: 0,
    genre: 'house',
    steps: DEFAULT_STEPS,
    reverbEnabled: false,
    pitchShift: 0
  }
}
