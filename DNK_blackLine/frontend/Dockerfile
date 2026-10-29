# ---------- build ----------
FROM ubuntu:24.04 AS build
# Install Node 20 and minimal deps
RUN apt-get update && apt-get install -y curl ca-certificates gnupg \
  && install -d -m 0755 /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
  && apt-get update && apt-get install -y nodejs git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY ./src ./src
COPY ./index.html ./index.html
COPY ./tsconfig.json ./tsconfig.json

RUN npm run build

# ---------- runtime ----------
FROM nginx:alpine
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /var/www
EXPOSE 80
CMD ["nginx","-g","daemon off;"]