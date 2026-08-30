---
name: lisibilite
description: Règles de rédaction pour tout texte produit dans ce dépôt — documents normatifs, notes de conception, énoncés soumis à validation, réponses en session. Vérifier ce skill avant de présenter un texte.
---

# Lisibilité

Ce skill gouverne **la forme de tout texte produit**, en français comme en anglais : contrats dans
`docs/`, notes de travail dans `docs/temp/`, briefings, énoncés soumis à validation, et réponses en
session.

Il ne gouverne pas le fond. Un texte exact mais illisible est à refaire ; un texte lisible mais faux
est à refaire aussi.

---

## 1. Chaque phrase a un sujet, un verbe et un objet

Pas de phrase nominale, pas de fragment, pas de verbe laissé sans complément. Une énumération de
syntagmes ne remplace pas une phrase.

> ❌ « Trois gateways, un seul mécanisme. »
> ✅ « Les trois gateways partagent le même mécanisme. »

> ❌ « Synchrone, passif, local. »
> ✅ « L'appel est synchrone, il ne déclenche rien, et il lit une valeur locale. »

## 2. Aucune déclaration universelle sans son contexte

Une phrase de la forme « X ne fait pas Y » n'est lisible que si le lecteur sait déjà **de quelle
situation on parle**. Poser la situation d'abord, l'affirmation ensuite.

> ❌ « Le gateway ne découpe rien et ne recolle rien. »
> ✅ « Lorsqu'une App doit transmettre plus de données qu'un seul message ne peut en porter, c'est
> elle qui les découpe. Le gateway transporte chaque morceau comme il transporterait n'importe quel
> payload. »

## 3. Un titre est une phrase complète et se comprend seul

Le titre d'un énoncé est lu hors contexte, dans une table des matières ou une liste de décisions. Il
doit être vrai et compréhensible sans son corps de texte, et ne doit pas reposer sur une tournure
pronominale ambiguë.

> ❌ « Un gros transfert se découpe dans l'App, pas dans le gateway. »
> ✅ « Une App qui transmet beaucoup de données les découpe elle-même en plusieurs émissions. »

## 4. Un terme s'introduit avant de s'employer

Ne jamais désigner par un article défini une chose dont le texte n'a pas encore parlé. Décrire
d'abord la fonction, nommer ensuite.

> ❌ « Le gateway n'apparaît que lorsque les deux Apps vivent sur des hôtes différents. »
> ✅ « Lorsque les deux Apps vivent sur des hôtes différents, il faut quelque chose qui porte les
> payloads de l'un à l'autre. Ce transport s'appelle un gateway. »

## 5. Aucune annonce, aucun cliffhanger, aucun renvoi

Supprimer toute formule qui présente une phrase au lieu de la dire, et tout renvoi vers un passage
que le lecteur n'a pas encore lu.

Interdits : « ce qui rend cela possible tient en une ligne », « ce qui est perdu est réel et
inhérent », « et c'est là que ça devient intéressant », « ce qu'on obtient à la place est décrit
plus loin ».

> ❌ « Ce qui rend cela possible tient en une ligne : Enigma n'inspecte jamais la valeur de retour. »
> ✅ « Enigma n'inspecte jamais la valeur de retour d'un receveur. »

Un fait important se montre en étant énoncé, pas en étant présenté.

Proscrire de même les superlatifs qui classent un élément parmi ceux qu'on est en train d'énumérer.
Ils n'apportent aucune information et sont souvent tautologiques.

> ❌ « Il reste un trou, et c'est le plus gros de ceux qui restent. »
> ✅ « Il reste un trou. »

## 6. Expliquer, ne pas asséner

Quand une phrase porte une conséquence pratique, écrire la conséquence. Une affirmation juste mais
nue oblige le lecteur à reconstruire le raisonnement, et il le reconstruira mal.

> ❌ « Un indicateur d'attente sert à informer, pas à masquer un blocage. »
> ✅ « L'interface reste entièrement utilisable pendant l'attente : rien n'est désactivé. Un
> indicateur informe donc que la réponse est en route, il ne recouvre pas une interface bloquée. Une
> App qui veut empêcher un second envoi doit le faire explicitement, sinon un double clic envoie deux
> commandes. »

## 7. Écrire pour quelqu'un qui construit, pas pour quelqu'un qui suit la conversation

Ne rien présupposer de la session en cours. Le lecteur est un développeur qui doit fabriquer la
chose, et qui n'a pas assisté à la discussion.

## 8. Voix impersonnelle

Employer « le développeur », « les développeurs », « on », « il faut ». Jamais « tu ». En anglais,
préférer l'impersonnel ou l'impératif à « you ».

Lorsqu'une phrase est construite autour de « tu », refaire la phrase entière plutôt que remplacer le
pronom.

## 9. Le vocabulaire technique reste en anglais

**payload**, **throw**, **flag**, **binding**, **snapshot**, **gateway**, **endpoint** — jamais
« charge utile », « lève », « drapeau », « passerelle ». Conjuguer le verbe anglais en français si
nécessaire : « l'appel throw », « ça throwe ».

La prose autour reste française.

## 10. Un ordre logique, pas un ordre d'apparition dans la discussion

Chaque paragraphe doit être compréhensible avec ce que les paragraphes précédents ont établi, et
rien d'autre. Relire dans l'ordre en se demandant, à chaque phrase, si tout ce qu'elle nomme a déjà
été défini.

## 11. Les contrats ne dépendent jamais des plans

Un contrat dans `docs/` doit se suffire à lui-même et rester vrai lorsque les plans sont terminés,
archivés ou supprimés. Il ne contient donc aucun lien ni renvoi vers `todos/`, une liste TDD, un
stage, un work package, un handoff ou un plan d'implémentation.

La dépendance va dans un seul sens : un plan ou un todo cite les contrats qui l'autorisent. Un
contrat ne cite jamais le plan qui prévoit, implémente ou vérifie ce contrat. Lorsqu'une information
issue d'un plan est nécessaire pour comprendre le comportement, réécrire cette information comme
une exigence autonome dans le contrat au lieu de créer une indirection vers le plan.

---

## Contrôle avant de présenter un texte

Passer les onze points dans l'ordre, sur le texte fini :

1. Chaque phrase a-t-elle sujet, verbe, objet ?
2. Chaque affirmation générale est-elle précédée de sa situation ?
3. Le titre est-il une phrase complète, vraie hors contexte ?
4. Chaque terme est-il introduit avant d'être employé avec un article défini ?
5. Reste-t-il une annonce, un cliffhanger ou un renvoi vers l'aval ?
6. Chaque affirmation qui a une conséquence pratique l'énonce-t-elle ?
7. Le texte se tient-il pour qui n'a pas suivi la conversation ?
8. Reste-t-il un « tu » ?
9. Reste-t-il un calque français d'un terme technique anglais ?
10. Chaque paragraphe ne s'appuie-t-il que sur ce qui précède ?
11. Un contrat contient-il un lien ou un renvoi vers un plan, un todo ou une liste TDD ?

Un texte qui échoue sur un point se réécrit avant d'être présenté, pas après.
