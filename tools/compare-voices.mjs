#!/usr/bin/env node
/* ============================================================
   Banc de comparaison des fournisseurs de voix.

   Génère les 5 MÊMES phrases chez chaque fournisseur dont tu as
   la clé, puis produit une page d'écoute en aveugle : les voix
   sont étiquetées A, B, C dans un ordre mélangé, et le nom du
   fournisseur ne s'affiche qu'après ton verdict.

   En aveugle, parce que savoir qu'on écoute « le plus cher »
   suffit à le trouver meilleur.

   USAGE
     export ELEVENLABS_API_KEY=...        # au moins une clé
     export OPENAI_API_KEY=...
     export AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=westeurope
     node tools/compare-voices.mjs

   Puis ouvre http://localhost:8777/compare.html
   ============================================================ */

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "compare");

/* Cinq phrases choisies pour couvrir ce qui casse les voix de synthèse :
   la jota, le r roulé, le ñ, le ll, les liaisons et le débit familier. */
const TESTS = [
  { id: "t1", es: "Hola, ¿qué tal? Me llamo Georges y soy francés.",
    fr: "Phrase d'ouverture — le ñ implicite, les liaisons.", stress: "liaisons" },
  { id: "t2", es: "El señor Jiménez trabaja en el barrio y siempre llega tarde.",
    fr: "La jota, le r roulé, le ñ, le ll — le test décisif.", stress: "jota · rr · ñ · ll" },
  { id: "t3", es: "Venga, vale, nos vemos luego. ¡Qué guay!",
    fr: "Débit familier — c'est là que les voix sonnent fausses.", stress: "registre familier" },
  { id: "t4", es: "Espero que todo salga bien, aunque la verdad es que no tengo ni idea.",
    fr: "Phrase longue — la prosodie tient-elle sur la durée ?", stress: "prosodie longue" },
  { id: "t5", es: "Son las tres y media y tengo que irme corriendo.",
    fr: "Chiffres et enchaînements rapides.", stress: "chiffres · débit" }
];

const has = k => !!process.env[k];

/* ---- fournisseurs candidats ---- */
const candidates = [
  {
    id: "elevenlabs", label: "ElevenLabs", need: ["ELEVENLABS_API_KEY"],
    async voices() {
      const r = await fetch("https://api.elevenlabs.io/v1/voices",
        { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } });
      if (!r.ok) throw new Error(`liste des voix ${r.status}`);
      const { voices } = await r.json();
      // on cherche une voix réellement hispanophone, pas une voix anglaise qui « fait » l'espagnol
      const es = voices.filter(v =>
        /spanish|español|castilian|latin/i.test(JSON.stringify(v.labels || {}) + " " + (v.description || "")));
      const pick = (es.length ? es : voices).slice(0, 1);
      if (!es.length) console.warn(`  ⚠ ElevenLabs : aucune voix marquée hispanophone dans ton compte.\n    → « ${pick[0]?.name} » sera un anglophone qui parle espagnol. Ajoute une voix espagnole depuis la Voice Library pour un test juste.`);
      return pick.map(v => ({ id: v.voice_id, name: v.name }));
    },
    async say(text, voice) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.1 } })
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
      return Buffer.from(await r.arrayBuffer());
    }
  },
  {
    id: "azure", label: "Azure Neural", need: ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"],
    async voices() { return [{ id: "es-ES-ElviraNeural", name: "Elvira (es-ES)" }]; },
    async say(text, voice) {
      const ssml = `<speak version='1.0' xml:lang='es-ES'><voice name='${voice.id}'>${
        text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</voice></speak>`;
      const r = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: "POST",
        headers: { "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3" },
        body: ssml
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
      return Buffer.from(await r.arrayBuffer());
    }
  },
  {
    id: "openai", label: "OpenAI gpt-4o-mini-tts", need: ["OPENAI_API_KEY"],
    async voices() { return [{ id: "nova", name: "nova" }]; },
    async say(text, voice) {
      const r = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: voice.id, input: text,
          response_format: "mp3",
          instructions: "Habla en español de España con acento nativo y ritmo natural de conversación. Material para aprender idiomas: claro pero no artificial." })
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
      return Buffer.from(await r.arrayBuffer());
    }
  }
];

const active = candidates.filter(c => c.need.every(has));

if (!active.length) {
  console.error(`
  Aucune clé détectée. Exporte au moins une de celles-ci dans ce terminal,
  puis relance. Les clés restent chez toi, elles ne transitent pas ailleurs.

    export ELEVENLABS_API_KEY=...      → elevenlabs.io, Profil → API Keys
    export OPENAI_API_KEY=sk-...       → platform.openai.com/api-keys
    export AZURE_SPEECH_KEY=...        → portal.azure.com, ressource « Speech »
    export AZURE_SPEECH_REGION=westeurope

  Tu peux n'en mettre qu'une : la comparaison se fera contre la voix
  système de macOS, ce qui suffit déjà à mesurer l'écart.
`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

console.log(`\n  Fournisseurs testés : ${active.map(a => a.label).join(", ")}\n`);

const results = [];
for (const p of active) {
  let voice;
  try { voice = (await p.voices())[0]; }
  catch (e) { console.error(`  ✗ ${p.label} : ${e.message}`); continue; }
  if (!voice) { console.error(`  ✗ ${p.label} : aucune voix utilisable`); continue; }

  const clips = {};
  let okCount = 0;
  for (const t of TESTS) {
    try {
      const buf = await p.say(t.es, voice);
      const file = `${p.id}-${t.id}.mp3`;
      writeFileSync(join(OUT, file), buf);
      clips[t.id] = file; okCount++;
      process.stdout.write(`\r  ${p.label.padEnd(24)} ${okCount}/${TESTS.length}`);
    } catch (e) { console.error(`\n  ✗ ${p.label} / ${t.id} : ${e.message}`); }
  }
  console.log("");
  if (okCount) results.push({ id: p.id, label: p.label, voice: voice.name, clips });
}

/* ordre mélangé et figé : l'écoute doit être aveugle */
const order = results.map((_, i) => i);
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(((i * 2654435761) % 4294967296) / 4294967296 * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}

writeFileSync(join(OUT, "index.json"), JSON.stringify({
  tests: TESTS,
  providers: order.map((oi, k) => ({ ...results[oi], blind: String.fromCharCode(65 + k) }))
}, null, 1));

console.log(`\n  ${results.length} fournisseur(s), ${results.length * TESTS.length} extraits dans compare/`);
console.log(`\n  → Ouvre http://localhost:8777/compare.html et écoute en aveugle.\n`);
