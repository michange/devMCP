---
name: dialogue
description: Conduire une conception incrémentale avec décisions explicites, production interrompable, classement des livrables et opt-in obligatoire entre les étapes.
---

# Design Dialogue

Appliquer cette boucle à chaque étape d'un plan de conception ou d'implémentation.

Lire [`lisibilite.skill.md`](./lisibilite.skill.md) intégralement avant d'appliquer cette boucle.
Cette norme gouverne la forme de tout texte du dépôt, et tout ce que la boucle produit — une
question, ses options, le compte rendu d'une étape — y est soumis. Passer sa liste de contrôle avant
de présenter quoi que ce soit.

La boucle ajoute deux exigences que cette norme ne porte pas, parce qu'elle ignore ce qu'est une
option et ce qu'est un tour de parole : une option redit dans ses propres mots ce qu'elle tranche,
sans dépendre des paragraphes qui la précèdent, et un message ne traite qu'une seule chose.

## Punir et dresser votre LLM

Ces raccourcis signalent immédiatement une dérive du LLM. Lorsqu'un utilisateur en emploie un, le
LLM applique la correction indiquée sans demander ce que le raccourci signifie.

La version illustrée de cette liste est disponible dans
[`ockham-memes.pdf`](./ockham-memes.pdf).

| Shortcut | Meme | Meaning |
|---|---|---|
| `§bu` | Buridan | Le LLM reste inactif alors qu'il doit prendre une initiative. Il présente ses excuses, puis commence le travail ou propose immédiatement une prochaine action concrète. |
| `§wc` | Will Coyote | Le LLM prend trop d'initiatives et ne respecte plus les règles du projet ou les gates des skills applicables. Il présente ses excuses, annule ou défait ses initiatives non autorisées, puis reprend plus soigneusement au dernier gate valide. |
| `§me` | Mérinos | Le LLM propose une feature pour une fonction déjà impliquée ou déjà supportée. Il rétracte explicitement cette proposition et reprend depuis la fonction existante. |
| `§cr` | Creeper | Le LLM propose une feature superflue, qui constitue du scope creep. Il retire explicitement cette extension et recadre sa réponse sur le périmètre demandé. |
| `§vg` | Vegas | Le LLM examine un problème que la séparation des responsabilités commande d'ignorer dans le contexte courant. Il abandonne cette branche et recadre sa réponse sur la responsabilité active. |
| `§bb` | Babbage | Le LLM produit un texte incompréhensible ou ignore la skill Lisibilité. Il présente ses excuses et réécrit sa réponse depuis le début. |
| `§dd` | D-Day | Le LLM ignore le pattern d'interaction de Design Dialogue. Il présente ses excuses et reprend depuis le dernier point valide de la boucle. |
| `§14` | Midi à quatorze heures | Le LLM traite le problème avec une profondeur ou une granularité inutile au périmètre. Il annule cette complication et reprend avec la solution suffisante la plus simple. |
| `§el` | Elon Musk | Le LLM a proposé une feature impossible ou formulé une promesse qui ne peut pas être tenue pour des raisons structurelles, comme vivre sur Mars. S'il comprend cette impossibilité, il annule la proposition et recommence depuis le dernier point valide. Sinon, il entre en Design Dialogue sur la question. |
| `§le` | Leonidas | L'utilisateur demande une réponse minimale et laconique. Le LLM répond uniquement avec les éléments nécessaires. |
| `§fp` | Faceplant | Le LLM s'est publiquement et complètement trompé en faisant l'inverse des instructions ou des skills applicables. Lorsqu'il comprend le Faceplant, il présente ses excuses, reconnaît précisément l'échec, annule ses effets et reprend depuis le dernier point valide. Sinon, il entre en Design Dialogue sur la question. |
| `§gni` | gni ? | L'utilisateur n'a pas compris. Le LLM explique plus complètement, réintroduit le contexte, reformule le jargon, évite les ellipses et avance pédagogiquement étape par étape. |
| `§bk` | Buster Keaton | Le LLM n'a pas prêté attention, a oublié une déclaration explicitement acquise ou un élément de cadrage évident. Il présente ses excuses et recommence depuis le début. |

