#!/usr/bin/env node
/* ============================================================
   Génère une vraie voix neuronale pour tout le corpus, une fois
   pour toutes, en fichiers MP3 statiques.

   Pourquoi pré-générer plutôt qu'appeler une API depuis le navigateur :
     · aucune clé exposée côté client
     · aucun coût à l'usage — on paie une fois, on écoute mille fois
     · qualité identique sur Mac, iPhone, n'importe quel navigateur
     · fonctionne hors ligne une fois les fichiers en cache
     · le ralenti du shadowing ne déforme plus la voix

   USAGE
     export OPENAI_API_KEY=sk-...
     node tools/generate-audio.mjs --provider openai --voice nova

     export ELEVENLABS_API_KEY=...
     node tools/generate-audio.mjs --provider elevenlabs --voice <voice_id>

     export AZURE_SPEECH_KEY=...  AZURE_SPEECH_REGION=westeurope
     node tools/generate-audio.mjs --provider azure --voice es-ES-ElviraNeural

   Options : --force (regénère tout)   --limit N (test sur N phrases)
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "audio");
// surchargeable pour les tests hors ligne
const ELEVEN = process.env.ELEVENLABS_BASE || "https://api.elevenlabs.io";

/* ---- args ---- */
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes("--" + k);
const PROVIDER = arg("provider", "openai");
const DEFAULT_VOICE = { openai: "nova", elevenlabs: "", azure: "es-ES-ElviraNeural,es-MX-JorgeNeural" };
const FORCE = flag("force");
const LIMIT = +arg("limit", 0);

/* ---- même hash que js/audio.js ---- */
function hash(text) {
  const s = text.normalize("NFC").trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/* ---- corpus : on exécute js/corpus.js tel quel ---- */
const src = readFileSync(join(ROOT, "js", "corpus.js"), "utf8");
const { CORPUS, RULES } = new Function(src + "\nreturn { CORPUS, RULES };")();

const items = [
  ...CORPUS.map(c => c.es),
  // les exemples espagnols du Cheat code, en retirant les gloses entre parenthèses
  ...RULES.flatMap(r => r.ex.map(([, b]) => b))
    .map(s => s.replace(/\s*\(.*$/, "").trim())
    .filter(s => s && !/[A-ZÀ-Þ]{3,}/.test(s))
];
const uniq = [...new Set(items)];
const todo = LIMIT ? uniq.slice(0, LIMIT) : uniq;

/* ---- fournisseurs ---- */
const providers = {
  async openai(text, voice) {
    const key = need("OPENAI_API_KEY");
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: arg("model", "gpt-4o-mini-tts"),
        voice,
        input: text,
        response_format: "mp3",
        instructions: "Habla en español de España, con acento nativo, ritmo natural de conversación, ni lento ni exagerado. Es material para aprender idiomas: pronuncia con claridad pero sin sonar artificial."
      })
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status} ${(await r.text()).slice(0, 200)}`);
    return Buffer.from(await r.arrayBuffer());
  },

  async elevenlabs(text, voice) {
    const key = need("ELEVENLABS_API_KEY");
    const r = await fetch(`${ELEVEN}/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: arg("model", "eleven_multilingual_v2"),
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15 }
      })
    });
    if (!r.ok) throw new Error(`ElevenLabs ${r.status} ${(await r.text()).slice(0, 200)}`);
    return Buffer.from(await r.arrayBuffer());
  },

  async azure(text, voice) {
    const key = need("AZURE_SPEECH_KEY");
    const region = need("AZURE_SPEECH_REGION");
    const ssml = `<speak version='1.0' xml:lang='es-ES'><voice name='${voice}'>${
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</voice></speak>`;
    const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3"
      },
      body: ssml
    });
    if (!r.ok) throw new Error(`Azure ${r.status} ${(await r.text()).slice(0, 200)}`);
    return Buffer.from(await r.arrayBuffer());
  }
};

function need(v) {
  if (!process.env[v]) { console.error(`\n✗ Variable d'environnement ${v} manquante.\n`); process.exit(1); }
  return process.env[v];
}


/* ---- ElevenLabs : trouver les voix réellement hispanophones du compte ----
   Une voix anglaise qui « parle espagnol » produit un accent qui n'existe pas.
   Pour apprendre, c'est pire qu'une voix moyenne mais native. */
