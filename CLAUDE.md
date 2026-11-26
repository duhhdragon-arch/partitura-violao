# CLAUDE.md: Partitura (teclado e violão para partitura)

## O que é
App web que escuta **violão ou teclado** (microfone ao vivo ou arquivo de áudio/vídeo) e escreve a **cifra numa pauta**: andamento (bpm), tom, compassos e acordes. Tem um modo **Melodia** que escreve as notas, inclusive várias ao mesmo tempo (as duas mãos do piano, acorde no fim da frase), com um leitor de notas por IA (Basic Pitch) rodando no próprio navegador. Feito a pedido do meu tio, que quer tocar e já ver a partitura/cifra montada. Teclado (piano, órgão, strings, pad) adicionado em 25/11/2026 a pedido dele: são os timbres que ele mais usa. **Desde 26/11/2026 o foco é o teclado/piano**: ele abre por padrão e vem primeiro no seletor. O violão continua como opção (funciona, o tio aprovou, e o afinador e os diagramas são dele). O nome do repositório (`partitura-violao`) **não muda**, porque o tio já usa esse link.

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
| `bp/` | Leitor de notas da Melodia (Basic Pitch + TensorFlow.js), ~2 MB, baixado só quando a Melodia abre. Ver "Melodia com IA" |
| `testes/` | Scripts de teste (Node e Chrome via DevTools Protocol). Ver "Testes" |

**Nenhuma requisição externa** (desde 25/11/2026; continua valendo com o `bp/`, que é servido pelo próprio site). As fontes (Archivo e Inter, variáveis; Noto Music para as claves 𝄞 𝄢) foram baixadas do Google Fonts e ficam em `fonts/`. Só estão os subconjuntos latin e latin-ext; da Noto Music, só o subconjunto "music". Motivo: com o Google Fonts, cada visita mandava o IP do visitante ao Google. As licenças OFL (`fonts/OFL-*.txt`) precisam acompanhar as fontes. Para conferir: servir por http local e listar `performance.getEntriesByType("resource")` fora da origem (deve sair vazio).

## Como rodar localmente
Microfone exige https ou `localhost`. Para testar:
```bash
npx serve .        # ou: python3 -m http.server 8000
```
Abrir `http://localhost:8000`. No celular, testar pelo site do GitHub Pages (https).

