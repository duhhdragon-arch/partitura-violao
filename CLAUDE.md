# CLAUDE.md: Violão para partitura

## O que é
App web que escuta **violão ou teclado** (microfone ao vivo ou arquivo de áudio/vídeo) e escreve a **cifra numa pauta**: andamento (bpm), tom, compassos e acordes. Tem um modo **Melodia** para notas tocadas uma de cada vez. Feito a pedido do meu tio, que quer tocar e já ver a partitura/cifra montada. Teclado (piano, órgão, strings, pad) adicionado em 25/11/2026 a pedido dele: são os timbres que ele mais usa.

- Repositório: `duhhdragon-arch/partitura-violao` (público)
- Site (GitHub Pages, branch `main`, pasta raiz): https://duhhdragon-arch.github.io/partitura-violao/
- Protótipo também publicado como artefato no Claude: https://claude.ai/artifact/6HwMXfRTGfLsEsAHSqcKb7 (lá o microfone é bloqueado, só funciona enviar arquivo)

## Arquivos
| Arquivo | Função |
|---|---|
| `index.html` | App inteiro: HTML + CSS + JS num arquivo só, sem dependências nem build |
| `manifest.json` | PWA ("adicionar à tela inicial"), nome curto "Partitura" |
| `icon.svg` | Ícone do app (pauta + nota + "C") |
| `README.md` | Descrição curta do repositório |
| `.nojekyll` | Faz o GitHub Pages servir os arquivos como estão |

| `sw.js` | Modo offline (service worker). Ver "Offline" abaixo |
| `fonts.css` + `fonts/` | Fontes hospedadas no próprio site (woff2 + licenças OFL) |

**Nenhuma requisição externa** (desde 25/11/2026). As fontes (Archivo e Inter, variáveis; Noto Music para as claves 𝄞 𝄢) foram baixadas do Google Fonts e ficam em `fonts/`. Só estão os subconjuntos latin e latin-ext; da Noto Music, só o subconjunto "music". Motivo: com o Google Fonts, cada visita mandava o IP do visitante ao Google. As licenças OFL (`fonts/OFL-*.txt`) precisam acompanhar as fontes. Para conferir: servir por http local e listar `performance.getEntriesByType("resource")` fora da origem (deve sair vazio).

## Como rodar localmente
Microfone exige https ou `localhost`. Para testar:
```bash
npx serve .        # ou: python3 -m http.server 8000
```
Abrir `http://localhost:8000`. No celular, testar pelo site do GitHub Pages (https).