async function elevenSpanishVoices() {
  const r = await fetch(`${ELEVEN}/v1/voices`,
    { headers: { "xi-api-key": need("ELEVENLABS_API_KEY") } });
  if (!r.ok) throw new Error(`liste des voix : ${r.status} ${(await r.text()).slice(0, 160)}`);
  const { voices } = await r.json();

  const isES = v => {
    const hay = JSON.stringify(v.labels || {}) + " " + (v.description || "") + " " +
                JSON.stringify(v.verified_languages || []) + " " + (v.name || "");
    return /\b(spanish|español|espanol|castilian|castellano|latin ?american|mexican|colombian|argentin)\b/i.test(hay);
  };
  const gender = v => (v.labels?.gender || "").toLowerCase();

  const es = voices.filter(isES);
  if (!es.length) return { picked: [], all: voices, none: true };

  // Accent : Espagne ou Amérique latine. Les deux comptent — tu veux
  // voyager ET bosser, et le seseo change complètement l'écoute.
  const zone = v => {
    const hay = JSON.stringify(v.labels || {}) + " " + (v.description || "");
    if (/castilian|castellano|spain|españa|espana|europe/i.test(hay)) return "ES";
    if (/latin|mexican|colombian|argentin|chilean|peruvian|america/i.test(hay)) return "LA";
    return "?";
  };

  /* Sélection équilibrée : on remplit les cases (genre × zone) une par une,
     en variant le genre à chaque tour. Apprendre sur une seule voix, c'est
     apprendre cette voix ; sur un seul genre, c'est rater la moitié des
     hauteurs de voix qu'on entendra en vrai. */
  const want = Math.max(1, Math.min(6, +arg("speakers", 2)));
  const picked = [];
  const used = new Set();
  const slots = [];
  for (let i = 0; i < want; i++) {
    slots.push({ g: i % 2 === 0 ? "f" : "m", z: i % 4 < 2 ? "ES" : "LA" });
  }
  for (const slot of slots) {
    let v = es.find(x => !used.has(x.voice_id) && gender(x).startsWith(slot.g) && zone(x) === slot.z)
         || es.find(x => !used.has(x.voice_id) && gender(x).startsWith(slot.g))
         || es.find(x => !used.has(x.voice_id));
    if (!v) break;
    used.add(v.voice_id); picked.push(v);
  }

  return { picked: picked.map(v => ({ id: v.voice_id, name: v.name, gender: gender(v) || "?", zone: zone(v) })), all: voices, total: es.length };
}


/* ---- Contrôle de quota avant de lancer quoi que ce soit ----
   Rien de pire qu'une génération interrompue à la phrase 180 : le manifeste
   est incomplet, l'app parle moitié natif moitié Mónica. On vérifie d'abord. */
async function elevenQuota() {
  try {
    const r = await fetch(`${ELEVEN}/v1/user/subscription`,
      { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } });
    if (!r.ok) return null;
    const d = await r.json();
    return {
      used: d.character_count ?? 0,
      limit: d.character_limit ?? 0,
      left: Math.max(0, (d.character_limit ?? 0) - (d.character_count ?? 0)),
      tier: d.tier || "?"
    };
  } catch (e) { return null; }
}

/* ---- génération ---- */
const gen = providers[PROVIDER];
if (!gen) { console.error(`✗ Fournisseur inconnu : ${PROVIDER}. Choix : ${Object.keys(providers).join(", ")}`); process.exit(1); }

let VOICES = (arg("voice", "") || DEFAULT_VOICE[PROVIDER] || "").split(",").map(v => v.trim()).filter(Boolean);
let VOICE_LABELS = VOICES.slice();

if (PROVIDER === "elevenlabs" && !arg("voice", "")) {
  const { picked, all, none } = await elevenSpanishVoices();
  if (none) {
    console.error(`
  ✗ Aucune voix hispanophone dans ton compte ElevenLabs.

    Les ${all.length} voix présentes sont anglophones : elles parleraient espagnol
    avec un accent qui n'existe pas. Pour apprendre, c'est contre-productif.

    → Va sur elevenlabs.io → Voice Library → filtre « Spanish », ajoute une
      voix es-ES et une es-MX à ton compte, puis relance cette commande.

    Ou force une voix quand même : --voice <voice_id>
`);
    process.exit(1);
  }
  VOICES = picked.map(v => v.id);
  VOICE_LABELS = picked.map(v => `${v.name} · ${v.gender} · ${v.zone === "LA" ? "Amérique latine" : v.zone === "ES" ? "Espagne" : "accent ?"}`);
}

