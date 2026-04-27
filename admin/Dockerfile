# ── Stage 1: Build ──
FROM node:20-alpine AS builder

# Instalar pnpm (el proyecto usa pnpm-lock.yaml)
RUN npm install -g pnpm

WORKDIR /app

# Copiar manifiestos de dependencias primero para aprovechar caché de Docker
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar el resto del código fuente
COPY . .

# Inyectar variables de entorno que Vite necesita en build-time
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# Compilar la aplicación para producción
RUN pnpm run build

# ── Stage 2: Serve ──
FROM nginx:alpine

# Copiar los archivos estáticos generados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx con proxy hacia el backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
