FROM node:22-alpine AS build-stage

LABEL maintainer="Pranjal.Rai"

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=production

RUN npm run build

FROM nginx:stable-alpine

WORKDIR /app

RUN chown nginx:nginx /app && apk add --no-cache gettext

ARG BACKEND
ARG CHAT_API
# Defaulted so an existing deploy that passes neither still renders a valid
# nginx config - an empty proxy_pass would stop the server from starting.
ARG LIBRARY=https://library.webuddhist.com
ARG LIBRARY_APP_NAME=webuddhist
# Worker API (segment AI chat). Pass the real worker URL; the default only
# keeps nginx starting (chat requests then fail with 502).
ARG WORKER=http://127.0.0.1:8001

ENV VITE_BACKEND_BASE_URL=$BACKEND
ENV VITE_CHAT_API_URL=$CHAT_API
ENV VITE_LIBRARY_BASE_URL=$LIBRARY
ENV VITE_LIBRARY_APP_NAME=$LIBRARY_APP_NAME
ENV VITE_WORKER_URL=$WORKER
ENV PORT=4173

# Copy the React build files into Nginx's public directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

COPY nginx/nginx.conf /etc/nginx/
COPY nginx/pecha.conf.template /etc/nginx/conf.d/
COPY nginx/security-headers.conf /etc/nginx/

EXPOSE 4173

CMD ["sh", "-c", "envsubst '${VITE_BACKEND_BASE_URL} ${VITE_CHAT_API_URL} ${VITE_LIBRARY_BASE_URL} ${VITE_LIBRARY_APP_NAME} ${VITE_WORKER_URL}' < /etc/nginx/conf.d/pecha.conf.template > /etc/nginx/conf.d/default.conf && cat /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

# docker build -f Dockerfile -t pecha-ui-app .
# docker run -e VITE_BACKEND_BASE_URL=<backend-url> -e VITE_CHAT_API_URL=<chat-api-url> -e VITE_LIBRARY_BASE_URL=<library-url> -e VITE_WORKER_URL=<worker-url> -p 4173:4173 --rm pecha-ui-app