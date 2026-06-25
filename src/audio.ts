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
  private kick: Tone.MembraneSynth
  private snare: Tone.NoiseSynth
  private clap: Tone.NoiseSynth
  private hihat: Tone.MetalSynth
  private crash: Tone.MetalSynth
  private tomHigh: Tone.MembraneSynth
  private tomLow: Tone.MembraneSynth
  private bass: Tone.MonoSynth
  private pluck: Tone.PluckSynth
  private lead: Tone.FMSynth
  private pad: Tone.PolySynth
  private piano: Tone.Sampler
  private violin: Tone.PolySynth
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
    
    const synths = this.createSynths(this.masterGain)
    this.kick = synths.kick
    this.snare = synths.snare
    this.clap = synths.clap
    this.hihat = synths.hihat
    this.crash = synths.crash
    this.tomHigh = synths.tomHigh
    this.tomLow = synths.tomLow
    this.bass = synths.bass
    this.pluck = synths.pluck
    this.lead = synths.lead
    this.pad = synths.pad
    this.piano = synths.piano
    this.violin = synths.violin
  }

  private createSynths(destination: Tone.ToneAudioNode) {
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
    }).connect(destination)

    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.05 },
    }).connect(destination)

    const hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).connect(destination)
    hihat.volume.value = -10

    const clap = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
    }).connect(destination)
    clap.volume.value = 2

    const crash = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 1.0, release: 0.2 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).connect(destination)
    crash.volume.value = -8

    const tomHigh = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    }).connect(destination)
    tomHigh.volume.value = -4

    const tomLow = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
    }).connect(destination)
    tomLow.volume.value = -2

    const bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
      filterEnvelope: {
        attack: 0.01, decay: 0.1, sustain: 0.5,
        release: 0.2, baseFrequency: 200, octaves: 2.6
      },
    }).connect(destination)

    const pluck = new Tone.PluckSynth({
      attackNoise: 1,
      dampening: 4000,
      resonance: 0.98,
    }).connect(destination)
    pluck.volume.value = -4

    const lead = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      detune: 0,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
    }).connect(destination)
    lead.volume.value = -8

    const padChorus = new Tone.Chorus(2, 2.5, 0.5).connect(destination).start()
    const padFilter = new Tone.AutoFilter(0.1, 800, 3).connect(padChorus).start()
    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsine', count: 3, spread: 30 },
      envelope: { attack: 0.2, decay: 0.5, sustain: 1.0, release: 2.0 }
    }).connect(padFilter)
    pad.volume.value = -8

    const piano = new Tone.Sampler({
      urls: {
        "C4": "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        "A4": "A4.mp3",
        "C5": "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        "A5": "A5.mp3"
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/"
    }).connect(destination)
    piano.volume.value = 4

    const stringChorus = new Tone.Chorus(4, 2.5, 0.5).connect(destination).start()
    const stringFilter = new Tone.Filter(2500, 'lowpass').connect(stringChorus)
    const violin = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1.01,
      modulationIndex: 2,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.9, release: 1.0 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.9, release: 1.0 }
    }).connect(stringFilter)
    violin.volume.value = -8

    return { kick, snare, hihat, clap, crash, tomHigh, tomLow, bass, pluck, lead, pad, piano, violin }
  }

  get analyserNode(): Tone.Analyser {
    return this.analyser
  }
}
