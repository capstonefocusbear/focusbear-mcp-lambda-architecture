FROM node:14
WORKDIR /app/backend

COPY ["package.json", "package-lock.json*", "./"]
RUN npm install
COPY . .

EXPOSE 4000

RUN npm i -g @nestjs/cli
CMD npm run start