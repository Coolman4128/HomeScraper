from flask import Flask, request, jsonify
from flask_cors import CORS
from models import Property, Settings, SessionLocal, create_tables
from scraper import scraper
import atexit
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database and start scraper
create_tables()

def get_or_create_settings(db):
    """Get settings from database or create default settings"""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        # Create default settings
        settings = Settings(
            id=1,
            update_interval=1,
            search_radius=30,
            search_time_range=365
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

# Load settings from database and update scraper
db = SessionLocal()
try:
    settings = get_or_create_settings(db)
    scraper.load_settings_from_db(settings.to_dict())
finally:
    db.close()

scraper.start_scheduler()

# Ensure scheduler stops when app shuts down
def shutdown_scheduler():
    scraper.stop_scheduler()

atexit.register(shutdown_scheduler)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/properties', methods=['GET'])
def get_all_properties():
    """Get all properties from the database"""
    try:
        db = SessionLocal()
        try:
            # Get all properties
            properties = db.query(Property).all()
            properties_list = [prop.to_dict() for prop in properties]
            
            return jsonify({
                "properties": properties_list,
                "total_found": len(properties_list),
                "message": f"Loaded {len(properties_list)} properties from database"
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error(f"Error getting all properties: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/scrape', methods=['POST'])
def get_properties():
    """Get filtered properties from the database"""
    try:
        # Get filter parameters from request
        data = request.get_json()
        
        # Extract filters with defaults
        min_price = data.get('min_price', 0)
        max_price = data.get('max_price', 10000000)
        min_sqft = data.get('min_sqft', 0)
        max_sqft = data.get('max_sqft', 10000)
        min_lot_acre = data.get('min_lot_acre', 0)
        max_lot_acre = data.get('max_lot_acre', 100)
        min_beds = data.get('min_beds', 0)
        max_beds = data.get('max_beds', 10)
        min_baths = data.get('min_baths', 0)
        max_baths = data.get('max_baths', 10)
        
        db = SessionLocal()
        try:
            # Build query with filters
            query = db.query(Property)
            
            # Apply filters
            if min_price > 0:
                query = query.filter(Property.list_price >= min_price)
            if max_price < 10000000:
                query = query.filter(Property.list_price <= max_price)
            if min_sqft > 0:
                query = query.filter(Property.sqft >= min_sqft)
            if max_sqft < 10000:
                query = query.filter(Property.sqft <= max_sqft)
            if min_lot_acre > 0:
                query = query.filter(Property.lot_acre >= min_lot_acre)
            if max_lot_acre < 100:
                query = query.filter(Property.lot_acre <= max_lot_acre)
            if min_beds > 0:
                query = query.filter(Property.beds >= min_beds)
            if max_beds < 10:
                query = query.filter(Property.beds <= max_beds)
            if min_baths > 0:
                query = query.filter(Property.baths >= min_baths)
            if max_baths < 10:
                query = query.filter(Property.baths <= max_baths)
            
            # Execute query and convert to list of dictionaries
            properties = query.all()
            properties_list = [prop.to_dict() for prop in properties]
            
            return jsonify({
                "properties": properties_list,
                "total_found": len(properties_list),
                "message": f"Found {len(properties_list)} properties matching your criteria from database"
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error(f"Error getting properties: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/manual-scrape', methods=['POST'])
def manual_scrape():
    """Manually trigger a property scrape"""
    try:
        scraper.scrape_and_store_properties()
        return jsonify({"message": "Manual scrape completed successfully"})
    except Exception as e:
        logger.error(f"Error during manual scrape: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/properties/favorite/<property_id>', methods=['PUT'])
def toggle_favorite(property_id):
    """Toggle favorite status of a property"""
    try:
        db = SessionLocal()
        try:
            property = db.query(Property).filter(Property.property_id == property_id).first()
            if not property:
                return jsonify({"error": "Property not found"}), 404
            
            # Toggle the favorite status
            property.favorited = not property.favorited
            db.commit()
            
            return jsonify({
                "message": f"Property {'favorited' if property.favorited else 'unfavorited'}",
                "favorited": property.favorited
            })
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error toggling favorite: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/properties/favorites', methods=['GET'])
def get_favorites():
    """Get all favorited properties"""
    try:
        db = SessionLocal()
        try:
            favorites = db.query(Property).filter(Property.favorited == True).all()
            favorites_list = [prop.to_dict() for prop in favorites]
            
            return jsonify({
                "properties": favorites_list,
                "total_found": len(favorites_list),
                "message": f"Found {len(favorites_list)} favorited properties"
            })
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error getting favorites: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/settings', methods=['GET'])
def get_settings():
    """Get current scraper settings"""
    try:
        db = SessionLocal()
        try:
            settings = get_or_create_settings(db)
            return jsonify({
                "settings": settings.to_dict(),
                "message": "Settings retrieved successfully"
            })
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error getting settings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/settings', methods=['PUT'])
def update_settings():
    """Update scraper settings"""
    try:
        data = request.get_json()
        
        # Validate settings
        update_interval = data.get('updateInterval', 1)
        search_radius = data.get('searchRadius', 30)
        search_time_range = data.get('searchTimeRange', 365)
        
        # Basic validation
        if not (1 <= update_interval <= 24):
            return jsonify({"error": "Update interval must be between 1 and 24 hours"}), 400
        if not (1 <= search_radius <= 100):
            return jsonify({"error": "Search radius must be between 1 and 100 miles"}), 400
        if not (1 <= search_time_range <= 1000):
            return jsonify({"error": "Search time range must be between 1 and 1000 days"}), 400
        
        db = SessionLocal()
        try:
            # Get or create settings
            settings = get_or_create_settings(db)
            
            # Update settings in database
            settings.update_interval = update_interval
            settings.search_radius = search_radius
            settings.search_time_range = search_time_range
            
            db.commit()
            db.refresh(settings)
            
            # Update scraper settings
            scraper.update_settings(
                update_interval=update_interval,
                search_radius=search_radius,
                search_time_range=search_time_range
            )
            
            return jsonify({
                "message": "Settings updated successfully. Changes will take effect on next scrape cycle.",
                "settings": settings.to_dict()
            })
        finally:
            db.close()
        
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    try:
        db = SessionLocal()
        try:
            total_properties = db.query(Property).count()
            recent_properties = db.query(Property).filter(
                Property.last_updated >= Property.first_seen
            ).count()
            
            return jsonify({
                "total_properties": total_properties,
                "recently_updated": recent_properties,
                "message": f"Database contains {total_properties} properties"
            })
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
