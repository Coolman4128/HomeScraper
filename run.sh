#!/bin/bash

echo "Starting Property Search Application..."

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "Backend stopped."
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "Frontend stopped."
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Check if virtual environment exists
if [ ! -f "venv/bin/python" ]; then
    echo "Error: Python virtual environment not found!"
    echo "Please ensure the virtual environment is set up at ./venv/"
    exit 1
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install frontend dependencies!"
        exit 1
    fi
    cd ..
fi

echo "Starting Flask backend server..."
# Start the Flask backend in the background
./venv/bin/python app.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Error: Backend failed to start!"
    exit 1
fi

echo "Backend started successfully (PID: $BACKEND_PID)"
echo "Starting React frontend..."

# Start the React frontend in the background
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 5

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "Error: Frontend failed to start!"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "Frontend started successfully (PID: $FRONTEND_PID)"
echo ""
echo "🚀 Application is running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both services..."

# Wait for user interrupt
while true; do
    # Check if both processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Backend process died unexpectedly!"
        break
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "Frontend process died unexpectedly!"
        break
    fi
    sleep 5
done