## Funcionalidades
- **Instrumento**: Violão | Teclado (timbres Piano, Órgão, Strings, Pad). A escolha fica em `localStorage` (`partitura.ins`), validada contra a lista `INS` antes de usar. Trocar de instrumento refaz a demo, ou reanalisa a gravação atual com o novo perfil.
- **Contagem antes de gravar** (25/11/2026): liga/desliga (`1·2·3·4`), bpm 40–200 com −/+, campo numérico e "Bater ritmo" (tap tempo, média dos últimos 6 toques, zera após 2 s parado). Fica em `localStorage` (`partitura.cnt`, JSON validado com `clampB`). Ao gravar, os cliques são agendados no relógio do `AudioContext` (`clickAt`, mais preciso que `setTimeout`). O áudio só é guardado a partir de `PRE = 0,12 s` antes do fim da contagem (`R.cut`). Com isso `st.grid = {bpm}`: `beatsOf` usa esse andamento em vez da autocorrelação, e `analyse` põe o tempo 1 na batida mais próxima de `PRE`, mesmo se ele entrar atrasado (aparece "—"). Arquivo enviado e demo zeram `st.grid`.
- **Corrigir acorde** (25/11/2026): cada tempo da folha tem um `<rect class="hit">` (clicável e focável por teclado, Enter/Espaço) que abre o `<dialog id="pk">`: 12 notas (♯ ou ♭ conforme o tom), tipo (maior, menor, 7, m7), prévia sonora com piano sintetizado e os botões "Sem acorde", Cancelar e Aplicar. `PK.r` é a nota como aparece na tela; ao salvar desconta `st.tr`. O acorde corrigido ganha `ed:true` e aparece na cor de destaque. `st.edits` conta as correções; ½×, 2×, 3/4 e troca de instrumento **perguntam antes** (`keepEdits`), porque reanalisar apaga as correções.
- **Imprimir / PDF** (25/11/2026): `window.print()`. O CSS `@media print` mostra só a `.sheet` em papel branco, mais `.pinfo` (tom · bpm · compasso · instrumento · transposição) e `.pfoot`. `render()` gera **um `<svg>` por sistema** (linha), com `break-inside:avoid`, então a página nunca corta uma linha no meio. Em `beforeprint`, `st.printW = 700` (largura A4) e o render refaz; `afterprint` volta ao normal.
- **Salvar no Repertório** (25/11/2026): abre o diálogo `#sv` (nome, artista) e depois uma aba nova em `../repertorio-palco/#importar=<base64url(JSON)>`. O JSON é `{v:1, app, titulo, artista, tom, bpm, cifra, notas}`. A cifra vem de `cifraRep()` no formato do Repertório: `| C G7 | Dm | F |   |`, 4 compassos por linha, `[m:ss]` a cada 8, `%` para compasso sem troca e vazio para silêncio (o "—" não é aceito pelo `isChordLine` do Repertório). O fragmento `#` não vai para o servidor. Limite de 60.000 caracteres. **O Repertório valida e pede confirmação** (ver o `app.js` dele, `importarDoLink`).
- **Afinador** (25/11/2026): botão 🎯 na linha do instrumento abre o `<dialog id="tun">`. Usa `getUserMedia` + `AnalyserNode` (4096 amostras), lido a cada 90 ms por `yin()`: função diferença normalizada (limiar 0,12), interpolação parabólica e faixa de 38 a 1200 Hz (inclui o Mi grave do baixo). Só aceita leituras com confiança ≥ 0,85, usa a mediana das últimas 5 e descarta leitura a mais de meio semitom da mediana (o ataque da corda às vezes sai uma oitava acima). Ponteiro de −50 a +50 cents, verde dentro de ±5, com textos "aperte (suba)" e "afrouxe (desça)". Chips das 6 cordas (E2 A2 D3 G3 B3 E4). Lá = 440 fixo. **Ao fechar, `tunStop()` para as trilhas do microfone** (o indicador do microfone apaga). Não abre durante uma gravação.
- **Acordes desta música** (25/11/2026): quadro `#chd` dentro da `.sheet`, que também sai na impressão. Um cartão por acorde diferente, na ordem em que aparece, já transposto. No violão, um diagrama de casas: `ABERTOS` para as formas abertas comuns e o resto em pestana, na forma de Mi (tônica na 6ª) ou de Lá (tônica na 5ª), a mais perto da cabeça (`forma()`). No teclado, 2 oitavas com as teclas do acorde (laranja = tônica). Tocar no cartão faz o acorde soar (`playChord`): rasgueado Karplus-Strong no violão, timbre atual no teclado.
- **● Gravar / ■ Parar**: microfone ao vivo. Enquanto grava, mostra o acorde atual grande e o histórico. Ao parar, analisa a gravação inteira e monta a partitura. Limite: 4 min.
- **Enviar gravação**: aceita `audio/*` e `video/*` (MP3, M4A, WAV, MP4…). Analisa os primeiros 4 min.
- **▶ Ouvir**: toca o áudio e destaca o compasso atual na pauta.
- **Cifra / Melodia**: barras de ritmo (slashes) com acordes, ou notas na pauta.
- **−½ / +½**: transpõe meio tom (acordes, notas e tom).
- **½× / 2×**: corrige o andamento quando a detecção sai pela metade ou pelo dobro.
- **4/4 / 3/4**: fórmula de compasso.
- **Copiar cifra**: texto no formato `| C | Am | F | G |` com tom, bpm e compasso.
- Ao abrir, carrega uma **demo sintetizada** (C – Am – F – G, 96 bpm) no timbre escolhido: violão por Karplus-Strong; teclado por síntese aditiva com wavetable (`TB`/`kb()`): piano com decaimento, órgão sustentado em drawbars, strings com 2 vozes + vibrato, pad com ataque lento de 0,6 s.
- Tema claro/escuro automático (`light-dark()`), layout responsivo (2 compassos por linha abaixo de 560px).
- Visual (25/11/2026): marca "Partitura" com ícone, linhas de pauta discretas no fundo do topo, painel de controles em 3 linhas (instrumento/timbre · captar · escrita/transpor/andamento/compasso), botões segmentados tipo "pílula", 4 cartões de números e folha com faixa colorida. **A cor de destaque segue o instrumento**: âmbar no violão, cobalto no teclado (`:root[data-ins=kbd]`, definido em `setIns`). O botão Gravar tem `.rd` (bolinha) + `#recL` (texto): o JS troca só o `#recL`. Rodapé diz que o áudio não sai do aparelho.
- Conferir visual: Chrome headless com `--screenshot`. Para largura de celular, usar um iframe de 375px, porque o `--window-size` do headless tem largura mínima e engana.

