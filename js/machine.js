/* ============================================================
   LA MACHINE — construction par accrétion (d'après Michel Thomas)

   Le principe est à l'envers de tout le reste de l'app.
   Ailleurs on te demande de RETROUVER. Ici on te demande
   d'ASSEMBLER — et chaque pièce t'a été donnée juste avant.

   Trois règles de fer :
     1. Une seule chose nouvelle par marche. Jamais deux.
     2. Chaque marche réutilise la précédente. Rien ne se perd.
     3. Tu ne peux pas échouer. Il n'y a pas de note, pas de score,
        pas de « raté ». Si tu hésites, tu regardes — c'est prévu.

   L'effet recherché n'est pas la mémorisation, c'est la
   DÉSINHIBITION. Au bout de 30 marches tu produis une phrase
   longue et correcte, et ton cerveau enregistre surtout une
   chose : « je peux le faire ». C'est ça qui débloque.
   ============================================================ */

const CHAINES = [
  {
    id: "ch1",
    titre: "La première montée",
    sous: "30 marches · tu finis sur une phrase de 20 mots",
    intro: "Tu ne vas rien apprendre par cœur. Chaque marche ajoute UN élément à la précédente. Dis chaque phrase à voix haute avant de regarder — même mal, même lentement. C'est le fait de la sortir qui compte.",
    final: "Me gustaría saber por qué no es posible para usted hacerlo ahora, pero puedo esperar hasta mañana si es necesario.",
    finalFr: "J'aimerais savoir pourquoi il ne vous est pas possible de le faire maintenant, mais je peux attendre jusqu'à demain si c'est nécessaire.",
    pas: [
      { neuf: "posible", sens: "possible", fr: "possible", es: "posible",
        note: "Tu le connais déjà. En espagnol, presque tous les mots français en -ible et -able sont identiques : terrible, probable, responsable, imposible. Des centaines de mots, gratuits." },
      { neuf: "es", sens: "c'est / il est", fr: "C'est possible.", es: "Es posible.",
        note: "Deux lettres. Pas de « il », pas de « ce ». L'espagnol jette les sujets quand ils sont évidents." },
      { neuf: "no", sens: "ne… pas", fr: "Ce n'est pas possible.", es: "No es posible.",
        note: "Un seul mot pour toute la négation française, et il se pose devant le verbe. Plus simple que chez nous." },
      { neuf: null, fr: "Est-ce que c'est possible ?", es: "¿Es posible?",
        note: "Rien de nouveau : mêmes mots, la voix qui monte. Pas d'inversion, pas de « est-ce que »." },
      { neuf: "necesario", sens: "nécessaire", fr: "C'est nécessaire.", es: "Es necesario." },
      { neuf: null, fr: "Ce n'est pas nécessaire.", es: "No es necesario." },
      { neuf: "para mí", sens: "pour moi", fr: "C'est nécessaire pour moi.", es: "Es necesario para mí.",
        note: "L'accent sur « mí » le distingue de « mi » (mon). Un trait qui change tout un mot." },
      { neuf: null, fr: "Ce n'est pas possible pour moi.", es: "No es posible para mí." },
      { neuf: "para usted", sens: "pour vous", fr: "Est-ce que c'est possible pour vous ?", es: "¿Es posible para usted?",
        note: "« Usted » = vous de politesse. Et il se conjugue à la 3ᵉ personne, comme « il ». Bizarre au début, automatique après." },
      { neuf: "hacerlo", sens: "le faire", fr: "C'est possible de le faire.", es: "Es posible hacerlo.",
        note: "« hacer » (faire) + « lo » (le), soudés. L'espagnol colle le pronom derrière l'infinitif au lieu de le mettre devant." },
      { neuf: null, fr: "Ce n'est pas possible de le faire.", es: "No es posible hacerlo." },
      { neuf: "ahora", sens: "maintenant", fr: "Ce n'est pas possible de le faire maintenant.", es: "No es posible hacerlo ahora." },
      { neuf: "mañana", sens: "demain", fr: "C'est possible de le faire demain.", es: "Es posible hacerlo mañana." },
      { neuf: null, fr: "Est-ce que c'est possible de le faire demain ?", es: "¿Es posible hacerlo mañana?" },
      { neuf: "quiero", sens: "je veux", fr: "Je veux le faire.", es: "Quiero hacerlo.",
        note: "Une seule forme pour « je veux ». Pas de pronom sujet : le -o final dit déjà « je »." },
      { neuf: null, fr: "Je ne veux pas le faire.", es: "No quiero hacerlo." },
      { neuf: "puedo", sens: "je peux", fr: "Je ne peux pas le faire.", es: "No puedo hacerlo." },
      { neuf: null, fr: "Je ne peux pas le faire maintenant.", es: "No puedo hacerlo ahora." },
      { neuf: "tengo que", sens: "je dois", fr: "Je dois le faire.", es: "Tengo que hacerlo.",
        note: "Littéralement « j'ai que le faire ». Le « que » est obligatoire — c'est la seule chose à retenir." },
      { neuf: null, fr: "Je dois le faire maintenant.", es: "Tengo que hacerlo ahora." },
      { neuf: "porque", sens: "parce que", fr: "Je dois le faire maintenant parce que c'est nécessaire.", es: "Tengo que hacerlo ahora porque es necesario.",
        note: "« porque » collé = parce que. « por qué » en deux mots avec accent = pourquoi. La différence tient à une espace." },
      { neuf: "pero", sens: "mais", fr: "Je veux le faire mais je ne peux pas.", es: "Quiero hacerlo pero no puedo." },
      { neuf: "si", sens: "si", fr: "Je peux le faire si c'est nécessaire.", es: "Puedo hacerlo si es necesario.",
        note: "« si » sans accent = si. « sí » avec accent = oui. Encore un trait qui fait tout." },
      { neuf: "más tarde", sens: "plus tard", fr: "Je peux le faire plus tard.", es: "Puedo hacerlo más tarde." },
      { neuf: null, fr: "Je veux le faire mais je ne peux pas maintenant. Je peux le faire plus tard si c'est nécessaire.",
        es: "Quiero hacerlo pero no puedo ahora. Puedo hacerlo más tarde si es necesario.",
        note: "Quinze mots. Tu n'as mémorisé aucune de ces phrases — tu viens de les fabriquer." },
      { neuf: "me gustaría", sens: "j'aimerais", fr: "J'aimerais le faire.", es: "Me gustaría hacerlo.",
        note: "Littéralement « ça me plairait ». Le conditionnel le plus utile de la langue : il transforme n'importe quelle demande en demande polie." },
      { neuf: "saber", sens: "savoir", fr: "J'aimerais savoir.", es: "Me gustaría saber." },
      { neuf: "por qué", sens: "pourquoi", fr: "J'aimerais savoir pourquoi ce n'est pas possible.", es: "Me gustaría saber por qué no es posible." },
      { neuf: null, fr: "J'aimerais savoir pourquoi ce n'est pas possible pour vous de le faire maintenant.",
        es: "Me gustaría saber por qué no es posible para usted hacerlo ahora." },
      { neuf: "esperar hasta", sens: "attendre jusqu'à", fr: "Je peux attendre jusqu'à demain.", es: "Puedo esperar hasta mañana." }
    ]
  },
  {
    id: "ch2",
    titre: "Raconter ce qui s'est passé",
    sous: "22 marches · le passé, sans tableau de conjugaison",
    intro: "Même principe, autre terrain. Cette fois on construit du passé — celui qu'on utilise vraiment en conversation. Tu n'apprendras aucune terminaison : tu vas les entendre arriver.",
    final: "Ayer estuve en un restaurante increíble con un amigo, pero no pude quedarme mucho tiempo porque tenía que trabajar.",
    finalFr: "Hier j'étais dans un restaurant incroyable avec un ami, mais je n'ai pas pu rester longtemps parce que je devais travailler.",
    pas: [
      { neuf: "estoy", sens: "je suis (là, maintenant)", fr: "Je suis dans un restaurant.", es: "Estoy en un restaurante.",
        note: "« estar » pour un lieu ou un état passager. Jamais « ser » pour dire où on est." },
      { neuf: "estuve", sens: "j'étais / j'ai été", fr: "J'étais dans un restaurant.", es: "Estuve en un restaurante.",
        note: "Voilà le passé. Un mot à la place d'un autre — pas de règle à appliquer sur le moment." },
      { neuf: "ayer", sens: "hier", fr: "Hier j'étais dans un restaurant.", es: "Ayer estuve en un restaurante." },
      { neuf: "increíble", sens: "incroyable", fr: "Hier j'étais dans un restaurant incroyable.", es: "Ayer estuve en un restaurante increíble.",
        note: "Encore un mot gratuit. L'adjectif passe DERRIÈRE le nom, comme souvent en français." },
      { neuf: "con un amigo", sens: "avec un ami", fr: "J'étais dans un restaurant avec un ami.", es: "Estuve en un restaurante con un amigo." },
      { neuf: "comí", sens: "j'ai mangé", fr: "J'ai mangé dans un restaurant.", es: "Comí en un restaurante.",
        note: "Le -í accentué de la fin, c'est « je » au passé pour les verbes en -er et -ir. Tu viens d'apprendre une conjugaison entière sans tableau." },
      { neuf: "muy bien", sens: "très bien", fr: "J'ai très bien mangé.", es: "Comí muy bien." },
      { neuf: "fui", sens: "je suis allé", fr: "Hier je suis allé au restaurant.", es: "Ayer fui al restaurante.",
        note: "« a + el » se contracte en « al ». Toujours. C'est la seule contraction obligatoire de l'espagnol, avec « del »." },
      { neuf: "con él", sens: "avec lui", fr: "Je suis allé au restaurant avec lui.", es: "Fui al restaurante con él." },
      { neuf: "no pude", sens: "je n'ai pas pu", fr: "Je n'ai pas pu y aller.", es: "No pude ir." },
      { neuf: "quedarme", sens: "rester", fr: "Je n'ai pas pu rester.", es: "No pude quedarme.",
        note: "« quedar » + « me » soudé : rester, moi. L'espagnol adore ces verbes qui se collent leur pronom." },
      { neuf: "mucho tiempo", sens: "longtemps", fr: "Je n'ai pas pu rester longtemps.", es: "No pude quedarme mucho tiempo." },
      { neuf: "porque", sens: "parce que", fr: "Je n'ai pas pu rester parce que c'était tard.", es: "No pude quedarme porque era tarde." },
      { neuf: "tenía que", sens: "je devais", fr: "Je devais travailler.", es: "Tenía que trabajar.",
        note: "« tengo que » (je dois) devient « tenía que » (je devais). Le -ía, c'est l'imparfait — le décor du récit." },
      { neuf: null, fr: "Je n'ai pas pu rester parce que je devais travailler.", es: "No pude quedarme porque tenía que trabajar." },
      { neuf: "pero", sens: "mais", fr: "J'y suis allé mais je n'ai pas pu rester.", es: "Fui pero no pude quedarme." },
      { neuf: "me encantó", sens: "j'ai adoré", fr: "J'ai adoré le restaurant.", es: "Me encantó el restaurante.",
        note: "Comme « gustar » : c'est le restaurant qui a enchanté, pas toi qui as adoré. Le sujet est la chose." },
      { neuf: "volver", sens: "revenir", fr: "J'aimerais y revenir.", es: "Me gustaría volver." },
      { neuf: "algún día", sens: "un jour", fr: "J'aimerais y revenir un jour.", es: "Me gustaría volver algún día." },
      { neuf: null, fr: "J'ai adoré le restaurant et j'aimerais y revenir un jour.", es: "Me encantó el restaurante y me gustaría volver algún día." },
      { neuf: null, fr: "Hier je suis allé dans un restaurant incroyable avec un ami.", es: "Ayer fui a un restaurante increíble con un amigo." },
      { neuf: null, fr: "Hier j'étais dans un restaurant incroyable avec un ami, mais je n'ai pas pu rester longtemps.",
        es: "Ayer estuve en un restaurante increíble con un amigo, pero no pude quedarme mucho tiempo.",
        note: "Il ne manque plus qu'un morceau, et tu l'as déjà construit deux marches plus haut." }
    ]
  }
];
