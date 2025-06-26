.PHONY: compose-local compose-dev compose-prod build-local build-dev build-prod stop-all clean-images

compose-local:
	@echo "Running LOCAL docker-compose setup..."
	docker compose --env-file .env.local -f compose.local.yml up --build

compose-dev:
	@echo "unning DEV docker-compose setup..."
	docker compose --env-file .env.dev -f compose.dev.yml up --build

compose-prod:
	@echo "Running PRODUCTION docker-compose setup..."
	docker compose --env-file .env.production -f compose.production.yml up -d

build-local:
	@echo "Building LOCAL image..."
	docker build -t crm-backend-local .

build-dev:
	@echo "Building DEV image..."
	docker build -t crm-backend-dev .

build-prod:
	@echo "Building PROD image..."
	docker build -t crm-backend-prod .

stop-all:
	@echo "Stopping all containers..."
	docker stop crm-backend-local crm-backend-dev crm-backend-prod || true

clean-images:
	@echo "Cleaning up unused Docker images..."
	docker image prune -a -f
