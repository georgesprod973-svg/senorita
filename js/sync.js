/* ============================================================
   SYNCHRO — une progression, plusieurs appareils.

   Pas de compte, pas de mot de passe, pas d'e-mail. Un code de
   synchro généré une fois, que tu recopies sur l'autre appareil.

   Ce que le code protège : la table est inaccessible en direct
   (RLS active, zéro policy, aucun droit accordé au rôle public).
   Deux fonctions Postgres en security definer sont la seule
   surface exposée, et elles exigent le code. Sans lui on ne peut
   rien lire, rien écrire, et rien énumérer.

   Ce que le code ne protège pas : il joue le rôle de secret
   porteur. Quiconque l'obtient accède à ta progression. Vu ce
   qu'elle contient — des phrases d'espagnol et des dates de
   révision — c'est un compromis raisonnable. Ne le colle pas
   en public pour autant.
   ============================================================ */

const Sync = {
  URL: "https://odmwbkvyczgtlsxwkkfb.supabase.co",
  KEY: "sb_publishable_Q-eOLPCE0Rk-cMl6H75WNw_x0AXgfWk",

  busy: false,

  code() { return Store.data.syncCode || null; },

  /** 24 caractères tirés du CSPRNG : hors de portée d'une attaque par essais. */
  newCode() {
    const A = "abcdefghjkmnpqrstuvwxyz23456789";   // sans les glyphes ambigus
    const b = crypto.getRandomValues(new Uint8Array(24));
    const raw = [...b].map(x => A[x % A.length]).join("");
    return raw.match(/.{1,6}/g).join("-");          // xxxxxx-xxxxxx-xxxxxx-xxxxxx
  },

  clean(c) { return (c || "").toLowerCase().replace(/[^a-z0-9-]/g, ""); },

  async rpc(fn, body) {
    const r = await fetch(`${this.URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: this.KEY, Authorization: `Bearer ${this.KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const txt = await r.text();
    if (!r.ok) throw new Error(`${r.status} ${txt.slice(0, 180)}`);
    return txt ? JSON.parse(txt) : null;
  },

  /** Ce qu'on envoie : la progression, jamais les réglages d'appareil. */
  payload() {
    const { cards, rules, islands, mined, log, meca, created } = Store.data;
    return { v: 1, created, cards, rules, islands, mined, log, meca };
  },

  device() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return "iPhone";
    if (/iPad/.test(ua)) return "iPad";
    if (/Android/.test(ua)) return "Android";
    if (/Mac/.test(ua)) return "Mac";
    if (/Windows/.test(ua)) return "Windows";
    return "navigateur";
  },

  async push() {
    const c = this.code();
    if (!c) throw new Error("aucun code de synchro");
    this.busy = true;
    try {
      const at = await this.rpc("senorita_push", { p_code: c, p_data: this.payload(), p_device: this.device() });
      Store.data.syncAt = Date.now();
      Store.data.syncRemote = at;
      Store.save();
      return at;
    } finally { this.busy = false; }
  },

  async peek(code) {
    const rows = await this.rpc("senorita_pull", { p_code: this.clean(code || this.code()) });
    return (rows && rows[0]) || null;
  },

  /**
   * Fusion, pas écrasement. Deux appareils qui travaillent chacun de leur
   * côté doivent additionner leurs efforts, pas s'annuler.
   *   · une carte : on garde la révision la plus avancée (intervalle le plus long)
   *   · le journal : union par date, en cumulant les compteurs du même jour
   *   · phrases minées : union par id
   *   · règles, îlots, mécaniques : le plus récent / le meilleur score
   */
  merge(remote) {
    const L = Store.data, R = remote;
    if (!R || R.v !== 1) throw new Error("données distantes illisibles");

    const cards = { ...(R.cards || {}) };
    for (const id in (L.cards || {})) {
      const a = L.cards[id], b = cards[id];
      cards[id] = !b ? a : (a.ivl >= b.ivl ? a : b);
    }

    const log = {};
    [...(R.log || []), ...(L.log || [])].forEach(e => {
      const p = log[e.d];
      log[e.d] = !p ? { ...e } : {
        d: e.d,
        min: Math.max(p.min || 0, e.min || 0),
        spoken: Math.max(p.spoken || 0, e.spoken || 0),
        reviews: Math.max(p.reviews || 0, e.reviews || 0),
        cov: Math.max(p.cov || 0, e.cov || 0),
        mast: Math.max(p.mast || 0, e.mast || 0),
        words: Math.max(p.words || 0, e.words || 0)
      };
    });

    const mined = [...(R.mined || [])];
    const seen = new Set(mined.map(m => m.id));
    (L.mined || []).forEach(m => { if (!seen.has(m.id)) mined.push(m); });

    const islands = { ...(R.islands || {}) };
    for (const k in (L.islands || {})) {
      const a = L.islands[k], b = islands[k];
      if (!b || (a.text || "").length > (b.text || "").length) islands[k] = a;
    }

    const meca = { ...(R.meca || {}) };
    for (const k in (L.meca || {})) {
      const a = L.meca[k], b = meca[k];
      if (!b || (a.score / a.total) >= (b.score / b.total)) meca[k] = a;
    }

    L.cards = cards;
    L.rules = { ...(R.rules || {}), ...(L.rules || {}) };
    L.islands = islands;
    L.meca = meca;
    L.mined = mined;
    L.log = Object.values(log).sort((a, b) => a.d.localeCompare(b.d));
    L.created = Math.min(L.created || Date.now(), R.created || Date.now());
    Store.save();

    return { cartes: Object.keys(cards).length, jours: L.log.length, minées: mined.length };
  },

  /** Cycle complet : je récupère, je fusionne, je renvoie le résultat fusionné. */
  async full() {
    const row = await this.peek();
    let stats = null;
    if (row) stats = this.merge(row.data);
    await this.push();
    return stats;
  }
};
