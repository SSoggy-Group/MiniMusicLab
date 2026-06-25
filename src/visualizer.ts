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
    // draw will be implemented in the next part
  }
}
