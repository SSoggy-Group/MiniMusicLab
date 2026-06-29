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
    const padFilter = new Tone.Filter(2000, "lowpass").connect(padChorus)
    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine', partials: [1, 0.5, 0.25, 0.125] },
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.5 }
    }).connect(padFilter)
    pad.volume.value = 0

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

    const stringChorus = new Tone.Chorus(2, 4, 0.5).connect(destination).start()
    const stringFilter = new Tone.Filter(3000, "lowpass").connect(stringChorus)
    const violin = new Tone.Sampler({
      urls: {
        "C5": "ElevenLabs_Warm_nostalgic_violin,_memories_of_family_gathering.mp3"
      },
      release: 1,
      baseUrl: "/"
    }).connect(stringFilter)
    violin.volume.value = 4

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

  async loadSample(id: string, audioDataUrl: string) {
    if (this.samplers[id]) {
      this.samplers[id].player?.dispose()
      this.samplers[id].gain.dispose()
      this.samplers[id].buffer.dispose()
    }
    const gain = new Tone.Gain(0.8).connect(this.masterGain)
    const buffer = new Tone.ToneAudioBuffer()
    await buffer.load(audioDataUrl)
    this.samplers[id] = { buffer, gain }
  }

  setBpm(bpm: number) {
    Tone.getTransport().bpm.value = bpm
  }

  getSamplerDurationSteps(id: string, bpm: number): number {
    const buffer = this.samplers[id]?.buffer
    if (!buffer || !buffer.loaded) return 1
    const duration = buffer.duration
    const stepDuration = 15 / bpm
    return Math.max(1, Math.ceil(duration / stepDuration))
  }

  async start(grid: Grid, bpm: number) {
    await Tone.start()
    this._grid = grid
    Tone.getTransport().bpm.value = bpm

    if (this.sequence) {
      this.sequence.stop(0)
      this.sequence.dispose()
    }

    const totalSteps = grid[0]?.length || 64
    const steps = Array.from({ length: totalSteps }, (_, i) => i)
    this.sequence = new Tone.Sequence(
      (time, step) => {
        this.triggerStep(time, step as number)
        Tone.getDraw().schedule(() => {
          this.onStep?.(step as number)
        }, time)
      },
      steps,
      '16n'
    )

    this.sequence.start(0)
    Tone.getTransport().start()
  }

  stop() {
    Tone.getTransport().stop()
    if (this.sequence) {
      this.sequence.stop(0)
    }
  }

  private triggerStep(time: number, step: number) {
    const instrOrder = this._instruments.length > 0 
      ? this._instruments.map(i => i.id) 
      : DEFAULT_INSTRUMENTS.map(i => i.id)

    instrOrder.forEach((id, row) => {
      if (this._grid[row]?.[step]) {
        this.triggerInstrument(id, step, time)
      }
    })
  }

  triggerInstrument(id: InstrumentId, step = 0, time?: number, synths?: ReturnType<typeof this.createSynths>) {
    const t = time ?? Tone.now()

    const samplerObj = this.samplers[id]
    if (samplerObj && samplerObj.buffer.loaded) {
      const inst = this._instruments.find(i => i.id === id)
      const mode = inst?.playbackMode || 'oneshot'
      let vol = inst?.volume ?? 0.8
      if (inst?.type === 'sampler') {
        if (id === 'phonk_7') {
          vol *= 5 // Low honor is extremely quiet
        } else if (id !== 'phonk_5' && id !== 'phonk_6' && id !== 'pad') {
          vol *= 2.5 // Boost average samples to compete with Tone.js synths
        }
      }
      
      samplerObj.gain.gain.setValueAtTime(vol, t)

      if (mode === 'oneshot') {
        const player = new Tone.Player(samplerObj.buffer).connect(samplerObj.gain)
        player.onstop = () => player.dispose()
        player.start(t)
      } else if (mode === 'choke') {
        if (!samplerObj.player) {
          samplerObj.player = new Tone.Player(samplerObj.buffer).connect(samplerObj.gain)
        }
        samplerObj.player.loop = false
        samplerObj.player.stop(t)
        samplerObj.player.start(t)
      } else if (mode === 'loop') {
        if (!samplerObj.player) {
          samplerObj.player = new Tone.Player(samplerObj.buffer).connect(samplerObj.gain)
        }
        samplerObj.player.loop = true
        samplerObj.player.stop(t)
        samplerObj.player.start(t)
      }
      return
    }

    try {
      switch (id) {
        case 'kick':
          (synths?.kick || this.kick).triggerAttackRelease('C1', '8n', t)
          break
        case 'snare':
          (synths?.snare || this.snare).triggerAttackRelease('8n', t)
          break
        case 'clap':
          (synths?.clap || this.clap).triggerAttackRelease('16n', t)
          break
        case 'hihat':
          (synths?.hihat || this.hihat).triggerAttackRelease('16n', t)
          break
        case 'crash':
          (synths?.crash || this.crash).triggerAttackRelease('1m', t)
          break
        case 'tomHigh':
          (synths?.tomHigh || this.tomHigh).triggerAttackRelease('A2', '16n', t)
          break
        case 'tomLow':
          (synths?.tomLow || this.tomLow).triggerAttackRelease('D2', '16n', t)
          break
        case 'bass':
          (synths?.bass || this.bass).triggerAttackRelease(BASS_NOTES[step % BASS_NOTES.length], '8n', t)
          break
        case 'pluck':
          (synths?.pluck || this.pluck).triggerAttack(PLUCK_NOTES[step % PLUCK_NOTES.length], t)
          break
        case 'lead':
          (synths?.lead || this.lead).triggerAttackRelease(LEAD_NOTES[step % LEAD_NOTES.length], '16n', t)
          break
        case 'pad':
          (synths?.pad || this.pad).triggerAttackRelease(PAD_NOTES[step % PAD_NOTES.length], '2n', t)
          break
        case 'piano':
          (synths?.piano || this.piano).triggerAttackRelease(PIANO_NOTES[step % PIANO_NOTES.length], '8n', t)
          break
        case 'violin':
          (synths?.violin || this.violin).triggerAttackRelease(VIOLIN_NOTES[step % VIOLIN_NOTES.length], '4n', t)
          break
      }
    } catch (e) {
    }
  }

  previewInstrument(id: InstrumentId) {
    this.triggerInstrument(id, 0)
  }

  getProxyUrl(url: string) {
    if (url.startsWith('http://localhost') || url.startsWith('blob:')) return url;
    return `http://localhost:8000/proxy?url=${encodeURIComponent(url)}`;
  }

  getWaveform(): Float32Array {
    return this.analyser.getValue() as Float32Array
  }

  async exportWav(grid: Grid, bpm: number): Promise<Blob> {
    const baseSteps = grid[0]?.length || 16
    // If the grid is only 1 or 2 pages, loop it automatically so the exported file is actually a "song"
    const loopCount = baseSteps <= 32 ? 4 : 1
    const totalSteps = baseSteps * loopCount
    
    const totalDuration = ((totalSteps * (60 / bpm)) / 4) + 2 // Added 2 seconds for reverb/cymbal tails
    
    await Tone.loaded()

    const buffer = await Tone.Offline(() => {
      const offlineLimiter = new Tone.Limiter(-3).toDestination()
      
      const offlineReverb = new Tone.Reverb(2).connect(offlineLimiter)
      offlineReverb.wet.value = this._reverbEnabled ? 0.5 : 0
      
      const offlinePitchShift = new Tone.PitchShift(this._pitchShift).connect(offlineReverb)
      
      const offlineMaster = new Tone.Gain(0.8).connect(offlinePitchShift)
      const offlineSynths = this.createSynths(offlineMaster)
      
      const offlineSamplers: Record<string, { buffer: Tone.ToneAudioBuffer, gain: Tone.Gain, player?: Tone.Player }> = {}
      Object.entries(this.samplers).forEach(([id, { buffer }]) => {
        if (buffer && buffer.loaded) {
          const gain = new Tone.Gain(0.8).connect(offlineMaster)
          offlineSamplers[id] = { buffer, gain }
        }
      })

      const stepDuration = (60 / bpm) / 4
      const instrOrder = this._instruments.length > 0 
        ? this._instruments.map(i => i.id) 
        : DEFAULT_INSTRUMENTS.map(i => i.id)

      for (let step = 0; step < totalSteps; step++) {
        const time = step * stepDuration
        const gridStep = step % baseSteps
        
        instrOrder.forEach((id, row) => {
          if (grid[row]?.[gridStep]) {
            const samplerObj = offlineSamplers[id]
            if (samplerObj && samplerObj.buffer.loaded) {
              const inst = this._instruments.find(i => i.id === id)
              const mode = inst?.playbackMode || 'oneshot'
              let vol = inst?.volume ?? 0.8
              if (inst?.type === 'sampler') {
                if (id === 'phonk_7') {
                  vol *= 5
                } else if (id !== 'phonk_5' && id !== 'phonk_6' && id !== 'pad') {
                  vol *= 2.5
                }
              }
              
              samplerObj.gain.gain.setValueAtTime(vol, time)

              if (mode === 'oneshot') {
                const player = new Tone.Player(samplerObj.buffer.get() as any).connect(samplerObj.gain)
                player.start(time)
              } else if (mode === 'choke') {
                if (!samplerObj.player) {
                  samplerObj.player = new Tone.Player(samplerObj.buffer.get() as any).connect(samplerObj.gain)
                }
                samplerObj.player.loop = false
                samplerObj.player.stop(time)
                samplerObj.player.start(time)
              } else if (mode === 'loop') {
                if (!samplerObj.player) {
                  samplerObj.player = new Tone.Player(samplerObj.buffer.get() as any).connect(samplerObj.gain)
                }
                samplerObj.player.loop = true
                samplerObj.player.stop(time)
                samplerObj.player.start(time)
              }
            } else {
              this.triggerInstrument(id, step, time, offlineSynths)
            }
          }
        })
      }
      
    }, totalDuration)

    return this.audioBufferToWav(buffer)
  }

  private audioBufferToWav(buffer: Tone.ToneAudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const result = new Float32Array(buffer.length * numChannels);
    
    if (numChannels === 2) {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        result[i * 2] = left[i];
        result[i * 2 + 1] = right[i];
      }
    } else {
      result.set(buffer.getChannelData(0));
    }
    
    const dataLength = result.length * (bitDepth / 8);
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    let offset = 44;
    for (let i = 0; i < result.length; i++) {
      const sample = Math.max(-1, Math.min(1, result[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([view], { type: 'audio/wav' });
  }
}

export class MicRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []

  async startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mediaRecorder = new MediaRecorder(stream)
    this.chunks = []

    this.mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }

    this.mediaRecorder.start()
  }

  async stopRecording(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) return resolve('')
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        resolve(url)
        
        this.mediaRecorder?.stream.getTracks().forEach(t => t.stop())
        this.mediaRecorder = null
      }
      
      this.mediaRecorder.stop()
    })
  }
}
