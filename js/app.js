/* ============================================================
   SEÑORITA — moteur de session
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

Store.load();
Store.data.settings = Object.assign({ newPerDay: 8, rate: 0.9, voice: null, sessionMin: 16 }, Store.data.settings || {});
Voice.init();
Sound.init();

/* ── Micro : on teste vraiment, et on le dit ─────────────── */

/** Renvoie "ok" ou un code. Le résultat est mis en cache après le premier test. */
async function micStatus() {
  return Ears.status || await Ears.probe();
}

/** Écrit l'explication d'échec micro dans un conteneur. */
function micFail(code, node) {
  const x = Ears.explain(code);
  node.innerHTML = `<div class="warn-box" style="text-align:left;margin:0">
      <b>${x.t}</b><br><span style="color:var(--mut)">${x.d}</span>
      <div style="color:var(--dim);margin-top:.5rem;font-size:.82rem">
        Tu peux continuer sans micro : dis la phrase à voix haute et note-toi toi-même. C'est le fait de parler qui compte, pas la machine qui écoute.
      </div>
    </div>`;
}

/** Bandeau global affiché tant que le micro n'est pas utilisable. */
async function micBanner() {
  const st = await micStatus();
  document.querySelectorAll(".mic-banner").forEach(n => n.remove());
  if (st === "ok") return;
  const x = Ears.explain(st);
  const b = el("div", "warn-box mic-banner",
    `<b>🎙 ${x.t}</b><br><span style="color:var(--mut)">${x.d}</span>`);
  $("#v-home").prepend(b.cloneNode(true));
  $("#v-session").prepend(b);
}


/* ── Univers ─────────────────────────────────────────────
   Six ambiances, une par famille de situations. Elles ne servent
   pas à décorer : associer une phrase à un lieu mental aide à la
   rappeler. C'est le même principe que la méthode des lieux. */
const AMBIANCES = {
  bar:     ["resto", "social", "argot"],
  mercado: ["achat"],
  calle:   ["survie", "base", "meta"],
  oficina: ["travail", "abstrait"],
  casa:    ["quotidien", "passé", "récit", "opinion", "connecteur"],
  noche:   ["futur", "subjonctif", "conditionnel", "impératif", "perso"]
};
const TAG2AMB = {};
for (const a in AMBIANCES) AMBIANCES[a].forEach(t => TAG2AMB[t] = a);

let ambCur = null, ambLayer = 0;
function setAmbience(tag) {
  const name = TAG2AMB[tag] || "calle";
  if (name === ambCur) return;
  ambCur = name;
  const layers = $$("#ambience i");
  if (!layers.length) return;
  ambLayer = 1 - ambLayer;
  const next = layers[ambLayer];
  next.style.backgroundImage = `url(univers/${name}.jpg)`;
  next.classList.add("on");
  layers[1 - ambLayer].classList.remove("on");
}

