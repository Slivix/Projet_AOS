document.addEventListener('DOMContentLoaded', function() {
    const createAccountForm = document.getElementById('create-account-form');
    const loginForm = document.getElementById('login-form');

    createAccountForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        fetch('http://localhost:8002/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: username,
                email: email,
                password: password
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.detail || "Erreur lors de la création du compte");
                });
            }
            return response.json();
        })
        .then(data => {
            alert('Compte créé avec succès !');
            console.log('User created:', data);
            // Stocker le nom de l'utilisateur dans le stockage local
            localStorage.setItem('username', username);
         
            window.location.href = 'game.html';
        })
        .catch(error => {
            console.error('Erreur:', error.message);
            alert('Erreur: ' + error.message);
        });
    });


    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        fetch('http://localhost:8002/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: username,
                password: password
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.detail || "Erreur lors de la connexion");
                });
            }
            return response.json();
        })
        .then(data => {
            alert('Connexion réussie !');
            console.log('Login successful:', data);
            // Stocker le nom de l'utilisateur dans le stockage local
            localStorage.setItem('username', username);
           
            window.location.href = 'menu.html';
        })
        .catch(error => {
            console.error('Erreur:', error.message);
            alert('Erreur: ' + error.message);
        });
    });
});