## Funcionalidades
- **Instrumento**: Teclado | Violão (timbres do teclado: Piano, Órgão, Strings, Pad). **Padrão: piano** (26/11/2026; antes era violão). A escolha fica em `localStorage` (`partitura.ins`), validada contra a lista `INS` antes de usar; quem já tinha escolhido continua com a escolha. Trocar de instrumento refaz a demo, ou reanalisa a gravação atual com o novo perfil.
- **Contagem antes de gravar** (25/11/2026): liga/desliga (`1·2·3·4`), bpm 40–200 com −/+, campo numérico e "Bater ritmo" (tap tempo, zera após 2 s parado). **"Bater ritmo" refeito em 26/11/2026** (o tio disse que estava "sem função"): o cálculo funcionava, mas não dava sinal de vida (1º toque sem nada, resultado só no `#msg` lá embaixo) e, no celular, toques rápidos viravam o gesto de zoom de toque duplo. Agora usa `pointerdown` (+ `click` com `detail 0` para teclado), `touch-action:manipulation` nos botões, clique sonoro e piscada a cada toque, o bpm escrito no próprio botão e a **mediana** dos intervalos dos últimos 8 toques (um toque torto não estraga). Testado no Chrome com toque emulado a 100/138 bpm e mouse a 72. Fica em `localStorage` (`partitura.cnt`, JSON validado com `clampB`). Ao gravar, os cliques são agendados no relógio do `AudioContext` (`clickAt`, mais preciso que `setTimeout`). O áudio só é guardado a partir de `PRE = 0,12 s` antes do fim da contagem (`R.cut`). Com isso `st.grid = {bpm}`: `beatsOf` usa esse andamento em vez da autocorrelação, e `analyse` põe o tempo 1 na batida mais próxima de `PRE`, mesmo se ele entrar atrasado (aparece "—"). Arquivo enviado e demo zeram `st.grid`.
- **Metrônomo** (25/11/2026, pedido do tio): botão `♩ Metrônomo` (`st.cnt.met`, salvo junto em `partitura.cnt`; ligar o metrônomo liga a contagem). Continua clicando a gravação toda, com agendador de folga (`setInterval` 40 ms agenda no relógio do áudio até 150 ms à frente). Bolinhas dos tempos no painel ao vivo (`#lvB`, por `requestAnimationFrame` lendo `ctx.currentTime`; tempo 1 em branco). O clique é seno de 2093/2637 Hz, **acima da faixa que a análise usa (55–1760 Hz)**, então vazar no microfone não suja o acorde. `st.grid = {bpm, met, lat}`, onde `lat` é a latência informada pelo navegador na hora de gravar (`ctx.outputLatency + ctx.baseLatency + track.getSettings().latency`). Como as batidas são calculadas com metrônomo, ver o passo 3 do pipeline.
- **Corrigir acorde** (25/11/2026): cada tempo da folha tem um `<rect class="hit">` (clicável e focável por teclado, Enter/Espaço) que abre o `<dialog id="pk">`: 12 notas (♯ ou ♭ conforme o tom), tipo (maior, menor, 7, m7), prévia sonora com piano sintetizado e os botões "Sem acorde", Cancelar e Aplicar. `PK.r` é a nota como aparece na tela; ao salvar desconta `st.tr`. O acorde corrigido ganha `ed:true` e aparece na cor de destaque. `st.edits` conta as correções; ½×, 2×, 3/4 e troca de instrumento **perguntam antes** (`keepEdits`), porque reanalisar apaga as correções.
- **Imprimir / PDF** (25/11/2026): `window.print()`. O CSS `@media print` mostra só a `.sheet` em papel branco, mais `.pinfo` (tom · bpm · compasso · instrumento · transposição) e `.pfoot`. `render()` gera **um `<svg>` por sistema** (linha), com `break-inside:avoid`, então a página nunca corta uma linha no meio. Em `beforeprint`, `st.printW = 700` (largura A4) e o render refaz; `afterprint` volta ao normal.
- **Salvar no Repertório** (25/11/2026): abre o diálogo `#sv` (nome, artista) e depois uma aba nova em `../repertorio-palco/#importar=<base64url(JSON)>`. O JSON é `{v:1, app, titulo, artista, tom, bpm, cifra, notas}`. A cifra vem de `cifraRep()` no formato do Repertório: `| C G7 | Dm | F |   |`, 4 compassos por linha, `[m:ss]` a cada 8, `%` para compasso sem troca e vazio para silêncio (o "—" não é aceito pelo `isChordLine` do Repertório). O fragmento `#` não vai para o servidor. Limite de 60.000 caracteres. **O Repertório valida e pede confirmação** (ver o `app.js` dele, `importarDoLink`).
- **Afinador** (25/11/2026): botão 🎯 na linha do instrumento abre o `<dialog id="tun">`. Usa `getUserMedia` + `AnalyserNode` (4096 amostras), lido a cada 90 ms por `yin()`: função diferença normalizada (limiar 0,12), interpolação parabólica e faixa de 38 a 1200 Hz (inclui o Mi grave do baixo). Só aceita leituras com confiança ≥ 0,85, usa a mediana das últimas 5 e descarta leitura a mais de meio semitom da mediana (o ataque da corda às vezes sai uma oitava acima). Ponteiro de −50 a +50 cents, verde dentro de ±5, com textos "aperte (suba)" e "afrouxe (desça)". Chips das 6 cordas (E2 A2 D3 G3 B3 E4). Lá = 440 fixo. **Ao fechar, `tunStop()` para as trilhas do microfone** (o indicador do microfone apaga). Não abre durante uma gravação.
- **Acordes desta música** (25/11/2026): quadro `#chd` dentro da `.sheet`, que também sai na impressão. Um cartão por acorde diferente, na ordem em que aparece, já transposto. No violão, um diagrama de casas: `ABERTOS` para as formas abertas comuns e o resto em pestana, na forma de Mi (tônica na 6ª) ou de Lá (tônica na 5ª), a mais perto da cabeça (`forma()`). No teclado, 2 oitavas com as teclas do acorde (laranja = tônica). Tocar no cartão faz o acorde soar (`playChord`): rasgueado Karplus-Strong no violão, timbre atual no teclado.
- **● Gravar / ■ Parar**: microfone ao vivo. Enquanto grava, mostra o acorde atual grande e o histórico. Ao parar, analisa a gravação inteira e monta a partitura. Limite: 4 min.
- **Enviar gravação**: aceita `audio/*` e `video/*` (MP3, M4A, WAV, MP4…). Analisa os primeiros 4 min.
- **▶ Ouvir**: toca o áudio e destaca o compasso atual na pauta.
- **Cifra / Melodia**: barras de ritmo (slashes) com acordes, ou notas na pauta (ver "Melodia com IA").
- **−½ / +½**: transpõe meio tom (acordes, notas e tom).
- **½× / 2×**: corrige o andamento quando a detecção sai pela metade ou pelo dobro.
- **4/4 / 3/4**: fórmula de compasso.
- **Copiar cifra**: texto no formato `| C | Am | F | G |` com tom, bpm e compasso.
- Ao abrir, carrega uma **demo sintetizada** (C – Am – F – G, 96 bpm) no timbre escolhido: violão por Karplus-Strong; teclado por síntese aditiva com wavetable (`TB`/`kb()`): piano com decaimento, órgão sustentado em drawbars, strings com 2 vozes + vibrato, pad com ataque lento de 0,6 s.
- Tema claro/escuro automático (`light-dark()`), layout responsivo (2 compassos por linha abaixo de 560px).
- Visual (25/11/2026): marca "Partitura" com ícone, linhas de pauta discretas no fundo do topo, painel de controles em 3 linhas (instrumento/timbre · captar · escrita/transpor/andamento/compasso), botões segmentados tipo "pílula", 4 cartões de números e folha com faixa colorida. **A cor de destaque segue o instrumento**: âmbar no violão, cobalto no teclado (`:root[data-ins=kbd]`, definido em `setIns`). O botão Gravar tem `.rd` (bolinha) + `#recL` (texto): o JS troca só o `#recL`. Rodapé diz que o áudio não sai do aparelho.
- Conferir visual: Chrome headless com `--screenshot`. Para largura de celular, usar um iframe de 375px, porque o `--window-size` do headless tem largura mínima e engana.