## Offline (`sw.js`)
- O registro só acontece em contexto seguro (HTTPS ou localhost).
- Página: **rede primeiro**, com limite de 4 s e cópia em cache como reserva. Por isso não é preciso mudar `CACHE` a cada atualização do `index.html`.
- Fontes, ícone e manifest: **cache primeiro**. Mudar `CACHE` (`partitura-vN`) só quando a lista `ARQUIVOS` mudar.
- **Mesmo origin do Repertório Palco** (`duhhdragon-arch.github.io`): o CacheStorage é por origin, não por pasta. Cada app só apaga caches com o próprio prefixo (`partitura-` / `repertorio-`). Antes, o Repertório apagava tudo que não fosse dele; foi corrigido junto (v4). O mesmo vale para o `localStorage`: os dois apps enxergam as chaves um do outro, por isso as chaves têm prefixo (`partitura.*`, `repertorio_palco_*`).
- Testado via Chrome DevTools Protocol (servidor Node desligado no meio do teste): o app abre offline, com a partitura e as fontes, e os caches dos dois apps convivem. O `--dump-dom` do headless **não** serve para testar service worker, porque o momento em que ele captura a página varia de uma execução para outra.

## Perfis de instrumento (`INS`, lido por `prof()`)
| Perfil | Pauta | `tr` (escrita) | Pitch MIDI | `wC` | `pen` (Viterbi) |
|---|---|---|---|---|---|
| violao | sol com 8 | +12 | 40–88 | 0 | 0,12 |
| piano | sol (cifra) / sol + fá (melodia) | 0 | 36–96 | 0,4 | 0,12 |
| orgao | idem | 0 | 36–96 | 1,2 | 0,15 |
| strings | idem | 0 | 36–96 | 2 | 0,18 |
| pad | idem | 0 | 36–96 | 2 | 0,18 |

- `wC` > 0: o envelope de ritmo soma a **novidade harmônica** (distância de cosseno entre o chroma de 4 frames antes e 4 depois, ponderada pelo volume). Assim timbres sem ataque (pad, strings, órgão) ainda marcam o pulso pelas trocas de acorde. Com `wC` > 0 a autocorrelação vira "pente": `r(l) + 0,5·r(2l) + 0,5·r(bpb·l)`, para achar a batida mesmo quando só o compasso tem troca.
- `wC` ≥ 1: no acorde por batida, ignora os primeiros 40% da batida, porque o acorde novo ainda está crescendo.
- Pauta dupla: nota com MIDI escrito < 60 vai para a clave de fá. `note()` recebe `base` (passo da linha de baixo: sol 30, fá 18) e `tr`.
- Valores de `wC`/`pen` foram ajustados só com as demos sintetizadas. Precisam de gravação real.

## Pipeline de análise (tudo no navegador, Web Audio)
Constantes: `SR = 22050` Hz, `N = 4096` (FFT), `HOP = 512` (~23 ms, `FPS ≈ 43`).

