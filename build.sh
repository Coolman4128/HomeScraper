#!/bin/bash

echo "Building React frontend for production..."

cd frontend

# Install dependencies if they don't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Remove existing build
if [ -d "../static" ]; then
    echo "Cleaning previous build..."
    rm -rf ../static
fi

# Build the app
echo "Building..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build complete! Frontend is ready to be served by Flask."
    echo "📁 Files are in the 'static' directory"
else
    echo "❌ Build failed!"
    exit 1
fi

cd ..
