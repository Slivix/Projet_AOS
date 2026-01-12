# Projet_AOS

Team :

Adel SAADI
Baptiste GRASSART
Keltoum MEZIANI
Naila AYADI
Roni BASAK



Projet Puissance X

## **📝 Installation et Exécution**

### **Pré-requis** :
- Python3 installé sur votre machine pour lancer les tests.
- Docker et Docker Compose installés sur votre machine pour lancer le projet.

### **Étapes d'Installation** :

1. **Cloner le dépôt** :

Si vous n’avez pas encore cloné le dépôt, exécutez la commande suivante :
```bash
git clone https://github.com/Slivix/Projet_AOS
cd Projet_AOS
```

2. **Lancer les tests unitaires** :
Installer les dependances du projet :
```bash
pip install -r requirements.txt
```
Lancer les tests :
```bash
pytest
```


3. **Construire l'Image Docker** :
Cela construira les images Docker nécessaires pour exécuter le projet.
```bash
docker-compose build
```

4. **Démarrer le Conteneur Docker** :
Cette commande lancera les conteneurs Docker et démarrera les services associés.
```bash
docker-compose up
```

Cela va démarrer les services suivants :
- **game-service** : le service qui permet de gérer la logique du jeu (FastAPI)
- **user-service** : le service qui permet de gérer la gestion des utilisateurs du jeu (FastAPI)
- **Base de données** : MongoDB
- **Frontend** : Serveur HTTP Nginx pour héberger le frontend du jeu

1. **Accéder au jeu** :
- **Menu** :
   [http://localhost:8000/menu.html](http://localhost:8000/menu.html)
1. **Accéder à la Documentation de l'API** :
- **Swagger UI** de l'API game-service :  
   [http://localhost:8000/docs](http://localhost:8000/docs)

- **Swagger UI** de l'API user-service :  
   [http://localhost:8002/docs](http://localhost:8003/docs)

Ces adresses vous permettront de consulter et tester l'API via une interface graphique.

## **👨🏼‍💻 Technologies Utilisées**
- **Backend** : Python, NodesJS
- **Frontend** : HTML, CSS, JavaScript
- **Base de Données** : MongoDB

## **⚖️ Licence**
Le jeu Puissance 4 est sous licence Open Source MIT et est disponible gratuitement.
