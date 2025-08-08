#!/bin/bash

echo "Starting Property Search Application (Integrated Mode)..."

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down Flask server..."
    if [ ! -z "$FLASK_PID" ]; then
        kill $FLASK_PID 2>/dev/null
        echo "Flask server stopped."
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Please run setup.sh first."
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Build the React frontend
echo "Building React frontend..."
./build-frontend.sh
if [ $? -ne 0 ]; then
    echo "Frontend build failed. Exiting."
    exit 1
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Start Flask server (which now serves both API and React app)
echo "Starting Flask server..."
echo "The application will be available at: http://localhost:5000"
echo ""

# Start Flask server in background
python app.py &
FLASK_PID=$!

echo "Flask server started (PID: $FLASK_PID)"
echo "Visit http://localhost:5000 to access the application"
echo "Press Ctrl+C to stop the server..."

# Wait for user interrupt
while true; do
    # Check if Flask process is still running
    if ! kill -0 $FLASK_PID 2>/dev/null; then
        echo "Flask server died unexpectedly!"
        break
    fi
    sleep 5
done
