//fichier principal qui gère le serveur et importe les autres fichiers.

const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./authRoutes'); // Import des routes


const app = express();
module.exports = app; // Ajoute cette ligne

// Middleware pour parser le JSON
app.use(express.json());

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/p4game', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Utilisation des routes d'authentification
app.use('/api/auth', authRoutes);

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Route pour afficher tous les utilisateurs
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find(); // Récupérer tous les utilisateurs de la base de données
    res.status(200).json(users); // Retourner les utilisateurs sous forme de JSON
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
  }
});
