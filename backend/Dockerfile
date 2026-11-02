FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG FRONTEND_PORT
EXPOSE ${FRONTEND_PORT}
CMD ["npm", "run", "dev"]