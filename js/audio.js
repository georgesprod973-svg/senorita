/* ============================================================
   SON — couche audio à deux étages.

   1. Si un fichier pré-généré existe pour la phrase (audio/*.mp3,
      produit par une vraie voix neuronale), on le joue. Qualité
      constante sur toutes les machines, aucun coût à l'exécution,
      disponible hors ligne une fois en cache.
   2. Sinon on retombe sur la synthèse du navigateur.

   Bénéfice secondaire, décisif pour le shadowing : sur un vrai
   fichier audio, playbackRate ralentit sans déformer la voix
   (preservesPitch). La synthèse système, elle, devient robotique
   dès qu'on descend sous 0.8×.
   ============================================================ */

const Sound = {
  manifest: null,      // { hash: "fichier.mp3" }
  el: null,
  ready: false,

  /** FNV-1a 32 bits. Doit rester identique à tools/generate-audio.mjs. */
  hash(text) {
    const s = text.normalize("NFC").trim();
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  },

  async init() {
    try {
      const r = await fetch("audio/manifest.json", { cache: "no-cache" });
      if (r.ok) this.manifest = await r.json();
    } catch (e) { /* pas d'audio pré-généré : on reste en synthèse */ }
    this.ready = true;
    document.dispatchEvent(new Event("sound-ready"));
  },

  /** Une entrée peut être un fichier ou plusieurs (une par locuteur). */
  files(text) {
    const v = this.manifest && this.manifest[this.hash(text)];
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  },

  /** Combien de phrases du corpus ont une vraie voix ? */
  coverage() {
    if (!this.manifest) return { n: 0, total: CORPUS.length, voices: 0 };
    const n = CORPUS.filter(c => this.files(c.es).length).length;
    const voices = Math.max(0, ...CORPUS.map(c => this.files(c.es).length));
    return { n, total: CORPUS.length, voices };
  },

  has(text) { return this.files(text).length > 0; },

  /**
   * Joue une phrase. onend est appelé dans les deux cas.
   * Retombe silencieusement sur la synthèse si le fichier manque ou échoue.
   *
   * Multi-locuteurs : on alterne d'une écoute à l'autre. N'apprendre que sur
   * une seule voix, c'est apprendre CETTE voix — pas la langue. L'exposition
   * à plusieurs locuteurs est ce qui rend la compréhension transférable au réel.
   */
  turn: 0,

  play(text, rate = null, onend = null) {
    const r = rate ?? Store.data.settings.rate;
    const fs = this.files(text);
    const file = fs.length ? fs[this.turn++ % fs.length] : null;

    if (!file) return Voice.say(text, r, onend);

    this.stop();
    const a = new window.Audio("audio/" + file);
    a.preservesPitch = true;
    a.mozPreservesPitch = true;
    a.webkitPreservesPitch = true;
    a.playbackRate = Math.max(0.5, Math.min(1.5, r));
    a.onended = () => onend && onend();
    a.onerror = () => Voice.say(text, r, onend);   // fichier absent ou corrompu
    this.el = a;
    a.play().catch(() => Voice.say(text, r, onend));  // autoplay refusé
  },

  stop() {
    if (this.el) { try { this.el.pause(); this.el.currentTime = 0; } catch (e) {} this.el = null; }
    Voice.stop();
  }
};
