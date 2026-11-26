/*
 * Basic Pitch (Spotify), adaptado para JavaScript puro, sem build.
 * Copyright 2022 Spotify AB. Licensed under the Apache License, Version 2.0
 * (texto completo em bp/LICENSE-basic-pitch.txt).
 *
 * MODIFICADO em 25/11/2026 para o Partitura: a inferência (src/inference.ts) e
 * outputToNotesPoly (esm/toMidi.js) do pacote @spotify/basic-pitch 1.0.1 foram
 * reescritas com arrays planos (Float32Array). O "melodia trick" busca os picos
 * por ordenação em vez de varrer a matriz inteira a cada nota (mesmo resultado,
 * bem mais rápido em música longa). Sem MIDI e sem pitch bends.
 *
 * Precisa do TensorFlow.js 3.x carregado antes (global `tf`).
 * Uso: const notas = await BasicPitch.transcrever(audio22050, url_ou_handler, progresso)
 *      -> [{t: início em s, d: duração em s, m: nota MIDI, a: confiança 0–1, o: 1 se tem ataque detectado}]
 */
(function (g) {
  'use strict';
  const SR = 22050, HOP = 256, FPS = Math.floor(SR / HOP), WIN = 2;
  const NS = SR * WIN - HOP;            // amostras por janela do modelo (43844)
  const NOV = 30, NOV2 = NOV / 2;       // quadros sobrepostos entre janelas
  const OVL = NOV * HOP, PASSO = NS - OVL;
  const ANNOT_N = FPS * WIN;
  const WIN_OFF = (HOP / SR) * (ANNOT_N - NS / HOP) + 0.0018;
  const NP = 88, MIDI0 = 21;
  const quadroParaTempo = (f) => (f * HOP) / SR - WIN_OFF * Math.floor(f / ANNOT_N);

  let modelo = null;
  async function carregar(fonte) {
    if (!modelo) modelo = await g.tf.loadGraphModel(fonte);
    return modelo;
  }

  // Roda o modelo em janelas de 2 s e devolve as matrizes planas [quadro*88 + nota]
  async function inferir(x, fonte, progresso) {
    const tf = g.tf, m = await carregar(fonte);
    const sinal = new Float32Array(OVL / 2 + x.length);
    sinal.set(x, OVL / 2);
    const nJan = Math.max(1, Math.ceil(sinal.length / PASSO));
    const nOrig = Math.floor(x.length * (FPS / SR));
    const frames = new Float32Array(nOrig * NP), onsets = new Float32Array(nOrig * NP);
    const jan = new Float32Array(NS);
    let feitos = 0;
    for (let i = 0; i < nJan && feitos < nOrig; i++) {
      if (progresso) progresso(i / nJan);
      jan.fill(0);
      const ini = i * PASSO;
      jan.set(sinal.subarray(ini, Math.min(sinal.length, ini + NS)));
      const [fr, on] = tf.tidy(() => {
        const ent = tf.tensor3d(jan, [1, NS, 1]);
        const r = m.execute(ent, ['Identity_1', 'Identity_2']);
        return r.map((t) => t.slice([0, NOV2, 0], [1, t.shape[1] - NOV, NP]).reshape([-1, NP]));
      });
      const dF = await fr.data(), dO = await on.data();
      fr.dispose(); on.dispose();
      const n = Math.min(dF.length / NP, nOrig - feitos);
      frames.set(dF.subarray(0, n * NP), feitos * NP);
      onsets.set(dO.subarray(0, n * NP), feitos * NP);
      feitos += n;
      await new Promise((r) => setTimeout(r, 0)); // deixa a tela respirar
    }
    if (progresso) progresso(1);
    return { frames, onsets, n: nOrig };
  }

  // outputToNotesPoly do Basic Pitch, com os mesmos parâmetros padrão
  function paraNotas(F, O, n, op = {}) {
    const onT = op.onset ?? 0.5, frT = op.frame ?? 0.3, minLen = op.minLen ?? 5, tol = op.tol ?? 11;
    const at = (A, i, j) => A[i * NP + j];
    // Ataques inferidos: subida do "frames" em 1 e 2 quadros, escalada para a faixa dos onsets
    const dif = new Float32Array(n * NP);
    let maxO = 0, maxD = 0;
    for (let k = 0; k < n * NP; k++) maxO = Math.max(maxO, O[k]);
    for (let i = 2; i < n; i++) for (let j = 0; j < NP; j++) {
      const v = Math.max(0, Math.min(at(F, i, j) - at(F, i - 1, j), at(F, i, j) - at(F, i - 2, j)));
      dif[i * NP + j] = v; if (v > maxD) maxD = v;
    }
    const inf = new Float32Array(n * NP);
    for (let k = 0; k < n * NP; k++) inf[k] = Math.max(O[k], maxD ? (maxO * dif[k]) / maxD : 0);
    // Picos no tempo acima do limiar
    const ini = [];
    for (let j = 0; j < NP; j++) for (let i = 0; i < n; i++) {
      const v = inf[i * NP + j];
      if (v <= onT) continue;
      if (i > 0 && !(v > inf[(i - 1) * NP + j])) continue;
      if (i < n - 1 && !(v > inf[(i + 1) * NP + j])) continue;
      ini.push([i, j]);
    }
    ini.sort((a, b) => b[0] - a[0] || b[1] - a[1]); // mesma ordem do original (de trás para frente)
    const rest = F.slice(), notas = [];
    const zera = (i, j) => { rest[i * NP + j] = 0; if (j < NP - 1) rest[i * NP + j + 1] = 0; if (j > 0) rest[i * NP + j - 1] = 0; };
    const media = (a, b, j) => { let s = 0; for (let i = a; i < b; i++) s += F[i * NP + j]; return s / Math.max(1, b - a); };
    for (const [s, j] of ini) {
      if (s >= n - 1) continue;
      let i = s + 1, k = 0;
      while (i < n - 1 && k < tol) { k = rest[i * NP + j] < frT ? k + 1 : 0; i++; }
      i -= k;
      if (i - s <= minLen) continue;
      for (let q = s; q < i; q++) zera(q, j);
      notas.push({ s, e: i, j, a: media(s, i, j), o: 1 });
    }
    if (op.melodia !== false) {
      // Energia que sobrou sem ataque detectado: segue do maior pico para os lados
      const cand = [];
      for (let k = 0; k < n * NP; k++) if (rest[k] > frT) cand.push(k);
      cand.sort((a, b) => rest[b] - rest[a] || a - b);
      for (const k of cand) {
        if (rest[k] <= frT) continue;
        const iM = Math.floor(k / NP), j = k % NP;
        rest[k] = 0;
        let i = iM + 1, c = 0;
        while (i < n - 1 && c < tol) { c = rest[i * NP + j] < frT ? c + 1 : 0; zera(i, j); i++; }
        const fim = i - 1 - c;
        i = iM - 1; c = 0;
        while (i > 0 && c < tol) { c = rest[i * NP + j] < frT ? c + 1 : 0; zera(i, j); i--; }
        const com = i + 1 + c;
        if (fim - com <= minLen) continue;
        notas.push({ s: com, e: fim, j, a: media(com, fim, j), o: 0 });
      }
    }
    return notas.map((q) => ({ t: quadroParaTempo(q.s), d: quadroParaTempo(q.e) - quadroParaTempo(q.s), m: q.j + MIDI0, a: q.a, o: q.o }))
      .sort((a, b) => a.t - b.t || a.m - b.m);
  }

  async function transcrever(x, fonte, progresso, op) {
    const r = await inferir(x, fonte, progresso);
    return paraNotas(r.frames, r.onsets, r.n, op);
  }

  g.BasicPitch = { transcrever, inferir, paraNotas, FPS };
})(typeof window !== 'undefined' ? window : globalThis);
