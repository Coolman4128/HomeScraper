#!/bin/bash

echo "Setting up Property Search Application..."

# Install Node.js dependencies for frontend
echo "Installing frontend dependencies..."
cd frontend
npm install

echo "Setup complete!"
echo ""
echo "To run the application:"
echo "1. Start the Flask backend:"
echo "   cd /home/twatson/hometest"
echo "   /home/twatson/hometest/venv/bin/python app.py"
echo ""
echo "2. In a new terminal, start the React frontend:"
echo "   cd /home/twatson/hometest/frontend"
echo "   npm start"
echo ""
echo "The backend will run on http://localhost:5000"
echo "The frontend will run on http://localhost:3000"
