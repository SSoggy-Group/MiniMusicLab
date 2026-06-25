// ─── Audio Engine (Tone.js) ───────────────────────────────────────────────────
import * as Tone from 'tone'
import { DEFAULT_INSTRUMENTS } from './state'
import type { InstrumentId, Grid, Instrument } from './types'

// Notes used for pitched instruments (mutable for genres)
let BASS_NOTES = ['C2', 'C2', 'C2', 'G2', 'C2', 'C2', 'G2', 'C2',
                  'C2', 'C2', 'F2', 'G2', 'A2', 'G2', 'F2', 'E2']
let PLUCK_NOTES = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5',
                   'G5', 'A5', 'C5', 'B4', 'A4', 'G4', 'E4', 'D4']
let LEAD_NOTES = ['C5', 'Eb5', 'F5', 'G5', 'C6', 'Bb5', 'G5', 'F5', 
                  'Eb5', 'C5', 'Bb4', 'C5', 'Eb5', 'F5', 'G5', 'C6']
let PAD_NOTES = ['C4', 'C4', 'Eb4', 'Eb4', 'F4', 'F4', 'G4', 'G4', 
                 'C4', 'C4', 'Eb4', 'Eb4', 'F4', 'F4', 'G4', 'G4']
let PIANO_NOTES = [['C4', 'Eb4', 'G4'], ['C4', 'Eb4', 'G4'], ['F4', 'Ab4', 'C5'], ['G4', 'B4', 'D5'],
                   ['C4', 'Eb4', 'G4'], ['C4', 'Eb4', 'G4'], ['F4', 'Ab4', 'C5'], ['G4', 'B4', 'D5'],
                   ['Ab4', 'C5', 'Eb5'], ['Ab4', 'C5', 'Eb5'], ['Bb4', 'D5', 'F5'], ['Bb4', 'D5', 'F5'],
                   ['C5', 'Eb5', 'G5'], ['G4', 'B4', 'D5'], ['C4', 'Eb4', 'G4'], ['C4', 'Eb4', 'G4']]
let VIOLIN_NOTES = ['C5', 'C5', 'Eb5', 'Eb5', 'F5', 'F5', 'G5', 'G5',
                    'C5', 'C5', 'Eb5', 'Eb5', 'F5', 'F5', 'G5', 'G5']

export class AudioEngine {
  private kick!: Tone.MembraneSynth
  private snare!: Tone.NoiseSynth
  private clap!: Tone.NoiseSynth
  private hihat!: Tone.MetalSynth
  private crash!: Tone.MetalSynth
  private tomHigh!: Tone.MembraneSynth
  private tomLow!: Tone.MembraneSynth
  private bass!: Tone.MonoSynth
  private pluck!: Tone.PluckSynth
  private lead!: Tone.FMSynth
  private pad!: Tone.PolySynth
  private piano!: Tone.Sampler
  private violin!: Tone.PolySynth
  private globalReverb: Tone.Reverb
  private globalPitchShift: Tone.PitchShift
  private _reverbEnabled = false
  private _pitchShift = 0
  private analyser: Tone.Analyser
  private sequence: Tone.Sequence | null = null
  private _grid: Grid = []
  private _instruments: Instrument[] = []
  private masterGain: Tone.Gain
  private samplers: Record<string, { buffer: Tone.ToneAudioBuffer, gain: Tone.Gain, player?: Tone.Player }> = {}
  onStep: ((step: number) => void) | null = null

  constructor() {
    // Master limiter to avoid clipping
    const limiter = new Tone.Limiter(-3).toDestination()

    this.analyser = new Tone.Analyser('waveform', 256)
    
    // Global FX chain
    this.globalReverb = new Tone.Reverb(2).connect(limiter)
    this.globalReverb.wet.value = 0
    
    this.globalPitchShift = new Tone.PitchShift(0).connect(this.globalReverb)
    
    this.masterGain = new Tone.Gain(0.8).connect(this.globalPitchShift).connect(this.analyser)
    
    // Synths creation will be wired in Part 2
  }
}