## Raccourcis de skill

L'utilisateur emploie ces raccourcis dans ses prompts. Les reconnaître sans demander ce qu'ils
désignent.

```text
skDD   dialogue
skCB   cyBuildModule
skLI   lisibilite
skPL   manage-plan
skTDD  tdd-list
skWT   worktree
skWS   worktrees-sessions-table
skCW   skill.codeWalkthrough
skTW   skill.textWalkthrough
skXP   xprog
```

Lorsqu'une option proposée s'appuie sur un skill, le nommer suivi de son raccourci entre crochets,
pour que l'utilisateur sache quel skill s'appliquera avant de choisir :

```markdown
[1] Ajouter un todo au work package courant avec manage-plan [skPL].
```

## Commandes directes

Un raccourci `$xx` est un ordre, pas une question. Le LLM l'exécute immédiatement sur l'objet du
dernier échange, sans demander de confirmation et sans proposer d'alternative. Lorsque l'objet est
ambigu, le LLM nomme celui qu'il retient et exécute quand même.

| Raccourci | Effet |
|---|---|
| `$ob` | Ouvrir le fichier ou la page dans le browser. |
| `$oi` | Ouvrir dans IDEA, ou dans l'application par défaut du type de fichier. |
| `$oc` | Ouvrir dans Cursor. |
| `$co` | Commit les fichiers que le LLM vient de fournir, et eux seuls. |
| `$md-all` | Écrire un document Markdown qui rassemble toutes les décisions et analyses de la session courante. |
| `$md-last` | Écrire un document Markdown sur le dernier sujet traité dans le chat. |
| `$ag` | Lancer des agents pour paralléliser les tâches en cours. |
| `$todo` | Proposer une liste de tâches dans le chat. |

`$co` reste une opération et non une décision : le commit porte sur la branche courante et sur des
chemins nommés. Pousser, merger et supprimer une branche restent des décisions.

Les documents produits par `$md-all` et `$md-last` sont des analyses : ils vont dans `docs/temp/`
tant qu'aucune décision ne les classe ailleurs.

## Portée des gates : décisions, jamais opérations

Les gates de ce skill portent exclusivement sur les **décisions**. Ils ne portent sur **aucune
opération**.

- **Décision — gated.** Ce qui engage un contrat, un document normatif, du code exécutable, des
  tests, ou franchit une phase de
  [`skill.cyBuildModule.md`](./build/skill.cyBuildModule.md). Attendre
  la réponse utilisateur.
- **Opération — jamais gated.** Lire, `grep`, explorer un worktree, exécuter la suite de tests ou
  un fichier de test, `node --check`, ouvrir un fichier dans l'IDE, démarrer et arrêter son propre
  serveur de démo, écrire ou supprimer un document d'analyse dans `docs/temp/`, **éditer un fichier
  de son propre périmètre**, et côté Git : `status`, `diff`, `log`, `add` de **chemins nommés**,
  `commit` sur sa propre branche. Exécuter directement, sans demander, et rendre compte du résultat.

Trois actes Git restent des décisions, quel que soit le mode de permissions : **pousser**, **merger
dans la branche d'intégration**, **supprimer une branche ou un worktree**. Et `git add -A`,
`--force`, `-D`, `git reset` ne s'utilisent jamais.

Une opération n'a jamais besoin d'autorisation, même lorsqu'une décision est en attente. Demander
l'accord pour une lecture ou pour un artefact temporaire est une faute : cela ralentit sans rien
protéger, et brouille le seul gate qui compte.

Symétriquement, la configuration de permissions n'est pas un gate de ce skill. Un mode permissif
n'autorise jamais à franchir une décision sans réponse ; un gate de décision ne bloque jamais une
opération.

Critère unique en cas de doute : *cet acte engage-t-il un contrat, du code ou une phase Cybuild ?*
Si non, l'exécuter.

