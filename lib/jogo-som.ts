/** Sons do joguinho, gerados na hora (WebAudio): nenhum arquivo para baixar. */
let ctx: AudioContext | null = null;
let mudo = false;
let ultimoTiro = 0;

export const setMudo = (m: boolean) => {
  mudo = m;
};

/** Precisa de um toque do usuário (política dos navegadores). */
export function ativarAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx?.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function nota(freq: number, fim: number, dur: number, tipo: OscillatorType, vol: number, atraso = 0) {
  if (!ctx || mudo) return;
  const t0 = ctx.currentTime + atraso;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, fim), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function ruido(dur: number, vol: number, corte: number) {
  if (!ctx || mudo) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = corte;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start();
}

export type Som = "tiro" | "tick" | "pop" | "caixa" | "bomba" | "dano" | "bonus" | "escudo" | "estrela" | "inicio" | "fim";

export function tocar(s: Som, combo = 0) {
  if (!ctx || mudo) return;
  switch (s) {
    case "tiro": {
      const agora = performance.now();
      if (agora - ultimoTiro < 90) return;
      ultimoTiro = agora;
      nota(900, 500, 0.05, "square", 0.012);
      break;
    }
    case "tick":
      nota(320, 260, 0.05, "triangle", 0.05);
      break;
    case "pop":
      nota(440 * (1 + Math.min(combo, 14) * 0.05), 900 * (1 + Math.min(combo, 14) * 0.05), 0.1, "triangle", 0.07);
      break;
    case "caixa":
      ruido(0.12, 0.08, 900);
      nota(160, 90, 0.1, "square", 0.04);
      break;
    case "bomba":
      ruido(0.3, 0.16, 1400);
      nota(120, 40, 0.28, "sine", 0.12);
      break;
    case "dano":
      nota(220, 55, 0.4, "sawtooth", 0.09);
      ruido(0.2, 0.06, 600);
      break;
    case "bonus":
      [523, 659, 784, 1047].forEach((f, i) => nota(f, f, 0.09, "square", 0.04, i * 0.06));
      break;
    case "escudo":
      nota(1300, 700, 0.1, "sine", 0.06);
      break;
    case "estrela":
      nota(988, 988, 0.12, "sine", 0.07);
      nota(1319, 1319, 0.2, "sine", 0.07, 0.1);
      break;
    case "inicio":
      nota(392, 392, 0.1, "triangle", 0.06);
      nota(587, 587, 0.16, "triangle", 0.06, 0.1);
      break;
    case "fim":
      [392, 330, 262, 196].forEach((f, i) => nota(f, f * 0.97, 0.22, "triangle", 0.07, i * 0.2));
      break;
  }
}
