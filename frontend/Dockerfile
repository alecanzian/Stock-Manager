FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 3000
CMD ["sh", "-c", "echo \"window.APP_CONFIG = { API_URL: '$API_URL' };\" > /usr/share/nginx/html/config.js && exec nginx -g 'daemon off;'"]