## Melodia com IA (Basic Pitch) — 26/11/2026
Pedido do tio: no modo Melodia o app "acertava umas notas e inventava outras", e quando ele terminava a frase com um acorde, se perdia (o método antigo só acha uma nota por vez).

- **O que é**: [Basic Pitch](https://github.com/spotify/basic-pitch) (Spotify, Apache-2.0), modelo de transcrição polifônica, rodando com [TensorFlow.js](https://github.com/tensorflow/tfjs) 3.21.0 (Google, Apache-2.0) no navegador, pela placa de vídeo (WebGL). O áudio **não sai do aparelho**.
- **Arquivos em `bp/`** (baixados do npm com `npm pack`, que confere o SHA-512 do pacote; versões fixas):

  | Arquivo | Origem | Tamanho | SHA-256 (início) |
  |---|---|---|---|
  | `tf.min.js` | `@tensorflow/tfjs@3.21.0` `dist/tf.es2017.min.js` (licença no cabeçalho) | 1.064.323 | `4b1f9f6b2f9c7b6b` |
  | `model.json` + `group1-shard1of1.bin` | `@spotify/basic-pitch@1.0.1` `model/` | 174.537 + 742.392 | `1ed1aaee3409ec1d` / `b142a95737a52e1e` |
  | `basic-pitch.js` | **adaptação nossa** de `src/inference.ts` + `esm/toMidi.js` (cabeçalho diz o que mudou, como pede a Apache-2.0) | ~6 KB | muda a cada edição |
  | `LICENSE-basic-pitch.txt` | texto da Apache-2.0 do pacote | 11.357 | `c71d239df91726fc` |

  O rodapé da página dá o crédito e linka a licença.
- **`bp/basic-pitch.js`**: `BasicPitch.transcrever(x22050, url_ou_handler, progresso)` → `[{t, d, m, a, o}]` (início s, duração s, MIDI, confiança 0–1, `o=1` se o modelo achou ataque). Janelas de 2 s com sobreposição, igual ao original. O "melodia trick" do original varria a matriz inteira a cada nota (lento em música longa): aqui ordena os picos uma vez só, com o mesmo resultado. Sem MIDI nem pitch bends.
- **Carregamento** (`melodiaIA()` no `index.html`): só quando a Melodia é aberta e há áudio. Injeta `bp/tf.min.js` e `bp/basic-pitch.js`, mostra "Lendo as notas… N%". Resultado em `st.BP` (zerado em `run()`, isto é, a cada áudio novo). `BPS.fail`:
  - `'webgl'`: sem WebGL (aparelho muito antigo). Na CPU seria lento demais (no Node, 4 s de áudio passaram de 5 min), então usa o método antigo de vez.
  - `'rede'`: falhou o download (em geral sem internet na 1ª vez). Usa o método antigo agora e tenta de novo na próxima vez que a Melodia abrir.
- **Velocidade** (Chrome headless, WebGL por software): 1ª vez ~15 s (preparo do modelo); depois, 1 min de áudio em ~2 s.
- **`notasIA()`** (dentro do `analyse`), em ordem:
  1. **Faixa**: violão E2–E6 (40–88); teclado o piano inteiro A0–C8 (21–108). A faixa antiga do teclado (36–96) cortava o baixo F1 da mão esquerda.
  2. **Emenda**: nota que começa até 0,06 s depois do fim de uma nota igual, **sem ataque novo** (`o=0` no modelo, ou sem pico de fluxo 1,6× no áudio, `ataque(t)`), é a mesma nota continuando. O modelo às vezes quebra em duas uma nota longa enquanto o som decai, e isso aparecia como repetição fantasma no fim do acorde.
  3. **Limpeza**: sai nota com menos de 0,1 s. Confiança ≥ 0,55 fica. Abaixo disso, sai se for **harmônico** (12, 19, 24, 28 ou 31 semitons acima de uma nota mais forte soando junto e com menos de 60% da duração dela, comparando as durações **de antes da emenda**). Se não for harmônico, fica com confiança ≥ 0,5 ou se começar junto (±0,08 s) com uma nota forte (≥ 0,6) e durar pelo menos metade dela (nota de acorde tocada baixinho). Números tirados das notas reais vs. fantasmas medidas no teste: tocadas 0,55–0,85; harmônicos e repetições 0,26–0,54 e curtos.
  4. **Tempo**: segundos → quadro de batida com `t*FPS - ATQ` (ver ATQ no pipeline). Início arredondado ao meio tempo; fim arredondado ao meio tempo **mais próximo** (antes era sempre para baixo e semínima virava colcheia).
  5. **Pautas**: no teclado, MIDI escrito < 60 vai para a clave de fá (`sf=1`). Cada pauta tem o próprio ritmo; notas da mesma pauta que começam no mesmo meio tempo viram **acorde** (`ms:[…]`). Duração = menor entre o fim das notas, a próxima nota da pauta e o fim do compasso, convertida na maior figura que cabe (`FIG = 4, 3, 2, 1,5, 1, 0,5`).
- **Método antigo** (fluxo + soma harmônica, uma nota por vez) continua no código e só roda quando `BPS.fail`.
- **Resultado medido** (`testes/teste6.js`, Chrome; % de notas da melodia certas e no tempo exato):

  | Caso | Antigo | IA |
  |---|---|---|
  | Piano, só melodia | 93% | 100%, 0 inventadas |
  | Piano + acorde no fim | 93%, acorde 0/4, 12 inventadas | 100%, acorde 4/4, 0 inventadas |
  | Piano, duas mãos | 92%, baixo 0/16 | 100%, baixo 16/16, 1 inventada |
  | Violão + acorde | 88%, acorde 0/4 | 96%, acorde 4/4, 3 inventadas |
  | "Real": piano 2 mãos + acorde, com eco de sala, ruído e tempo/força humanos | 93%, baixo 0/16, acorde 0/4 | 100%, baixo 16/16, acorde 4/4, 0 inventadas |
  | "Real": violão + acorde | 92%, acorde 0/4 | 100%, acorde 4/4, 4 inventadas |

  Com som sintético limpo até o método antigo acerta ~90%; no áudio real do tio ele era bem pior. **Falta o teste com gravação real.**

## Looper (26/11/2026, pedido do tio)
Para **treino**, sem partitura. Botão `🔁 Looper` abre o `<dialog id="lp">`. Escolhe 1/2/4/8 compassos (andamento = `st.cnt.bpm`, compasso = `st.bpb`; travados enquanto houver camada). "Gravar loop" conta 1 compasso e grava exatamente N compassos (`LP.len` em amostras); o loop começa a tocar sozinho, em fase. "Gravar camada" grava a próxima volta inteira por cima (parado: conta 1 compasso antes). Desfazer, mudo por camada (chips), Apagar tudo (pede confirmação), Clique liga/desliga. Fechar **desliga o microfone e fecha o contexto** (`lpClose`); as camadas ficam na memória até recarregar a página.
- **Relógio**: `AudioWorklet` (código em `LPW`, carregado por Blob URL) manda blocos de 2048 amostras carimbados com `currentFrame`. Som que sai no quadro f volta ao microfone em f+L. Quem toca, toca no que ouve; então a camada da volta que começou em T é `[T+L, T+L+volta)`. Guarda o trecho bruto com margem de 0,25 s (`raw`, `off0`) para **realinhar na hora** quando L muda (−5/+5 ms ou nova medição).
- **Emenda**: fade-in de 5 ms e os 0,3 s depois do fim (nota ainda soando) somados no começo com fade, como num pedal de loop. Cada camada é normalizada (pico 0,7, ganho máx. 6×); mix = 0,9/√(camadas ativas). Todas as camadas têm o mesmo comprimento em amostras e partem de `lpPhase`, então nunca saem de fase.
- **Atraso (L)**: "Medir atraso" toca 8 cliques de 2637 Hz, acha o início de cada um no microfone (demodulação I/Q, janela 2 ms, metade do pico) e desconta o viés do detector medido num clique sintético. Exige 5 de 8 leituras a até 4 ms da mediana. Salvo em `localStorage` `partitura.lat` (`{ms, src:'medido'|'ajustado'}`, validado 0–600). Sem medição, usa a estimativa do navegador. **Bluetooth** (o teclado do tio): medir de novo ao trocar de saída de som.
- **Clique vazado**: um notch estreito tirava só ~7 dB (o clique é curto e se espalha). `lpTiraClique` usa notch largo (Q 3, duas passadas, ~−35 dB) **só de −30 a +110 ms em volta de cada clique** (o app sabe quando cada um tocou). Resultado no teste: clique 25 dB abaixo da nota (antes, −2 dB).
- **Teste** (`testes/teste7.js`, Chrome mudo, microfone simulado por `LP.fakeIn` com atraso de ida e volta conhecido): com 137 ms e 280 ms, calibração exata, loop e camada 2 com **0 ms de erro** em todas as notas, +50 ms de ajuste move a camada −50 ms, mudo/desfazer/apagar/fechar ok, microfone desligado ao fechar. **Falta testar com o teclado Bluetooth de verdade.**
- Limitação: com caixa de som (não fone), o loop também vaza no microfone e entra na camada nova, **alinhado** (só fica mais alto/colorido). Fone com fio evita.

## Offline (`sw.js`)
- O registro só acontece em contexto seguro (HTTPS ou localhost).
- Página: **rede primeiro**, com limite de 4 s e cópia em cache como reserva. Por isso não é preciso mudar `CACHE` a cada atualização do `index.html`.
- Fontes, ícone e manifest: **cache primeiro**. Mudar `CACHE` (`partitura-vN`, hoje **v3**) quando a lista `ARQUIVOS` mudar **e sempre que algo em `bp/` mudar**.
- `bp/` não está em `ARQUIVOS` (2 MB): é guardado na primeira vez que a Melodia abre e depois vem só do cache (cache primeiro, ignorando `?v=`). **Aconteceu no teste**: o navegador usou um `basic-pitch.js` velho do cache e a Melodia saiu errada. Por isso: trocar `CACHE` a cada mudança em `bp/`, e o código não depende de campos novos existirem (`q.o===0`, não `!q.o`).
- Melodia offline: funciona depois da primeira vez com internet.
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
- A faixa "Pitch MIDI" é a do método antigo. A Melodia com IA usa violão 40–88 e teclado 21–108.
- Valores de `wC`/`pen` foram ajustados só com as demos sintetizadas. Precisam de gravação real.

## Pipeline de análise (tudo no navegador, Web Audio)
Constantes: `SR = 22050` Hz, `N = 4096` (FFT), `HOP = 512` (~23 ms, `FPS ≈ 43`), `PRE = 0,12` s, **`ATQ = 6,5`** quadros.

**`ATQ` (medido em 26/11/2026):** o quadro i analisa o som de i·HOP até i·HOP+N (186 ms). Como o volume é comprimido (log), o ataque de uma nota já aparece no envelope de ataques quando ela **entra** na janela: o pico fica 6,5 quadros (~150 ms) **antes** da hora real, igual em violão, piano e órgão. Toda conversão segundos ↔ quadro de batida usa isso: notas da IA (`t*FPS - ATQ`), grade do metrônomo, escolha do tempo 1 e `bars.t0/t1` (destaque no "Ouvir" e marcas `[m:ss]`). Primeiro supus N/2 (4 quadros, 90 ms) e errei: as notas caíam atrasadas e às vezes meio tempo depois. **Lição: medir em vez de supor.**

1. **Decodificar e reamostrar**: `decodeAudioData` + `OfflineAudioContext` para mono 22050 Hz. No microfone, captura via `ScriptProcessorNode` na taxa nativa e reamostra no fim. Normaliza o pico para 0,5.
2. **`frames(x)`**: FFT com janela de Hann a cada hop, gerando por frame:
   - `chroma[12]`: energia por classe de nota (55–1760 Hz), peso cos² pela distância ao semitom.
   - `rms` (volume), `flux` (fluxo espectral, para ataques).
   - `pitch`: f0 por soma harmônica (MIDI 40–88, 6 harmônicos, peso 1/√h), com correção de oitava: se a sub-harmônica (−12/−19/−24) tiver ≥75% da saliência, usa ela.
3. **`beatsOf(F)`**: tempo e batidas.
   - Envelope de ataques = flux menos média local, normalizado.
   - Autocorrelação de 55 a 190 bpm, com preferência log-gaussiana em torno de 105 bpm.
   - **Com metrônomo + piano/violão** (`st.grid.met`, `wC < 1`): as batidas **são os cliques**. O 1º clique depois da contagem fica em `PRE` s na gravação, ou seja, no quadro `PRE*FPS - ATQ`, mais o atraso do som. O atraso é procurado em ±1/4 de tempo (máx. 0,15 s) em volta de `grid.lat`, escolhendo o que mais coincide com os ataques na grade de **colcheias** (peso 1,25 no tempo, 1 no contratempo). Comparar só com os tempos deixava uma melodia sincopada puxar a grade meio tempo. **Salvaguarda** para latência mal informada (fone Bluetooth): se a grade atual tem ataque em ≤ 20% dos tempos e a de meio tempo ao lado em ≥ 80%, troca. O tempo 1 do compasso 1 vem direto daí (`one`), e um tempo pouco antes do início da gravação vira o quadro 0 em vez de ser descartado (senão o compasso 1 pulava um tempo).
   - **Com metrônomo + pad/strings/órgão** (`wC ≥ 1`): rastreamento de Ellis com período fixo, penalidade `400·log²(intervalo/período)`. Esses timbres crescem devagar; alinhar onde a troca de acorde aparece acerta mais que alinhar no clique (testado: com a grade nos cliques o pad errava a 1ª batida de cada compasso quando a latência era mal estimada).
   - **Sem metrônomo** (contagem só no começo, sem contagem, arquivo): programação dinâmica com estado (quadro, intervalo), para acompanhar quem acelera ou desacelera (feedback do tio em 25/11/2026: com o período fixo, os acordes iam saindo do compasso). Intervalos de 0,78× a 1,3× o período inicial; trocar de intervalo entre batidas custa `LAM·Δlog²` (60) e se afastar do inicial custa `MU·log²` (2, ou 4 com contagem). Pad/strings/órgão (`wC ≥ 1`) rastreiam de compasso em compasso (`U = bpb`, `MU = 10`) e dividem cada compasso em tempos iguais, porque quase só têm ataque nas trocas de acorde.
   - bpm mostrado = média da música (primeira à última batida). Antes da primeira batida, completa com o primeiro intervalo.
   - `st.lagMul` multiplica o período (botões ½×/2×).
4. **Acordes por batida**: chroma médio por batida, similaridade de cosseno com 48 moldes (12 tônicas × maior, menor, 7, m7). Os moldes incluem harmônicos (offsets `[0,0,7,0,4]`, decaimento 0,6^h). Sem isso, C era confundido com Em7. Sétimas têm viés −0,04 para preferir tríades. Batida com rms < 6% do máximo, ou energia na faixa dos acordes (55–1760 Hz) < 4% do máximo, é silêncio. A segunda regra faz o clique do metrônomo sozinho (depois que a música acaba) não virar compasso.
5. **Suavização (Viterbi)**: penalidade 0,12 para trocar de acorde, evitando acordes "piscando".
6. **Tom**: pontua os 24 tons pelos acordes diatônicos encontrados (I, ii, iii, IV, V, vi), com bônus para tônica e dominante. Tons de bemol (F, Bb, Eb, Ab, Db, Gb, Dm, Gm, Cm, Fm…) escrevem acordes com ♭.
7. **Compassos**: começam na primeira batida com acorde (ignora silêncio inicial) e vão até a última. Um compasso final com até meia barra repetindo o acorde anterior é descartado (é a cauda do som), **a não ser que a IA da Melodia tenha achado ali um ataque forte** (`tocou()`, confiança ≥ 0,55): aí o acorde foi tocado de novo e o compasso fica. Com contagem sem metrônomo, o tempo 1 é a batida mais perto de `PRE*FPS - ATQ + lat*FPS`.
8. **Melodia**: com a IA, ver "Melodia com IA". Método antigo (só se `BPS.fail`): notas segmentadas pelos ataques (picos de flux > 1,6× a média local); cada segmento usa o pitch mais frequente (moda) e é quantizado a colcheias no grid de batidas.
9. **Ao vivo (`liveTick`, a cada 350 ms)**: analisa os últimos 0,6 s e só troca o acorde exibido depois de 2 leituras iguais seguidas.

## Notação (SVG desenhado à mão em `render()` / `note()`)
- Clave de sol com "8" embaixo (o violão soa uma oitava abaixo do escrito: nota escrita = MIDI + 12).
- Pauta com espaçamento `G = 8px`. Posição da nota pelo passo diatônico (E4 = linha de baixo, passo 30), com linhas suplementares, ♯/♭, haste para cima/baixo (B4 = passo 34) e bandeira de colcheia.
- Durações: semibreve/mínima (cabeça vazada), semínima, colcheia, pontuadas (1,5 e 3).
- **Acordes na pauta** (26/11/2026): `note()` aceita `nt.ms` (várias notas). Cabeças na mesma haste, linhas suplementares até a nota mais extrema, haste para cima ou para baixo pela média, nota vizinha (intervalo de segunda) deslocada para o lado, acidentes alternando de coluna. Nota com `sf` vai para a pauta que a IA escolheu.
- Sem pausas, ligaduras nem tercinas (simplificação).
- Nome do acorde acima da pauta: fonte de 10 a 17 px conforme a largura do tempo (`step*0,55`). No celular, com acorde mudando a cada tempo, os nomes se encavalavam.
- Retângulo `.hl` por compasso para destacar durante a reprodução.

## Estado (`st`)
`mode` ('cifra'|'melodia'), `tr` (transposição), `bpb` (batidas por compasso), `buf` (áudio 22050 Hz), `F` (frames: `chroma, rms, band, flux, pitch`), `A` (`{bars, bpm, key}`), `lagMul`, `grid` (`{bpm, met, lat}` ou null), `BP` (notas da IA ou null), `cnt` (`{on, bpm, met}`). Cada barra: `{t0, t1, ch:[{pos, t}], notes:[{pos, dur, m, ms?, sf?}]}`.

**Gancho de teste**: `window.__P` (st, run, analyse, setMode, setIns, kb, pluck, forma, BPS, setSeed) **só existe em `127.0.0.1`** (servidor local de teste), nunca no site publicado.

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
- Andamento variável (Node, `testes/teste4.js`): 5 timbres × 5 curvas (constante 96, acelera 84→104, desacelera 104→84, oscila ±7%, 90→100→88) × com/sem contagem, 12 compassos C–Am–F–G. Rastreador antigo: 436/600 compassos certos (com contagem e aceleração, 5/12, exatamente o problema do tio). Novo: 600/600.
- Metrônomo vazando (Node, `testes/teste5.js`): cliques até 1,5× o volume do violão, violão/piano/pad: 12/12, sem compasso fantasma no fim. Chrome com microfone falso: bolinhas pulsando, subtítulo "gravado com metrônomo", sem erros; conferido em 1000 px e 375 px.
- Afinador (Node): tons com harmônicos + ruído em 9 notas (de E1 41 Hz a A5) × 5 desafinações (−30 a +25 cents): pior erro de 0,21 cents. Silêncio e ruído não geram leitura. Corda Karplus-Strong: variação < 0,05 cent entre leituras; um único erro de oitava, na janela do ataque, que a mediana absorve. No Chrome com microfone falso, a cadeia mic → analyser → YIN funcionou (48 kHz, `running`), mas o bipe falso é picotado e foi descartado pela confiança, o que é o esperado. **Falta testar com instrumento de verdade.**
- Formas de violão (Node): as 48 combinações (12 × 4) só tocam notas do acorde, têm tônica + terça (+ sétima) e o baixo é a tônica. A latência do microfone pode deslocar uns 20–50 ms, coberto pelo `PRE`.
- Violão: o tio já testou e gostou. **Teclado ainda não testado com gravação real.**

- Melodia com IA (26/11/2026, `testes/teste6.js`, Chrome headless): ver a tabela em "Melodia com IA".
- Metrônomo com latência (`teste5.js` adaptado, 26/11/2026): atraso real × estimado do navegador = 0/0, 0/0,06, 0,08/0,08, 0,25/0,25, 0,25/0,15, 0,15/0,25, 0,3/0,3, 0,35/0,3, 0,3/0,06 e 0,4/0,06 s → violão, piano e pad 12/12 em todos. (Na versão publicada antes, com Ellis para tudo, também dava 12/12; a grade nos cliques foi para a Melodia ficar no tempo exato sem perder isso.)
- Regressão depois da Melodia com IA: `teste2` igual, `teste4` 600/600, `teste3` igual (afinador intocado).

### Scripts de teste (`testes/`)
Rodar da pasta do projeto. Todos carregam o `<script>` do `index.html` com `(0,eval)` e stubs mínimos de DOM.
- `node testes/teste2.js index.html saida.txt`: regressão (demos dos 5 timbres, contagem, correção, pacote do Repertório).
- `node testes/teste3.js index.html`: afinador YIN, 48 formas de violão, Karplus-Strong.
- `node testes/teste4.js index.html [violao,piano,orgao,strings,pad]`: andamento variável (precisa dar 600/600).
- `node testes/teste5.js index.html` e depois `node index.html.tmp.js index.html` (apagar o .tmp.js depois): metrônomo vazando no microfone. Para testar latência, no .tmp.js somar `LAT` ao `lead` dos acordes e dos cliques e pôr `lat:EST` no `st.grid`.
- `node testes/teste6.js <pasta que contém partitura-violao/> <porta>`: Melodia, método antigo × IA (precisa de WebGL, então Chrome headless; não roda no Node). `DET=1` mostra caso a caso. Copiar `index.html`, `sw.js` e `bp/` para a pasta de teste e lembrar que o service worker guarda o `bp/` em cache: ao mudar `bp/`, usar perfil novo do Chrome ou trocar `CACHE`.
- `node testes/teste7.js <pasta que contém partitura-violao/> <porta> [atraso ms]`: looper (calibração, alinhamento, clique vazado).
- Chrome headless para os testes: **sempre com `--mute-audio`** (sem isso o som de teste sai no fone/caixa do Eduardo; aconteceu em 26/11/2026). `chrome --headless=new --mute-audio --remote-debugging-port=9333 --user-data-dir=<perfil> --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --autoplay-policy=no-user-gesture-required`.
- `cdp.js` (offline/service worker), `cdp2.js` (quadro de acordes e afinador), `cdp3.js` (metrônomo): precisam de um Chrome headless com `--remote-debugging-port` e microfone falso (`--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`). Uso: `node testes/cdp3.js <pasta que contém partitura-violao/> <pasta das capturas> <porta>`.

## Histórico (feedback do tio e versões)
Tudo em 25/11/2026.
- v1 só violão (feita em outro chat). O tio testou e gostou.
- Teclado (piano, órgão, strings, pad), visual novo, fontes no próprio site.
- Correção de acorde com um toque e contagem 1-2-3-4.
- Imprimir/PDF, offline e "Salvar no Repertório".
- Afinador e quadro "Acordes desta música" (commit 6c657fb).
- **Feedback do tio depois disso** (testado com violão): os acordes saem todos certos, mas escorregam de compasso quando quem toca acelera ou desacelera, porque o app fixava o andamento da contagem e parava de contar. Ele sugeriu detectar a velocidade de quem toca ou ter um metrônomo sempre ligado. **Fizemos os dois** (commit 021652c, publicado): rastreador de andamento variável e botão "♩ Metrônomo".
- **Feedback do tio (26/11/2026)**: "dos acordes, com o metrônomo, agora tá perfeitinho". Na **Melodia** não: "pega algumas notas, só que inventa outras, totalmente fora", e só capta uma nota por vez, então quando a frase termina num acorde, se perde.
- **Decisão (26/11/2026)**: o Eduardo sugeriu tirar o violão e focar no piano, que o tio usa mais. Combinamos **manter o violão** (funciona, aprovado, afinador e diagramas são dele, e o link tem "violao") e deixar o **teclado como padrão**, com a Melodia do piano usando IA (Basic Pitch).
- **Feito em 26/11/2026** (ainda **não commitado nem publicado** quando este registro foi escrito):
  - Melodia com IA (`bp/`, `melodiaIA`, `notasIA`, acordes na pauta).
  - Teclado primeiro e padrão.
  - `ATQ` medido e aplicado em todo lugar; grade do metrônomo nos cliques para piano/violão, com latência do navegador e salvaguarda.
  - Último compasso não é cortado se a IA viu ataque.
  - Fonte do nome do acorde se ajusta no celular.
  - `sw.js` em v3 com a regra do `bp/`.
  - Rodapé com crédito/licença; textos "O que funciona bem" e "Onde ainda erra" com a Melodia com IA.
  - Teste novo `testes/teste6.js`.
- **Textos da página revisados (26/11/2026)**: título, marca, `<h1>`, `manifest.json` e README com teclado primeiro; frase do topo cita a Melodia; título/subtítulo iniciais da folha já no piano; "Andamento e tom", "Onde ainda erra" e "Dica de gravação" atualizados (contagem, metrônomo, fone com fio). Testes depois disso: `teste2` igual, `teste4` 600/600, `teste6` igual à tabela da Melodia. Publicado junto com a Melodia com IA.
- **Feedback do tio (26/11/2026, tarde, antes de testar a Melodia)**: gostou bastante de gravar. Pediu (1) **gravar uma 2ª pista por cima da 1ª** (ele já sofre com latência nisso em outros apps) e (2) **looping**: gravar alguns compassos e o app ficar repetindo. Ele respondeu que o **looping é para treino** (não precisa gerar partitura). O teclado novo dele tem **Bluetooth**: o som do celular sai nas caixas do teclado. **Feito (ver "Looper")**, commitado localmente, sem publicar até o retorno do teste da Melodia.
- Próximo passo com o tio: testar a Melodia no piano com gravação real (melodia com acorde no fim, as duas mãos) e mandar retorno. Se escorregar, pedir a gravação.

## Limitações conhecidas
- Acordes com 9ª, sus, dim, aum e baixo trocado (C/E) saem simplificados.
- Melodia (IA): partitura simplificada (sem pausas, ligaduras, tercinas; menor figura colcheia). Na 1ª vez precisa de internet (~2 MB). Sem WebGL, volta ao método antigo (uma nota por vez).
- Nomes de acorde na Melodia vêm da análise de cifra (chroma): com áudio só de melodia + baixo, sem acompanhamento, podem sair estranhos (ex.: Gm, Cm). Com acorde tocado, ficam certos. Ideia: usar as notas da IA para ajudar a cifra.
- Metrônomo: a grade usa a latência informada pelo navegador. Com fone Bluetooth que informa errado, a salvaguarda pega casos claros (batida de violão), mas uma melodia muito sincopada pode sair meio tempo fora. Recomendar alto-falante ou fone com fio.
- Pad/strings: o andamento depende das trocas de acorde. Música com acorde parado por muitos compassos fica sem pulso confiável. Para esses casos, gravar com o metrônomo ligado.
- O rastreador acompanha variação gradual (~±20% ao longo da música). Mudança brusca de andamento (ex.: "ritornello" lento → rápido) ainda pode errar.
- Alto-falante de celular perde o grave e o baixo do acorde pode sair errado. Caixinha de som ajuda.
- Compassos ainda não detectam anacruse (a música começa sempre no tempo 1).
- `ScriptProcessorNode` é obsoleto. Migrar para `AudioWorklet`.

## Próximos passos (ideias)
1. Testar com gravações reais e ajustar limiares (silêncio 6% / faixa 4%, penalidade Viterbi 0,12, onset 1,6×, rastreador LAM 60 / MU 2–10).
2. Diagramas feitos (violão e teclado, 25/11/2026). Falta tablatura e afinador de baixo (cordas E1 A1 D2 G2).
3. PDF feito (impressão, 25/11/2026). Falta MusicXML para abrir no MuseScore.
4. ~~Edição manual~~ (feito 25/11/2026). Próximo: corrigir também notas da melodia (tocar na nota → mudar/apagar).
5. Mais tipos de acorde (sus, dim, 9, baixo invertido) com detecção do baixo pela faixa grave.
6. Salvar músicas: feito via Repertório Palco (botão "Salvar no Repertório", 25/11/2026).
7. ~~Basic Pitch no navegador~~ (feito 26/11/2026 para a Melodia). Versão multi-instrumento: separar com Demucs e transcrever com Basic Pitch / YourMT3 num servidor Python. A ordem "separar → transcrever" acumula erro, por isso os modelos conjuntos são melhores.
8. Foco em música brasileira (sertanejo, MPB, pagode, louvor) como diferencial.
9. Melodia: pausas e ligaduras; exportar MusicXML para o MuseScore.
11. **Entrada MIDI por cabo (ideia guardada em 26/11/2026, para depois)**: o teclado do tio é um Yamaha CK61 (Bluetooth só recebe áudio; USB TO HOST com MIDI e áudio 2×2) e o celular é Samsung Android. Com cabo USB-B ↔ USB-C (OTG) no Chrome: Web MIDI → Melodia e cifra pelas teclas exatas, e áudio limpo e com pouco atraso para o looper. Antes de programar, ele testa o cabo em https://midi.city. Só ler MIDI, nunca enviar (sem sysex).
10. Capotraste no violão ("Capo 2: formas de G") e mais tipos de acorde (sus4, 9, baixo invertido), que o louvor usa muito (sugeridos ao Eduardo em 25/11/2026).

## Convenções
- Interface e textos em português do Brasil.
- Manter tudo num `index.html` autocontido enquanto der. Sem frameworks nem build.
- Valores numéricos de ajuste ficam como constantes no topo do script ou documentados aqui.
- **Código de terceiros** (`bp/`): versão fixa, baixado do npm com verificação de integridade, hash anotado aqui, licença junto e crédito no rodapé. Para atualizar: baixar a versão nova numa pasta isolada, ler o que mudou, conferir licença, atualizar a tabela de hashes e trocar `CACHE`. Não carregar de CDN (privacidade e cadeia de suprimentos).
- Editar `index.html` com scripts Node de substituição exata (`R(antigo, novo)` que falha se não achar). Cuidado: `git stash`/checkout converte o arquivo para CRLF (autocrlf) e as substituições com `\n` deixam de achar; normalizar para LF antes.
