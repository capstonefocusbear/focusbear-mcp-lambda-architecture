FROM node:14
WORKDIR /app/backend

COPY ["package.json", "package-lock.json*", "./"]
RUN npm install
COPY . .

EXPOSE 4000

CMD npm run start