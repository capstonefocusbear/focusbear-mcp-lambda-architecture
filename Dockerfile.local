FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install glob rimraf

RUN npm install

COPY . .
