/* ============================================================
   ESCENAS — conversations à embranchements

   Le seul mode où quelqu'un te répond.

   Les huit autres modes sont du solo : tu récites, tu construis,
   tu répètes. Aucun ne t'entraîne à la chose qui compte vraiment
   en voyage — comprendre une phrase que tu n'as pas choisie, puis
   répondre avant que le silence devienne gênant.

   C'est de l'approche par tâches (task-based) : une situation
   réelle avec un objectif réel, où la langue est le moyen et non
   le sujet. La recherche est constante là-dessus depuis vingt ans :
   c'est ce qui réduit l'hésitation, là où le drill ne le fait pas.

   Trois principes de conception :
     1. L'AUDIO D'ABORD. Le texte existe, mais il faut le demander.
        Dans la vraie vie il n'y a pas de sous-titres.
     2. PAS DE BONNE RÉPONSE. Il y a des conséquences. Une réponse
        maladroite ne bloque pas la scène — elle la change.
     3. LES RÉPONSES SONT DONNÉES. On ne demande pas de produire
        librement : on demande de choisir puis de DIRE. Choisir est
        à ta portée aujourd'hui ; produire ex nihilo, pas encore.
   ============================================================ */

const ESCENAS = [
  {
    id: "e1",
    titre: "El bar",
    lieu: "Madrid · 20 h · un bar de quartier bondé",
    brief: "Tu entres seul dans un bar. Le serveur est rapide, il ne ralentira pas pour toi. Objectif : boire quelque chose, manger un truc, et repartir sans avoir eu l'air perdu.",
    ambiance: "bar",
    duree: "10 tours",
    depart: "n1",
    noeuds: {
      n1: { qui: "El camarero", dit: "¡Hola! ¿Qué te pongo?", fr: "Salut ! Je te sers quoi ?",
        astuce: "« ¿Qué te pongo ? » est LA formule d'accueil dans un bar espagnol. Littéralement « qu'est-ce que je te pose ? ».",
        rep: [
          { es: "Una caña, por favor.", fr: "Une bière pression, s'il te plaît.", va: "n2", ton: "bien",
            effet: "Impeccable. « Caña » = un demi pression, le réflexe local." },
          { es: "Perdona, ¿puedes repetir más despacio?", fr: "Pardon, tu peux répéter plus lentement ?", va: "n1b", ton: "neutre",
            effet: "Aucune honte. C'est la phrase la plus utile de ton répertoire." },
          { es: "Un café con leche.", fr: "Un café au lait.", va: "n2", ton: "maladroit",
            effet: "Ça passe, mais à 20 h dans un bar, tu viens de te signaler comme touriste." }
        ] },
      n1b: { qui: "El camarero", dit: "Claro, hombre. ¿Qué… quieres… tomar?", fr: "Bien sûr, mon gars. Qu'est-ce que… tu veux… boire ?",
        astuce: "Il ralentit et il t'appelle « hombre » — c'est amical, pas condescendant.",
        rep: [
          { es: "Una caña, por favor.", fr: "Une bière pression, s'il te plaît.", va: "n2", ton: "bien" },
          { es: "Un vino tinto.", fr: "Un vin rouge.", va: "n2", ton: "bien" }
        ] },
      n2: { qui: "El camarero", dit: "Marchando. ¿Algo para picar? Tenemos tortilla, jamón, aceitunas.",
        fr: "Ça arrive. Quelque chose à grignoter ? On a de la tortilla, du jambon, des olives.",
        astuce: "« Marchando » = ça part, ça arrive. Tu l'entendras dans tous les bars d'Espagne.",
        rep: [
          { es: "¿Qué me recomiendas?", fr: "Tu me recommandes quoi ?", va: "n3", ton: "bien",
            effet: "La meilleure question du voyage. Elle ouvre la conversation et te sort du menu." },
          { es: "Una de tortilla.", fr: "Une part de tortilla.", va: "n4", ton: "bien",
            effet: "« Una de… » = une portion de. Formule locale, tu sonnes juste." },
          { es: "No, gracias. Solo la caña.", fr: "Non merci. Juste la bière.", va: "n4", ton: "neutre" }
        ] },
      n3: { qui: "El camarero", dit: "La tortilla está recién hecha. Te la recomiendo.",
        fr: "La tortilla vient d'être faite. Je te la recommande.",
        astuce: "« recién hecha » = tout juste faite. « Te la recomiendo » : le « la » remplace la tortilla.",
        rep: [
          { es: "Vale, pues una de tortilla.", fr: "OK, alors une part de tortilla.", va: "n4", ton: "bien",
            effet: "« Vale, pues… » — deux mots qui te font sonner d'ici. Enchaînement typiquement espagnol." },
          { es: "Entonces ponme dos.", fr: "Alors mets-m'en deux.", va: "n4", ton: "bien",
            effet: "« Ponme » = mets-moi. Impératif + pronom soudé, exactement comme un natif." }
        ] },
      n4: { qui: "El camarero", dit: "¿Es tu primera vez en Madrid?", fr: "C'est ta première fois à Madrid ?",
        astuce: "La conversation démarre. C'est le moment où la plupart des gens paniquent et répondent « sí » en regardant leur verre.",
        rep: [
          { es: "Sí, llegué ayer.", fr: "Oui, je suis arrivé hier.", va: "n5", ton: "bien" },
          { es: "No, es la segunda vez. Me gusta mucho.", fr: "Non, c'est la deuxième fois. J'aime beaucoup.", va: "n5", ton: "bien",
            effet: "Tu as ajouté une info non demandée. C'est ça qui transforme un échange en conversation." },
          { es: "Perdona, no te entiendo.", fr: "Pardon, je ne te comprends pas.", va: "n4b", ton: "neutre" }
        ] },
      n4b: { qui: "El camarero", dit: "Que si es tu primera vez aquí, en Madrid.", fr: "Je demande si c'est ta première fois ici, à Madrid.",
        astuce: "Le « que » de reformulation. Un Espagnol qui répète commence presque toujours par « que… ».",
        rep: [
          { es: "Ah, sí. Llegué ayer.", fr: "Ah, oui. Je suis arrivé hier.", va: "n5", ton: "bien" }
        ] },
      n5: { qui: "El camarero", dit: "¿Y qué tal? ¿Te está gustando?", fr: "Et alors ? Ça te plaît ?",
        rep: [
          { es: "Me encanta. La gente es muy simpática.", fr: "J'adore. Les gens sont très sympas.", va: "n6", ton: "bien",
            effet: "« Me encanta » plutôt que « me gusta » : plus chaleureux, et les Espagnols le prennent bien." },
          { es: "Está bien.", fr: "C'est bien.", va: "n6froid", ton: "maladroit",
            effet: "Correct mais tiède. En Espagne, la tiédeur ferme la conversation." },
          { es: "Sí, aunque hace mucho calor.", fr: "Oui, même s'il fait très chaud.", va: "n6", ton: "bien",
            effet: "Se plaindre de la chaleur est un sport national. Tu viens de marquer des points." }
        ] },
      n6: { qui: "El camarero", dit: "Oye, pues hablas muy bien español, ¿eh?", fr: "Dis donc, tu parles vraiment bien espagnol, hein ?",
        astuce: "Le « ¿eh? » final cherche ton accord. Et le compliment est sincère : ici, essayer suffit.",
        rep: [
          { es: "Gracias, estoy aprendiendo.", fr: "Merci, j'apprends.", va: "n7", ton: "bien" },
          { es: "¡Qué va! Solo un poco.", fr: "Mais non ! Juste un peu.", va: "n7", ton: "bien",
            effet: "« ¡Qué va! » — la modestie réflexe espagnole. Personne n'accepte un compliment de face." }
        ] },
      n6froid: { qui: "El camarero", dit: "Ya. Bueno, si necesitas algo me dices.", fr: "Mouais. Bon, si tu as besoin de quelque chose tu me dis.",
        astuce: "« Ya. » sec = il a compris que tu ne voulais pas parler. Il se retire poliment.",
        rep: [
          { es: "Vale, gracias.", fr: "OK, merci.", va: "finFroid", ton: "neutre" },
          { es: "Perdona, es que me cuesta hablar. Pero me gusta mucho Madrid.", fr: "Pardon, c'est que j'ai du mal à parler. Mais j'aime beaucoup Madrid.", va: "n6", ton: "bien",
            effet: "Rattrapage parfait. « Me cuesta » = ça me coûte, j'ai du mal. Phrase en or." }
        ] },
      n7: { qui: "El camarero", dit: "Pues sigue así. ¿Te cobro o quieres otra?", fr: "Ben continue comme ça. Je t'encaisse ou tu en veux une autre ?",
        rep: [
          { es: "Ponme otra, por favor.", fr: "Remets-m'en une, s'il te plaît.", va: "n8", ton: "bien" },
          { es: "Cóbrame, por favor. ¿Cuánto es?", fr: "Encaisse-moi, s'il te plaît. C'est combien ?", va: "finBien", ton: "bien" }
        ] },
      n8: { qui: "El camarero", dit: "Marchando. Oye, ¿y a qué te dedicas?", fr: "Ça arrive. Dis, et tu fais quoi dans la vie ?",
        astuce: "« ¿A qué te dedicas? » — la vraie question, bien plus naturelle que « ¿cuál es tu trabajo? ».",
        rep: [
          { es: "Trabajo con vídeo y diseño.", fr: "Je travaille dans la vidéo et le design.", va: "finAmigo", ton: "bien" },
          { es: "Es difícil de explicar en español todavía.", fr: "C'est difficile à expliquer en espagnol pour l'instant.", va: "finAmigo", ton: "bien",
            effet: "Honnête et drôle. Ça désamorce et ça fait sourire." }
        ] }
    },
    fins: {
      finBien: { titre: "Sorti par la grande porte", dit: "Son cinco euros. ¡Hasta luego! Y vuelve, ¿eh?",
        fr: "Ça fait cinq euros. À plus tard ! Et reviens, hein ?",
        verdict: "Tu as commandé, mangé, discuté et payé, sans jamais basculer en anglais. C'est exactement l'objectif. Le « y vuelve, ¿eh? » est un vrai signe : il t'a apprécié." },
      finAmigo: { titre: "Tu t'es fait un contact", dit: "¡Qué bueno! Pues yo estoy aquí casi todas las noches. Me llamo Dani.",
        fr: "Génial ! Ben moi je suis là presque tous les soirs. Je m'appelle Dani.",
        verdict: "La meilleure fin possible. Tu n'as pas juste consommé — tu es devenu quelqu'un. C'est comme ça qu'on apprend une langue pour de vrai : en ayant une raison de revenir." },
      finFroid: { titre: "Correct, mais fermé", dit: "Aquí tienes. Adiós.", fr: "Voilà. Au revoir.",
        verdict: "Rien de faux dans ton espagnol. Mais tu as répondu au minimum, et la conversation est morte. En Espagne, un échange tiède se lit comme un refus. Refais la scène en ajoutant une information non demandée à chaque réponse — c'est tout ce qui change." }
    }
  },

  {
    id: "e2",
    titre: "La estación",
    lieu: "Atocha · 7 h 40 · ton train part dans 20 minutes",
    brief: "Tu dois aller à Séville. Le guichet a la queue, l'employée est pressée, et quelque chose ne va pas se passer comme prévu. Objectif : monter dans un train.",
    ambiance: "calle",
    duree: "8 tours",
    depart: "n1",
    noeuds: {
      n1: { qui: "La taquillera", dit: "Buenos días, ¿dígame?", fr: "Bonjour, je vous écoute ?",
        astuce: "« ¿Dígame? » — littéralement « dites-moi ». C'est le « j'écoute » standard, aussi au téléphone.",
        rep: [
          { es: "Buenos días. Un billete para Sevilla, por favor.", fr: "Bonjour. Un billet pour Séville, s'il vous plaît.", va: "n2", ton: "bien" },
          { es: "Quiero ir a Sevilla.", fr: "Je veux aller à Séville.", va: "n2", ton: "maladroit",
            effet: "Compréhensible, mais « quiero » sec sonne brusque au guichet. « Quisiera » ou « un billete… por favor » passe mieux." }
        ] },
      n2: { qui: "La taquillera", dit: "¿Para hoy? ¿Ida y vuelta o solo ida?", fr: "Pour aujourd'hui ? Aller-retour ou aller simple ?",
        astuce: "« Ida y vuelta » = aller-retour. « Solo ida » = aller simple. À retenir tel quel.",
        rep: [
          { es: "Solo ida, para hoy.", fr: "Aller simple, pour aujourd'hui.", va: "n3", ton: "bien" },
          { es: "Ida y vuelta, vuelvo el domingo.", fr: "Aller-retour, je reviens dimanche.", va: "n3", ton: "bien" },
          { es: "Perdone, ¿me lo puede repetir?", fr: "Pardon, vous pouvez me le répéter ?", va: "n2b", ton: "neutre",
            effet: "Note le « perdone » et le « puede » : avec un inconnu au guichet, on vouvoie." }
        ] },
      n2b: { qui: "La taquillera", dit: "Que si quiere ida y vuelta… o solo ida.", fr: "Je demande si vous voulez un aller-retour… ou juste un aller.",
        rep: [
          { es: "Solo ida, gracias.", fr: "Aller simple, merci.", va: "n3", ton: "bien" }
        ] },
      n3: { qui: "La taquillera", dit: "Lo siento, el de las ocho está completo. El siguiente sale a las once.",
        fr: "Désolée, celui de 8 h est complet. Le suivant part à 11 h.",
        astuce: "Le moment de vérité. « Está completo » = c'est complet. Ne pas comprendre ici, c'est rater son train.",
        rep: [
          { es: "¿No hay nada antes?", fr: "Il n'y a rien avant ?", va: "n4", ton: "bien",
            effet: "Le réflexe juste : ne jamais accepter la première réponse à un guichet." },
          { es: "Vale, el de las once entonces.", fr: "OK, celui de 11 h alors.", va: "n5", ton: "neutre" },
          { es: "¿Completo? ¿Qué significa eso?", fr: "Complet ? Ça veut dire quoi ?", va: "n3b", ton: "neutre",
            effet: "Demander le sens d'un mot en pleine conversation : c'est comme ça qu'on apprend vite." }
        ] },
      n3b: { qui: "La taquillera", dit: "Que no quedan plazas. Está lleno.", fr: "Qu'il ne reste plus de places. Il est plein.",
        rep: [
          { es: "Ah, entiendo. ¿No hay nada antes de las once?", fr: "Ah, je comprends. Il n'y a rien avant 11 h ?", va: "n4", ton: "bien" }
        ] },
      n4: { qui: "La taquillera", dit: "A ver… Hay uno a las nueve y cuarto, pero con cambio en Córdoba.",
        fr: "Voyons… Il y en a un à 9 h 15, mais avec changement à Cordoue.",
        astuce: "« A ver… » = voyons voir. Elle cherche pour toi : ta question a fonctionné.",
        rep: [
          { es: "Perfecto, ese me vale.", fr: "Parfait, celui-là me va.", va: "n5", ton: "bien",
            effet: "« Me vale » = ça me va. Très courant, très naturel." },
          { es: "¿Cuánto tiempo dura el cambio?", fr: "Le changement dure combien de temps ?", va: "n4b", ton: "bien" },
          { es: "No, prefiero esperar al directo.", fr: "Non, je préfère attendre le direct.", va: "n5", ton: "neutre" }
        ] },
      n4b: { qui: "La taquillera", dit: "Cuarenta minutos. Llega a Sevilla a la una y media.",
        fr: "Quarante minutes. Il arrive à Séville à 13 h 30.",
        rep: [
          { es: "Vale, me lo quedo.", fr: "OK, je le prends.", va: "n5", ton: "bien" }
        ] },
      n5: { qui: "La taquillera", dit: "Son cuarenta y dos euros. ¿Con tarjeta o en efectivo?",
        fr: "Ça fait quarante-deux euros. Par carte ou en espèces ?",
        rep: [
          { es: "Con tarjeta.", fr: "Par carte.", va: "n6", ton: "bien" },
          { es: "En efectivo.", fr: "En espèces.", va: "n6", ton: "bien" }
        ] },
      n6: { qui: "La taquillera", dit: "Aquí tiene. Andén 6, pero cámbielo en la pantalla, que a veces lo mueven.",
        fr: "Voilà. Quai 6, mais vérifiez sur l'écran, parce qu'ils le changent parfois.",
        astuce: "Elle te rend service en te prévenant. « Que » ici = « parce que » — très oral.",
        rep: [
          { es: "Muchas gracias, muy amable.", fr: "Merci beaucoup, très aimable.", va: "finBien", ton: "bien" },
          { es: "Vale. ¿El andén 6 está por allí?", fr: "OK. Le quai 6 c'est par là ?", va: "finBien", ton: "bien",
            effet: "Vérifier plutôt que supposer. Réflexe de voyageur." }
        ] }
    },
    fins: {
      finBien: { titre: "Tu as ton train", dit: "Sí, todo recto y a la derecha. ¡Buen viaje!",
        fr: "Oui, tout droit puis à droite. Bon voyage !",
        verdict: "Tu as encaissé une mauvaise nouvelle en espagnol, tu as posé la bonne question, et tu as trouvé une solution. C'est très exactement la compétence qui sépare « je connais des mots » de « je me débrouille »." }
    }
  },

  {
    id: "e3",
    titre: "La cena",
    lieu: "Chez des amis d'amis · un dîner où tu ne connais personne",
    brief: "On t'a invité. Tout le monde parle vite. Objectif : ne pas rester dans ton coin, et repartir avec un numéro ou une invitation.",
    ambiance: "noche",
    duree: "9 tours",
    depart: "n1",
    noeuds: {
      n1: { qui: "Lucía", dit: "¡Hola! Tú eres el amigo de Marta, ¿no? Yo soy Lucía.",
        fr: "Salut ! C'est toi l'ami de Marta, non ? Moi c'est Lucía.",
        astuce: "Le « ¿no? » en fin de phrase cherche confirmation. L'équivalent de notre « hein ? ».",
        rep: [
          { es: "Sí, encantado. Yo soy Georges.", fr: "Oui, enchanté. Moi c'est Georges.", va: "n2", ton: "bien" },
          { es: "Sí. Perdona, hablo poco español.", fr: "Oui. Pardon, je parle peu espagnol.", va: "n1b", ton: "neutre",
            effet: "Prévenir désamorce la pression. Mais attention à ne pas t'enfermer dedans." }
        ] },
      n1b: { qui: "Lucía", dit: "¡Pero si lo estás hablando! Tranquilo, hablo despacio.",
        fr: "Mais tu es en train de le parler ! Tranquille, je parle lentement.",
        astuce: "« ¡Pero si…! » = « mais enfin ! ». Marque la surprise amusée.",
        rep: [
          { es: "Gracias. Yo soy Georges.", fr: "Merci. Moi c'est Georges.", va: "n2", ton: "bien" }
        ] },
      n2: { qui: "Lucía", dit: "¿Y qué haces por aquí? ¿Vacaciones o trabajo?",
        fr: "Et tu fais quoi par ici ? Vacances ou boulot ?",
        rep: [
          { es: "Vacaciones. Estoy aquí una semana.", fr: "Vacances. Je suis là une semaine.", va: "n3", ton: "bien" },
          { es: "Un poco de todo. Trabajo, pero también quiero conocer la ciudad.", fr: "Un peu de tout. Je travaille, mais je veux aussi découvrir la ville.", va: "n3", ton: "bien",
            effet: "« Conocer » = découvrir/rencontrer, pas « savoir ». Tu viens d'ouvrir une porte." }
        ] },
      n3: { qui: "Lucía", dit: "¿Y ya has probado el salmorejo? Porque si no, no has estado aquí.",
        fr: "Et t'as déjà goûté le salmorejo ? Parce que sinon, t'es pas venu.",
        astuce: "L'exagération affectueuse est un mode de conversation en Espagne. Ne la prends pas au premier degré : joue avec.",
        rep: [
          { es: "Todavía no. ¿Está muy bueno?", fr: "Pas encore. C'est très bon ?", va: "n4", ton: "bien" },
          { es: "No, ¿qué es?", fr: "Non, c'est quoi ?", va: "n4", ton: "bien" },
          { es: "Entonces creo que no he estado aquí.", fr: "Alors je crois que je ne suis pas venu.", va: "n4rire", ton: "bien",
            effet: "Tu as repris sa blague dans sa structure. C'est le geste social le plus puissant qui existe dans une langue étrangère." }
        ] },
      n4rire: { qui: "Lucía", dit: "¡Ja! Muy bueno. Oye, pues tienes que probarlo ya.",
        fr: "Ha ! Excellent. Bon, du coup faut que tu goûtes tout de suite.",
        rep: [
          { es: "Venga, ¿dónde está?", fr: "Allez, il est où ?", va: "n5", ton: "bien" }
        ] },
      n4: { qui: "Lucía", dit: "Es como un gazpacho pero más espeso. Está buenísimo. Ven, te pongo un poco.",
        fr: "C'est comme un gazpacho mais plus épais. C'est vraiment très bon. Viens, je t'en sers un peu.",
        astuce: "« Buenísimo » — le suffixe -ísimo, superlatif espagnol. Ajoute-le partout, c'est gratuit et ça sonne natif.",
        rep: [
          { es: "Vale, gracias. Me apunto.", fr: "OK, merci. Je suis partant.", va: "n5", ton: "bien",
            effet: "« Me apunto » = je m'inscris, je suis partant. Un mot qui te fait accepter tout ce qu'on te propose." }
        ] },
      n5: { qui: "Lucía", dit: "¿Qué te parece?", fr: "T'en penses quoi ?",
        rep: [
          { es: "Está buenísimo. En serio.", fr: "C'est vraiment très bon. Sérieux.", va: "n6", ton: "bien" },
          { es: "Me gusta, aunque es diferente a lo que esperaba.", fr: "J'aime bien, même si c'est différent de ce que j'attendais.", va: "n6", ton: "bien",
            effet: "Une nuance, pas juste un avis. C'est ce qui fait qu'on te répond quelque chose." }
        ] },
      n6: { qui: "Lucía", dit: "¿Y cuánto tiempo llevas estudiando español?",
        fr: "Et ça fait combien de temps que tu étudies l'espagnol ?",
        astuce: "« Llevas + gérondif » — la structure qu'aucun francophone ne produit spontanément. Écoute-la bien.",
        rep: [
          { es: "Llevo unas semanas.", fr: "Ça fait quelques semaines.", va: "n7", ton: "bien",
            effet: "Tu viens de réutiliser sa structure. C'est comme ça qu'on l'apprend vraiment." },
          { es: "Poco tiempo. Empecé hace poco.", fr: "Peu de temps. J'ai commencé il n'y a pas longtemps.", va: "n7", ton: "bien" }
        ] },
      n7: { qui: "Lucía", dit: "¿Semanas? ¡Qué va, no me lo creo! Oye, si quieres quedamos y practicas conmigo.",
        fr: "Des semaines ? Mais non, je te crois pas ! Dis, si tu veux on se voit et tu pratiques avec moi.",
        astuce: "« Quedamos » = on se donne rendez-vous. Le verbe le plus utile de la vie sociale espagnole.",
        rep: [
          { es: "Me encantaría. ¿Te paso mi número?", fr: "J'adorerais. Je te passe mon numéro ?", va: "finAmiga", ton: "bien" },
          { es: "Sí, claro. ¿Cuándo te viene bien?", fr: "Oui, bien sûr. Quand ça t'arrange ?", va: "finAmiga", ton: "bien",
            effet: "« ¿Cuándo te viene bien? » — tu ne dis pas juste oui, tu concrétises. C'est ce qui fait la différence entre une politesse et un vrai rendez-vous." },
          { es: "Gracias, pero me voy pronto.", fr: "Merci, mais je repars bientôt.", va: "finPoli", ton: "maladroit" }
        ] }
    },
    fins: {
      finAmiga: { titre: "Tu repars avec quelqu'un à voir", dit: "Genial. Pues te escribo mañana y quedamos. ¡Un placer, Georges!",
        fr: "Génial. Je t'écris demain et on se cale ça. Enchantée, Georges !",
        verdict: "Voilà pourquoi on apprend une langue. Tu n'as pas « réussi un exercice » — tu as rencontré quelqu'un. Et à partir de maintenant, ton espagnol progressera dix fois plus vite, parce qu'il aura une raison d'exister." },
      finPoli: { titre: "Poli, mais tu es reparti seul", dit: "Ah, vale. Bueno, pues que disfrutes del viaje.",
        fr: "Ah, d'accord. Bon, ben profite bien du voyage.",
        verdict: "Rien d'incorrect. Mais on t'a tendu une perche et tu l'as refusée poliment. En espagnol comme ailleurs, la langue ne sert à rien si on décline les occasions de s'en servir. Refais la scène et accepte tout." }
    }
  }
];