if (flag("list")) {
  console.log(`\n  Voix retenues : ${VOICE_LABELS.join(", ")}`);
  console.log(`  IDs           : ${VOICES.join(",")}\n`);
  process.exit(0);
}

if (!VOICES.length) { console.error(`\n✗ --voice requis pour ${PROVIDER}.\n`); process.exit(1); }
console.log(`  Locuteurs   : ${VOICE_LABELS.join(", ")}`);

mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, "manifest.json");
const manifest = existsSync(manifestPath) && !FORCE ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

const chars = todo.reduce((n, t) => n + t.length, 0);
console.log(`\n  Fournisseur : ${PROVIDER}`);
console.log(`  Phrases     : ${todo.length}  (${chars.toLocaleString("fr")} caractères)`);
console.log(`  Déjà faites : ${Object.keys(manifest).length}\n`);

if (PROVIDER === "elevenlabs") {
  const q = await elevenQuota();
  if (q) {
    const need = chars * VOICES.length;
    console.log(`  Quota       : ${q.left.toLocaleString("fr")} caractères restants sur ${q.limit.toLocaleString("fr")} (offre « ${q.tier} »)`);
    console.log(`  Nécessaire  : ${need.toLocaleString("fr")} caractères (${chars.toLocaleString("fr")} × ${VOICES.length} locuteur(s))\n`);
    if (need > q.left) {
      const fits = Math.floor(q.left / chars);
      console.error(`  ✗ Quota insuffisant : il manque ${(need - q.left).toLocaleString("fr")} caractères.\n`);
      if (fits >= 1) {
        console.error(`    → Avec ${fits} locuteur(s) ça passe :`);
        console.error(`      node tools/generate-audio.mjs --provider elevenlabs --speakers ${fits}\n`);
      }
      console.error(`    → Ou passe à une offre supérieure, ou attends la remise à zéro mensuelle.`);
      console.error(`    → Ou force malgré tout : --ignore-quota (la génération s'arrêtera net à l'épuisement).\n`);
      if (!flag("ignore-quota")) process.exit(1);
    }
  }
}

let ok = 0, skip = 0, fail = 0;
const CONC = 4;

async function one(text) {
  const h = hash(text);
  for (const [vi, voice] of VOICES.entries()) {
    const file = VOICES.length > 1 ? `${h}-${vi}.mp3` : `${h}.mp3`;
    const done = (manifest[h] || []).includes?.(file) || manifest[h] === file;
    if (!FORCE && done && existsSync(join(OUT, file))) { skip++; continue; }
    await once(text, voice, file, h);
  }
}

async function once(text, voice, file, h) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const buf = await gen(text, voice);
      if (buf.length < 500) throw new Error("réponse audio suspecte (" + buf.length + " octets)");
      writeFileSync(join(OUT, file), buf);
      const cur = manifest[h];
      manifest[h] = VOICES.length > 1
        ? [...new Set([...(Array.isArray(cur) ? cur : cur ? [cur] : []), file])].sort()
        : file;
      ok++;
      process.stdout.write(`\r  ✓ ${ok}  ⤼ ${skip}  ✗ ${fail}   ${text.slice(0, 42).padEnd(44)}`);
      return;
    } catch (e) {
      if (attempt === 3) { fail++; console.error(`\n  ✗ « ${text} » → ${e.message}`); return; }
      await new Promise(r => setTimeout(r, 800 * attempt));
    }
  }
}

for (let i = 0; i < todo.length; i += CONC) {
  await Promise.all(todo.slice(i, i + CONC).map(one));
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 0));
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 0));
const bytes = readdirSync(OUT).filter(f => f.endsWith(".mp3"))
  .reduce((n, f) => n + readFileSync(join(OUT, f)).length, 0);

console.log(`\n\n  Terminé — ${ok} générées, ${skip} déjà présentes, ${fail} en échec.`);
const nFiles = readdirSync(OUT).filter(f => f.endsWith(".mp3")).length;
console.log(`  ${Object.keys(manifest).length} phrases × ${VOICES.length} locuteur(s) = ${nFiles} fichiers, ${(bytes / 1048576).toFixed(1)} Mo dans audio/`);
console.log(`\n  Recharge l'app : elle détecte audio/manifest.json toute seule.`);
console.log(`  Puis : vercel deploy --prod --yes\n`);
