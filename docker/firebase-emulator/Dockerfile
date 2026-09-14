FROM node:20-bookworm

# Firestore emulator requires a JRE.
RUN apt-get update \
  && apt-get install -y --no-install-recommends default-jre-headless \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g firebase-tools@13.29.1

WORKDIR /app
