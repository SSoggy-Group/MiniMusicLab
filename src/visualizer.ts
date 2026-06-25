import type { AudioEngine } from './audio'

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: AudioEngine;
  private rafId = 0;

  constructor(container: HTMLElement, engine: AudioEngine) {
    this.engine = engine

    this.canvas = document.createElement('canvas')
    this.canvas.className = 'visualizer-canvas'
    container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D not supported')
    this.ctx = ctx

    const ro = new ResizeObserver(() => this.resize())
    ro.observe(this.canvas)

    this.resize()
    this.loop()
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.ctx.scale(dpr, dpr)
  }

  private loop() {
    this.rafId = requestAnimationFrame(() => this.loop())
    this.draw()
  }

  private draw() {
    const { ctx, canvas } = this
    const W = canvas.width / (window.devicePixelRatio || 1)
    const H = canvas.height / (window.devicePixelRatio || 1)

    ctx.clearRect(0, 0, W, H)

    const data = this.engine.getWaveform()
    const barCount = 48
    const barW = W / barCount - 1
    const midY = H / 2

    ctx.fillStyle = '#4a6ea0'

    for (let i = 0; i < barCount; i++) {
      const sample = data[Math.floor((i / barCount) * data.length)]
      const h = Math.max(2, Math.abs(sample) * H * 1.8)
      const x = i * (W / barCount)
      const y = midY - h / 2

      ctx.globalAlpha = 0.4 + Math.abs(sample) * 0.6
      ctx.beginPath()
      ctx.roundRect(x, y, barW, h, 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1
  }

  destroy() {
    cancelAnimationFrame(this.rafId)
  }
}
