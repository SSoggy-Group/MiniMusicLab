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

  setGenre(genre: 'house' | 'trap' | 'synthwave' | 'tuff phonk' | 'lo-fi' | 'techno') {
    if (genre === 'house') {
      BASS_NOTES = ['C2', 'C2', 'C2', 'G2', 'C2', 'C2', 'G2', 'C2', 'C2', 'C2', 'F2', 'G2', 'A2', 'G2', 'F2', 'E2']
      PLUCK_NOTES = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C5', 'B4', 'A4', 'G4', 'E4', 'D4']
      LEAD_NOTES = ['C5', 'Eb5', 'F5', 'G5', 'C6', 'Bb5', 'G5', 'F5', 'Eb5', 'C5', 'Bb4', 'C5', 'Eb5', 'F5', 'G5', 'C6']
      PAD_NOTES = ['C4', 'C4', 'Eb4', 'Eb4', 'F4', 'F4', 'G4', 'G4', 'C4', 'C4', 'Eb4', 'Eb4', 'F4', 'F4', 'G4', 'G4']
      this.kick.set({ pitchDecay: 0.05, envelope: { decay: 0.4 } })
      this.clap.set({ noise: { type: 'pink' } })
      this.hihat.set({ envelope: { decay: 0.1 }, resonance: 4000 })
      this.bass.set({ oscillator: { type: 'square' }, envelope: { decay: 0.2 } })
    } else if (genre === 'trap') {
      BASS_NOTES = ['C1', 'C1', 'C1', 'C1', 'Eb1', 'Eb1', 'D1', 'D1', 'C1', 'C1', 'G1', 'G1', 'F1', 'F1', 'C1', 'C1']
      PLUCK_NOTES = ['C5', 'G4', 'Eb5', 'C5', 'G4', 'C5', 'D5', 'G4', 'C5', 'G4', 'F5', 'Eb5', 'D5', 'C5', 'G4', 'G4']
      LEAD_NOTES = ['C6', 'G5', 'C6', 'Eb6', 'D6', 'C6', 'G5', 'C6', 'Eb6', 'F6', 'G6', 'F6', 'Eb6', 'D6', 'C6', 'G5']
      PAD_NOTES = ['C4', 'C4', 'C4', 'C4', 'Ab3', 'Ab3', 'G3', 'G3', 'C4', 'C4', 'Eb4', 'Eb4', 'D4', 'D4', 'C4', 'C4']
      this.kick.set({ pitchDecay: 0.3, envelope: { decay: 1.2 } }) 
      this.clap.set({ noise: { type: 'white' } }) 
      this.hihat.set({ envelope: { decay: 0.05 }, resonance: 8000 })
      this.bass.set({ oscillator: { type: 'triangle' }, envelope: { decay: 1.0, release: 1.0 } })
    } else if (genre === 'synthwave') {
      BASS_NOTES = ['F1', 'F1', 'F1', 'F1', 'G1', 'G1', 'G1', 'G1', 'A1', 'A1', 'A1', 'A1', 'C2', 'C2', 'C2', 'C2']
      PLUCK_NOTES = ['F4', 'A4', 'C5', 'F5', 'G4', 'B4', 'D5', 'G5', 'A4', 'C5', 'E5', 'A5', 'C5', 'E5', 'G5', 'C6']
      LEAD_NOTES = ['A5', 'G5', 'A5', 'C6', 'B5', 'G5', 'A5', 'E5', 'A5', 'G5', 'A5', 'C6', 'D6', 'C6', 'B5', 'G5']
      PAD_NOTES = ['F4', 'F4', 'F4', 'F4', 'G4', 'G4', 'G4', 'G4', 'A4', 'A4', 'A4', 'A4', 'C5', 'C5', 'C5', 'C5']
      this.kick.set({ pitchDecay: 0.01, envelope: { decay: 0.2 } })
      this.clap.set({ noise: { type: 'brown' } })
      this.hihat.set({ envelope: { decay: 0.3 }, resonance: 2000 })
      this.bass.set({ oscillator: { type: 'sawtooth' }, envelope: { decay: 0.4 } })
    } else if (genre === 'tuff phonk') {
      BASS_NOTES = ['C1', 'C1', 'Eb1', 'C1', 'F1', 'F1', 'G1', 'Eb1', 'C1', 'C1', 'Eb1', 'C1', 'Bb0', 'C1', 'G1', 'Eb1']
      PLUCK_NOTES = ['C5', 'Eb5', 'G5', 'C6', 'Eb6', 'G6', 'C7', 'Eb7', 'C5', 'Eb5', 'G5', 'C6', 'Eb6', 'G6', 'C7', 'Eb7']
      LEAD_NOTES = ['C6', 'C6', 'Eb6', 'C6', 'G6', 'F6', 'Eb6', 'C6', 'Bb5', 'C6', 'Eb6', 'C6', 'G6', 'F6', 'Eb6', 'C6']
      PAD_NOTES = ['C3', 'C3', 'Eb3', 'Eb3', 'F3', 'F3', 'G3', 'G3', 'C3', 'C3', 'Eb3', 'Eb3', 'F3', 'F3', 'G3', 'G3']
      this.kick.set({ pitchDecay: 0.2, envelope: { decay: 0.6 } })
      this.clap.set({ noise: { type: 'white' } })
      this.hihat.set({ envelope: { decay: 0.03 }, resonance: 6000 })
      this.bass.set({ oscillator: { type: 'square' }, envelope: { decay: 1.2, release: 1.5 } })
    } else if (genre === 'lo-fi') {
      BASS_NOTES = ['C2', 'C2', 'E2', 'E2', 'A1', 'A1', 'F1', 'F1', 'C2', 'C2', 'E2', 'E2', 'A1', 'A1', 'G1', 'G1']
      PLUCK_NOTES = ['E4', 'G4', 'B4', 'D5', 'C5', 'E5', 'G5', 'B5', 'A4', 'C5', 'E5', 'G5', 'F4', 'A4', 'C5', 'E5']
      LEAD_NOTES = ['G5', 'E5', 'D5', 'C5', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'A4', 'G4']
      PAD_NOTES = ['C4', 'C4', 'E4', 'E4', 'A3', 'A3', 'F3', 'F3', 'C4', 'C4', 'E4', 'E4', 'A3', 'A3', 'G3', 'G3']
      this.kick.set({ pitchDecay: 0.01, envelope: { decay: 0.15 } })
      this.clap.set({ noise: { type: 'brown' } })
      this.hihat.set({ envelope: { decay: 0.08 }, resonance: 2000 })
      this.bass.set({ oscillator: { type: 'triangle' }, envelope: { decay: 0.8, release: 1.2 } })
    } else if (genre === 'techno') {
      BASS_NOTES = ['C1', 'C1', 'C1', 'Db1', 'C1', 'C1', 'C1', 'Bb0', 'C1', 'C1', 'C1', 'Db1', 'C1', 'C1', 'F1', 'Eb1']
      PLUCK_NOTES = ['C4', 'C4', 'C4', 'Eb4', 'C4', 'C4', 'C4', 'F4', 'C4', 'C4', 'C4', 'Eb4', 'C4', 'C4', 'G4', 'F4']
      LEAD_NOTES = ['C5', 'C5', 'Db5', 'C5', 'C5', 'C5', 'Bb4', 'C5', 'C5', 'C5', 'Db5', 'C5', 'C5', 'C5', 'Eb5', 'F5']
      PAD_NOTES = ['C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'C3']
      this.kick.set({ pitchDecay: 0.08, envelope: { decay: 0.5 } })
      this.clap.set({ noise: { type: 'white' } })
      this.hihat.set({ envelope: { decay: 0.02 }, resonance: 8000 })
      this.bass.set({ oscillator: { type: 'sawtooth' }, envelope: { decay: 0.3, release: 0.2 } })
    }
  }

  setReverb(enabled: boolean) {
    this._reverbEnabled = enabled
    this.globalReverb.wet.value = enabled ? 0.5 : 0
  }

  setPitchShift(semitones: number) {
    this._pitchShift = semitones
    this.globalPitchShift.pitch = semitones
  }

  setGrid(grid: Grid) {
    this._grid = grid
  }

  setInstruments(instruments: Instrument[]) {
    this._instruments = instruments
  }
}
