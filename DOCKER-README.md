# Docker Setup for Property Scraper

This application can be easily deployed using Docker and Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Build and run the application:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Open your browser and navigate to `http://localhost:8080`
   - The API endpoints are available at `http://localhost:8080/api/*`

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

## Docker Configuration

### Dockerfile
- **Multi-stage build**: First builds the React frontend, then sets up the Python backend
- **Port**: Uses port 8080 (configurable via PORT environment variable)
- **Base images**: 
  - Node.js 18 Alpine for frontend build
  - Python 3.10 slim for runtime

### Docker Compose
- **Port mapping**: Maps host port 8080 to container port 8080
- **Persistent storage**: Creates a named volume `hometest-data` for application data
- **Database**: Mounts the local database file for persistence
- **Health check**: Monitors application health via `/health` endpoint
- **Auto-restart**: Configured to restart unless manually stopped

## Environment Variables

- `PORT`: Application port (default: 8080)
- `FLASK_ENV`: Flask environment (production/development)
- `PYTHONUNBUFFERED`: Ensures Python output is not buffered

## Volumes

- `hometest-data`: Persistent volume for application data
- `./properties.db`: Local database file mounted to container
- `./property_data_*.json`: Any JSON data files (read-only)

## Health Check

The container includes a health check that pings the `/health` endpoint every 30 seconds.

## Production Deployment

For production deployment:

1. **Use specific image tags** instead of building locally
2. **Configure proper secrets** for any API keys or sensitive data
3. **Set up proper logging** and monitoring
4. **Use external database** for better scalability
5. **Configure reverse proxy** (nginx, Traefik) for SSL termination

## Troubleshooting

- **Build issues**: Check that all files are present and `.dockerignore` is properly configured
- **Port conflicts**: Change the host port in `docker-compose.yml` if 8080 is already in use
- **Data persistence**: Ensure the volume mounts are correct for your database location
- **Frontend build failures**: Check that Node.js dependencies in `package.json` are correct

## Development

For development with hot-reload:
```bash
# Run only the Python backend
docker-compose up --build

# In another terminal, run the React frontend separately
cd frontend
npm start
```
