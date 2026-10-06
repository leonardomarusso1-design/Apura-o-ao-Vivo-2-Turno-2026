"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SITE_URL } from "@/lib/env";

/** Joguinho da espera: atire nos blocos, desvie de bombas e caixas. Canvas puro, sem som, sem bibliotecas. */
const W = 360;
const H = 640;
const PX = 28; // largura do bonequinho
const PY = H - 78;
const LS_BEST = "apuracao:jogo:melhor";
const PTS_ESTRELA = 150;

type Cor = "vermelho" | "verde";
type Obj = { x: number; y: number; w: number; h: number; vy: number; kind: "bloco" | "bomba" | "caixa"; cor: Cor; hp: number; giro: number };
type Tiro = { x: number; y: number };
type Part = { x: number; y: number; vx: number; vy: number; vida: number; cor: string };
type Aviso = { t: string; x: number; y: number; vida: number };
type Fase = "pronto" | "jogando" | "pausa" | "fim";
type BonusKind = "rapido" | "x2" | "x3" | "escudo" | "lento" | "vida" | "limpa";
type Bonus = { x: number; y: number; vy: number; kind: BonusKind };

const BONUS: Record<BonusKind, { e: string; cor: string; txt: string; peso: number }> = {
  rapido: { e: "⚡", cor: "#facc15", txt: "Tiro rápido!", peso: 22 },
  x2: { e: "✌️", cor: "#38bdf8", txt: "Tiro duplo!", peso: 20 },
  x3: { e: "🔱", cor: "#a78bfa", txt: "Tiro triplo!", peso: 12 },
  escudo: { e: "🛡️", cor: "#22d3ee", txt: "Escudo!", peso: 20 },
  lento: { e: "⏳", cor: "#94a3b8", txt: "Câmera lenta!", peso: 14 },
  vida: { e: "➕", cor: "#f472b6", txt: "+1 vida!", peso: 6 },
  limpa: { e: "💥", cor: "#f97316", txt: "Limpou a tela!", peso: 6 },
};
const DUR = { rapido: 8, multi: 10, escudo: 8, lento: 6 };
const MAX_VIDAS = 5;

