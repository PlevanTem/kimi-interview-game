import { useEffect, useRef } from 'react'

/**
 * 锁定音。
 *
 * 整部游戏只有这一个音效，因为它标记着唯一一件值得庆祝的事：三条真相同时落定。
 * 用 WebAudio 现场合成一个纯五度，不加载任何音频资产。
 */
export function useChime(pulse: number, muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)
  const lastPulse = useRef(pulse)

  useEffect(() => {
    if (pulse === lastPulse.current) return
    lastPulse.current = pulse
    if (muted) return

    try {
      const AudioCtor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      const ctx = ctxRef.current ?? new AudioCtor()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') void ctx.resume()

      const now = ctx.currentTime
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6)
      gain.connect(ctx.destination)

      // 纯五度：392 Hz（G4）与 587.33 Hz（D5）。
      for (const [freq, detune] of [
        [392, 0],
        [587.33, -4],
      ] as const) {
        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now)
        osc.detune.setValueAtTime(detune, now)
        osc.connect(gain)
        osc.start(now)
        osc.stop(now + 1.7)
      }
    } catch {
      // 音频不可用时静默降级——它从来不是玩法的必要条件。
    }
  }, [pulse, muted])

  useEffect(() => {
    return () => {
      void ctxRef.current?.close()
      ctxRef.current = null
    }
  }, [])
}
