//fichier qui gère les routes d'authentification.

const express = require('express');
const User = require('./user'); // Import du modèle utilisateur

const router = express.Router();

// Inscription
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = await User.create({
      username,
      password, // mot de passe en clair
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && user.password === password) {
      res.json({
        _id: user._id,
        username: user.username,
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Route pour afficher tous les utilisateurs
router.get('/users', async (req, res) => {
  try {
    const users = await User.find(); // Récupère tous les utilisateurs
    res.status(200).json(users); // Envoie les utilisateurs en JSON
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
  }
});

module.exports = router;
