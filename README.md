# Property Search Application

A full-stack application for searching and filtering real estate properties using the HomeHarvest library.

## Features

- **Flask Backend**: RESTful API that scrapes property data using HomeHarvest
- **React Frontend**: Modern, responsive UI for setting filters and viewing results
- **Real-time Search**: Dynamic property filtering with the following criteria:
  - Min/Max Price
  - Min/Max Square Feet
  - Max Radius from hardcoded location
  - Min/Max Lot Acres
  - Listing Age (past days)
- **Property Cards**: Clean display of property information including images
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
/home/twatson/hometest/
├── app.py                 # Flask backend server
├── main.py               # Original proof of concept script
├── setup.sh              # Setup script
├── frontend/             # React frontend application
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js        # Main React component
│       ├── index.js      # React entry point
│       └── index.css     # Styles
└── README.md
```

## Setup and Installation

### Prerequisites
- Python 3.10+ with virtual environment activated
- Node.js and npm

### Quick Setup
Run the setup script:
```bash
./setup.sh
```

### Manual Setup
1. Install Python dependencies (already done):
   ```bash
   # Flask dependencies already installed:
   # flask, flask-cors, homeharvest, pandas
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

## Running the Application

### Method 1: Using VS Code Tasks (Recommended)
The application includes VS Code tasks for easy development:

1. **Start Backend**: Use VS Code Command Palette (Ctrl+Shift+P) → "Tasks: Run Task" → "Start Flask Backend"
2. **Start Frontend**: Use VS Code Command Palette → "Tasks: Run Task" → "Start React Frontend"

### Method 2: Manual Commands

1. **Start the Flask Backend**:
   ```bash
   /home/twatson/hometest/venv/bin/python app.py
   ```
   The backend will run on http://localhost:5000

2. **Start the React Frontend** (in a new terminal):
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on http://localhost:3000

## Usage

1. Open your browser to http://localhost:3000
2. Set your desired filters:
   - **Min/Max Price**: Price range in USD
   - **Min/Max Square Feet**: Property size range
   - **Max Radius**: Search radius in miles from "2821 Old Rte 15, New Columbia, PA"
   - **Min/Max Lot Acres**: Lot size range
   - **Listing Age**: How many days back to search
3. Click "Search Properties"
4. Wait for results (may take a moment as it scrapes live data)
5. Browse property cards with images, details, and links

## API Endpoints

### Backend (Flask)
- `GET /health` - Health check endpoint
- `POST /scrape` - Main property search endpoint

### Request Format
```json
{
  "min_price": 100000,
  "max_price": 500000,
  "min_sqft": 1000,
  "max_sqft": 5000,
  "max_radius": 30,
  "min_lot_acre": 0.1,
  "max_lot_acre": 5.0,
  "listing_age": 365
}
```

### Response Format
```json
{
  "properties": [
    {
      "property_id": "123456",
      "address": "123 Main St",
      "city": "New Columbia",
      "state": "PA",
      "zip_code": "17856",
      "sqft": 2000,
      "lot_acre": 0.5,
      "list_price": 300000,
      "beds": 3,
      "baths": 2,
      "year_built": 2010,
      "property_type": "Single Family",
      "photos": ["url1", "url2"],
      "description": "Beautiful home...",
      "url": "https://...",
      "status": "For Sale"
    }
  ],
  "total_found": 25,
  "message": "Found 25 properties matching your criteria"
}
```

## Technology Stack

- **Backend**: Flask, HomeHarvest, Pandas
- **Frontend**: React, Axios
- **Styling**: Custom CSS with responsive design
- **Data**: Real-time property scraping via HomeHarvest

## Development Notes

- The location is hardcoded to "2821 Old Rte 15, New Columbia, PA" as requested
- CORS is enabled for frontend-backend communication
- Error handling includes user-friendly messages
- Loading states provide feedback during long operations
- Property images are displayed when available
- All property data is formatted for easy reading

## Troubleshooting

1. **Backend not starting**: Ensure Python virtual environment is activated and dependencies are installed
2. **Frontend not loading**: Run `npm install` in the frontend directory
3. **CORS errors**: Make sure both frontend and backend are running on correct ports
4. **No properties found**: Try adjusting filter criteria or check if HomeHarvest service is available
