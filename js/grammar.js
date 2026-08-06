/* ============================================================
   MÉCANIQUES — la grammaire qui émerge du corpus.

   Pas de tableaux abstraits appris à vide. Chaque mécanique part
   d'un PIÈGE francophone précis, l'explique en une phrase, et
   s'ancre dans des phrases que tu as déjà rencontrées.

   On n'apprend pas la règle puis les phrases. On apprend les
   phrases, puis on voit la règle qui les traversait déjà.
   ============================================================ */

const MECANIQUES = [
  {
    id: "m1", title: "SER ou ESTAR", sub: "Le mur n°1, et il tombe vite",
    trap: "Le français a un seul verbe « être ». L'espagnol en a deux, et se tromper change le sens — pas juste le style.",
    rule: [
      ["SER", "ce que la chose <b>est</b> : identité, origine, matière, heure, profession. Ce qui te définirait sur une carte d'identité."],
      ["ESTAR", "l'<b>état</b> et le <b>lieu</b> : humeur, position, situation du moment. Ce qui peut changer demain."]
    ],
    killer: "<b>Soy aburrido</b> = je suis quelqu'un d'ennuyeux.<br><b>Estoy aburrido</b> = je m'ennuie, là, maintenant.<br>Le même mot, deux vies différentes.",
    from: ["Soy francés.", "Estoy perdido.", "Estoy cansado.", "Está muy lejos.", "Son las tres y media.", "Está muy rico."],
    drill: [
      { q: "___ francés, de París.", opts: ["Soy", "Estoy"], a: 0, why: "Origine, ça ne change pas → SER." },
      { q: "___ cansado, me voy a dormir.", opts: ["Soy", "Estoy"], a: 1, why: "État du moment → ESTAR." },
      { q: "El baño ___ al fondo.", opts: ["es", "está"], a: 1, why: "Localisation → toujours ESTAR." },
      { q: "___ las nueve de la mañana.", opts: ["Son", "Están"], a: 0, why: "L'heure → SER, sans exception." },
      { q: "La paella ___ muy rica.", opts: ["es", "está"], a: 1, why: "Le goût de CE plat, maintenant → ESTAR. « Es rica » parlerait de la paella en général." },
      { q: "Mi hermana ___ médica.", opts: ["es", "está"], a: 0, why: "Profession = identité → SER." }
    ]
  },
  {
    id: "m2", title: "GUSTAR marche à l'envers", sub: "Ce n'est pas toi le sujet",
    trap: "« Me gusta » ne veut pas dire « j'aime ». Ça veut dire « ça me plaît ». La chose est le sujet, toi tu es le complément. Tout un groupe de verbes fonctionne comme ça.",
    rule: [
      ["Singulier", "<b>me gusta</b> el café — <i>le café me plaît</i>"],
      ["Pluriel", "<b>me gustan</b> los libros — <i>les livres me plaisent</i>. Le verbe s'accorde avec la CHOSE."],
      ["La famille", "encantar (adorer), doler (avoir mal), interesar, apetecer, faltar, quedar, parecer — tous à l'envers."]
    ],
    killer: "<b>Me gustas.</b> = Tu me plais.<br>Deux mots, et tu as dragué en espagnol. Le « s » final, c'est « tu ».",
    from: ["Me gusta mucho.", "No me gusta nada.", "¿Te gusta?", "Me encantó la película.", "Me parece buena idea.", "No me apetece."],
    drill: [
      { q: "Me ___ los tacos.", opts: ["gusta", "gustan"], a: 1, why: "« los tacos » est pluriel et c'est LUI le sujet → gustan." },
      { q: "Me ___ la cabeza.", opts: ["duele", "duelo"], a: 0, why: "C'est la tête qui fait mal, pas toi qui fais mal." },
      { q: "¿Te ___ salir esta noche?", opts: ["apetece", "apeteces"], a: 0, why: "Le sujet est « sortir », un infinitif → singulier." },
      { q: "Nos ___ mucho tu casa.", opts: ["encanta", "encantamos"], a: 0, why: "Ta maison nous enchante. Elle est le sujet." },
      { q: "Me ___ dos euros.", opts: ["falta", "faltan"], a: 1, why: "Deux euros manquent → pluriel." }
    ]
  },
  {
    id: "m3", title: "POR ou PARA", sub: "La cause contre le but",
    trap: "Le français dit « pour » dans les deux cas. L'espagnol sépare la raison d'avant et l'objectif d'après.",
    rule: [
      ["POR", "la <b>cause</b>, l'échange, le passage, la durée. Ce qui est <i>derrière</i> l'action. « Grâce à », « à cause de », « en échange de », « à travers »."],
      ["PARA", "le <b>but</b>, le destinataire, l'échéance. Ce qui est <i>devant</i> l'action. « Afin de », « à destination de », « pour le… »."]
    ],
    killer: "<b>Lo hago por ti</b> = je le fais parce que c'est toi (mobile).<br><b>Lo hago para ti</b> = je le fais pour te le donner (destinataire).",
    from: ["Gracias por todo.", "Por eso lo dejé.", "La cuenta, por favor.", "Necesito una respuesta antes del viernes.", "Es mejor que te vayas."],
    drill: [
      { q: "Estudio español ___ viajar.", opts: ["por", "para"], a: 1, why: "Le but visé → PARA." },
      { q: "Gracias ___ tu ayuda.", opts: ["por", "para"], a: 0, why: "La cause de ton merci → POR." },
      { q: "Este regalo es ___ ti.", opts: ["por", "para"], a: 1, why: "Destinataire → PARA." },
      { q: "Pagué veinte euros ___ la camiseta.", opts: ["por", "para"], a: 0, why: "Échange → POR." },
      { q: "Lo necesito ___ el lunes.", opts: ["por", "para"], a: 1, why: "Échéance → PARA." },
      { q: "Pasamos ___ el centro.", opts: ["por", "para"], a: 0, why: "Passage à travers → POR." }
    ]
  },
  {
    id: "m4", title: "Passé simple ou imparfait", sub: "La photo contre le film",
    trap: "En français parlé, le passé simple a disparu. En espagnol il est vivant et quotidien — c'est LE passé de la conversation.",
    rule: [
      ["Pretérito (fui, comí)", "l'action <b>terminée</b>, le fait, l'événement. La <b>photo</b>. « Hier je suis allé au ciné. »"],
      ["Imperfecto (iba, comía)", "le <b>décor</b>, l'habitude, ce qui durait. Le <b>film de fond</b>. « Avant j'allais au ciné tous les jeudis. »"]
    ],
    killer: "Les deux ensemble racontent : <b>Estaba en casa</b> (décor) <b>cuando llamó</b> (événement).<br>C'est la structure de toute anecdote.",
    from: ["Ayer fui al cine.", "Antes vivía en París.", "Cuando era pequeño, jugaba al fútbol.", "Llegué muy tarde a casa.", "Siempre hacíamos lo mismo.", "Al final decidí quedarme."],
    drill: [
      { q: "Ayer ___ a casa de Marta.", opts: ["fui", "iba"], a: 0, why: "Hier, une fois, terminé → pretérito." },
      { q: "Cuando ___ niño, vivía en Cayena.", opts: ["fui", "era"], a: 1, why: "Décor de l'enfance → imparfait." },
      { q: "___ la tele cuando sonó el teléfono.", opts: ["Vi", "Veía"], a: 1, why: "L'action en cours = décor → imparfait. Le téléphone, lui, est l'événement." },
      { q: "El año pasado ___ a España tres veces.", opts: ["viajé", "viajaba"], a: 0, why: "Trois fois, compté et fini → pretérito." },
      { q: "Todos los veranos ___ a la playa.", opts: ["fuimos", "íbamos"], a: 1, why: "« Tous les étés » = habitude → imparfait." }
    ]
  },
  {
    id: "m5", title: "Le subjonctif sans panique", sub: "Quatre déclencheurs, c'est tout",
    trap: "On te le vend comme le monstre de l'espagnol. En réalité il se déclenche presque toujours sur quatre situations, et le français fait pareil dans trois d'entre elles.",
    rule: [
      ["1 · Volonté sur autrui", "quiero que <b>vengas</b> — exactement comme « je veux que tu viennes »."],
      ["2 · Émotion et jugement", "espero que <b>salga</b> bien, es importante que lo <b>sepas</b>."],
      ["3 · Doute et négation d'opinion", "no creo que <b>sea</b> buena idea. Attention : <i>creo que es</i> (certitude) reste à l'indicatif."],
      ["4 · Futur incertain", "cuando <b>llegues</b>, avísame. <b>Là le français ne le fait pas</b> — c'est le seul vrai piège."]
    ],
    killer: "Règle de survie : <b>si les deux moitiés de la phrase ont des sujets différents et qu'il y a « que » au milieu</b>, le subjonctif est probable.",
    from: ["Quiero que vengas conmigo.", "Espero que todo salga bien.", "No creo que sea buena idea.", "Cuando llegues, avísame.", "Ojalá tengas razón.", "Es mejor que te vayas."],
    drill: [
      { q: "Quiero que me ___ la verdad.", opts: ["dices", "digas"], a: 1, why: "Volonté sur quelqu'un d'autre → subjonctif." },
      { q: "Creo que ___ razón.", opts: ["tienes", "tengas"], a: 0, why: "« Creo que » affirmatif = certitude → indicatif. Piège classique." },
      { q: "No creo que ___ verdad.", opts: ["es", "sea"], a: 1, why: "Nié, donc doute → subjonctif." },
      { q: "Cuando ___ a Madrid, te llamo.", opts: ["llego", "llegue"], a: 1, why: "Futur pas encore réalisé après « cuando » → subjonctif. Le piège n°1 des francophones." },
      { q: "Cuando ___ a Madrid, siempre te llamo.", opts: ["llego", "llegue"], a: 0, why: "Ici c'est une habitude réelle, pas un futur → indicatif." },
      { q: "Es importante que lo ___.", opts: ["sabes", "sepas"], a: 1, why: "Jugement de valeur → subjonctif." }
    ]
  },
  {
    id: "m6", title: "Les pronoms et le « se » magique", sub: "Comment l'espagnol évite d'accuser",
    trap: "L'espagnol colle les pronoms au verbe et les empile dans un ordre fixe. Et il a une tournure que le français n'a pas : déresponsabiliser le sujet.",
    rule: [
      ["Ordre fixe", "<b>SE — ME/TE/NOS — LE/LES — LO/LA/LOS/LAS</b>. Toujours cet ordre, sans exception."],
      ["Collés ou devant", "devant le verbe conjugué (<i>te lo digo</i>), collés à l'infinitif et à l'impératif (<i>decírtelo</i>, <i>dímelo</i>)."],
      ["Le « se » de l'accident", "<b>se me ha roto</b> el móvil = « le téléphone s'est cassé à moi ». Personne n'est coupable. Très espagnol, très utile."]
    ],
    killer: "<b>Se me ha olvidado</b> plutôt que <i>he olvidado</i>.<br>Tu n'as pas oublié : ça s'est oublié tout seul. La langue te couvre.",
    from: ["Se me ha olvidado.", "Se me ha roto el móvil.", "Me lo contó todo.", "Déjame pensarlo.", "Dile que me llame.", "No le digas nada a nadie."],
    drill: [
      { q: "« Il me l'a dit » → ___ dijo.", opts: ["Me lo", "Lo me"], a: 0, why: "ME avant LO, toujours." },
      { q: "« Je vais te le donner » → Voy a ___.", opts: ["dártelo", "darlote"], a: 0, why: "Collés à l'infinitif, dans l'ordre te + lo." },
      { q: "___ las llaves. (j'ai perdu mes clés, l'air innocent)", opts: ["He perdido", "Se me han perdido"], a: 1, why: "Le « se » de l'accident. Et le verbe s'accorde avec « las llaves »." },
      { q: "« Dis-le-moi » → ___.", opts: ["Dímelo", "Melodí"], a: 0, why: "Impératif + me + lo, soudés, avec accent écrit." }
    ]
  },
  {
    id: "m7", title: "Les verbes qui se cassent en deux", sub: "La diphtongue, et pourquoi c'est régulier",
    trap: "querer → quiero, poder → puedo, tener → tengo. Ça a l'air anarchique. Ça ne l'est pas : la voyelle se casse quand l'accent tombe dessus.",
    rule: [
      ["e → ie", "qu<b>e</b>rer → qu<b>ie</b>ro · p<b>e</b>nsar → p<b>ie</b>nso · emp<b>e</b>zar → emp<b>ie</b>zo"],
      ["o → ue", "p<b>o</b>der → p<b>ue</b>do · d<b>o</b>rmir → d<b>ue</b>rmo · v<b>o</b>lver → v<b>ue</b>lvo"],
      ["e → i", "p<b>e</b>dir → p<b>i</b>do · s<b>e</b>guir → s<b>i</b>go · d<b>e</b>cir → d<b>i</b>go"],
      ["La bonne nouvelle", "<b>nosotros</b> et <b>vosotros</b> ne cassent jamais : p<i>o</i>demos, qu<i>e</i>remos. L'accent est ailleurs."]
    ],
    killer: "Le motif en botte : les quatre formes du milieu cassent, les deux du bas non.<br>Une fois vu, tu ne peux plus le rater.",
    from: ["Quiero un café, por favor.", "¿Puedes ayudarme con esto?", "Necesito dormir.", "¿Me recomiendas algo?", "Tengo que irme."],
    drill: [
      { q: "Yo ___ ir contigo. (querer)", opts: ["quero", "quiero"], a: 1, why: "Accent sur le e → il casse en ie." },
      { q: "Nosotros ___ salir. (poder)", opts: ["podemos", "puedemos"], a: 0, why: "Nosotros ne casse jamais." },
      { q: "Ella ___ ocho horas. (dormir)", opts: ["dorme", "duerme"], a: 1, why: "o → ue à la 3e personne." },
      { q: "Yo ___ un café. (pedir)", opts: ["pedo", "pido"], a: 1, why: "e → i. Et « pedo » veut dire tout autre chose." }
    ]
  },
  {
    id: "m8", title: "Les genres qui trahissent", sub: "Quand le français t'induit en erreur",
    trap: "75 % du lexique se ressemble, donc tu supposes que le genre suit. Parfois il change, et l'accord entier part de travers.",
    rule: [
      ["Piège masculin", "<b>el</b> problema, <b>el</b> tema, <b>el</b> sistema, <b>el</b> idioma, <b>el</b> día, <b>el</b> mapa — masculins malgré le -a final."],
      ["Piège féminin", "<b>la</b> mano, <b>la</b> foto, <b>la</b> moto, <b>la</b> radio — féminins malgré le -o."],
      ["Genre inversé vs français", "la voiture → <b>el</b> coche · le lait → <b>la</b> leche · le sang → <b>la</b> sangre · la mer → <b>el</b> mar"]
    ],
    killer: "« <b>El</b> agua fría » : agua est <b>féminin</b>, mais on met « el » parce que « la agua » écorche la bouche. L'adjectif, lui, reste féminin. C'est de la phonétique, pas de la grammaire.",
    from: ["¿Qué es esto?", "Está muy rico.", "No me funciona el móvil.", "¿Me pasas el agua?"],
    drill: [
      { q: "___ problema es difícil.", opts: ["El", "La"], a: 0, why: "Masculin malgré le -a. Vient du grec." },
      { q: "Me duele ___ mano.", opts: ["el", "la"], a: 1, why: "Féminin malgré le -o." },
      { q: "___ coche es nuevo.", opts: ["El", "La"], a: 0, why: "Masculin en espagnol, féminin en français." },
      { q: "Quiero ___ leche fría.", opts: ["el", "la"], a: 1, why: "Féminin en espagnol, masculin en français." }
    ]
  }
];


