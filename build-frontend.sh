#!/bin/bash

# Build script for React frontend
echo "Building React frontend..."

# Navigate to frontend directory
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Build the React app (will output to ../static due to .env configuration)
echo "Building React app..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ React app built successfully!"
    echo "📁 Built files are in the 'static' directory"
    echo "🚀 You can now run the Flask server to serve the app"
else
    echo "❌ Build failed!"
    exit 1
fi

cd ..
