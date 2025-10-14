# frontend/Dockerfile
FROM nginx:alpine

WORKDIR /usr/share/nginx/html
COPY user.html user_script.js styles.css game.html game_script.js ./

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/