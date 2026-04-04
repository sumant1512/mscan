# Use official Node.js image
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production \
    && npm cache clean --force

COPY . .

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app /app

EXPOSE 3000

CMD ["npm", "run", "start"]