const COR: Record<Cor, [string, string]> = { vermelho: ["#ef4444", "#fca5a5"], verde: ["#22c55e", "#86efac"] };

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export default function Jogo() {
  const cv = useRef<HTMLCanvasElement>(null);
  const fase = useRef<Fase>("pronto");
  const alvoX = useRef(W / 2);
  const teclas = useRef({ e: false, d: false });
  const [fim, setFim] = useState<{ pontos: number; estrelas: number; melhor: number } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const iniciar = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = cv.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    let melhor = 0;
    try {
      melhor = Number(localStorage.getItem(LS_BEST) ?? "0") || 0;
    } catch {
      /* sem armazenamento */
    }

    // estado do jogo (fora do React: não renderiza a cada quadro)
    let px = W / 2;
    let objs: Obj[] = [];
    let tiros: Tiro[] = [];
    let parts: Part[] = [];
    let avisos: Aviso[] = [];
    let bonus: Bonus[] = [];
    const ef = { rapido: 0, multi: 0, multiN: 2, escudo: 0, lento: 0 };
    let semBonus = 0;
    let pontos = 0;
    let vidas = 3;
    let combo = 0;
    let estrelas = 0;
    let tSpawn = 0.4;
    let tTiro = 0;
    let imune = 0;
    let tremer = 0;
    let t = 0;
    let ultimo = 0;
    let raf = 0;

    const nivel = () => 1 + Math.floor(pontos / 120);
    const dif = () => Math.min(nivel(), 10); // a dificuldade para de subir no nível 10 (o placar continua)
    const mult = () => (combo >= 20 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1);

    const explode = (x: number, y: number, cores: string[], n = 14) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 60 + Math.random() * 180;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, vida: 0.4 + Math.random() * 0.4, cor: cores[i % cores.length] });
      }
    };

    const novo = () => {
      px = W / 2;
      alvoX.current = W / 2;
      objs = [];
      tiros = [];
      parts = [];
      avisos = [];
      bonus = [];
      ef.rapido = 0;
      ef.multi = 0;
      ef.multiN = 2;
      ef.escudo = 0;
      ef.lento = 0;
      semBonus = 0;
      pontos = 0;
      vidas = 3;
      combo = 0;
      estrelas = 0;
      tSpawn = 0.4;
      tTiro = 0;
      imune = 0;
      tremer = 0;
      t = 0;
      fase.current = "jogando";
      setFim(null);
      setCopiado(false);
    };
    iniciar.current = novo;

    const terminar = () => {
      fase.current = "fim";
      if (pontos > melhor) {
        melhor = pontos;
        try {
          localStorage.setItem(LS_BEST, String(melhor));
        } catch {
          /* ignora */
        }
      }
      setFim({ pontos, estrelas, melhor });
    };

    const gerar = () => {
      const n = dif();
      const r = Math.random();
      const kind: Obj["kind"] = r < 0.62 ? "bloco" : r < 0.8 ? "bomba" : n >= 2 ? "caixa" : "bloco";
      const big = kind === "bloco" && n >= 3 && Math.random() < 0.3;
      const w = kind === "bloco" ? (big ? 56 : 40) : kind === "bomba" ? 34 : 46;
      const h = kind === "bloco" ? (big ? 40 : 32) : kind === "bomba" ? 34 : 40;
      objs.push({
        x: 10 + Math.random() * (W - w - 20),
        y: -h,
        w,
        h,
        vy: 80 + n * 11 + Math.random() * 30,
        kind,
        cor: Math.random() < 0.5 ? "vermelho" : "verde",
        hp: kind === "caixa" ? 3 : big ? 2 : 1,
        giro: (Math.random() - 0.5) * 0.4,
      });
    };

    const soltaBonus = (x: number, y: number) => {
      if (!(Math.random() < 0.1 || semBonus > 12)) return;
      semBonus = 0;
      const lista = (Object.keys(BONUS) as BonusKind[]).filter((k) => k !== "vida" || vidas < MAX_VIDAS);
      let r = Math.random() * lista.reduce((a, k) => a + BONUS[k].peso, 0);
      let kind = lista[0];
      for (const k of lista) {
        r -= BONUS[k].peso;
        if (r <= 0) {
          kind = k;
          break;
        }
      }
      bonus.push({ x: Math.max(20, Math.min(W - 20, x)), y, vy: 95, kind });
    };

    const pegaBonus = (b: Bonus) => {
      const info = BONUS[b.kind];
      avisos.push({ t: `${info.e} ${info.txt}`, x: Math.max(70, Math.min(W - 70, px)), y: PY - 50, vida: 1.1 });
      explode(b.x, b.y, [info.cor, "#ffffff"], 10);
      if (navigator.vibrate) navigator.vibrate(15);
      if (b.kind === "rapido") ef.rapido = DUR.rapido;
      else if (b.kind === "x2") {
        ef.multi = DUR.multi;
        ef.multiN = Math.max(ef.multiN, 2);
      } else if (b.kind === "x3") {
        ef.multi = DUR.multi;
        ef.multiN = 3;
      } else if (b.kind === "escudo") ef.escudo = DUR.escudo;
      else if (b.kind === "lento") ef.lento = DUR.lento;
      else if (b.kind === "vida") vidas = Math.min(MAX_VIDAS, vidas + 1);
      else {
        for (const o of objs) {
          if (o.hp > 0 && o.kind !== "bloco") {
            o.hp = 0;
            pontos += 10;
            explode(o.x + o.w / 2, o.y + o.h / 2, ["#f97316", "#facc15", "#fef08a"], 12);
          }
        }
        tremer = 0.3;
      }
    };

    const passo = (dt: number) => {
      t += dt;
      // movimento: dedo/mouse define o alvo; setas movem o alvo
      if (teclas.current.e) alvoX.current -= 340 * dt;
      if (teclas.current.d) alvoX.current += 340 * dt;
      alvoX.current = Math.max(PX / 2 + 4, Math.min(W - PX / 2 - 4, alvoX.current));
      px += (alvoX.current - px) * Math.min(1, dt * 16);

      tTiro -= dt;
      if (tTiro <= 0) {
        const xs = ef.multi > 0 ? (ef.multiN === 3 ? [-12, 0, 12] : [-7, 7]) : [0];
        for (const d of xs) tiros.push({ x: px + d, y: PY - 26 });
        tTiro = ef.rapido > 0 ? 0.12 : 0.27;
      }
      ef.rapido = Math.max(0, ef.rapido - dt);
      ef.multi = Math.max(0, ef.multi - dt);
      ef.escudo = Math.max(0, ef.escudo - dt);
      ef.lento = Math.max(0, ef.lento - dt);
      if (ef.multi <= 0) ef.multiN = 2;
      semBonus += dt;
      tSpawn -= dt;
      if (tSpawn <= 0) {
        gerar();
        tSpawn = Math.max(0.5, 0.85 - dif() * 0.04) * (0.8 + Math.random() * 0.4);
      }

      for (const s of tiros) s.y -= 560 * dt;
      tiros = tiros.filter((s) => s.y > -20);

      const dtO = ef.lento > 0 ? dt * 0.5 : dt;
      for (const o of objs) o.y += o.vy * dtO;

      // tiros x objetos
      for (const s of tiros) {
        for (const o of objs) {
          if (o.hp <= 0 || s.y < -50) continue;
          if (s.x > o.x - 3 && s.x < o.x + o.w + 3 && s.y > o.y && s.y < o.y + o.h) {
            s.y = -100; // consome o tiro
            if (o.kind === "bloco") {
              o.hp--;
              explode(s.x, o.y + o.h / 2, [COR[o.cor][0], COR[o.cor][1]], o.hp <= 0 ? 12 : 4);
              if (o.hp <= 0) {
                combo++;
                soltaBonus(o.x + o.w / 2, o.y + o.h / 2);
                const ganho = (o.w > 44 ? 20 : 10) * mult();
                pontos += ganho;
                avisos.push({ t: `+${ganho}`, x: o.x + o.w / 2, y: o.y, vida: 0.7 });
                if (navigator.vibrate) navigator.vibrate(8);
              }
            } else if (o.kind === "bomba") {
              o.hp = 0;
              explode(o.x + o.w / 2, o.y + o.h / 2, ["#f97316", "#facc15", "#fef08a"], 18);
              tremer = 0.15;
            } else {
              o.hp--;
              explode(s.x, o.y + o.h / 2, ["#a16207", "#ca8a04"], 5);
              if (o.hp <= 0) {
                pontos += 5;
                avisos.push({ t: "+5", x: o.x + o.w / 2, y: o.y, vida: 0.6 });
              }
            }
          }
        }
      }
      tiros = tiros.filter((s) => s.y > -50);

      // objetos x jogador (blocos passam por ele; bomba e caixa machucam)
      if (imune > 0) imune -= dt;
      for (const o of objs) {
        if (o.hp <= 0) continue;
        const bate = o.x < px + PX / 2 && o.x + o.w > px - PX / 2 && o.y + o.h > PY - 22 && o.y < PY + 24;
        if (bate && o.kind !== "bloco" && ef.escudo > 0) {
          o.hp = 0;
          pontos += 5;
          avisos.push({ t: "+5", x: o.x + o.w / 2, y: o.y, vida: 0.6 });
          explode(o.x + o.w / 2, o.y + o.h / 2, ["#22d3ee", "#a5f3fc"], 12);
          continue;
        }
        if (bate && o.kind !== "bloco" && imune <= 0) {
          o.hp = 0;
          vidas--;
          combo = 0;
          imune = 1.3;
          tremer = 0.3;
          explode(px, PY, ["#ef4444", "#f97316", "#fde68a"], 24);
          if (navigator.vibrate) navigator.vibrate(60);
          if (vidas <= 0) {
            terminar();
            return;
          }
        }
        if (o.kind === "bloco" && o.hp > 0 && o.y > H) combo = 0; // bloco que passou
      }
      objs = objs.filter((o) => o.hp > 0 && o.y < H + 10);

      for (const b of bonus) {
        b.y += b.vy * dt;
        if (Math.abs(b.x - px) < PX / 2 + 14 && b.y > PY - 40 && b.y < PY + 28) {
          pegaBonus(b);
          b.y = H + 100;
        }
      }
      bonus = bonus.filter((b) => b.y < H + 20);

      // estrelas a cada PTS_ESTRELA pontos
      const novas = Math.floor(pontos / PTS_ESTRELA);
      if (novas > estrelas) {
        estrelas = novas;
        avisos.push({ t: "⭐ +1 estrela", x: W / 2, y: H / 2 - 40, vida: 1.2 });
      }

      for (const p of parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 420 * dt;
        p.vida -= dt;
      }
      parts = parts.filter((p) => p.vida > 0);
      for (const a of avisos) {
        a.y -= 40 * dt;
        a.vida -= dt;
      }
      avisos = avisos.filter((a) => a.vida > 0);
      if (tremer > 0) tremer -= dt;
    };

    const desenhaFundo = () => {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0b1220");
      g.addColorStop(1, "#111c2e");
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "rgba(255,255,255,0.04)";
      c.lineWidth = 1;
      for (let y = (t * 30) % 40; y < H; y += 40) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(W, y);
        c.stroke();
      }
      c.fillStyle = "rgba(255,255,255,0.06)";
      c.fillRect(0, PY + 26, W, 2);
    };

    const desenhaObj = (o: Obj) => {
      c.save();
      c.translate(o.x + o.w / 2, o.y + o.h / 2);
      if (o.kind === "bloco") {
        const [a, b] = COR[o.cor];
        rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 7);
        c.fillStyle = a;
        c.fill();
        rr(c, -o.w / 2 + 3, -o.h / 2 + 3, o.w - 6, 7, 3);
        c.fillStyle = b;
        c.globalAlpha = 0.55;
        c.fill();
        c.globalAlpha = 1;
        if (o.hp > 1) {
          c.fillStyle = "rgba(0,0,0,0.35)";
          c.font = "bold 14px system-ui";
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillText(String(o.hp), 0, 2);
        }
      } else if (o.kind === "bomba") {
        c.rotate(Math.sin(t * 8 + o.x) * 0.15);
        c.beginPath();
        c.arc(0, 2, o.w / 2 - 2, 0, Math.PI * 2);
        c.fillStyle = "#0f172a";
        c.fill();
        c.strokeStyle = "#475569";
        c.lineWidth = 2;
        c.stroke();
        c.beginPath();
        c.arc(-5, -3, 4, 0, Math.PI * 2);
        c.fillStyle = "rgba(255,255,255,0.35)";
        c.fill();
        c.strokeStyle = "#a3a3a3";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(4, -14);
        c.quadraticCurveTo(10, -22, 14, -20);
        c.stroke();
        c.beginPath();
        c.arc(14, -20, 3 + Math.sin(t * 20) * 1.2, 0, Math.PI * 2);
        c.fillStyle = "#fbbf24";
        c.fill();
      } else {
        rr(c, -o.w / 2, -o.h / 2, o.w, o.h, 4);
        c.fillStyle = "#a16207";
        c.fill();
        c.strokeStyle = "#713f12";
        c.lineWidth = 3;
        c.stroke();
        c.beginPath();
        c.moveTo(-o.w / 2 + 4, -o.h / 2 + 4);
        c.lineTo(o.w / 2 - 4, o.h / 2 - 4);
        c.moveTo(o.w / 2 - 4, -o.h / 2 + 4);
        c.lineTo(-o.w / 2 + 4, o.h / 2 - 4);
        c.stroke();
        c.fillStyle = "rgba(0,0,0,0.4)";
        c.font = "bold 12px system-ui";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("x".repeat(o.hp), 0, 0);
      }
      c.restore();
    };

    const desenhaJogador = () => {
      if (imune > 0 && Math.floor(t * 14) % 2 === 0) return; // pisca quando imune
      c.save();
      c.translate(px, PY);
      if (ef.escudo > 0 && (ef.escudo > 2 || Math.floor(t * 10) % 2 === 0)) {
        c.beginPath();
        c.arc(0, -4, 32, 0, Math.PI * 2);
        c.fillStyle = "rgba(34,211,238,0.14)";
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = "rgba(34,211,238,0.85)";
        c.stroke();
      }
      c.fillStyle = "#38bdf8"; // corpo
      rr(c, -12, -6, 24, 28, 7);
      c.fill();
      c.fillStyle = "#fcd9b6"; // cabeça
      c.beginPath();
      c.arc(0, -16, 11, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#0f172a"; // olhos
      c.fillRect(-5, -18, 3, 4);
      c.fillRect(3, -18, 3, 4);
      c.fillStyle = "#facc15"; // boné
      c.beginPath();
      c.arc(0, -19, 11, Math.PI, 0);
      c.fill();
      c.fillStyle = "#94a3b8"; // arminha
      rr(c, -3, -34, 6, 20, 2);
      c.fill();
      if (tTiro > 0.2) {
        c.fillStyle = "#fde047";
        c.beginPath();
        c.arc(0, -38, 6, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    };

    const desenha = () => {
      c.save();
      if (tremer > 0) c.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      desenhaFundo();
      for (const o of objs) desenhaObj(o);
      for (const b of bonus) {
        const info = BONUS[b.kind];
        const r = 15 + Math.sin(t * 8) * 1.5;
        c.beginPath();
        c.arc(b.x, b.y, r + 5, 0, Math.PI * 2);
        c.fillStyle = info.cor;
        c.globalAlpha = 0.25;
        c.fill();
        c.globalAlpha = 1;
        c.beginPath();
        c.arc(b.x, b.y, r, 0, Math.PI * 2);
        c.fillStyle = "#0f172a";
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = info.cor;
        c.stroke();
        c.font = "16px system-ui";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = "#fff";
        c.fillText(info.e, b.x, b.y + 1);
      }
      c.fillStyle = "#fde047";
      for (const s of tiros) {
        c.beginPath();
        c.arc(s.x, s.y, 4, 0, Math.PI * 2);
        c.fill();
      }
      for (const p of parts) {
        c.globalAlpha = Math.max(0, p.vida * 2);
        c.fillStyle = p.cor;
        c.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      c.globalAlpha = 1;
      if (fase.current !== "pronto") desenhaJogador();
      for (const a of avisos) {
        c.globalAlpha = Math.min(1, a.vida * 2);
        c.fillStyle = "#fef08a";
        c.font = "bold 16px system-ui";
        c.textAlign = "center";
        c.fillText(a.t, a.x, a.y);
      }
      c.globalAlpha = 1;
      c.restore();

      // placar
      c.textBaseline = "alphabetic";
      c.textAlign = "left";
      c.fillStyle = "#f8fafc";
      c.font = "bold 22px system-ui";
      c.fillText(String(pontos), 14, 32);
      c.font = "12px system-ui";
      c.fillStyle = "#94a3b8";
      c.fillText(`nível ${nivel()}`, 14, 50);
      if (combo >= 2) {
        c.fillStyle = "#fde047";
        c.fillText(`combo ${combo}  x${mult()}`, 14, 66);
      }
      const ativos: [string, number, number, string][] = [];
      if (ef.rapido > 0) ativos.push(["⚡", ef.rapido, DUR.rapido, "#facc15"]);
      if (ef.multi > 0) ativos.push([ef.multiN === 3 ? "🔱" : "✌️", ef.multi, DUR.multi, "#a78bfa"]);
      if (ef.escudo > 0) ativos.push(["🛡️", ef.escudo, DUR.escudo, "#22d3ee"]);
      if (ef.lento > 0) ativos.push(["⏳", ef.lento, DUR.lento, "#94a3b8"]);
      ativos.forEach(([e, rest, tot, cor], i) => {
        const x = 14 + i * 40;
        c.textAlign = "left";
        c.font = "16px system-ui";
        c.fillStyle = "#fff";
        c.fillText(e, x, 92);
        c.fillStyle = "rgba(255,255,255,0.15)";
        c.fillRect(x, 98, 30, 4);
        c.fillStyle = cor;
        c.fillRect(x, 98, 30 * (rest / tot), 4);
      });
      c.textAlign = "center";
      c.font = "16px system-ui";
      c.fillStyle = "#fde047";
      c.fillText(`⭐ ${estrelas}`, W / 2, 30);
      c.textAlign = "right";
      c.font = "18px system-ui";
      c.fillText("❤️".repeat(Math.max(0, vidas)) || "💔", W - 12, 30);
    };

    const sobreposto = (linhas: string[], sub: string, dica = "") => {
      c.fillStyle = "rgba(2,6,23,0.72)";
      c.fillRect(0, 0, W, H);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#f8fafc";
      c.font = "bold 30px system-ui";
      linhas.forEach((l, i) => c.fillText(l, W / 2, H / 2 - 40 + i * 38));
      c.font = "15px system-ui";
      c.fillStyle = "#cbd5e1";
      c.fillText(sub, W / 2, H / 2 + 50 + (linhas.length - 1) * 30);
      if (dica) {
        c.font = "13px system-ui";
        c.fillStyle = "#94a3b8";
        c.fillText(dica, W / 2, H / 2 + 80 + (linhas.length - 1) * 30);
      }
    };

    const quadro = (agora: number) => {
      const dt = Math.min(0.033, (agora - ultimo) / 1000 || 0.016);
      ultimo = agora;
      const f = fase.current;
      if (f === "jogando") passo(dt);
      else t += dt * 0.3;
      desenha();
      if (f === "pronto") sobreposto(["Atire nos blocos", "e desvie das bombas"], melhor ? `Recorde: ${melhor} · toque para jogar` : "Toque para jogar", "Pegue os bônus: ⚡ 🛡️ ✌️ 🔱 ⏳ 💥");
      else if (f === "pausa") sobreposto(["Pausado"], "Toque para continuar");
      else if (f === "fim") sobreposto(["Fim de jogo", `${pontos} pontos`], `⭐ ${estrelas} · recorde ${melhor}`);
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame((a) => {
      ultimo = a;
      quadro(a);
    });

    // entrada
    const mover = (cx: number) => {
      const r = canvas.getBoundingClientRect();
      alvoX.current = ((cx - r.left) / r.width) * W;
    };
    const aoApertar = (e: PointerEvent) => {
      canvas.setPointerCapture?.(e.pointerId);
      mover(e.clientX);
      if (fase.current === "pronto") novo();
      else if (fase.current === "pausa") fase.current = "jogando";
    };
    const aoMover = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.buttons) mover(e.clientX);
    };
    const aoTecla = (e: KeyboardEvent, v: boolean) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") teclas.current.e = v;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") teclas.current.d = v;
      else if (v && (e.key === " " || e.key === "Enter")) {
        if (fase.current === "pronto" || fase.current === "fim") novo();
        else if (fase.current === "pausa") fase.current = "jogando";
      } else if (v && (e.key === "Escape" || e.key === "p" || e.key === "P")) {
        if (fase.current === "jogando") fase.current = "pausa";
      } else return;
      if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => aoTecla(e, true);
    const ku = (e: KeyboardEvent) => aoTecla(e, false);
    const oculto = () => {
      if (document.hidden && fase.current === "jogando") fase.current = "pausa";
    };
    canvas.addEventListener("pointerdown", aoApertar);
    canvas.addEventListener("pointermove", aoMover);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    document.addEventListener("visibilitychange", oculto);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", aoApertar);
      canvas.removeEventListener("pointermove", aoMover);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      document.removeEventListener("visibilitychange", oculto);
    };
  }, []);

  const compartilhar = useCallback(async () => {
    if (!fim) return;
    const texto = `Fiz ${fim.pontos} pontos e ${fim.estrelas} ⭐ no jogo da apuração! Consegue me superar?`;
    const url = `${SITE_URL}/jogo`;
    try {
      if (navigator.share) await navigator.share({ title: "Jogo da espera", text: texto, url });
      else {
        await navigator.clipboard.writeText(`${texto} ${url}`);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch {
      /* cancelou */
    }
  }, [fim]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="w-full overflow-hidden rounded-2xl border border-line bg-panel" style={{ maxWidth: "min(100%, calc(78dvh * 9 / 16))" }}>
        <canvas
          ref={cv}
          role="img"
          aria-label="Jogo: mova o personagem e atire nos blocos vermelhos e verdes, desviando de bombas e caixas"
          className="block h-auto w-full select-none"
          style={{ aspectRatio: `${W} / ${H}`, touchAction: "none" }}
        />
      </div>
      {fim ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => iniciar.current()} className="h-11 rounded-xl bg-lime px-5 font-semibold text-ink">
            Jogar de novo
          </button>
          <button type="button" onClick={() => void compartilhar()} className="h-11 rounded-xl border border-line px-5 text-paper">
            {copiado ? "Link copiado ✓" : "Compartilhar pontuação"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
