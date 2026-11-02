FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/
ARG FRONTEND_PORT
EXPOSE ${FRONTEND_PORT}
CMD ["sh", "-c", "echo \"window.APP_CONFIG = { API_URL: '$API_URL' };\" > /usr/share/nginx/html/config.js && exec nginx -g 'daemon off;'"]