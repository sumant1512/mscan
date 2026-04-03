# Use official Node.js image as build environment
FROM node:22 AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Inject API URL at build time (defaults to relative /api if not provided)
ARG API_URL=/api
RUN sed -i "s|apiUrl: '/api'|apiUrl: '${API_URL}'|g" src/environments/environment.prod.ts

RUN npm run build

# Use Nginx to serve the built Angular app
FROM nginx:alpine
COPY --from=build /app/dist/mscan-client/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
