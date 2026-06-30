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

    this.buildDOM()
    this.bindEvents()

    this.engine.setInstruments(this.state.instruments)
    this.engine.setReverb(this.state.reverbEnabled)
    this.engine.setPitchShift(this.state.pitchShift)

    this.renderGrid()
    this.renderSidebar()
    this.updatePlayBtn()
    this.updateBpmDisplay()
    this.updateFXDisplay()

    for (const inst of this.state.instruments) {
      if (inst.type === 'sampler' && inst.audioData) {
        this.engine.loadSample(inst.id, inst.audioData).catch(console.error)
      }
    }

    const savedMode = localStorage.getItem(MODE_KEY) as InputMode
    const picker = document.getElementById('mode-picker')
    if (picker) picker.style.display = 'flex'
  }

  private applyMode(mode: InputMode) {
    this.inputMode = mode
    if (mode) {
      localStorage.setItem(MODE_KEY, mode)
    }
    const picker = document.getElementById('mode-picker')
    if (picker) picker.style.display = 'none'
    const select = document.getElementById('mode-select') as HTMLSelectElement
    if (select) select.value = mode || 'click'
    this.updateStatus()
  }

  private buildDOM() {
    const root = document.getElementById('app')
    if (!root) return

    root.innerHTML = ''
    root.className = 'app-root'
    root.innerHTML = `
      <header class="top-bar" id="top-bar">
        <div class="top-bar-left">
          <span class="app-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </span>
          <span class="app-name">MiniMusicLab</span>
        </div>
        <div class="top-bar-center" id="top-bar-center">
          <button class="btn btn-play" id="play-btn" tabindex="-1" aria-label="Play/Stop">
            <svg class="icon-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <svg class="icon-stop" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            <span class="btn-label">Play</span>
          </button>
          
          <select id="genre-select" class="genre-select" tabindex="-1">
            <option value="house">House Kit</option>
            <option value="trap">Trap Kit</option>
            <option value="synthwave">Synthwave Kit</option>
            <option value="tuff phonk">Tuff Phonk Kit</option>
            <option value="lo-fi">Lo-Fi Kit</option>
            <option value="techno">Techno Kit</option>
          </select>
          <select class="genre-select" id="mode-select" aria-label="Input Mode" style="margin-left:8px; width:100px;">
            <option value="click">Mouse</option>
            <option value="space">Spacebar</option>
          </select>
          <button class="btn btn-sm" id="reverb-btn" tabindex="-1">Reverb: OFF</button>
          <div class="bpm-control" style="margin-left: 10px;">
            <button class="btn btn-sm bpm-btn" id="pitch-down" tabindex="-1">−</button>
            <span class="bpm-display" id="pitch-display">Pitch: 0</span>
            <button class="btn btn-sm bpm-btn" id="pitch-up" tabindex="-1">+</button>
          </div>
        </div>
        <div class="top-bar-right" id="top-bar-right">
          <button class="btn btn-sm" id="add-instants-btn" tabindex="-1" style="color: #9b59b6;">+ MyInstants</button>
          <button class="btn btn-sm" id="add-sound-btn" tabindex="-1">+ Sound</button>
          <button class="btn btn-sm" id="add-mic-btn" tabindex="-1" style="color: #e74c3c;">+ Mic</button>
          <div class="bpm-control">
            <button class="btn btn-sm bpm-btn" id="bpm-minus" tabindex="-1" aria-label="BPM minus">−</button>
            <span class="bpm-display" id="bpm-display">120 BPM</span>
            <button class="btn btn-sm bpm-btn" id="bpm-plus" tabindex="-1" aria-label="BPM plus">+</button>
          </div>
          <button class="btn btn-sm" id="theme-btn" tabindex="-1" title="Toggle Theme">🌙</button>
          <button class="btn btn-sm" id="save-btn" tabindex="-1">Save</button>
          <button class="btn btn-sm" id="export-btn" tabindex="-1">Export WAV</button>
          <button class="btn btn-sm btn-danger" id="clear-btn" tabindex="-1">Clear</button>
        </div>
      </header>

      <main class="main-area" id="main-area">
        <aside class="sidebar" id="sidebar"></aside>
        <div class="grid-wrapper">
          <div class="pagination" id="pagination">
            <button class="page-btn page-btn-secondary" id="page-remove" aria-label="Remove Page" style="padding: 4px 8px;">-</button>
            <button class="page-btn" id="page-prev">&lsaquo;</button>
            <span class="page-indicator" id="page-indicator">Page 1</span>
            <button class="page-btn" id="page-next">&rsaquo;</button>
            <button class="page-btn page-btn-secondary" id="page-add" aria-label="Add Page" style="padding: 4px 8px;">+</button>
          </div>
          <div class="beat-numbers" id="beat-numbers"></div>
          <div class="grid" id="grid"></div>
        </div>
      </main>

      <div class="modal-overlay" id="instants-modal" style="display:none;">
        <div class="modal-content" style="max-width: 800px; width: 90vw; max-height: 90vh; display: flex; flex-direction: column;">
          <div class="modal-header">
            <h3>Search MyInstants</h3>
            <button class="btn btn-sm btn-danger" id="close-instants-btn">X</button>
          </div>
          <div style="display:flex; gap:10px; margin-bottom: 10px;">
            <input type="text" id="instants-search-input" placeholder="bruh..." class="sb-search-input" style="flex:1;">
            <button id="instants-search-btn" class="btn btn-sm" style="background:#3498db; color:white;">Search</button>
          </div>
          <div id="instants-results" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
            <p class="soundboard-hint">Search for a sound to import to the grid.</p>
          </div>
        </div>
      </div>

      <div class="mode-picker-overlay" id="mode-picker" style="display:none;">
        <div class="mode-picker-card">
          <div class="mode-picker-icon">👋</div>
          <h2 class="mode-picker-title">Welcome to MiniMusicLab</h2>
          <p class="mode-picker-sub">Choose your preferred way to interact with the grid.</p>
          <div class="mode-picker-options">
            <button class="mode-btn" id="mode-btn-click">
              <span class="mode-btn-icon">🖱️</span>
              <span class="mode-btn-label">Mouse / Touch</span>
              <span class="mode-btn-desc">Click or tap cells directly</span>
            </button>
            <button class="mode-btn" id="mode-btn-space">
              <span class="mode-btn-icon">⌨️</span>
              <span class="mode-btn-label">Spacebar</span>
              <span class="mode-btn-desc">Hover mouse and press Space</span>
            </button>
          </div>
        </div>
      </div>

      <footer class="bottom-panel" id="bottom-panel">
        <div class="status-text" id="status-text">click a cell, or switch to spacebar mode</div>
        <div class="visualizer-wrap" id="visualizer-container"></div>
      </footer>
    `

    this.sidebar = document.getElementById('sidebar')!
    this.gridEl = document.getElementById('grid')!
    this.statusText = document.getElementById('status-text')!
    this.playBtn = document.getElementById('play-btn')!
    this.bpmDisplay = document.getElementById('bpm-display')!
    this.bpmPlusBtn = document.getElementById('bpm-plus')!
    this.bpmMinusBtn = document.getElementById('bpm-minus')!
    this.saveBtn = document.getElementById('save-btn')!
    this.exportBtn = document.getElementById('export-btn')!
    this.clearBtn = document.getElementById('clear-btn')!
    this.visualizerContainer = document.getElementById('visualizer-container')!
    this.reverbBtn = document.getElementById('reverb-btn')!
    this.pitchDisplay = document.getElementById('pitch-display')!
    this.pitchUpBtn = document.getElementById('pitch-up')!
    this.pitchDownBtn = document.getElementById('pitch-down')!

    const pagePrevBtn = document.getElementById('page-prev')!
    const pageNextBtn = document.getElementById('page-next')!
    const pageAddBtn = document.getElementById('page-add')!
    const pageRemoveBtn = document.getElementById('page-remove')!

    this.trackHover(pagePrevBtn, { type: 'page-prev' })
    this.trackHover(pageNextBtn, { type: 'page-next' })
    this.trackHover(pageAddBtn, { type: 'page-add' })
    this.trackHover(pageRemoveBtn, { type: 'page-remove' })

    const genreSelect = document.getElementById('genre-select') as HTMLSelectElement
    if (this.state.genre) {
      genreSelect.value = this.state.genre
      this.engine.setGenre(this.state.genre)
      this.updateBaseInstruments(this.state.genre).catch(console.error)
    }

    genreSelect.addEventListener('change', async (e) => {
      const val = (e.target as HTMLSelectElement).value as AppState['genre']
      this.state.genre = val
      this.engine.setGenre(val)
      await this.updateBaseInstruments(val)
      saveState(this.state)
    })

    this.trackHover(genreSelect, { type: 'genre' })
    this.trackHover(this.playBtn, { type: 'play' })
    this.trackHover(this.bpmPlusBtn, { type: 'bpm-plus' })
    this.trackHover(this.bpmMinusBtn, { type: 'bpm-minus' })
    this.trackHover(this.reverbBtn, { type: 'reverb' })
    this.trackHover(this.pitchUpBtn, { type: 'pitch-up' })
    this.trackHover(this.pitchDownBtn, { type: 'pitch-down' })
    this.trackHover(this.saveBtn, { type: 'save' })
    this.trackHover(this.exportBtn, { type: 'export' })
    this.trackHover(this.clearBtn, { type: 'clear' })

    const addSoundBtn = document.getElementById('add-sound-btn')!
    const micBtn = document.getElementById('add-mic-btn')!

    this.trackHover(addSoundBtn, { type: 'add-sound' })

    micBtn.addEventListener('mouseenter', () => {
      this.hovered = {
        type: this.isRecording ? 'stop-recording' : 'add-mic'
      }
      this.updateStatus()
    })

    micBtn.addEventListener('mouseleave', () => {
      this.hovered = { type: 'none' }
      this.updateStatus()
    })

    micBtn.addEventListener('click', () => {
      if (this.inputMode === 'click') {
        this.hovered = {
          type: this.isRecording ? 'stop-recording' : 'add-mic'
        }
        this.handleKeyActivate()
      }
    })

    new Visualizer(this.visualizerContainer, this.engine)
  }

  private trackHover(el: HTMLElement, target: HoveredTarget) {
    el.addEventListener('mouseenter', () => {
      this.hovered = target
      this.updateStatus()
    })
    el.addEventListener('mouseleave', () => {
      this.hovered = { type: 'none' }
      this.updateStatus()
    })
    el.addEventListener('click', () => {
      if (this.inputMode === 'click') {
        this.hovered = target
        this.handleKeyActivate()
      }
    })
  }

  private async updateBaseInstruments(genre: AppState['genre']) {
    const defaultInsts = genre === 'tuff phonk' ? PHONK_INSTRUMENTS : DEFAULT_INSTRUMENTS
    const count = this.state.instruments.length
    const nextInsts = [...defaultInsts]

    const prevBaseCount = this.state.genre === 'tuff phonk' ? PHONK_INSTRUMENTS.length : DEFAULT_INSTRUMENTS.length

    if (count > prevBaseCount) {
      nextInsts.push(...this.state.instruments.slice(prevBaseCount))
    }

    this.state.instruments = nextInsts

    while (this.state.grid.length < this.state.instruments.length) {
      this.state.grid.push(new Array(this.state.steps).fill(false))
    }

    while (this.state.grid.length > this.state.instruments.length) {
      this.state.grid.pop()
    }

    for (const r of nextInsts) {
      if (r.type === 'sampler' && r.audioData) {
        try {
          await this.engine.loadSample(r.id, r.audioData)
        } catch (e) {
          console.error(`Failed to load sample for ${r.id}:`, e)
        }
      }
    }

    this.engine.setInstruments(this.state.instruments)
    this.renderSidebar()
    this.renderGrid()
  }

  private getRandomColor() {
    const hue = Math.floor(Math.random() * 360)
    return {
      color: `hsl(${hue}, 70%, 50%)`,
      colorHover: `hsl(${hue}, 70%, 60%)`
    }
  }

  private renderSidebar() {
    this.sidebar.innerHTML = ''
    this.instrEls = []

    const label = document.createElement('div')
    label.className = 'sidebar-label'
    label.textContent = 'Drum Kit'
    this.sidebar.appendChild(label)

    this.state.instruments.forEach((inst, idx) => {
      const row = document.createElement('div')
      row.className = 'instrument-row'
      row.dataset.row = String(idx)
      row.setAttribute('tabindex', '-1')

      const dot = document.createElement('span')
      dot.className = 'instr-dot'
      dot.style.background = inst.color

      const name = document.createElement('span')
      name.className = 'instr-name'
      name.textContent = inst.label

      const leftWrap = document.createElement('div')
      leftWrap.style.display = 'flex'
      leftWrap.style.alignItems = 'center'
      leftWrap.style.gap = '8px'
      leftWrap.appendChild(dot)
      leftWrap.appendChild(name)
      row.appendChild(leftWrap)

      const isCustomUserUpload = inst.id.startsWith('custom-') || inst.id.startsWith('instants-') || inst.id.startsWith('mic-')

      if (inst.type === 'sampler' && isCustomUserUpload) {
        const controls = document.createElement('div')
        controls.className = 'sampler-controls'
        controls.style.display = 'flex'
        controls.style.alignItems = 'center'
        controls.style.gap = '6px'

        const volInput = document.createElement('input')
        volInput.type = 'range'
        volInput.min = '0'
        volInput.max = '4'
        volInput.step = '0.05'
        volInput.value = String(inst.volume ?? 0.8)
        volInput.className = 'vol-slider'
        volInput.style.width = '40px'
        volInput.title = 'Volume'
        volInput.oninput = (e) => {
          const v = parseFloat((e.target as HTMLInputElement).value)
          inst.volume = v
          this.engine.setInstruments(this.state.instruments)
        }
        volInput.onchange = () => {
          saveState(this.state)
        }

        const modeSelect = document.createElement('select')
        modeSelect.className = 'mode-select btn btn-sm'
        modeSelect.style.padding = '2px 4px'
        modeSelect.style.fontSize = '10px'
        ;['oneshot', 'choke', 'loop'].forEach((m) => {
          const opt = document.createElement('option')
          opt.value = m
          opt.textContent = m === 'oneshot' ? '1-Shot' : m === 'choke' ? 'Cut' : 'Loop'
          if ((inst.playbackMode || 'oneshot') === m) {
            opt.selected = true
          }
          modeSelect.appendChild(opt)
        })
        modeSelect.onchange = (e) => {
          const v = (e.target as HTMLSelectElement).value
          inst.playbackMode = v as any
          this.engine.setInstruments(this.state.instruments)
          saveState(this.state)
        }

        const delBtn = document.createElement('button')
        delBtn.className = 'btn btn-sm btn-danger'
        delBtn.innerHTML = '×'
        delBtn.title = 'Delete Sample'
        delBtn.style.padding = '2px 6px'
        delBtn.onclick = (e) => {
          e.stopPropagation()
          this.state.instruments.splice(idx, 1)
          this.state.grid.splice(idx, 1)
          saveState(this.state)
          this.engine.setInstruments(this.state.instruments)
          this.renderSidebar()
          this.renderGrid()
        }

        controls.appendChild(volInput)
        controls.appendChild(modeSelect)
        controls.appendChild(delBtn)
        row.appendChild(controls)
      }

      if (inst.id === this.state.selectedInstrument) {
        row.classList.add('selected')
      }

      row.addEventListener('mouseenter', () => {
        this.hovered = {
          type: 'instrument',
          row: idx,
          instrumentId: inst.id
        }
        this.updateStatus()
      })

      row.addEventListener('mouseleave', () => {
        this.hovered = { type: 'none' }
        this.updateStatus()
      })

      row.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.sampler-controls')) {
          if (this.inputMode === 'click') {
            this.hovered = {
              type: 'instrument',
              row: idx,
              instrumentId: inst.id
            }
            this.handleKeyActivate()
          }
        }
      })

      this.sidebar.appendChild(row)
      this.instrEls.push(row)
    })
  }

  private updateSidebarSelection() {
    this.instrEls.forEach((el, idx) => {
      el.classList.toggle(
        'selected',
        this.state.instruments[idx].id === this.state.selectedInstrument
      )
    })
  }

  private renderGrid() {
    const start = this.currentPage * this.PAGE_SIZE
    const end = start + this.PAGE_SIZE

    const indicator = document.getElementById('page-indicator')
    if (indicator) {
      indicator.textContent = `Page ${this.currentPage + 1} of ${Math.ceil(this.state.steps / this.PAGE_SIZE)}`
    }

    const numbers = document.getElementById('beat-numbers')!
    numbers.innerHTML = ''
    for (let c = start; c < end; c++) {
      const num = document.createElement('span')
      num.className = 'beat-num'
      num.textContent = String(c + 1)
      num.dataset.col = String(c)
      numbers.appendChild(num)
    }

    this.gridEl.style.setProperty('--page-size', String(this.PAGE_SIZE))
    numbers.style.setProperty('--page-size', String(this.PAGE_SIZE))

    this.gridEl.innerHTML = ''
    this.cellEls = []

    this.state.instruments.forEach((inst, rIdx) => {
      const row = document.createElement('div')
      row.className = 'grid-row'
      row.dataset.row = String(rIdx)
      this.cellEls[rIdx] = []

      for (let cIdx = start; cIdx < end; cIdx++) {
        const cell = document.createElement('div')
        cell.className = 'grid-cell'
        cell.dataset.row = String(rIdx)
        cell.dataset.col = String(cIdx)

        if (cIdx % 4 === 0) {
          cell.classList.add('beat-start')
        }

        if (this.state.grid[rIdx][cIdx]) {
          cell.classList.add('filled')
          cell.style.setProperty('--note-color', inst.color)
          cell.style.setProperty('--note-color-hover', inst.colorHover)
        }

        cell.addEventListener('mouseenter', () => {
          this.hovered = { type: 'cell', row: rIdx, col: cIdx }
          this.updateStatus()
        })

        cell.addEventListener('mouseleave', () => {
          this.hovered = { type: 'none' }
          this.updateStatus()
        })

        cell.addEventListener('click', () => {
          if (this.inputMode === 'click') {
            this.hovered = { type: 'cell', row: rIdx, col: cIdx }
            this.handleKeyActivate()
          }
        })

        row.appendChild(cell)
        this.cellEls[rIdx][cIdx] = cell
      }
      this.gridEl.appendChild(row)
    })
  }

  private updateCell(row: number, col: number) {
    const cell = this.cellEls[row]?.[col]
    if (!cell) return

    const inst = this.state.instruments[row]
    const filled = this.state.grid[row][col]

    cell.classList.toggle('filled', filled)
    if (filled) {
      cell.style.setProperty('--note-color', inst.color)
      cell.style.setProperty('--note-color-hover', inst.colorHover)
      cell.classList.add('pop-in')
      cell.addEventListener(
        'animationend',
        () => cell.classList.remove('pop-in'),
        { once: true }
      )
    } else {
      cell.style.removeProperty('--note-color')
      cell.style.removeProperty('--note-color-hover')
    }
  }

  private updatePlayhead() {
    const activePage = Math.floor(this.currentStep / this.PAGE_SIZE)
    if (this.state.playing && activePage !== this.currentPage) {
      this.currentPage = activePage
      this.renderGrid()
      this.updateStatus()
    }

    document.querySelectorAll('.grid-cell.active-step').forEach((el) => {
      el.classList.remove('active-step')
    })

    this.state.instruments.forEach((_, rIdx) => {
      const cell = this.cellEls[rIdx]?.[this.currentStep]
      if (cell) {
        cell.classList.add('active-step')
      }
    })
  }

  private updatePlayBtn() {
    this.playBtn.classList.toggle('playing', this.state.playing)
    const label = this.playBtn.querySelector('.btn-label')!
    label.textContent = this.state.playing ? 'Stop' : 'Play'
  }

  private updateBpmDisplay() {
    this.bpmDisplay.textContent = `${this.state.bpm} BPM`
  }

  private updateFXDisplay() {
    this.reverbBtn.textContent = `Reverb: ${this.state.reverbEnabled ? 'ON' : 'OFF'}`
    this.pitchDisplay.textContent = `Pitch: ${this.state.pitchShift}`
  }

  private updateStatus() {
    const t = this.hovered
    const actionText = this.inputMode === 'click' ? '<kbd>Click</kbd>' : this.inputMode === 'space' ? 'Press <kbd>Space</kbd>' : ''
    let status = this.inputMode ? `Hover your mouse anywhere to interact (${actionText})` : 'Choose your input method above to begin'

    switch (t.type) {
      case 'cell': {
        const name = this.state.instruments[t.row!].label
        status = this.state.grid[t.row!][t.col!]
          ? `${actionText} to remove this <strong>${name}</strong> note`
          : `${actionText} to place a <strong>${name}</strong> note`
        break
      }
      case 'instrument':
        status = `${actionText} to select <strong>${this.state.instruments[t.row!].label}</strong>`
        break
      case 'play':
        status = this.state.playing
          ? `${actionText} to stop playback`
          : `${actionText} to start playback`
        break
      case 'add-sound':
        status = `${actionText} to upload a custom sample (.mp3, .wav)`
        break
      case 'add-mic':
        status = `${actionText} to start microphone recording`
        break
      case 'stop-recording':
        status = `${actionText} to STOP recording and add it as a track`
        break
      case 'page-prev':
        status = `${actionText} to view previous page`
        break
      case 'page-next':
        status = `${actionText} to view next page`
        break
      case 'page-add':
        status = `${actionText} to add a new page (16 steps)`
        break
      case 'page-remove':
        status = `${actionText} to remove the last page`
        break
      case 'genre':
        status = `${actionText} to cycle through genre kits`
        break
      case 'reverb':
        status = `${actionText} to toggle global Reverb`
        break
      case 'pitch-up':
        status = `${actionText} to transpose global pitch up 1 semitone`
        break
      case 'pitch-down':
        status = `${actionText} to transpose global pitch down 1 semitone`
        break
      case 'bpm-plus':
        status = `${actionText} to increase BPM (+5)`
        break
      case 'bpm-minus':
        status = `${actionText} to decrease BPM (−5)`
        break
      case 'save':
        status = `${actionText} to save your pattern`
        break
      case 'export':
        status = `${actionText} to export WAV`
        break
      case 'clear':
        status = `${actionText} to clear the grid`
        break
    }
    this.statusText.innerHTML = status
  }

  private bindEvents() {
    const startAudio = async () => {
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }
    }

    const modeSelect = document.getElementById('mode-select') as HTMLSelectElement
    if (modeSelect) {
      modeSelect.value = this.inputMode || 'click'
      modeSelect.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value as InputMode
        this.applyMode(val)
      })
    }

    const btnClick = document.getElementById('mode-btn-click')
    const btnSpace = document.getElementById('mode-btn-space')
    if (btnClick) btnClick.addEventListener('click', () => this.applyMode('click'))
    if (btnSpace) btnSpace.addEventListener('click', () => this.applyMode('space'))

    document.addEventListener('click', startAudio, { capture: true })

    document.addEventListener('keydown', (e) => {
      startAudio()
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
        if (e.code === 'Enter') {
          e.preventDefault()
          this.togglePlay()
          return
        }
      }

      if (
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) &&
        this.inputMode === 'space' &&
        e.code === 'Space'
      ) {
        e.preventDefault()
        if (!this.keyHeld) {
          this.keyHeld = true
          if (this.hovered.type === 'none' && e.shiftKey) {
            const genres: AppState['genre'][] = ['house', 'trap', 'synthwave', 'tuff phonk', 'lo-fi', 'techno']
            const nextIdx = (genres.indexOf(this.state.genre) + 1) % genres.length
            const g = genres[nextIdx]
            this.state.genre = g
            this.engine.setGenre(g)
            this.updateBaseInstruments(g).catch(console.error)
            const selectEl = document.getElementById('genre-select') as HTMLSelectElement
            if (selectEl) {
              selectEl.value = g
            }
            saveState(this.state)
            return
          }
          if (this.hovered.type === 'none') {
            return
          }
          this.handleKeyActivate()
          this.previewTimeout = setTimeout(() => {
            this.handleKeyHold()
          }, 200)
        }
      }
    })

    document.addEventListener('keyup', (e) => {
      if (this.inputMode === 'space' && e.code === 'Space') {
        e.preventDefault()
        this.keyHeld = false
        if (this.previewTimeout) {
          clearTimeout(this.previewTimeout)
          this.previewTimeout = null
        }
      }
    })

    this.setupInstantsListeners()
  }

  private handleKeyActivate() {
    const t = this.hovered
    switch (t.type) {
      case 'cell': {
        const { row: r, col: o } = t
        if (r === undefined || o === undefined) return
        const a = this.state.grid[r][o]
        this.state.grid[r][o] = !a
        this.updateCell(r, o)
        if (!a) {
          this.engine.previewInstrument(this.state.instruments[r].id)
        }
        break
      }
      case 'instrument': {
        if (t.instrumentId === undefined) return
        this.state.selectedInstrument = t.instrumentId
        this.updateSidebarSelection()
        this.engine.previewInstrument(t.instrumentId)
        break
      }
      case 'play':
        this.togglePlay()
        break
      case 'bpm-plus':
        this.adjustBpm(5)
        break
      case 'bpm-minus':
        this.adjustBpm(-5)
        break
      case 'save':
        this.doSave()
        break
      case 'export':
        this.doExport()
        break
      case 'clear':
        this.doClear()
        break
      case 'add-sound':
        this.doUploadSound()
        break
      case 'add-mic':
      case 'stop-recording':
        this.toggleRecording()
        break
      case 'page-prev':
        if (this.currentPage > 0) {
          this.currentPage--
          this.renderGrid()
        }
        break
      case 'page-next':
        if (this.currentPage < Math.ceil(this.state.steps / this.PAGE_SIZE) - 1) {
          this.currentPage++
          this.renderGrid()
        }
        break
      case 'page-add':
        this.state.steps += this.PAGE_SIZE
        this.state.grid.forEach((r) => {
          for (let o = 0; o < this.PAGE_SIZE; o++) {
            r.push(false)
          }
        })
        this.currentPage = Math.ceil(this.state.steps / this.PAGE_SIZE) - 1
        this.renderGrid()
        break
      case 'page-remove':
        if (this.state.steps > this.PAGE_SIZE) {
          this.state.steps -= this.PAGE_SIZE
          this.state.grid.forEach((r) => {
            r.length = this.state.steps
          })
          if (this.currentPage >= Math.ceil(this.state.steps / this.PAGE_SIZE)) {
            this.currentPage = Math.ceil(this.state.steps / this.PAGE_SIZE) - 1
          }
          this.renderGrid()
        }
        break
      case 'genre': {
        const genres: AppState['genre'][] = ['house', 'trap', 'synthwave', 'tuff phonk', 'lo-fi', 'techno']
        const nextIdx = (genres.indexOf(this.state.genre) + 1) % genres.length
        const g = genres[nextIdx]
        this.state.genre = g
        this.engine.setGenre(g)
        const selectEl = document.getElementById('genre-select') as HTMLSelectElement
        if (selectEl) {
          selectEl.value = g
        }
        saveState(this.state)
        break
      }
      case 'reverb':
        this.state.reverbEnabled = !this.state.reverbEnabled
        this.engine.setReverb(this.state.reverbEnabled)
        this.updateFXDisplay()
        saveState(this.state)
        break
      case 'pitch-up':
        this.state.pitchShift = Math.min(this.state.pitchShift + 1, 12)
        this.engine.setPitchShift(this.state.pitchShift)
        this.updateFXDisplay()
        saveState(this.state)
        break
      case 'pitch-down':
        this.state.pitchShift = Math.max(this.state.pitchShift - 1, -12)
        this.engine.setPitchShift(this.state.pitchShift)
        this.updateFXDisplay()
        saveState(this.state)
        break
    }
  }

  private handleKeyHold() {
    const t = this.hovered
    if (t.type === 'cell' && t.row !== undefined) {
      this.engine.previewInstrument(this.state.instruments[t.row].id)
    } else if (t.type === 'instrument' && t.instrumentId) {
      this.engine.previewInstrument(t.instrumentId)
    }
  }

  private async togglePlay() {
    if (this.state.playing) {
      this.state.playing = false
      this.engine.stop()
      document.querySelectorAll('.grid-cell.active-step').forEach((t) => {
        t.classList.remove('active-step')
      })
    } else {
      this.state.playing = true
      await this.engine.start(this.state.grid, this.state.bpm)
    }
    this.updatePlayBtn()
    this.updateStatus()
  }

  private adjustBpm(t: number) {
    this.state.bpm = Math.max(40, Math.min(240, this.state.bpm + t))
    this.engine.setBpm(this.state.bpm)
    this.updateBpmDisplay()
    this.bpmDisplay.classList.add('bpm-bump')
    this.bpmDisplay.addEventListener(
      'animationend',
      () => {
        this.bpmDisplay.classList.remove('bpm-bump')
      },
      { once: true }
    )
  }

  private setupInstantsListeners() {
    const modal = document.getElementById('instants-modal')!
    const closeBtn = document.getElementById('close-instants-btn')!
    const searchInput = document.getElementById('instants-search-input') as HTMLInputElement
    const searchBtn = document.getElementById('instants-search-btn')!
    const resultsContainer = document.getElementById('instants-results')!

    const saveBtn = document.getElementById('save-btn')
    saveBtn?.addEventListener('click', () => {
      saveState(this.state)
      const h = document.getElementById('save-btn')
      if (h) {
        const u = h.textContent
        h.textContent = 'Saved!'
        h.style.background = 'var(--success, #2ecc71)'
        h.style.borderColor = 'var(--success, #2ecc71)'
        h.style.color = '#fff'
        setTimeout(() => {
          h.textContent = u
          h.style.background = ''
          h.style.borderColor = ''
          h.style.color = ''
        }, 1500)
      }
    })

    const themeBtn = document.getElementById('theme-btn')
    themeBtn?.addEventListener('click', () => {
      const doc = document.documentElement
      if (
        doc.classList.contains('dark') ||
        (!doc.classList.contains('light') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        doc.classList.remove('dark')
        doc.classList.add('light')
        const btn = document.getElementById('theme-btn')
        if (btn) btn.textContent = '☀️'
      } else {
        doc.classList.remove('light')
        doc.classList.add('dark')
        const btn = document.getElementById('theme-btn')
        if (btn) btn.textContent = '🌙'
      }
    })

    const addInstantsBtn = document.getElementById('add-instants-btn')
    addInstantsBtn?.addEventListener('click', () => {
      modal.style.display = 'flex'
      searchInput.focus()
    })

    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none'
    })

    const performSearch = async () => {
      const q = searchInput.value.trim()
      if (q) {
        resultsContainer.innerHTML = '<p class="soundboard-hint">Searching...</p>'
        try {
          const res = await fetch(`http://localhost:8000/search?q=${encodeURIComponent(q)}`)
          const parsed = await res.json()
          if (parsed.data && Array.isArray(parsed.data)) {
            this.renderInstantsResults(parsed.data)
          } else {
            resultsContainer.innerHTML = '<p class="soundboard-hint">No results found.</p>'
          }
        } catch {
          resultsContainer.innerHTML =
            '<p class="soundboard-hint" style="color:red;">Error connecting to API. Is it running?</p>'
        }
      }
    }

    searchBtn.addEventListener('click', performSearch)
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        performSearch()
      }
    })
  }

  private renderInstantsResults(results: any[]) {
    const container = document.getElementById('instants-results')
    if (!container) return

    container.innerHTML = ''
    if (results.length === 0) {
      container.innerHTML = '<p class="soundboard-hint">No results found.</p>'
      return
    }

    results.forEach((item) => {
      const card = document.createElement('div')
      card.className = 'soundboard-result-card'

      const title = document.createElement('div')
      title.className = 'soundboard-result-title'
      title.textContent = item.title

      const actions = document.createElement('div')
      actions.className = 'soundboard-result-actions'

      const importBtn = document.createElement('button')
      importBtn.className = 'btn btn-sm btn-primary'
      importBtn.textContent = 'Import to Grid'
      importBtn.onclick = async () => {
        const url = this.engine.getProxyUrl(item.mp3)
        const id = 'instants-' + Date.now().toString()
        const newInst: Instrument = {
          id,
          label: item.title.substring(0, 15),
          color: '#9b59b6',
          colorHover: '#8e44ad',
          type: 'sampler',
          audioData: url,
          volume: 0.8,
          playbackMode: 'oneshot'
        }

        await this.engine.loadSample(id, url)
        this.state.instruments.push(newInst)
        this.state.grid.push(new Array(this.state.steps).fill(false))
        saveState(this.state)
        this.renderSidebar()
        this.renderGrid()
        document.getElementById('instants-modal')!.style.display = 'none'
      }

      actions.appendChild(importBtn)
      card.appendChild(title)
      card.appendChild(actions)
      container.appendChild(card)
    })
  }

  private doUploadSound() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const id = 'custom_' + Date.now()
      const url = URL.createObjectURL(file)
      await this.engine.loadSample(id, url)
      const { color, colorHover } = this.getRandomColor()
      this.state.instruments.push({
        id,
        label: file.name.substring(0, 12),
        color,
        colorHover,
        type: 'sampler',
        audioData: url,
        volume: 0.8,
        playbackMode: 'oneshot'
      })
      this.state.grid.push(new Array(this.state.steps).fill(false))
      this.engine.setInstruments(this.state.instruments)
      this.renderSidebar()
      this.renderGrid()
    }
    input.click()
  }

  private async toggleRecording() {
    if (this.isRecording) {
      this.isRecording = false
      const url = await this.micRecorder.stopRecording()
      if (url) {
        const id = 'mic_' + Date.now()
        await this.engine.loadSample(id, url)
        const { color, colorHover } = this.getRandomColor()
        this.state.instruments.push({
          id,
          label: 'Mic ' + this.state.instruments.length,
          color,
          colorHover,
          type: 'sampler',
          audioData: url,
          volume: 0.8,
          playbackMode: 'oneshot'
        })
        this.state.grid.push(new Array(this.state.steps).fill(false))
        this.engine.setInstruments(this.state.instruments)
        this.renderSidebar()
        this.renderGrid()
      }
      const btn = document.getElementById('add-mic-btn')
      if (btn) btn.textContent = '+ Mic'
    } else {
      this.isRecording = true
      await this.micRecorder.startRecording()
      const btn = document.getElementById('add-mic-btn')
      if (btn) btn.textContent = 'Recording... (Stop)'
    }
    this.updateStatus()
  }

  private doSave() {
    saveState(this.state)
    this.saveBtn.classList.add('saved')
    this.saveBtn.textContent = 'Saved!'
    setTimeout(() => {
      this.saveBtn.classList.remove('saved')
      this.saveBtn.textContent = 'Save'
    }, 1200)
  }

  private doClear() {
    if (this.state.playing) {
      this.state.playing = false
      this.engine.stop()
      this.updatePlayBtn()
    }
    const cleared = clearGrid(this.state)
    this.state.grid = cleared.grid
    this.renderGrid()
    this.updateStatus()
  }

  private async doExport() {
    this.exportBtn.classList.add('saved')
    this.exportBtn.textContent = 'Exporting...'
    try {
      const blob = await this.engine.exportWav(this.state.grid, this.state.bpm)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'MiniMusicLab_Beat.wav'
      a.click()
      URL.revokeObjectURL(url)
      this.exportBtn.textContent = 'Exported!'
    } catch (e) {
      console.error('Export failed:', e)
      this.exportBtn.textContent = 'Failed'
    }
    setTimeout(() => {
      this.exportBtn.classList.remove('saved')
      this.exportBtn.textContent = 'Export WAV'
    }, 2000)
  }

  public syncGridToEngine() {
    this.engine.setGrid(this.state.grid)
  }
}