1. **Decodificar e reamostrar**: `decodeAudioData` + `OfflineAudioContext` para mono 22050 Hz. No microfone, captura via `ScriptProcessorNode` na taxa nativa e reamostra no fim. Normaliza o pico para 0,5.
2. **`frames(x)`**: FFT com janela de Hann a cada hop, gerando por frame:
   - `chroma[12]`: energia por classe de nota (55–1760 Hz), peso cos² pela distância ao semitom.
   - `rms` (volume), `flux` (fluxo espectral, para ataques).
   - `pitch`: f0 por soma harmônica (MIDI 40–88, 6 harmônicos, peso 1/√h), com correção de oitava: se a sub-harmônica (−12/−19/−24) tiver ≥75% da saliência, usa ela.
3. **`beatsOf(F)`**: tempo e batidas.
   - Envelope de ataques = flux menos média local, normalizado.
   - Autocorrelação de 55 a 190 bpm, com preferência log-gaussiana em torno de 105 bpm.
   - Rastreamento de batidas por programação dinâmica (Ellis), penalidade `400·log²(intervalo/período)`.
   - `st.lagMul` multiplica o período (botões ½×/2×).
4. **Acordes por batida**: chroma médio por batida, similaridade de cosseno com 48 moldes (12 tônicas × maior, menor, 7, m7). Os moldes incluem harmônicos (offsets `[0,0,7,0,4]`, decaimento 0,6^h). Sem isso, C era confundido com Em7. Sétimas têm viés −0,04 para preferir tríades. Batida com rms < 6% do máximo é silêncio.
5. **Suavização (Viterbi)**: penalidade 0,12 para trocar de acorde, evitando acordes "piscando".
6. **Tom**: pontua os 24 tons pelos acordes diatônicos encontrados (I, ii, iii, IV, V, vi), com bônus para tônica e dominante. Tons de bemol (F, Bb, Eb, Ab, Db, Gb, Dm, Gm, Cm, Fm…) escrevem acordes com ♭.
7. **Compassos**: começam na primeira batida com acorde (ignora silêncio inicial) e vão até a última. Um compasso final com até meia barra repetindo o acorde anterior é descartado (é a cauda do som).
8. **Melodia**: notas segmentadas pelos ataques (picos de flux > 1,6× a média local). Cada segmento usa o pitch mais frequente (moda) e é quantizado a colcheias no grid de batidas.
9. **Ao vivo (`liveTick`, a cada 350 ms)**: analisa os últimos 0,6 s e só troca o acorde exibido depois de 2 leituras iguais seguidas.

## Notação (SVG desenhado à mão em `render()` / `note()`)
- Clave de sol com "8" embaixo (o violão soa uma oitava abaixo do escrito: nota escrita = MIDI + 12).
- Pauta com espaçamento `G = 8px`. Posição da nota pelo passo diatônico (E4 = linha de baixo, passo 30), com linhas suplementares, ♯/♭, haste para cima/baixo (B4 = passo 34) e bandeira de colcheia.
- Durações: semibreve/mínima (cabeça vazada), semínima, colcheia, pontuadas (1,5 e 3).
- Retângulo `.hl` por compasso para destacar durante a reprodução.

## Estado (`st`)
`mode` ('cifra'|'melodia'), `tr` (transposição), `bpb` (batidas por compasso), `buf` (áudio 22050 Hz), `F` (frames), `A` (`{bars, bpm, key}`), `lagMul`. Cada barra: `{t0, t1, ch:[{pos, t}], notes:[{pos, dur, m}]}`.