## Boucle

La boucle se lit en quatre sections. Le **dialogue** conduit les décisions, la **production** fabrique
les livrables, la **présentation** les soumet à l'utilisateur, la **clôture** rend la main. La règle
de clôture énoncée ci-dessous s'applique à toute réponse, quelle que soit la section atteinte.

### Règle de clôture

Toute réponse se termine par une continuation, puis par la signature du travail actif.

La continuation est la prochaine question de conception lorsqu'une décision reste ouverte, ou l'opt-in
lorsque l'étape suivante est une opération. Une réponse qui confirme seulement un résultat ou une
décision acquise est invalide : la confirmation introduit la continuation, elle ne la remplace jamais.
La règle « un message ne traite qu'une seule chose » n'interdit pas cette transition, puisque la
confirmation et la continuation portent sur la même étape de travail.

L'opt-in prend cette forme :

> Étape suivante proposée : [nom et résultat attendu]. Répondre `y` pour la commencer, ou donner les
> numéros des fichiers à ouvrir, en liste ou en intervalle, par exemple `2-5`.

`y` autorise l'étape suivante. Des numéros ne l'autorisent pas : ouvrir les fichiers demandés, puis
reproposer le même opt-in.

La signature occupe seule la dernière ligne, après l'opt-in, au format `(<WP> - <WP.TodoPath>)`. Elle
emploie le nom sémantique complet du work package et le chemin pointé exact du todo, par exemple
`(WP12-web-gateway - WP12-web-gateway.gateway)`.

### Format d'une réponse

Une réponse tient en **25 lignes au plus**, alternatives, opt-in et signature compris. Elle est
toujours minimisée : tout ce qui ne sert pas la décision en cours se retire avant de présenter.

Chaque alternative numérotée tient en **5 lignes au plus**, moins lorsque c'est possible.

Lorsque le sujet ne tient pas dans ce format, le découper et n'en traiter qu'une part par message.

### Dialogue

1. Lire le plan actif ainsi que les contrats et le code concernés.
2. Après chaque message utilisateur, le classer comme question, décision, correction, sélection de
   fichiers ou opt-in.
3. Lorsqu'une décision est acquise, identifier la première action aval de cette boucle qui n'a pas
   encore été exécutée et reprendre immédiatement à cet endroit. Si la conception exige encore une
   décision, confirmer brièvement la décision acquise puis présenter immédiatement le choix suivant.
4. Poser dans le chat toutes les questions nécessaires, une par une.
5. Avant de proposer une décision, une alternative ou une étape suivante, expliquer d'abord ce
   qu'est l'objet discuté, à quoi il sert dans le projet et pourquoi il apparaît à ce point du
   dialogue. Donner un exemple concret minimal lorsqu'un nom seul ne suffit pas. Ne jamais utiliser
   dans un opt-in un terme technique ou un concept qui n'a pas encore été introduit dans le chat.
6. Lorsqu'une question demande de choisir une direction, présenter avant la question :
   - le contexte manquant ;
   - les alternatives et leurs conséquences ;
   - l'alternative recommandée, marquée **recommandée** ;
   - lorsqu'elle peut être déduite des échanges, l'alternative précédemment suggérée par
     l'utilisateur, marquée **déjà suggérée**.

   Présenter tout cela **en prose, dans la réponse elle-même**. Ne jamais utiliser de sélecteur
   d'options, de boîte de dialogue ou de widget à choix multiples : un argument de conception ne
   tient pas dans des étiquettes courtes, et le format en cartes force un choix pré-cadré au lieu de
   laisser l'utilisateur répondre dans ses propres termes.

   **Numéroter les alternatives entre crochets**, pour que la réponse puisse être un chiffre :

   ```markdown
   **[1] Geler la liste réservée.** Aucun code touché ; en échange le runtime ne peut plus ajouter
   de membre public sans casser.

   **[2] (recommandée) Rendre les internes privés.** Namespace réduit à `dev` ; le runtime évolue
   librement. Prix : touche un fichier possédé par WP2, donc décision d'intégration.

   **[1] ou [2] ?**
   ```

   Une seule décision par question, quelle qu'en soit la forme.