/* ============================================================
   CONJUGAISON — uniquement les verbes que le corpus utilise
   réellement, et uniquement les temps qui servent à parler.
   ============================================================ */

const PRONOMS = ["yo", "tú", "él/ella", "nosotros", "vosotros", "ellos"];

const VERBES = [
  { inf: "ser", fr: "être (identité)", irr: true,
    pres: ["soy", "eres", "es", "somos", "sois", "son"],
    pret: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"],
    imp:  ["era", "eras", "era", "éramos", "erais", "eran"],
    subj: ["sea", "seas", "sea", "seamos", "seáis", "sean"] },
  { inf: "estar", fr: "être (état, lieu)", irr: true,
    pres: ["estoy", "estás", "está", "estamos", "estáis", "están"],
    pret: ["estuve", "estuviste", "estuvo", "estuvimos", "estuvisteis", "estuvieron"],
    imp:  ["estaba", "estabas", "estaba", "estábamos", "estabais", "estaban"],
    subj: ["esté", "estés", "esté", "estemos", "estéis", "estén"] },
  { inf: "tener", fr: "avoir, devoir (que)", irr: true,
    pres: ["tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"],
    pret: ["tuve", "tuviste", "tuvo", "tuvimos", "tuvisteis", "tuvieron"],
    imp:  ["tenía", "tenías", "tenía", "teníamos", "teníais", "tenían"],
    subj: ["tenga", "tengas", "tenga", "tengamos", "tengáis", "tengan"] },
  { inf: "ir", fr: "aller", irr: true,
    pres: ["voy", "vas", "va", "vamos", "vais", "van"],
    pret: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"],
    imp:  ["iba", "ibas", "iba", "íbamos", "ibais", "iban"],
    subj: ["vaya", "vayas", "vaya", "vayamos", "vayáis", "vayan"] },
  { inf: "hacer", fr: "faire", irr: true,
    pres: ["hago", "haces", "hace", "hacemos", "hacéis", "hacen"],
    pret: ["hice", "hiciste", "hizo", "hicimos", "hicisteis", "hicieron"],
    imp:  ["hacía", "hacías", "hacía", "hacíamos", "hacíais", "hacían"],
    subj: ["haga", "hagas", "haga", "hagamos", "hagáis", "hagan"] },
  { inf: "poder", fr: "pouvoir", irr: true,
    pres: ["puedo", "puedes", "puede", "podemos", "podéis", "pueden"],
    pret: ["pude", "pudiste", "pudo", "pudimos", "pudisteis", "pudieron"],
    imp:  ["podía", "podías", "podía", "podíamos", "podíais", "podían"],
    subj: ["pueda", "puedas", "pueda", "podamos", "podáis", "puedan"] },
  { inf: "querer", fr: "vouloir, aimer", irr: true,
    pres: ["quiero", "quieres", "quiere", "queremos", "queréis", "quieren"],
    pret: ["quise", "quisiste", "quiso", "quisimos", "quisisteis", "quisieron"],
    imp:  ["quería", "querías", "quería", "queríamos", "queríais", "querían"],
    subj: ["quiera", "quieras", "quiera", "queramos", "queráis", "quieran"] },
  { inf: "decir", fr: "dire", irr: true,
    pres: ["digo", "dices", "dice", "decimos", "decís", "dicen"],
    pret: ["dije", "dijiste", "dijo", "dijimos", "dijisteis", "dijeron"],
    imp:  ["decía", "decías", "decía", "decíamos", "decíais", "decían"],
    subj: ["diga", "digas", "diga", "digamos", "digáis", "digan"] },
  { inf: "saber", fr: "savoir", irr: true,
    pres: ["sé", "sabes", "sabe", "sabemos", "sabéis", "saben"],
    pret: ["supe", "supiste", "supo", "supimos", "supisteis", "supieron"],
    imp:  ["sabía", "sabías", "sabía", "sabíamos", "sabíais", "sabían"],
    subj: ["sepa", "sepas", "sepa", "sepamos", "sepáis", "sepan"] },
  { inf: "venir", fr: "venir", irr: true,
    pres: ["vengo", "vienes", "viene", "venimos", "venís", "vienen"],
    pret: ["vine", "viniste", "vino", "vinimos", "vinisteis", "vinieron"],
    imp:  ["venía", "venías", "venía", "veníamos", "veníais", "venían"],
    subj: ["venga", "vengas", "venga", "vengamos", "vengáis", "vengan"] },
  { inf: "hablar", fr: "parler — modèle -AR", irr: false,
    pres: ["hablo", "hablas", "habla", "hablamos", "habláis", "hablan"],
    pret: ["hablé", "hablaste", "habló", "hablamos", "hablasteis", "hablaron"],
    imp:  ["hablaba", "hablabas", "hablaba", "hablábamos", "hablabais", "hablaban"],
    subj: ["hable", "hables", "hable", "hablemos", "habléis", "hablen"] },
  { inf: "comer", fr: "manger — modèle -ER", irr: false,
    pres: ["como", "comes", "come", "comemos", "coméis", "comen"],
    pret: ["comí", "comiste", "comió", "comimos", "comisteis", "comieron"],
    imp:  ["comía", "comías", "comía", "comíamos", "comíais", "comían"],
    subj: ["coma", "comas", "coma", "comamos", "comáis", "coman"] },
  { inf: "vivir", fr: "vivre — modèle -IR", irr: false,
    pres: ["vivo", "vives", "vive", "vivimos", "vivís", "viven"],
    pret: ["viví", "viviste", "vivió", "vivimos", "vivisteis", "vivieron"],
    imp:  ["vivía", "vivías", "vivía", "vivíamos", "vivíais", "vivían"],
    subj: ["viva", "vivas", "viva", "vivamos", "viváis", "vivan"] }
];

const TEMPS = [
  { k: "pres", n: "Présent", why: "80 % de ce que tu diras les trois premiers mois." },
  { k: "pret", n: "Passé simple", why: "Le passé de la conversation espagnole. Incontournable." },
  { k: "imp",  n: "Imparfait", why: "Le décor, les habitudes. Presque toujours régulier — trois irréguliers en tout." },
  { k: "subj", n: "Subjonctif", why: "Se forme sur le « yo » du présent : tengo → tenga. Presque toujours." }
];
