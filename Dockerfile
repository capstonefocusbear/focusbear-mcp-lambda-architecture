# Builder
FROM node:20

# Prepare data
WORKDIR /app/backend
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --legacy-peer-deps
COPY . .

# Build
RUN npm run build
# RUN rm -rf node_modules

# Install production dependencies
# RUN npm install --production
# RUN rm -rf src


EXPOSE 4000
CMD ["npm", "run", "start"]
