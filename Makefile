# Sentinel PPE — top-level orchestration
# Requires: node 18, python 3.10, flutter 3, mongodb, make

.PHONY: help install dev backend ai client mobile clean docker-build docker-up

help:
	@echo "Targets:"
	@echo "  install       — install all dependencies (server + client + ai-engine + mobile)"
	@echo "  dev           — start backend + AI engine + dashboard in parallel"
	@echo "  backend       — start Node.js backend only"
	@echo "  ai            — start Python AI engine only"
	@echo "  client        — start React dashboard dev server only"
	@echo "  mobile        — run Flutter app on the connected device"
	@echo "  docker-build  — build the docker-compose stack"
	@echo "  docker-up     — start the docker-compose stack"
	@echo "  clean         — remove node_modules, venvs and build outputs"

install:
	cd server    && npm ci
	cd client    && npm ci
	cd ai-engine && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
	cd mobile    && flutter pub get

dev:
	./run_local.sh

backend:
	cd server && node server.js

ai:
	cd ai-engine && ./venv/bin/python main.py

client:
	cd client && npm run dev

mobile:
	cd mobile && flutter run

docker-build:
	docker compose build

docker-up:
	docker compose up -d

clean:
	rm -rf server/node_modules client/node_modules ai-engine/venv \
	       client/dist mobile/build mobile/.dart_tool
