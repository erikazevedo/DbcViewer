FROM node:26-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN mkdir -p /app/.angular && chmod -R 777 /app/.angular

EXPOSE 4200

CMD ["npm", "start"]
