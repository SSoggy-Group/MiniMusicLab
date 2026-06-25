import { saveState, clearGrid, DEFAULT_INSTRUMENTS, PHONK_INSTRUMENTS } from './state'
import { Visualizer } from './visualizer'
import { AudioEngine, MicRecorder } from './audio'
import type { AppState, HoveredTarget, Instrument, InputMode } from './types'
import * as Tone from 'tone'

const MODE_KEY = 'minimusiclab_inputmode'

export class App {
  private state: AppState
  private engine: AudioEngine
  private hovered: HoveredTarget = { type: 'none' }
  private keyHeld = false
  private previewTimeout: ReturnType<typeof setTimeout> | null = null
  private inputMode: InputMode = null
  private micRecorder = new MicRecorder()
  private isRecording = false

  // Pagination
  private currentPage = 0
  private readonly PAGE_SIZE = 16

  // DOM refs
  private sidebar!: HTMLElement
  private gridEl!: HTMLElement
  private statusText!: HTMLElement
  private playBtn!: HTMLElement
  private bpmDisplay!: HTMLElement
  private bpmPlusBtn!: HTMLElement
  private bpmMinusBtn!: HTMLElement
  private saveBtn!: HTMLElement
  private exportBtn!: HTMLElement
  private clearBtn!: HTMLElement
  private cellEls: HTMLElement[][] = []
  private instrEls: HTMLElement[] = []
  private visualizerContainer!: HTMLElement
  private reverbBtn!: HTMLElement
  private pitchDisplay!: HTMLElement
  private pitchUpBtn!: HTMLElement
  private pitchDownBtn!: HTMLElement

  private currentStep = 0

  constructor(state: AppState, engine: AudioEngine) {
    this.state = state
    this.engine = engine

    engine.onStep = (step) => {
      this.currentStep = step
      this.updatePlayhead()
    }

    // Methods like buildDOM, bindEvents, renderGrid, renderSidebar, and applyMode/showModePicker will be added in subsequent parts.
  }

  private updatePlayhead() {
    // Will be implemented in render/UI updates
  }
}
