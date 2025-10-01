const request = require('supertest');
const app = require('./app'); // Assure-toi d'exporter ton app dans app.js

describe('Auth API', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test',
        password: 'mdp',
      });
    console.log(response.body); // Affiche le contenu de la réponse pour voir le message d'erreur retourné par l'API
    console.log(response.body.username);
    console.log(response.status);
    expect(response.status).toBe(201);
    expect(response.body.username).toBe('era');
  });

  it('should login an existing user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test',
        password: 'mdp',
      });

    expect(response.status).toBe(200);
    expect(response.body.username).toBe('test');
  });

  it('should return all users', async () => {
    const response = await request(app).get('/api/auth/users');
    expect(response.status).toBe(200); // Vérifie que le statut est 200
    expect(Array.isArray(response.body)).toBe(true); // Vérifie que la réponse est un tableau
    // Tu peux ajouter d'autres vérifications comme la longueur du tableau ou les propriétés des utilisateurs
    console.log(response.body);
  });
});
