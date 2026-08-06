/* ============================================================
   SRS — répétition espacée (SM-2 adapté, tolérant aux trous)
   Tu as dit "irrégulier" n'était pas ton cas, mais la vie l'est.
   Si tu sautes 5 jours, l'algo ne t'écrase pas de retard.
   ============================================================ */

const DAY = 86400000;
const KEY = "senorita.v1";

const Store = {
  data: null,

  load() {
    try { this.data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { this.data = null; }
    if (!this.data) this.data = this.fresh();
    // migrations douces
    this.data.cards ||= {};
    this.data.rules ||= {};
    this.data.islands ||= {};
    this.data.mined ||= [];
    this.data.log ||= [];
    return this.data;
  },

  fresh() {
    return {
      created: Date.now(),
      cards: {},      // id -> {due, ivl, ease, reps, lapses}
      rules: {},      // ruleId -> true
      islands: {},    // islandId -> {text, done}
      mined: [],      // phrases ajoutées par toi
      log: [],        // [{d: 'YYYY-MM-DD', min, spoken, reviews}]
      settings: { newPerDay: 8, rate: 0.9, voice: null, sessionMin: 16 }
    };
  },

  save() { localStorage.setItem(KEY, JSON.stringify(this.data)); },

  reset() { localStorage.removeItem(KEY); this.data = this.fresh(); this.save(); }
};

const SRS = {
  card(id) {
    return Store.data.cards[id] || null;
  },

  /** Toutes les phrases connues de l'app (corpus + tes phrases minées). */
  all() {
    return CORPUS.concat(Store.data.mined);
  },

  /** Cartes dues maintenant, les plus en retard d'abord. */
  due(now = Date.now()) {
    const all = this.all();
    return all
      .filter(c => { const s = Store.data.cards[c.id]; return s && s.due <= now; })
      .sort((a, b) => Store.data.cards[a.id].due - Store.data.cards[b.id].due);
  },

  /** Nouvelles cartes jamais vues, dans l'ordre pédagogique. */
  fresh(limit) {
    const seen = Store.data.cards;
    const out = this.all().filter(c => !seen[c.id]);
    out.sort((a, b) => (a.lvl - b.lvl) || a.id.localeCompare(b.id));
    return limit ? out.slice(0, limit) : out;
  },

  /** File de révision d'une session : dues d'abord, puis du neuf. */
  queue(max = 40) {
    const d = this.due();
    const room = Math.max(0, Math.min(Store.data.settings.newPerDay, max - d.length));
    return d.concat(this.fresh(room)).slice(0, max);
  },

  /**
   * grade : 1 = raté, 2 = dur, 3 = bien, 4 = trop facile
   * Intervalles volontairement agressifs au début : tu détestes la lenteur.
   */
  rate(id, grade) {
    const s = Store.data.cards[id] || { due: Date.now(), ivl: 0, ease: 2.5, reps: 0, lapses: 0 };

    if (grade === 1) {
      s.lapses++; s.reps = 0; s.ivl = 0;
      s.ease = Math.max(1.3, s.ease - 0.2);
      s.due = Date.now() + 6 * 60000;          // revient dans 6 min, même session
    } else {
      s.reps++;
      if (grade === 2) { s.ease = Math.max(1.3, s.ease - 0.15); s.ivl = s.ivl ? s.ivl * 1.2 : 1; }
      else if (grade === 3) { s.ivl = s.reps === 1 ? 1 : (s.reps === 2 ? 3 : s.ivl * s.ease); }
      else { s.ease += 0.15; s.ivl = s.reps === 1 ? 4 : s.ivl * s.ease * 1.3; }
      s.ivl = Math.min(s.ivl, 365);
      s.due = Date.now() + Math.round(s.ivl * DAY);
    }
    Store.data.cards[id] = s;
    Store.save();
    return s;
  },

  /** Une carte est "acquise" à partir de 10 jours d'intervalle. */
  mastered() {
    return Object.values(Store.data.cards).filter(s => s.ivl >= 10).length;
  },

  /** Mots distincts rencontrés dans les phrases déjà vues. */
  knownWords() {
    const set = new Set();
    const byId = {}; this.all().forEach(c => byId[c.id] = c);
    for (const id in Store.data.cards) {
      const c = byId[id]; if (!c) continue;
      c.es.toLowerCase().replace(/[¿?¡!.,;:«»…()"]/g, " ").split(/\s+/)
        .filter(Boolean).forEach(w => set.add(w));
    }
    // les règles de conversion déverrouillent du vocabulaire passif
    return set;
  },

  /**
   * Estimation de couverture de l'espagnol PARLÉ courant, à partir du seul
   * vocabulaire ACTIF (mots rencontrés dans des phrases réellement travaillées).
   *
   * Courbe log calée sur les fréquences lexicales de l'espagnol oral :
   * 50 mots ≈ 30 %, 200 ≈ 49 %, 1000 ≈ 72 %, 2000 ≈ 82 %.
   *
   * Le vocabulaire déverrouillé par les règles de conversion n'entre
   * volontairement PAS dans ce chiffre : reconnaître « información » à l'écrit
   * n'est pas la même chose que le produire à l'oral. Il est compté à part.
   */
  coverage() {
    const n = this.knownWords().size;
    if (n < 5) return 0;
    return Math.max(0, Math.min(92, 14 * Math.log(n) - 24.8));
  },

  /** Mots reconnaissables sans les avoir appris, grâce aux règles cochées. */
  passiveWords() {
    return RULES.filter(r => Store.data.rules[r.id]).reduce((n, r) => n + (r.gain || 0), 0);
  },

  today() {
    const d = new Date().toISOString().slice(0, 10);
    let e = Store.data.log.find(x => x.d === d);
    if (!e) { e = { d, min: 0, spoken: 0, reviews: 0 }; Store.data.log.push(e); }
    return e;
  },

  streak() {
    const days = new Set(Store.data.log.filter(e => e.reviews > 0).map(e => e.d));
    let n = 0, cur = new Date();
    for (;;) {
      const k = cur.toISOString().slice(0, 10);
      if (days.has(k)) { n++; cur = new Date(cur - DAY); }
      else if (n === 0 && k === new Date().toISOString().slice(0, 10)) { cur = new Date(cur - DAY); }
      else break;
      if (n > 3650) break;
    }
    return n;
  }
};