/* ── Navigation ─────────────────────────────────────────── */
function show(v) {
  $$("nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  if (v !== "session") Session.abort();
  if (v === "home") renderHome();
  if (v === "rules") renderRules();
  if (v === "machine") renderMachine();
  if (v === "meca") renderMeca();
  if (v === "prog") renderProg();
  if (v === "islands") renderIslands();
  if (v === "mine") renderMined();
  if (v === "set") renderSettings();
  window.scrollTo(0, 0);
}
$$("nav button").forEach(b => b.onclick = () => show(b.dataset.v));

/* ── Accueil ─────────────────────────────────────────────── */
function renderHome() {
  const cov = SRS.coverage();
  $("#cov-n").textContent = Math.round(cov) + "%";
  $("#cov-bar").style.width = cov + "%";
  $("#h-cov").textContent = Math.round(cov) + "%";
  $("#h-streak").textContent = SRS.streak();

  const active = SRS.knownWords().size;
  const unlocked = SRS.passiveWords();
  $("#cov-detail").innerHTML = unlocked
    ? `${active} mots que tu peux <b style="color:var(--mut)">produire</b> · et ≈ ${unlocked.toLocaleString("fr")} que tu <b style="color:var(--mut)">reconnais</b> grâce aux règles de conversion (comptés à part, exprès)`
    : `${active} mots produisibles · passe par l'onglet Cheat code : il vaut des milliers de mots reconnaissables en une soirée`;

  $("#t-due").textContent = SRS.due().length;
  $("#t-mast").textContent = SRS.mastered();
  $("#t-words").textContent = active;
  $("#t-spoken").textContent = Math.round(Store.data.log.reduce((n, e) => n + (e.spoken || 0), 0) / 60);

  const due = SRS.due().length;
  $("#go").textContent = `Lancer la session · ${Store.data.settings.sessionMin} min`
    + (due ? ` · ${due} à réviser` : "");
}
$("#go").onclick = () => { show("session"); Session.start(); };

/* ============================================================
   SESSION — 4 phases
   ============================================================ */

const PHASES = [
  { key: "decode", name: "Phase 1 · Décodage", why: "Une règle de conversion FR→ES. Deux minutes ici valent des semaines de fiches de vocabulaire.", w: .10 },
  { key: "recall", name: "Phase 2 · Rappel actif", why: "Tu produis la phrase à voix haute AVANT de voir la réponse. Bloqué ? Prends un indice — l'échelle est là pour ça, pas la honte.", w: .36 },
  { key: "listen", name: "Phase 3 · Compréhension", why: "Tu entends sans voir. Reconstruis la phrase. C'est l'entraînement qui te fera comprendre une série — et il ne ressemble à aucun autre.", w: .18 },
  { key: "shadow", name: "Phase 4 · Shadowing", why: "Tu colles à la voix native, en même temps qu'elle. C'est ce qui installe le rythme et l'accent, pas la théorie phonétique.", w: .14 },
  { key: "produce", name: "Phase 5 · Production libre", why: "Soixante secondes sans filet. Le micro transcrit ce que tu as réellement dit — pas ce que tu crois avoir dit.", w: .22 }
];

/* Échelle d'indices : « je ne sais pas » n'est pas une réponse utile.
   On descend marche par marche jusqu'à ce que ça débloque. */
function skeleton(s, revealWords = 0) {
  let i = 0;
  return s.replace(/[\p{L}\p{M}]+/gu, w => (i++ < revealWords) ? w : w[0] + "·".repeat(w.length - 1));
}

const Session = {
  live: false, i: 0, t0: 0, budget: 0,
  queue: [], cur: null, done: 0, spoke: 0,

  start() {
    this.live = true; this.i = 0; this.done = 0; this.spoke = 0;
    this.budget = Store.data.settings.sessionMin * 60000;
    this.queue = SRS.queue(60);
    this.t0 = Date.now();
    this.enter(0);
  },

  abort() { this.live = false; Voice.stop(); Ears.stop(); },

  /** Temps alloué à la phase i (ms) */
  slot(i) { return this.budget * PHASES[i].w; },

  enter(i) {
    if (!this.live) return;
    if (i >= PHASES.length) return this.finish();
    this.i = i; this.pt0 = Date.now();
    $$("#pbar div").forEach((d, k) => { d.className = k < i ? "past" : (k === i ? "on" : ""); });
    $("#pname").textContent = PHASES[i].name;
    $("#pwhy").textContent = PHASES[i].why;
    Voice.stop(); Ears.stop();
    this["ph_" + PHASES[i].key]();
  },

  next() { this.enter(this.i + 1); },

  overtime() { return Date.now() - this.pt0 > this.slot(this.i); },

  /* ---------- Phase 1 : décodage ---------- */
  ph_decode() {
    const todo = RULES.filter(r => !Store.data.rules[r.id]);
    if (!todo.length) return this.next();
    const r = todo[0];
    const s = $("#stage"); s.innerHTML = "";

    const box = el("div", "rule" + (r.danger ? " danger" : ""));
    box.appendChild(el("div", "rule-h",
      `<b>${r.title}</b>${r.gain ? `<span class="gain">≈ ${r.gain} mots d'un coup</span>` : ""}`));
    box.appendChild(el("p", null, r.body));
    const exs = el("div", "exs");
    r.ex.forEach(([a, b]) => {
      const row = el("div", "ex", `<span class="a">${a}</span><span class="arr">→</span><span class="b">${b}</span>`);
      row.querySelector(".b").onclick = () => Sound.play(b.replace(/\s*\(.*/, ""));
      exs.appendChild(row);
    });
    box.appendChild(exs);
    s.appendChild(box);

    const row = el("div", "row");
    row.style.marginTop = "1.2rem";
    row.style.justifyContent = "center";
    const ok = el("button", "btn pri", "Je la maîtrise — suivante");
    ok.onclick = () => { Store.data.rules[r.id] = true; Store.save(); this.ph_decode(); };
    const later = el("button", "btn", "Pas encore · passer à la suite");
    later.onclick = () => this.next();
    row.append(ok, later);
    s.appendChild(row);

    if (this.overtime()) { row.prepend(el("div", "tap-hint", "Le temps de cette phase est écoulé — tu peux enchaîner.")); }
  },

  /* ---------- Phase 2 : rappel actif ---------- */
  ph_recall() {
    if (!this.queue.length || this.overtime()) return this.next();
    this.cur = this.queue.shift();
    const c = this.cur, s = $("#stage");
    const isNew = !SRS.card(c.id);
    setAmbience(c.tag);
    s.innerHTML = "";

    const stage = el("div", "stage");
    if (isNew) stage.appendChild(el("div", "tap-hint", "◆ nouvelle phrase"));
    stage.appendChild(el("div", "prompt-fr", c.fr));

    const reveal = el("div", "hidden");
    reveal.appendChild(el("div", "answer-es", c.es));
    if (c.note) reveal.appendChild(el("div", "note", c.note));
    stage.appendChild(reveal);

    const heard = el("div", "transcript");
    stage.appendChild(heard);

    const actions = el("div", "row");
    actions.style.justifyContent = "center";

    const micBtn = el("button", "btn", "🎙 Vérifier au micro");
    micBtn.onclick = async () => {
      if (Ears.active) { Ears.stop(); return; }
      const st = await micStatus();
      if (st !== "ok") { micFail(st, heard); micBtn.disabled = true; return; }
      micBtn.textContent = "⏹ J'ai fini";
      heard.textContent = "…";
      Ears.listen(
        txt => heard.textContent = txt,
        finalTxt => {
          micBtn.textContent = "🎙 Réessayer";
          this.spoke += 6;
          const said = (finalTxt || heard.textContent || "").replace(/^…$/, "").trim();
          if (!said) { heard.innerHTML = `<span class="scoreline">Rien capté — parle plus près du micro.</span>`; return; }
          const r = Match.score(said, c.es);
          heard.innerHTML = r.words.map(w => `<span class="${w.ok ? "w-ok" : "w-no"}">${w.w}</span>`).join(" ")
            + `<div class="scoreline">${r.pct}% des mots attendus détectés</div>`;
          showAnswer();
        },
        err => micFail(err, heard)
      );
    };

    /* ---- Échelle d'indices ----
       Sans elle, une phrase inconnue est un mur : tu ne produis rien, tu
       cliques « révéler », tu lis. Lire n'apprend pas. Avec l'échelle, tu
       produis toujours quelque chose — c'est l'effort partiel qui grave. */
    const hintBox = el("div", "hint");
    stage.appendChild(hintBox);
    let hints = 0;

    const HINTS = [
      () => { hintBox.innerHTML = `<span class="hint-lab">Squelette</span><span class="hint-txt">${skeleton(c.es)}</span>`; },
      () => { hintBox.innerHTML = `<span class="hint-lab">Premier mot</span><span class="hint-txt">${skeleton(c.es, 1)}</span>`; Sound.play(c.es); },
      () => { hintBox.innerHTML = `<span class="hint-lab">Moitié</span><span class="hint-txt">${skeleton(c.es, Math.ceil(c.es.split(/\s+/).length / 2))}</span>`; }
    ];

    const hintBtn = el("button", "btn", "Un indice ↓");
    hintBtn.onclick = () => {
      if (hints >= HINTS.length) return showAnswer();
      HINTS[hints++]();
      hintBtn.textContent = hints >= HINTS.length ? "Montre-moi la réponse" : `Encore un indice ↓ (${hints}/${HINTS.length})`;
    };

    const revBtn = el("button", "btn pri", "Je l'ai dite → révéler");
    revBtn.onclick = () => showAnswer();

    actions.append(hintBtn, micBtn, revBtn);
    stage.appendChild(actions);
    stage.appendChild(el("div", "tap-hint", "Dis-la à voix haute. Vraiment à voix haute. Pas dans ta tête."));
    s.appendChild(stage);

    const showAnswer = () => {
      if (!reveal.classList.contains("hidden")) return;
      Ears.stop();
      reveal.classList.remove("hidden");
      actions.classList.add("hidden");
      Sound.play(c.es);
      const g = el("div", "grades");
      const scale = hints === 0
        ? [[1, "Raté", "revoir dans 6 min"], [2, "Dur", "revoir bientôt"], [3, "Bien", "espacé normalement"], [4, "Trop facile", "on saute loin"]]
        : [[1, "Raté", "revoir dans 6 min"], [2, "Dur", "revoir bientôt"], [3, "Sortie avec l'indice", "espacé, mais moins"]];
      if (hints) g.style.gridTemplateColumns = "repeat(3,1fr)";
      scale.forEach(([n, lab, sub]) => {
          const b = el("button", null, `${lab}<small>${sub}</small>`);
          b.dataset.g = n;
          b.onclick = () => {
            SRS.rate(c.id, n);
            if (n === 1) this.queue.push(c);
            this.done++; SRS.today().reviews++; Store.save();
            this.ph_recall();
          };
        g.appendChild(b);
      });
      s.appendChild(g);
      const again = el("button", "btn", "🔊 Réécouter");
      again.style.marginTop = ".7rem";
      again.onclick = () => Sound.play(c.es);
      s.appendChild(again);
    };
  },

  /* ---------- Phase 3 : compréhension orale ----------
     Le trou béant des méthodes classiques. On sait produire des phrases
     apprises, et on ne comprend toujours rien à un natif. Ici : audio seul,
     aucun texte, et tu reconstruis avec une banque de mots. Pas de clavier —
     à ton niveau, taper l'orthographe serait un second obstacle inutile. */
  ph_listen() {
    const pool = SRS.all().filter(c => SRS.card(c.id) && c.es.split(/\s+/).length >= 3);
    if (pool.length < 2) return this.next();
    let k = 0;
    const s = $("#stage");

    const draw = () => {
      if (this.overtime() && k > 0) return this.next();
      const c = pool[(this.done + k) % pool.length];
      k++;
      setAmbience(c.tag);
      s.innerHTML = "";

      const target = c.es.split(/\s+/);
      // distracteurs : des mots d'autres phrases déjà vues, donc plausibles
      const others = pool.filter(x => x !== c).flatMap(x => x.es.split(/\s+/));
      // mélange déterministe mais réellement varié : on trie sur le hash du mot,
      // donc chaque phrase produit un ordre différent, et le même à chaque passage
      const h = w => { let n = 0; for (const ch of w + c.id) n = (n * 31 + ch.charCodeAt(0)) >>> 0; return n; };
      const noise = [...new Set(others)].filter(w => !target.includes(w))
        .sort((a, b) => h(a) - h(b)).slice(0, Math.min(3, Math.ceil(target.length / 3)));
      const bank = [...new Set([...target, ...noise])]
        .map(w => ({ w })).sort((a, b) => h(a.w) - h(b.w));

      const stage = el("div", "stage");
      stage.appendChild(el("div", "phase-name", "Écoute, puis reconstruis"));

      const playBtn = el("button", "btn pri big", "🔊 Écouter");
      playBtn.onclick = () => Sound.play(c.es);
      stage.appendChild(playBtn);

      const slow = el("button", "btn", "🐢 Plus lentement");
      slow.onclick = () => Sound.play(c.es, 0.6);
      stage.appendChild(slow);

      const built = el("div", "built");
      built.dataset.empty = "1";
      stage.appendChild(built);

      const bankEl = el("div", "bank");
      const chosen = [];

      const refresh = () => {
        built.innerHTML = chosen.length
          ? chosen.map((w, i) => `<button class="chip on" data-i="${i}">${w}</button>`).join("")
          : `<span class="tap-hint">Touche les mots dans l'ordre que tu as entendu</span>`;
        built.querySelectorAll("button").forEach(b => b.onclick = () => {
          const w = chosen.splice(+b.dataset.i, 1)[0];
          bankEl.querySelectorAll("button").forEach(x => { if (x.textContent === w && x.disabled) { x.disabled = false; return; } });
          refresh();
        });
      };

      bank.forEach(({ w }) => {
        const b = el("button", "chip", w);
        b.onclick = () => { if (b.disabled) return; b.disabled = true; chosen.push(w); refresh(); };
        bankEl.appendChild(b);
      });
      stage.appendChild(bankEl);
      refresh();

      const verdict = el("div", "transcript");
      stage.appendChild(verdict);

      const row = el("div", "row"); row.style.justifyContent = "center";
      const check = el("button", "btn pri", "Vérifier");
      check.onclick = () => {
        const said = chosen.join(" ");
        const okAll = Match.norm(said) === Match.norm(c.es);
        const r = Match.score(said, c.es);
        verdict.innerHTML = `<div class="answer-es sm">${c.es}</div>
          <div style="color:var(--mut);font-size:.95rem;margin:.4rem 0 .2rem">${c.fr}</div>
          <div class="scoreline">${okAll
            ? `<span style="color:var(--ok)">Exact. C'est ton oreille qui a fait ça, pas tes yeux.</span>`
            : `${r.pct}% de la phrase reconstruite — réécoute en ralenti et repère ce qui t'a échappé.`}</div>`;
        Sound.play(c.es);
        SRS.today().reviews++; Store.save();
        check.disabled = true;
      };
      const nx = el("button", "btn", "Suivante →");
      nx.onclick = () => draw();
      const skip = el("button", "btn", "Passer au shadowing →");
      skip.onclick = () => this.next();
      row.append(check, nx, skip);
      stage.appendChild(row);
      s.appendChild(stage);

      Sound.play(c.es);
    };
    draw();
  },

  /* ---------- Phase 4 : shadowing ---------- */
  ph_shadow() {
    const pool = SRS.all().filter(c => SRS.card(c.id)).sort((a, b) => b.lvl - a.lvl);
    if (!pool.length) return this.next();
    let k = 0;
    const s = $("#stage");

    const draw = () => {
      if (k >= pool.length || this.overtime() && k > 2) return this.next();
      const c = pool[k % pool.length];
      setAmbience(c.tag);
      s.innerHTML = "";
      const stage = el("div", "stage");
      stage.appendChild(el("div", "answer-es sm", c.es));
      stage.appendChild(el("div", "prompt-fr", `<span style="font-size:.95rem;color:var(--mut)">${c.fr}</span>`));

      const speed = el("div", "speed",
        `<span>lent</span><input type="range" min="0.5" max="1.15" step="0.05" value="${Store.data.settings.rate}"><span>natif</span>`);
      const sl = speed.querySelector("input");
      sl.oninput = () => { Store.data.settings.rate = +sl.value; Store.save(); };
      stage.appendChild(speed);

      const row = el("div", "row"); row.style.justifyContent = "center";
      const play = el("button", "btn pri", "🔊 Écouter puis répéter par-dessus");
      play.onclick = () => { Sound.play(c.es, +sl.value); this.spoke += 4; };
      const nx = el("button", "btn", "Suivante →");
      nx.onclick = () => { k++; draw(); };
      row.append(play, nx);
      stage.appendChild(row);
      stage.appendChild(el("div", "tap-hint", "Ne répète pas après : répète EN MÊME TEMPS. Un demi-mot de retard, pas plus."));
      s.appendChild(stage);

      const skip = el("button", "btn", "Passer à la production libre →");
      skip.style.marginTop = "1rem";
      skip.onclick = () => this.next();
      s.appendChild(skip);

      Sound.play(c.es, +sl.value);
    };
    draw();
  },

  /* ---------- Phase 5 : production libre ---------- */
  ph_produce() {
    const lvl = Math.max(1, Math.min(6, Math.ceil(SRS.mastered() / 25) + 1));
    const pool = PROMPTS.filter(p => p.lvl <= lvl);
    const p = pool[Math.floor(Date.now() / 86400000) % pool.length];
    const s = $("#stage"); s.innerHTML = "";

    const stage = el("div", "stage");
    stage.appendChild(el("div", "prompt-fr", p.txt));
    stage.appendChild(el("div", "note", `Amorces possibles : <i style="font-family:var(--serif);color:var(--gold)">${p.hint}</i>`));

    const mic = el("div", "mic", "🎙");
    stage.appendChild(mic);
    const timer = el("div", "scoreline", "60 secondes. Tu as le droit d'être mauvais.");
    stage.appendChild(timer);
    const out = el("div", "transcript");
    stage.appendChild(out);

    const row = el("div", "row"); row.style.justifyContent = "center";
    const btn = el("button", "btn pri", "Démarrer · 60 s");
    let iv = null, left = 60;

    btn.onclick = async () => {
      if (Ears.active) { Ears.stop(); return; }
      const st = await micStatus();
      if (st !== "ok") {
        micFail(st, out);
        timer.innerHTML = `Fais l'exercice sans micro : chronomètre-toi 60 s et parle. <b style="color:var(--gold)">C'est la partie qui compte.</b>`;
        btn.disabled = true;
        return;
      }
      left = 60; mic.classList.add("live"); btn.textContent = "⏹ Arrêter";
      out.textContent = "";
      iv = setInterval(() => {
        left--; timer.textContent = `${left} s`;
        if (left <= 0) Ears.stop();
      }, 1000);
      Ears.listen(
        txt => out.textContent = txt,
        finalTxt => {
          clearInterval(iv); mic.classList.remove("live"); btn.textContent = "🔁 Recommencer";
          const said = (finalTxt || out.textContent || "").trim();
          const n = said ? said.split(/\s+/).length : 0;
          this.spoke += (60 - left);
          timer.innerHTML = n
            ? `<b style="color:var(--gold)">${n} mots</b> produits en espagnol, sans filet.`
            : "Rien capté. Parle plus près du micro — ou plus fort, l'espagnol n'aime pas les timides.";
          if (said) out.innerHTML = `<span style="color:var(--tx)">${said}</span>
            <div class="scoreline" style="margin-top:.6rem">Voilà ce que la machine a entendu. Les écarts avec ton intention, c'est ta liste de travail — mets-les dans « Mes phrases ».</div>`;
        },
        err => { clearInterval(iv); mic.classList.remove("live"); btn.textContent = "Réessayer";
          timer.textContent = ""; micFail(err, out); }
      );
    };

    const fin = el("button", "btn", "Terminer la session");
    fin.onclick = () => { Ears.stop(); clearInterval(iv); this.finish(); };
    row.append(btn, fin);
    stage.appendChild(row);
    s.appendChild(stage);
  },

  /* ---------- Fin ---------- */
  finish() {
    this.live = false; Voice.stop(); Ears.stop();
    const mins = Math.round((Date.now() - this.t0) / 60000);
    const e = SRS.today();
    e.min += mins; e.spoken = (e.spoken || 0) + this.spoke;
    Store.save();
    snapshot();
    autoSync();

    $$("#pbar div").forEach(d => d.className = "past");
    $("#pname").textContent = "Session terminée";
    $("#pwhy").textContent = "";
    const cov = SRS.coverage();
    $("#stage").innerHTML = `
      <div class="done">
        <div class="k">${Math.round(cov)}%</div>
        <p style="color:var(--mut);margin-bottom:1.6rem">de l'espagnol parlé courant, après ${mins} min et ${this.done} phrases.</p>
        <div class="grid3" style="max-width:520px;margin:0 auto 2rem">
          <div class="tile"><b>${this.done}</b><span>phrases travaillées</span></div>
          <div class="tile"><b>${Math.round(this.spoke)}s</b><span>de parole produite</span></div>
          <div class="tile"><b>${SRS.streak()}</b><span>jours d'affilée</span></div>
        </div>
        <button class="btn pri big" id="back-home">Revenir à l'accueil</button>
      </div>`;
    $("#back-home").onclick = () => show("home");
  }
};

/* ── Cheat code ─────────────────────────────────────────── */
function renderRules() {
  const w = $("#rules-list"); w.innerHTML = "";
  RULES.forEach(r => {
    const got = !!Store.data.rules[r.id];
    const box = el("div", "rule" + (r.danger ? " danger" : "") + (got ? " got" : ""));
    box.appendChild(el("div", "rule-h",
      `<b>${r.title}</b>${r.gain ? `<span class="gain">≈ ${r.gain} mots</span>` : ""}`));
    box.appendChild(el("p", null, r.body));
    const exs = el("div", "exs");
    r.ex.forEach(([a, b]) => {
      const row = el("div", "ex", `<span class="a">${a}</span><span class="arr">→</span><span class="b">${b}</span>`);
      row.querySelector(".b").onclick = () => Sound.play(b.replace(/\s*\(.*/, "").replace(/[A-Z]{3,}.*/, ""));
      exs.appendChild(row);
    });
    box.appendChild(exs);
    const t = el("button", "btn", got ? "✓ Acquise — décocher" : "Je la maîtrise");
    t.style.marginTop = ".9rem";
    t.onclick = () => { Store.data.rules[r.id] = !got; Store.save(); renderRules(); };
    box.appendChild(t);
    w.appendChild(box);
  });
}


/* ── Mécaniques ─────────────────────────────────────────── */
function renderMeca() {
  const w = $("#meca-list"); w.innerHTML = "";
  MECANIQUES.forEach(m => {
    const done = Store.data.meca?.[m.id];
    const box = el("div", "rule" + (done ? " got" : ""));
    box.innerHTML = `<div class="rule-h"><b>${m.title}</b><span class="gain">${m.sub}</span></div>
      <p style="color:var(--mut);font-size:.9rem;margin:.6rem 0 .9rem">${m.trap}</p>
      <div class="exs">${m.rule.map(([k, v]) =>
        `<div class="ex" style="grid-template-columns:9rem 1fr"><span class="a" style="color:var(--gold);text-align:left">${k}</span><span style="color:var(--mut);font-size:.88rem">${v}</span></div>`).join("")}</div>
      <div class="killer">${m.killer}</div>`;

    const fromWrap = el("div");
    fromWrap.appendChild(el("div", "hint-lab", "Tu l'as déjà rencontré ici"));
    const fr = el("div", "cands");
    m.from.forEach(t => {
      const b = el("button", "chip", t);
      b.onclick = () => Sound.play(t);
      fr.appendChild(b);
    });
    fromWrap.appendChild(fr);
    box.appendChild(fromWrap);

    /* Le drill : on te fait tomber dans le piège avant de l'expliquer. */
    const drill = el("div", "drill");
    let idx = 0, score = 0;
    const step = () => {
      if (idx >= m.drill.length) {
        Store.data.meca = Store.data.meca || {};
        Store.data.meca[m.id] = { score, total: m.drill.length, at: Date.now() };
        Store.save();
        drill.innerHTML = `<div class="drill-done"><b>${score}/${m.drill.length}</b>
          <span>${score === m.drill.length ? "Mécanique verrouillée."
            : score >= m.drill.length - 1 ? "Presque. Relis le piège en haut, puis recommence."
            : "Normal au début — c'est exactement pour ça que cette section existe. Reprends."}</span></div>`;
        const again = el("button", "btn", "Refaire");
        again.onclick = () => { idx = 0; score = 0; step(); };
        drill.appendChild(again);
        return;
      }
      const d = m.drill[idx];
      drill.innerHTML = `<div class="drill-q"><span class="drill-n">${idx + 1}/${m.drill.length}</span>${d.q.replace("___", "<b>___</b>")}</div>`;
      const opts = el("div", "row");
      d.opts.forEach((o, i) => {
        const b = el("button", "btn", o);
        b.onclick = () => {
          const good = i === d.a;
          if (good) score++;
          opts.querySelectorAll("button").forEach(x => x.disabled = true);
          b.style.borderColor = good ? "var(--ok)" : "var(--bad)";
          if (!good) opts.querySelectorAll("button")[d.a].style.borderColor = "var(--ok)";
          const why = el("div", "drill-why", `${good ? "✓" : "✗"} ${d.why}`);
          drill.appendChild(why);
          const nx = el("button", "btn pri", "Suivante");
          nx.style.marginTop = ".7rem";
          nx.onclick = () => { idx++; step(); };
          drill.appendChild(nx);
        };
        opts.appendChild(b);
      });
      drill.appendChild(opts);
    };
    box.appendChild(drill);
    step();
    w.appendChild(box);
  });
}

function renderConj() {
  const w = $("#conj-list"); w.innerHTML = "";
  const tsel = el("div", "row");
  tsel.style.marginBottom = "1.2rem";
  let temps = "pres";
  const draw = () => {
    tsel.querySelectorAll("button").forEach(b => b.classList.toggle("pri", b.dataset.k === temps));
    tables.innerHTML = "";
    const t = TEMPS.find(x => x.k === temps);
    tables.appendChild(el("div", "warn-box", `<b>${t.n}</b> — <span style="color:var(--mut)">${t.why}</span>`));
    VERBES.forEach(v => {
      const box = el("div", "rule");
      box.innerHTML = `<div class="rule-h"><b>${v.inf}</b><span class="gain">${v.fr}</span>${
        v.irr ? '<span class="gain" style="background:rgba(200,80,63,.14);color:var(--bad)">irrégulier</span>' : ""}</div>`;
      const grid = el("div", "conj");
      v[temps].forEach((f, i) => {
        const cell = el("button", "conj-cell", `<span>${PRONOMS[i]}</span><b>${f}</b>`);
        cell.onclick = () => Voice.say(f);
        grid.appendChild(cell);
      });
      box.appendChild(grid);
      tables.appendChild(box);
    });
  };
  TEMPS.forEach(t => {
    const b = el("button", "btn", t.n);
    b.dataset.k = t.k;
    b.onclick = () => { temps = t.k; draw(); };
    tsel.appendChild(b);
  });
  w.appendChild(tsel);
  const tables = el("div");
  w.appendChild(tables);
  draw();
}

$("#meca-tab-p").onclick = () => {
  $("#meca-tab-p").classList.add("pri"); $("#meca-tab-c").classList.remove("pri");
  $("#meca-list").classList.remove("hidden"); $("#conj-list").classList.add("hidden");
};
$("#meca-tab-c").onclick = () => {
  $("#meca-tab-c").classList.add("pri"); $("#meca-tab-p").classList.remove("pri");
  $("#conj-list").classList.remove("hidden"); $("#meca-list").classList.add("hidden");
  renderConj();
};




/* ── La Machine ──────────────────────────────────────────
   Construction par accrétion. Aucune note, aucun score, aucun
   « raté » : le seul objectif est que tu produises 30 phrases
   d'affilée sans jamais te sentir bloqué. Ce que ça installe
   n'est pas du vocabulaire, c'est l'absence d'appréhension. */

function renderMachine() {
  $("#mach-run").classList.add("hidden");
  const w = $("#mach-home"); w.classList.remove("hidden"); w.innerHTML = "";

  w.appendChild(el("div", null, `<h2>La Machine</h2>
    <p class="sub">Ici tu ne mémorises rien. Chaque marche ajoute <b style="color:var(--tx)">un seul</b> élément
    à la précédente, et réutilise tout ce qui précède. Tu ne peux pas échouer : il n'y a ni note, ni score,
    ni bonne réponse à retrouver. À la trentième marche tu produiras une phrase de vingt mots que
    tu n'as jamais apprise. <b style="color:var(--gold)">C'est l'antidote au « j'ai du mal ».</b></p>`));

  CHAINES.forEach(ch => {
    const done = (Store.data.machine || {})[ch.id];
    const card = el("div", "mach-card");
    card.innerHTML = `<h4>${ch.titre}</h4>
      <div class="sous">${ch.sous}${done ? ` · <span style="color:var(--ok)">terminée ${done.fois} fois</span>` : ""}</div>
      <p>${ch.intro}</p>`;
    const b = el("button", "btn pri", done ? "Refaire la montée" : "Commencer");
    b.style.marginTop = "1rem";
    b.onclick = e => { e.stopPropagation(); runChaine(ch); };
    card.appendChild(b);
    card.onclick = () => runChaine(ch);
    w.appendChild(card);
  });

  w.appendChild(el("div", "warn-box", `<b>Comment s'en servir</b><br>
    <span style="color:var(--mut)">Dis chaque phrase <b>à voix haute</b> avant de révéler — même mal, même lentement,
    même en cherchant. C'est la sortie orale qui compte, pas l'exactitude. Si tu hésites plus de trois secondes,
    révèle : hésiter davantage n'apprend rien, ça installe juste de l'appréhension.</span>`));
}

function runChaine(ch) {
  $("#mach-home").classList.add("hidden");
  const w = $("#mach-run"); w.classList.remove("hidden");
  let i = 0, said = 0;
  const t0 = Date.now();

  const draw = () => {
    w.innerHTML = "";
    const bar = el("div", "mach-bar");
    ch.pas.forEach((_, k) => bar.appendChild(el("i", k < i ? "past" : k === i ? "on" : "")));
    w.appendChild(bar);

    if (i >= ch.pas.length) return fin();

    const p = ch.pas[i];
    const st = el("div", "mach-stage");
    st.appendChild(el("div", "mach-step", `Marche ${i + 1} / ${ch.pas.length}`));

    if (p.neuf) st.appendChild(el("div", "mach-neuf", `<b>${p.neuf}</b><span>${p.sens}</span>`));
    else st.appendChild(el("div", "tap-hint", "Rien de nouveau — tout est déjà à toi"));

    st.appendChild(el("div", "mach-say", p.fr));

    const rev = el("div", "hidden");
    // on met en valeur le morceau neuf à l'intérieur de la phrase
    const esHtml = p.neuf
      ? p.es.replace(new RegExp(`(${p.neuf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i"), "<em>$1</em>")
      : p.es;
    rev.appendChild(el("div", "mach-es", esHtml));
    if (p.note) rev.appendChild(el("div", "mach-note", p.note));
    st.appendChild(rev);

    const row = el("div", "row"); row.style.justifyContent = "center";
    const show = el("button", "btn pri big", "Je l'ai dite → montre");
    show.onclick = () => {
      if (!rev.classList.contains("hidden")) return;
      said++;
      rev.classList.remove("hidden");
      Sound.play(p.es);
      row.innerHTML = "";
      const again = el("button", "btn", "🔊 Réécouter");
      again.onclick = () => Sound.play(p.es);
      const slow = el("button", "btn", "🐢 Lentement");
      slow.onclick = () => Sound.play(p.es, 0.6);
      const nx = el("button", "btn pri big", i + 1 >= ch.pas.length ? "Voir la phrase finale →" : "Marche suivante →");
      nx.onclick = () => { i++; draw(); };
      row.append(again, slow, nx);
    };
    row.appendChild(show);
    st.appendChild(row);
    w.appendChild(st);

    const quit = el("button", "btn", "← Quitter la montée");
    quit.style.marginTop = "1rem";
    quit.onclick = () => renderMachine();
    w.appendChild(quit);
  };

  const fin = () => {
    const mins = Math.max(1, Math.round((Date.now() - t0) / 60000));
    Store.data.machine = Store.data.machine || {};
    const prev = Store.data.machine[ch.id];
    Store.data.machine[ch.id] = { fois: (prev?.fois || 0) + 1, at: Date.now() };
    const e = SRS.today(); e.min += mins; e.reviews += said; Store.save();

    const box = el("div", "mach-final");
    box.innerHTML = `<div class="mach-step">Tu viens de construire ça</div>
      <div class="big">${ch.final}</div>
      <div class="tr">${ch.finalFr}</div>
      <p style="color:var(--mut);font-size:.92rem;max-width:34rem;margin:0 auto 1.4rem;line-height:1.7">
        <b style="color:var(--gold)">${ch.final.split(/\s+/).length} mots.</b>
        Tu n'as mémorisé aucune de ces phrases — tu les as fabriquées, une pièce à la fois.
        C'est exactement ce que tu feras en conversation réelle : assembler, pas réciter.
      </p>`;
    const row = el("div", "row"); row.style.justifyContent = "center";
    const play = el("button", "btn pri big", "🔊 Écouter la phrase entière");
    play.onclick = () => Sound.play(ch.final);
    const slow = el("button", "btn", "🐢 Lentement");
    slow.onclick = () => Sound.play(ch.final, 0.6);
    const mine = el("button", "btn", "＋ Garder dans mes phrases");
    mine.onclick = () => {
      Store.data.mined.push({ id: "m" + Date.now(), lvl: 4, es: ch.final, fr: ch.finalFr, tag: "perso", note: "Construite dans La Machine — " + ch.titre });
      Store.save(); mine.textContent = "✓ Ajoutée au deck"; mine.disabled = true;
    };
    row.append(play, slow, mine);
    box.appendChild(row);
    w.innerHTML = "";
    w.appendChild(box);
    const back = el("button", "btn", "← Retour aux montées");
    back.style.marginTop = "1rem";
    back.onclick = () => renderMachine();
    w.appendChild(back);
    Sound.play(ch.final);
    if (typeof autoSync === "function") autoSync();
  };

  draw();
  window.scrollTo(0, 0);
}

/* ── Synchronisation ─────────────────────────────────────── */
function renderSync() {
  const box = $("#sync-box"); if (!box) return;
  const code = Sync.code();
  const at = Store.data.syncAt;
  box.innerHTML = "";

  if (!code) {
    box.innerHTML = `<p style="color:var(--mut);font-size:.9rem;margin-bottom:1rem">
      Un code, pas un compte. Génère-le ici, recopie-le sur ton téléphone, et les deux
      appareils partagent la même progression. Aucun e-mail, aucun mot de passe.
      <br><br><span style="color:var(--dim);font-size:.85rem">Le code est ta clé : qui l'a, a ta
      progression. Vu ce qu'elle contient — des phrases d'espagnol et des dates de révision —
      c'est un compromis raisonnable, mais ne le publie pas.</span></p>`;
    const row = el("div", "row");
    const gen = el("button", "btn pri", "Générer mon code");
    gen.onclick = async () => {
      Store.data.syncCode = Sync.newCode(); Store.save();
      renderSync();
      try { await Sync.push(); renderSync(); } catch (e) { syncErr(e); }
    };
    const join = el("button", "btn", "J'ai déjà un code");
    join.onclick = () => {
      box.innerHTML = "";
      const f = el("label", "field", `<span>Colle le code de ton autre appareil</span>`);
      const inp = el("input"); inp.placeholder = "xxxxxx-xxxxxx-xxxxxx-xxxxxx";
      f.appendChild(inp); box.appendChild(f);
      const ok = el("button", "btn pri", "Récupérer et fusionner");
      ok.onclick = async () => {
        const c = Sync.clean(inp.value);
        if (c.length < 16) return alert("Code trop court — recopie-le en entier.");
        ok.disabled = true; ok.textContent = "Récupération…";
        try {
          const row = await Sync.peek(c);
          if (!row) { alert("Aucune progression trouvée pour ce code. Vérifie la saisie."); ok.disabled = false; ok.textContent = "Récupérer et fusionner"; return; }
          Store.data.syncCode = c;
          const st = Sync.merge(row.data);
          await Sync.push();
          alert(`Fusionné : ${st.cartes} phrases, ${st.jours} jours d'historique, ${st.minées} phrases perso.`);
          renderProg();
        } catch (e) { syncErr(e); ok.disabled = false; ok.textContent = "Récupérer et fusionner"; }
      };
      box.appendChild(ok);
    };
    row.append(gen, join);
    box.appendChild(row);
    return;
  }

  box.innerHTML = `<div class="sync-code">${code}</div>
    <p style="color:var(--dim);font-size:.84rem;margin:.6rem 0 1rem">
      ${at ? `Dernière synchro ${new Date(at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`
           : "Jamais synchronisé"} ·
      recopie ce code dans Progression → « J'ai déjà un code » sur ton autre appareil.
    </p>`;
  const row = el("div", "row");

  const now = el("button", "btn pri", "Synchroniser maintenant");
  now.onclick = async () => {
    now.disabled = true; now.textContent = "Synchro…";
    try {
      const st = await Sync.full();
      now.textContent = st ? `Fusionné · ${st.cartes} phrases` : "Envoyé";
      setTimeout(() => renderProg(), 1200);
    } catch (e) { syncErr(e); now.disabled = false; now.textContent = "Synchroniser maintenant"; }
  };

  const copy = el("button", "btn", "Copier le code");
  copy.onclick = () => {
    navigator.clipboard.writeText(code).then(() => { copy.textContent = "Copié ✓"; setTimeout(() => copy.textContent = "Copier le code", 1800); });
  };

  const off = el("button", "btn", "Délier cet appareil");
  off.style.color = "var(--bad)";
  off.onclick = () => {
    if (!confirm("Cet appareil cessera de synchroniser. Ta progression locale est conservée, et la copie en ligne aussi. Continuer ?")) return;
    delete Store.data.syncCode; delete Store.data.syncAt; Store.save(); renderSync();
  };

  row.append(now, copy, off);
  box.appendChild(row);
}

function syncErr(e) {
  const m = String(e.message || e);
  alert(/Failed to fetch|NetworkError/i.test(m)
    ? "Pas de connexion — la synchro a besoin du réseau. Ta progression locale est intacte."
    : "Synchro impossible : " + m);
}

/* Synchro automatique en fin de session : c'est le moment où il y a
   quelque chose de neuf à sauver, et où une perte ferait le plus mal. */
async function autoSync() {
  if (!Sync.code() || Sync.busy) return;
  try { await Sync.full(); } catch (e) { /* silencieux : jamais bloquer une session */ }
}

/* ── Progression ─────────────────────────────────────────
   Ce qui manquait : l'historique. Le journal notait les minutes et les
   révisions, mais pas la couverture ni les acquis. Impossible de tracer
   une courbe rétroactivement — alors on prend un instantané chaque jour. */

function snapshot() {
  const e = SRS.today();
  e.cov = Math.round(SRS.coverage() * 10) / 10;
  e.mast = SRS.mastered();
  e.words = SRS.knownWords().size;
  Store.save();
}

const DAYMS = 86400000;
const iso = d => new Date(d).toISOString().slice(0, 10);

function renderProg() {
  renderSync();
  const log = Store.data.log || [];
  const byDay = {}; log.forEach(e => byDay[e.d] = e);

  /* ---- rappel de sauvegarde ---- */
  const last = Store.data.lastExport;
  const days = last ? Math.floor((Date.now() - last) / DAYMS) : null;
  const bk = $("#prog-backup");
  const risky = last === undefined || days > 10;
  bk.innerHTML = `<div class="warn-box" style="${risky ? "" : "background:rgba(95,168,96,.09);border-color:#2c4a2d;color:var(--ok)"}">
    <b>${last ? `Dernière sauvegarde il y a ${days} jour${days > 1 ? "s" : ""}` : "Jamais sauvegardé"}</b><br>
    <span style="color:var(--mut)">Ta progression vit dans le stockage local de <em>ce</em> navigateur. Elle survit à un rechargement et à un redémarrage — mais pas à un « effacer les données de navigation ».
    ${/^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      ? "<br><b style=\"color:var(--warn)\">Sur Safari en particulier :</b> le navigateur efface ce stockage après 7 jours sans visite du site. Si tu pars deux semaines, exporte avant."
      : ""}</span></div>`;
  const exp = el("button", "btn" + (risky ? " pri" : ""), "Exporter maintenant");
  exp.onclick = () => { $("#s-export").click(); Store.data.lastExport = Date.now(); Store.save(); renderProg(); };
  bk.appendChild(exp);

  /* ---- carte d'assiduité ---- */
  const heat = $("#heat"); heat.innerHTML = "";
  const today = new Date(iso(Date.now()));
  const start = new Date(today - 83 * DAYMS);
  const cells = [];
  for (let d = new Date(start); d <= today; d = new Date(+d + DAYMS)) {
    const k = iso(d), e = byDay[k];
    const m = e ? e.min : 0;
    const lvl = m === 0 ? 0 : m < 8 ? 1 : m < 16 ? 2 : m < 30 ? 3 : 4;
    cells.push(`<i class="h${lvl}" title="${k} — ${m} min, ${e ? e.reviews : 0} révisions"></i>`);
  }
  heat.innerHTML = cells.join("");
  const actifs = log.filter(e => e.reviews > 0).length;
  $("#heat-leg").innerHTML = `<span class="scoreline">${actifs} jour${actifs > 1 ? "s" : ""} d'entraînement ·
    série actuelle ${SRS.streak()} · moins <i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i> plus</span>`;

  /* ---- courbe de couverture ---- */
  const pts = log.filter(e => typeof e.cov === "number").sort((a, b) => a.d.localeCompare(b.d));
  const cv = $("#curve");
  if (pts.length < 2) {
    cv.innerHTML = `<span class="scoreline">La courbe apparaît après deux jours de session. Un instantané est pris à la fin de chaque session — couverture, phrases acquises, mots actifs.</span>`;
  } else {
    const W = 640, H = 150, max = Math.max(10, ...pts.map(p => p.cov));
    const x = i => 20 + i * (W - 40) / (pts.length - 1);
    const y = v => H - 24 - (v / max) * (H - 48);
    const line = pts.map((p, i) => `${x(i)},${y(p.cov)}`).join(" ");
    cv.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--acc)" stop-opacity=".35"/>
        <stop offset="100%" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>
      <polygon points="${x(0)},${H - 24} ${line} ${x(pts.length - 1)},${H - 24}" fill="url(#g)"/>
      <polyline points="${line}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linejoin="round"/>
      ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.cov)}" r="2.5" fill="var(--gold)"/>`).join("")}
      <text x="20" y="${H - 6}" fill="var(--dim)" font-size="10">${pts[0].d}</text>
      <text x="${W - 20}" y="${H - 6}" fill="var(--dim)" font-size="10" text-anchor="end">${pts[pts.length - 1].d}</text>
      <text x="20" y="14" fill="var(--gold)" font-size="12">${pts[pts.length - 1].cov}% de couverture</text>
    </svg>`;
  }

  /* ---- totaux ---- */
  const tot = k => log.reduce((n, e) => n + (e[k] || 0), 0);
  const best = (() => { // plus longue série
    const set = new Set(log.filter(e => e.reviews > 0).map(e => e.d));
    let b = 0, cur = 0;
    for (let d = new Date(Store.data.created); d <= today; d = new Date(+d + DAYMS)) {
      if (set.has(iso(d))) { cur++; b = Math.max(b, cur); } else cur = 0;
    }
    return b;
  })();
  $("#prog-tiles").innerHTML = [
    [actifs, "jours d'entraînement"],
    [Math.round(tot("min")) + " min", "de pratique cumulée"],
    [Math.round(tot("spoken") / 60) + " min", "de parole produite"],
    [tot("reviews"), "révisions au total"],
    [SRS.mastered(), "phrases acquises"],
    [best, "meilleure série"]
  ].map(([v, l]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join("");

  /* ---- les phrases qui résistent ---- */
  const byId = {}; SRS.all().forEach(c => byId[c.id] = c);
  const hard = Object.entries(Store.data.cards)
    .filter(([id, st]) => st.lapses >= 2 && byId[id])
    .sort((a, b) => b[1].lapses - a[1].lapses).slice(0, 8);
  const hw = $("#hard");
  hw.innerHTML = hard.length ? "" : `<span class="scoreline">Rien ne résiste encore. Reviens après quelques sessions — c'est ici que tu verras où porter l'effort.</span>`;
  hard.forEach(([id, st]) => {
    const c = byId[id];
    const row = el("div", "mined-row",
      `<span class="es">${c.es}</span><span class="fr">${c.fr}</span>
       <span style="flex:0 0 4.5rem;font-size:.76rem;color:var(--bad)">${st.lapses} oublis</span>`);
    const p = el("button", null, "🔊"); p.onclick = () => Sound.play(c.es);
    row.appendChild(p);
    hw.appendChild(row);
  });

  /* ---- mécaniques ---- */
  const mw = $("#prog-meca"); mw.innerHTML = "";
  const done = Store.data.meca || {};
  if (!Object.keys(done).length) {
    mw.innerHTML = `<span class="scoreline">Aucune mécanique travaillée. L'onglet Mécaniques t'attend — c'est là que se règlent les erreurs qui reviennent.</span>`;
  } else MECANIQUES.forEach(m => {
    const r = done[m.id];
    const pct = r ? Math.round(r.score / r.total * 100) : 0;
    mw.appendChild(el("div", "mined-row",
      `<span class="es" style="flex:2">${m.title}</span>
       <span style="flex:0 0 8rem;color:${!r ? "var(--dim)" : pct === 100 ? "var(--ok)" : pct >= 70 ? "var(--warn)" : "var(--bad)"};font-size:.85rem">
       ${r ? `${r.score}/${r.total}` : "pas encore fait"}</span>`));
  });
}

/* ── Îlots ─────────────────────────────────────────────── */
function renderIslands() {
  const w = $("#islands-list"); w.innerHTML = "";
  ISLANDS.forEach(is => {
    const st = Store.data.islands[is.id] || { text: "" };
    const box = el("div", "card island");
    box.appendChild(el("div", "rule-h", `<b style="font-family:var(--serif);font-size:1.15rem;color:var(--gold)">${is.title}</b><span class="gain">${is.brief}</span>`));
    box.appendChild(el("div", "why", is.why));
    const ta = el("textarea");
    ta.placeholder = "Écris ton texte en espagnol ici…";
    ta.value = st.text;
    ta.oninput = () => { Store.data.islands[is.id] = { text: ta.value }; Store.save(); };
    box.appendChild(ta);
    const row = el("div", "row"); row.style.marginTop = ".7rem";
    const play = el("button", "btn", "🔊 Écouter ma version");
    play.onclick = () => ta.value.trim() && Voice.say(ta.value);
    const rec = el("button", "btn", "🎙 Le dire de mémoire");
    const o = el("div", "transcript"); o.style.marginTop = ".7rem";
    rec.onclick = async () => {
      if (Ears.active) return Ears.stop();
      box.appendChild(o);
      const st = await micStatus();
      if (st !== "ok") { micFail(st, o); rec.disabled = true; return; }
      rec.textContent = "⏹ Arrêter";
      Ears.listen(t => o.textContent = t, f => {
        rec.textContent = "🎙 Le dire de mémoire";
        const said = (f || o.textContent || "").trim();
        if (!said) { o.textContent = "Rien capté."; return; }
        const r = Match.score(said, ta.value);
        o.innerHTML = r.words.map(x => `<span class="${x.ok ? "w-ok" : "w-no"}">${x.w}</span>`).join(" ")
          + `<div class="scoreline">${r.pct}% de ton texte restitué. Vise 90 % avant de passer à l'îlot suivant.</div>`;
      }, e => micFail(e, o));
    };
    row.append(play, rec);
    box.appendChild(row);
    w.appendChild(box);
  });
}

/* ── Sentence mining ────────────────────────────────────── */
$("#m-add").onclick = () => {
  const es = $("#m-es").value.trim(), fr = $("#m-fr").value.trim(), note = $("#m-note").value.trim();
  if (!es || !fr) return alert("Il faut au moins la phrase espagnole et sa traduction.");
  Store.data.mined.push({ id: "m" + Date.now(), lvl: 3, es, fr, tag: "perso", note: note || null });
  Store.save();
  $("#m-es").value = $("#m-fr").value = $("#m-note").value = "";
  renderMined();
};

function renderMined() {
  const w = $("#mined-list"); w.innerHTML = "";
  $("#m-count").textContent = Store.data.mined.length ? `· ${Store.data.mined.length}` : "";
  if (!Store.data.mined.length) {
    w.appendChild(el("div", "card", `<span style="color:var(--dim);font-size:.88rem">Vide pour l'instant. Prochaine série que tu regardes en VO : mets les sous-titres espagnols, mets en pause sur la première phrase que tu aurais aimé savoir dire, et colle-la ici. Trois phrases par épisode suffisent.</span>`));
    return;
  }
  [...Store.data.mined].reverse().forEach(m => {
    const row = el("div", "mined-row", `<span class="es">${m.es}</span><span class="fr">${m.fr}</span>`);
    const p = el("button", null, "🔊"); p.onclick = () => Sound.play(m.es);
    const d = el("button", null, "✕");
    d.onclick = () => {
      Store.data.mined = Store.data.mined.filter(x => x.id !== m.id);
      delete Store.data.cards[m.id]; Store.save(); renderMined();
    };
    row.append(p, d);
    w.appendChild(row);
  });
}

/* ── Réglages ───────────────────────────────────────────── */
function renderSettings() {
  const s = Store.data.settings;
  const sel = $("#s-voice"); sel.innerHTML = "";
  if (!Voice.voices.length) sel.appendChild(new Option("Aucune voix espagnole détectée", ""));
  Voice.voices.forEach(v => {
    const o = new Option(`${v.name} — ${v.lang}`, v.voiceURI);
    if (Voice.chosen && v.voiceURI === Voice.chosen.voiceURI) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = () => {
    s.voice = sel.value; Store.save();
    Voice.chosen = Voice.voices.find(v => v.voiceURI === sel.value) || Voice.chosen;
    Voice.say("Perfecto. Vamos a empezar.");
  };

  const bind = (id, lab, key, fmt = x => x) => {
    const r = $(id); r.value = s[key];
    $(lab).textContent = fmt(s[key]);
    r.oninput = () => { s[key] = +r.value; $(lab).textContent = fmt(+r.value); Store.save(); };
  };
  bind("#s-rate", "#s-rate-v", "rate", x => x.toFixed(2));
  bind("#s-new", "#s-new-v", "newPerDay");
  bind("#s-min", "#s-min-v", "sessionMin");

  micStatus().then(st => {
    const x = Ears.explain(st);
    $("#diag").innerHTML = [
      `Adresse : <code>${location.protocol}//${location.host || "(fichier local)"}</code>`,
      `Contexte sécurisé : ${window.isSecureContext ? `<span style="color:var(--ok)">oui</span>` : `<span style="color:var(--bad)">non</span> — passe par démarrer.command`}`,
      `Synthèse vocale : ${"speechSynthesis" in window ? `<span style="color:var(--ok)">disponible</span> — ${Voice.voices.length} voix espagnole(s)` : `<span style="color:var(--bad)">absente</span>`}`,
      `Micro : ${st === "ok" ? `<span style="color:var(--ok)">opérationnel</span>` : `<span style="color:var(--bad)">${x.t}</span><br><span style="color:var(--mut);font-size:.84rem">${x.d}</span>`}`,
      `Corpus : ${CORPUS.length} phrases + ${Store.data.mined.length} à toi`,
      `Cartes en circulation : ${Object.keys(Store.data.cards).length}`
    ].join("<br>");
  });
  const retry = $("#s-mic-retry");
  if (retry) retry.onclick = async () => { Ears.status = null; await micBanner(); renderSettings(); };

  renderAudioState();
  renderVoiceLab();
}

/* Phrase de test : sons durs de l'espagnol (j, rr, ñ, ll, diphtongues).
   Une voix qui passe celle-là passe tout le reste. */
const VOICE_TEST = "El señor Jiménez trabaja en el barrio y siempre llega tarde. ¡Qué guay!";

function renderAudioState() {
  const box = $("#audio-state"); if (!box) return;
  const cov = Sound.coverage();
  if (cov.n) {
    box.innerHTML = `<div class="warn-box" style="background:rgba(95,168,96,.09);border-color:#2c4a2d;color:var(--ok);margin-bottom:1.2rem">
      <b>🎧 Voix neuronale active</b><br>
      <span style="color:var(--mut)">${cov.n} / ${cov.total} phrases du corpus ont un vrai fichier audio. Le reste passe par la synthèse du navigateur.</span></div>`;
  } else if (Voice.bestIsPoor()) {
    box.innerHTML = `<div class="warn-box" style="margin-bottom:1.2rem">
      <b>🔈 Aucune voix de qualité installée</b><br>
      <span style="color:var(--mut)">Tu écoutes une voix « compact », le tier le plus bas de macOS. Deux façons d'en sortir :</span>
      <ol style="color:var(--mut);margin:.6rem 0 0 1.1rem;font-size:.86rem;line-height:1.7">
        <li><b>Gratuit, 3 min</b> — Réglages Système → Accessibilité → Contenu énoncé → Voix système →
            <i>Gérer les voix</i> → Espagnol → télécharge <b>Mónica (Premium)</b>. Recharge cette page ensuite.</li>
        <li><b>Le vrai correctif</b> — génère l'audio une fois pour toutes :
            <code>node tools/generate-audio.mjs --provider openai</code></li>
      </ol></div>`;
  } else { box.innerHTML = ""; }
}

function renderVoiceLab() {
  const w = $("#voice-lab"); if (!w) return;
  w.innerHTML = "";
  if (!Voice.voices.length) { w.innerHTML = `<span style="color:var(--dim);font-size:.86rem">Aucune voix espagnole détectée sur cette machine.</span>`; return; }

  Voice.voices.forEach(v => {
    const score = Voice.rank(v);
    const tier = score >= 100 ? ["Premium", "var(--ok)"]
      : score < 0 ? ["Fantaisie", "var(--bad)"]
      : ["Compact", "var(--warn)"];
    const on = Voice.chosen && v.voiceURI === Voice.chosen.voiceURI;
    const row = el("div", "mined-row");
    row.style.borderLeft = on ? "2px solid var(--acc)" : "2px solid transparent";
    row.innerHTML = `<span class="es" style="flex:2">${v.name}</span>
      <span class="fr" style="flex:0 0 5rem;font-size:.78rem">${v.lang}</span>
      <span style="flex:0 0 5.5rem;font-size:.72rem;color:${tier[1]}">${tier[0]}</span>`;
    const play = el("button", null, "🔊");
    play.title = "Écouter la phrase test";
    play.onclick = () => { Voice.chosen = v; Voice.say(VOICE_TEST); };
    const pick = el("button", null, on ? "✓" : "choisir");
    pick.style.fontSize = on ? "1.1rem" : ".78rem";
    pick.style.color = on ? "var(--acc)" : "var(--dim)";
    pick.onclick = () => {
      Voice.chosen = v; Store.data.settings.voice = v.voiceURI; Store.save();
      renderVoiceLab(); renderSettings();
    };
    row.append(play, pick);
    w.appendChild(row);
  });
}

$("#s-export").onclick = () => {
  const b = new Blob([JSON.stringify(Store.data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = `senorita-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  Store.data.lastExport = Date.now(); Store.save();
};
$("#s-import").onclick = () => $("#s-file").click();
$("#s-file").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try { Store.data = JSON.parse(r.result); Store.save(); alert("Importé."); show("home"); }
    catch (x) { alert("Fichier illisible."); }
  };
  r.readAsText(f);
};
$("#s-reset").onclick = () => {
  if (confirm("Tout effacer : progression, phrases perso, îlots. Irréversible. Continuer ?")) {
    Store.reset(); show("home");
  }
};

document.addEventListener("sound-ready", () => { if ($("#v-set").classList.contains("on")) renderSettings(); });
document.addEventListener("voices-ready", () => { if ($("#v-set").classList.contains("on")) renderSettings(); });

/* ── Go ─────────────────────────────────────────────────── */
renderHome();
micBanner();