## Testes
Testado em Node com stubs de DOM:
- Demo C–Am–F–G: cifra, tom C maior e 96 bpm corretos. Transposição −2 → Bb–Gm–Eb–F.
- Melodia sintetizada de 15 notas: alturas certas. Perde a 1ª nota e cria uma extra no fim (bordas).
- Microfone simulado a 48 kHz: acorde ao vivo funcionando. Na transição entre acordes pode mostrar um intermediário (ex.: Am7).
- Teclado (25/11/2026): demos de piano, órgão, strings e pad, todas com C–Am–F–G, tom C maior, 96 bpm e 8 compassos. Antes do corte de cauda e do pulo de 40%, pad dava "F G" no 4º compasso e um compasso extra no fim. Tempo no Node: demo < 0,4 s, análise ~0,3 s. **No teste, carregar o script com `(0,eval)(js)` (eval indireto). Com `eval` direto o V8 não otimiza e tudo fica ~10× mais lento.**
- Pauta dupla conferida com screenshot no Chrome headless.
- Demo com aleatório de semente fixa (`rnd()`, `seed=20261125` em `demo()`), então sai sempre igual. Antes, com `Math.random`, a demo do violão errava 2 em 25 vezes (Em antes do C no 1º tempo, Am atrasado um tempo). **Ou seja: com áudio real, C/Em no 1º tempo e trocas atrasadas em um tempo podem acontecer. É para isso que existe a correção manual.**
- Contagem (Node): demo com `st.grid={bpm:96}` correta no violão e no pad. Com 1 tempo de silêncio no começo, sai "— C | C Am | …", ou seja, respeita o tempo 1 da contagem.
- Correção (Node): com transposição +2, corrigir, trocar e apagar acordes refletem certo no "Copiar cifra" e continuam certos ao voltar a transposição pra 0.
- **Contagem ainda não testada com microfone real.**
- Afinador (Node): tons com harmônicos + ruído em 9 notas (de E1 41 Hz a A5) × 5 desafinações (−30 a +25 cents): pior erro de 0,21 cents. Silêncio e ruído não geram leitura. Corda Karplus-Strong: variação < 0,05 cent entre leituras; um único erro de oitava, na janela do ataque, que a mediana absorve. No Chrome com microfone falso, a cadeia mic → analyser → YIN funcionou (48 kHz, `running`), mas o bipe falso é picotado e foi descartado pela confiança, o que é o esperado. **Falta testar com instrumento de verdade.**
- Formas de violão (Node): as 48 combinações (12 × 4) só tocam notas do acorde, têm tônica + terça (+ sétima) e o baixo é a tônica. A latência do microfone pode deslocar uns 20–50 ms, coberto pelo `PRE`.
- Violão: o tio já testou e gostou. **Teclado ainda não testado com gravação real.**

## Limitações conhecidas
- Acordes com 9ª, sus, dim, aum e baixo trocado (C/E) saem simplificados.
- Melodia só com notas isoladas (sem acompanhamento junto). No piano com as duas mãos, a melodia sai com a nota mais forte, em geral o baixo. Solução futura: Basic Pitch (Spotify, roda no navegador via TF.js).
- Pad/strings: o andamento depende das trocas de acorde. Música com acorde parado por muitos compassos fica sem pulso confiável. Ideia: botão de tap tempo.
- Alto-falante de celular perde o grave e o baixo do acorde pode sair errado. Caixinha de som ajuda.
- Compassos ainda não detectam anacruse (a música começa sempre no tempo 1).
- `ScriptProcessorNode` é obsoleto. Migrar para `AudioWorklet`.

## Próximos passos (ideias)
1. Testar com gravações reais e ajustar limiares (silêncio 6%, penalidade Viterbi 0,12, onset 1,6×).
2. Diagramas feitos (violão e teclado, 25/11/2026). Falta tablatura e afinador de baixo (cordas E1 A1 D2 G2).
3. PDF feito (impressão, 25/11/2026). Falta MusicXML para abrir no MuseScore.
4. ~~Edição manual~~ (feito 25/11/2026). Próximo: corrigir também notas da melodia.
5. Mais tipos de acorde (sus, dim, 9, baixo invertido) com detecção do baixo pela faixa grave.
6. Salvar músicas: feito via Repertório Palco (botão "Salvar no Repertório", 25/11/2026).
7. Versão multi-instrumento: separar com Demucs e transcrever com Basic Pitch / YourMT3 num servidor Python. A ordem "separar → transcrever" acumula erro, por isso os modelos conjuntos são melhores.
8. Foco em música brasileira (sertanejo, MPB, pagode, louvor) como diferencial.

## Convenções
- Interface e textos em português do Brasil.
- Manter tudo num `index.html` autocontido enquanto der. Sem frameworks nem build.
- Valores numéricos de ajuste ficam como constantes no topo do script ou documentados aqui.
