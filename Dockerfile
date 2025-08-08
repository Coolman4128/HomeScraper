# Multi-stage build: First stage for building React frontend
FROM node:18-alpine AS frontend-build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY frontend/package*.json ./frontend/

# Install npm dependencies
RUN cd frontend && npm install

# Copy frontend source code and .env file
COPY frontend/ ./frontend/

# Build the React application (will output to ../static due to .env configuration)
RUN cd frontend && npm run build

# Second stage: Python runtime for the Flask backend
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy built React app from the frontend-build stage (built to /app/static)
COPY --from=frontend-build /app/static ./static

# Create directory for database and other persistent data
RUN mkdir -p /app/data

# Expose port 8080
EXPOSE 8080

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Run the application
CMD ["python", "app.py"]
