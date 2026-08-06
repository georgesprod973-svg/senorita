/* ============================================================
   VOIX — synthèse espagnole + reconnaissance vocale
   Tout est natif au navigateur. Zéro API, zéro compte, zéro coût.
   ============================================================ */

const Voice = {
  voices: [],
  chosen: null,

  init() {
    const load = () => {
      this.voices = speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang));
      const pref = Store.data.settings.voice;
      this.chosen = this.voices.find(v => v.voiceURI === pref)
        || this.voices.find(v => /Mónica|Monica|Jorge|Paulina|Diego/i.test(v.name))
        || this.voices.find(v => v.lang === "es-ES")
        || this.voices[0] || null;
      document.dispatchEvent(new Event("voices-ready"));
    };
    load();
    speechSynthesis.onvoiceschanged = load;
  },

  available() { return this.voices.length > 0; },

  /** Prononce une phrase espagnole. rate 0.5 → 1.2 */
  say(text, rate = null, onend = null) {
    if (!("speechSynthesis" in window)) { onend && onend(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.chosen ? this.chosen.lang : "es-ES";
    if (this.chosen) u.voice = this.chosen;
    u.rate = rate ?? Store.data.settings.rate;
    u.pitch = 1;
    if (onend) u.onend = onend;
    speechSynthesis.speak(u);
  },

  stop() { try { speechSynthesis.cancel(); } catch (e) {} }
};


const Ears = {
  rec: null,
  active: false,
  status: null,       // null = pas encore testé, "ok" = utilisable, sinon code d'erreur

  supported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  /** Panneau d'aperçu intégré à Claude : le micro y est bloqué, quoi qu'on fasse. */
  inPreviewPane() {
    return /\bClaude\//.test(navigator.userAgent);
  },

  /**
   * Vérifie réellement l'accès au micro AVANT de lancer la reconnaissance.
   * Sans ça, le bouton a l'air de marcher puis échoue sans explication.
   * Renvoie "ok" ou un code d'erreur.
   */
  async probe() {
    if (!this.supported()) return (this.status = "unsupported");
    if (this.inPreviewPane()) return (this.status = "preview-pane");
    if (!window.isSecureContext) return (this.status = "insecure");
    if (!navigator.mediaDevices?.getUserMedia) return (this.status = "no-api");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());          // on relâche tout de suite
      return (this.status = "ok");
    } catch (e) {
      const n = e.name;
      if (n === "NotAllowedError") return (this.status = "denied");
      if (n === "NotFoundError" || n === "OverconstrainedError") return (this.status = "no-device");
      return (this.status = "error:" + n);
    }
  },

  /** Message actionnable en français pour chaque cas d'échec. */
  explain(code) {
    const c = String(code || "");
    if (c === "preview-pane") return {
      t: "Le micro est bloqué dans ce panneau d'aperçu",
      d: "C'est une restriction du panneau intégré, pas de l'app. Ouvre <b>http://localhost:8777</b> dans Chrome ou Safari : le micro y marchera."
    };
    if (c === "insecure") return {
      t: "Contexte non sécurisé",
      d: "Tu as ouvert le fichier directement (<code>file://</code>). Lance <b>démarrer.command</b> et passe par <b>http://localhost:8777</b>."
    };
    if (c === "denied") return {
      t: "Accès micro refusé",
      d: "Clique sur l'icône 🔒 dans la barre d'adresse → Micro → Autoriser. Si rien ne se passe : Réglages Système → Confidentialité et sécurité → Microphone → active ton navigateur."
    };
    if (c === "no-device") return { t: "Aucun micro détecté", d: "Branche un micro ou un casque, puis recharge la page." };
    if (c === "unsupported" || c === "no-api") return {
      t: "Navigateur non compatible",
      d: "La reconnaissance vocale marche dans Chrome et Safari. Firefox ne la gère pas."
    };
    if (c === "no-speech") return { t: "Rien entendu", d: "Parle plus fort ou plus près du micro, puis relance." };
    if (c === "network") return { t: "Pas de réseau", d: "Chrome envoie l'audio à ses serveurs pour le transcrire : il faut une connexion." };
    if (c === "aborted") return { t: "Écoute interrompue", d: "Relance quand tu veux." };
    return { t: "Micro indisponible", d: "Code : " + c + ". Essaie de recharger la page." };
  },

  /**
   * Écoute et renvoie la transcription en continu.
   * onText(texte, définitif) — onEnd() — onErr(code)
   */
  listen(onText, onEnd, onErr) {
    if (!this.supported()) { onErr && onErr("unsupported"); return; }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new R();
    r.lang = "es-ES";
    r.continuous = true;
    r.interimResults = true;

    let finalText = "";
    r.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " "; else interim += t;
      }
      onText((finalText + interim).trim(), finalText.trim());
    };
    r.onerror = e => onErr && onErr(e.error);
    r.onend = () => { this.active = false; onEnd && onEnd(finalText.trim()); };

    this.rec = r; this.active = true;
    try { r.start(); } catch (e) { onErr && onErr("start-failed"); }
  },

  stop() { if (this.rec && this.active) { try { this.rec.stop(); } catch (e) {} } }
};


/* --- Comparaison de ce que tu as dit vs. la cible --- */

const Match = {
  norm(s) {
    return s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[¿?¡!.,;:«»…()"']/g, " ")
      .replace(/\s+/g, " ").trim();
  },

  /** Score 0-100 + diff mot à mot pour l'affichage. */
  score(said, target) {
    const a = this.norm(said).split(" ").filter(Boolean);
    const b = this.norm(target).split(" ").filter(Boolean);
    if (!b.length) return { pct: 0, words: [] };

    // distance de Levenshtein sur les mots → alignement
    const m = b.length, n = a.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1));

    const pct = Math.max(0, Math.round((1 - d[m][n] / m) * 100));
    const heard = new Set(a);
    const words = b.map(w => ({ w, ok: heard.has(w) }));
    return { pct, words };
  }
};
