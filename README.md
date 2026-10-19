# Courts libres Paris

Tous les créneaux libres des 42 tennis de la Ville de Paris (carte Paris Tennis, dont Aurelle de Paladines à Neuilly et Bobigny), club par club, avec l'adresse, les courts, les fermetures annoncées et le prix pour 1 h ou 2 h, sur les 7 jours ouverts à la réservation. La page se met à jour toute seule toutes les 15 minutes de 7 h à 23 h, y compris juste après 8 h quand la Ville ouvre un nouveau jour.

L'app affiche la dispo ; la réservation se fait sur [Paris Tennis](https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&view=recherche_creneau) avec un compte Mon Paris.

## Contenu

```
scraper/scrape.py              collecte (Python 3.9+, bibliothèque standard, rien à installer)
site/index.html                la page (HTML/CSS/JS, sans framework)
site/data.json                 généré à chaque collecte, non versionné
tests/test_scrape.py           tests du collecteur sur des extraits réels du site
tests/fixtures/                extraits de pages tennis.paris.fr
.github/workflows/refresh.yml  collecte + publication sur GitHub Pages
.github/workflows/keepalive.yml  commit hebdo pour que GitHub ne mette pas les tâches en pause
```

## Mise en ligne (une fois)

1. Crée un dépôt **public** sur GitHub (public : les minutes GitHub Actions y sont gratuites et illimitées) et pousse ce dossier sur la branche `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Onglet **Actions → Rafraîchir les créneaux → Run workflow**. Au bout de 2 à 3 minutes, la page est en ligne sur `https://<ton-compte>.github.io/<nom-du-dépôt>/`.
4. Sur iPhone : ouvre l'adresse dans Safari, Partager → Sur l'écran d'accueil.

## Comment ça marche

La recherche de créneaux de tennis.paris.fr est publique (pas besoin de compte pour voir la dispo). Le script :

1. ouvre la page de recherche et lit la carte des clubs qu'elle embarque : nom, adresse, arrondissement, liste des courts (surface, couvert, éclairé) et annonces de fermeture, ainsi que le jeton et les surfaces du formulaire ;
2. garde tous les clubs de tennis de la carte (le padel est exclu) ;
3. interroge la recherche jour par jour, 8 clubs par requête, de 8 h à 22 h, toutes surfaces, couvert et découvert (environ 48 requêtes espacées, 1 à 2 minutes au total) ;
4. écrit chaque court libre avec son heure, son numéro, sa surface, couvert/éclairé et le prix affiché.

La page propose trois durées : 1 h, 2 h sur le même court, ou 2 h en acceptant de changer de court à l'heure. Elle affiche le prix total, propose le barème réduit (moins de 26 ans domicilié à Paris : 7 € découvert, 12 € couvert) et liste en bas les clubs sans créneau libre et ceux sans réservation en ligne.

Si une collecte échoue, rien n'est republié : la page garde les données précédentes et affiche « Données anciennes » après 3 h. Le site de la Ville peut changer sa structure ; dans ce cas les tests et le résumé de l'onglet Actions le montrent, et c'est `parse_results()` dans `scraper/scrape.py` qu'il faut ajuster.

## En local

```bash
python scraper/scrape.py --out site/data.json
cd site && python -m http.server 8000      # puis http://localhost:8000
python -m unittest discover tests
```

## Crédits

La structure des pages de tennis.paris.fr est documentée par les projets open source [OneCourt](https://github.com/vroux18/onecourt) et [par-ici-tennis](https://github.com/bertrandda/par-ici-tennis).