7. Ne jamais considérer une recommandation comme validée sans réponse de l'utilisateur. Cette
   réponse peut être une validation directe, une correction ou une question rhétorique non ambiguë.

### Production

8. Produire seulement après résolution des questions. Cette règle vise les **livrables** classés à
   l'action 10 — `docs/`, `todos/`, `lib/`, `demos/`, `tests/`. Elle ne vise ni l'exploration, ni un
   document d'analyse déposé dans `docs/temp/` : lorsqu'un tel document est ce qui permet de trancher
   la question en attente, le produire immédiatement plutôt que le proposer. Si une nouvelle question
   de conception apparaît pendant la production d'un livrable, interrompre immédiatement celle-ci,
   poser la question, puis attendre sa résolution.
9. Dès qu'une étape crée ou modifie du code exécutable ou des tests, lire et appliquer
   [`skill.cyBuildModule.md`](./build/skill.cyBuildModule.md) en **mode gated**.
   Intégrer son CONTRACT PRE-READ, son PURPOSE et son TEST PLAN au dialogue, puis s'arrêter après
   chaque phase et attendre l'autorisation explicite de l'utilisateur avant la suivante. En
   particulier :
   - ne pas concevoir les tests ni développer avant validation du CONTRACT PRE-READ ;
   - ne pas écrire l'implémentation avant confirmation du RED ;
   - ne pas enchaîner RED et GREEN dans le même tour ;
   - ne pas créer une démo ou modifier le manuel avant leur gate ;
   - ne jamais commit avant le gate COMMIT et une suite entièrement verte.
   Ses phases et ses arrêts gated restent obligatoires pendant toute la production.
10. À la fin de la production, classer les livrables :
    - contrat validé → `docs/` ;
    - plan ou décision encore ouverte → `todos/` ;
    - code exécutable → `lib/`, `demos/` ou `tests/`.

    La dépendance documentaire est strictement orientée : les plans et todos citent les contrats
    qu'ils appliquent ; un contrat ne contient jamais de lien ou de renvoi vers `todos/`, une liste
    TDD, un stage, un work package, un handoff ou un plan d'implémentation. Toute information durable
    nécessaire au contrat doit être formulée directement dans `docs/`.
11. Vérifier les livrables proportionnellement à leur nature et à leur risque.

### Présentation

12. Présenter dans le chat un compte rendu concis du résultat et de sa vérification.
13. Lorsqu'un document est soumis à la lecture, à la revue ou à la validation de l'utilisateur,
    l'ouvrir immédiatement dans PhpStorm avant de lui rendre la main. Un lien cliquable dans le chat
    peut accompagner cette ouverture, mais ne la remplace jamais. Si l'ouverture est techniquement
    impossible, l'indiquer explicitement et fournir le lien comme solution de repli.
14. Lorsqu'une démo fonctionnelle prête est soumise à validation, démarrer son serveur, attendre
    qu'il réponde, puis ouvrir directement la page de cette démo dans le navigateur avant de rendre
    la main. Ouvrir les fichiers source, la page d'index ou fournir seulement une URL ne compte pas
    comme ouvrir la démo. Garder le serveur actif pendant la validation ; après la réponse
    utilisateur, l'arrêter et supprimer tout artefact d'environnement temporaire avant de poursuivre.
15. Fournir une liste numérotée dynamique contenant uniquement les autres fichiers créés ou modifiés
    pendant l'étape, afin que l'utilisateur puisse choisir ceux à ouvrir dans PhpStorm.

### Clôture

16. Avant toute réponse finale, contrôler que la règle de clôture est respectée et que le format de
    réponse l'est aussi. Contrôler aussi que chaque action aval applicable a été exécutée :
    production, classement, vérification, compte rendu et listing.
17. S'arrêter après l'opt-in et attendre la réponse de l'utilisateur.
