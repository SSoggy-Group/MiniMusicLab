// ─── Shared Types ────────────────────────────────────────────────────────────

export type InstrumentId = string
export type InstrumentType = 'synth' | 'sampler'
export type InputMode = 'click' | 'space' | null

export interface Instrument {
  id: InstrumentId
  label: string
  color: string      // CSS hex
  colorHover: string // lighter hover tint
  type: InstrumentType
  audioData?: string // Object URL or base64
  volume?: number    // 0 to 1
  playbackMode?: 'oneshot' | 'choke' | 'loop'
}

// Grid is [instrumentIndex][stepIndex] = boolean (note on/off)
export type Grid = boolean[][]

export interface AppState {
  bpm: number
  instruments: Instrument[]
  selectedInstrument: InstrumentId
  grid: Grid
  playing: boolean
  currentStep: number
  genre: 'house' | 'trap' | 'synthwave' | 'tuff phonk' | 'lo-fi' | 'techno'
  steps: number
  reverbEnabled: boolean
  pitchShift: number
}

export interface HoveredTarget {
  type: 'cell' | 'instrument' | 'play' | 'stop' | 'bpm-plus' | 'bpm-minus' | 'save' | 'clear' | 'export' | 'add-sound' | 'add-mic' | 'stop-recording' | 'page-prev' | 'page-next' | 'page-add' | 'page-remove' | 'genre' | 'reverb' | 'pitch-up' | 'pitch-down' | 'none'
  row?: number
  col?: number
  instrumentId?: InstrumentId
}
