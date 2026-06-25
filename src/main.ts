import './style.css'
import { loadState } from './state'
import { AudioEngine } from './audio'
import { App } from './app'

const state = loadState()
const engine = new AudioEngine()
new App(state, engine)
