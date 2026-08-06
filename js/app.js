/* ============================================================
   SEÑORITA — moteur de session
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

Store.load();
Store.data.settings = Object.assign({ newPerDay: 8, rate: 0.9, voice: null, sessionMin: 16 }, Store.data.settings || {});
Voice.init();

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

/* ── Navigation ─────────────────────────────────────────── */
function show(v) {
  $$("nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $$(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  if (v !== "session") Session.abort();
  if (v === "home") renderHome();
  if (v === "rules") renderRules();
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
  { key: "decode", name: "Phase 1 · Décodage", why: "Une règle de conversion FR→ES. Deux minutes ici valent des semaines de fiches de vocabulaire.", w: .12 },
  { key: "recall", name: "Phase 2 · Rappel actif", why: "Tu produis la phrase à voix haute AVANT de voir la réponse. L'effort de récupération est ce qui grave la mémoire — le reconnaître ne suffit pas.", w: .45 },
  { key: "shadow", name: "Phase 3 · Shadowing", why: "Tu colles à la voix native, en même temps qu'elle. C'est ce qui installe le rythme et l'accent, pas la théorie phonétique.", w: .18 },
  { key: "produce", name: "Phase 4 · Production libre", why: "Soixante secondes sans filet. Le micro transcrit ce que tu as réellement dit — pas ce que tu crois avoir dit.", w: .25 }
];

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
      row.querySelector(".b").onclick = () => Voice.say(b.replace(/\s*\(.*/, ""));
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

    const revBtn = el("button", "btn pri", "Je l'ai dite → révéler");
    revBtn.onclick = () => showAnswer();

    actions.append(micBtn, revBtn);
    stage.appendChild(actions);
    stage.appendChild(el("div", "tap-hint", "Dis-la à voix haute. Vraiment à voix haute. Pas dans ta tête."));
    s.appendChild(stage);

    const showAnswer = () => {
      if (!reveal.classList.contains("hidden")) return;
      Ears.stop();
      reveal.classList.remove("hidden");
      actions.classList.add("hidden");
      Voice.say(c.es);
      const g = el("div", "grades");
      [[1, "Raté", "revoir dans 6 min"], [2, "Dur", "revoir bientôt"], [3, "Bien", "espacé normalement"], [4, "Trop facile", "on saute loin"]]
        .forEach(([n, lab, sub]) => {
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
      again.onclick = () => Voice.say(c.es);
      s.appendChild(again);
    };
  },

  /* ---------- Phase 3 : shadowing ---------- */
  ph_shadow() {
    const pool = SRS.all().filter(c => SRS.card(c.id)).sort((a, b) => b.lvl - a.lvl);
    if (!pool.length) return this.next();
    let k = 0;
    const s = $("#stage");

    const draw = () => {
      if (k >= pool.length || this.overtime() && k > 2) return this.next();
      const c = pool[k % pool.length];
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
      play.onclick = () => { Voice.say(c.es, +sl.value); this.spoke += 4; };
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

      Voice.say(c.es, +sl.value);
    };
    draw();
  },

  /* ---------- Phase 4 : production libre ---------- */
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
      row.querySelector(".b").onclick = () => Voice.say(b.replace(/\s*\(.*/, "").replace(/[A-Z]{3,}.*/, ""));
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
    const p = el("button", null, "🔊"); p.onclick = () => Voice.say(m.es);
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
}

$("#s-export").onclick = () => {
  const b = new Blob([JSON.stringify(Store.data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = `senorita-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
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

document.addEventListener("voices-ready", () => { if ($("#v-set").classList.contains("on")) renderSettings(); });

/* ── Go ─────────────────────────────────────────────────── */
renderHome();
micBanner();
