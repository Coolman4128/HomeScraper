from apscheduler.schedulers.background import BackgroundScheduler
from homeharvest import scrape_property
import pandas as pd
from models import Property, Settings, SessionLocal, create_tables
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Hardcoded address as requested
LOCATION = "2821 Old Rte 15, New Columbia, PA"

class PropertyScraper:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        # Ensure tables exist
        create_tables()
        
        # Default settings - will be loaded from database
        self.settings = {
            'update_interval': 1,  # hours
            'search_radius': 30,   # miles
            'search_time_range': 365  # days
        }
        
    def load_settings_from_db(self, db_settings):
        """Load settings from database"""
        logger.info(f"Loading settings from database: {db_settings}")
        logger.info(f"Current settings before update: {self.settings}")
        
        # Filter out non-scraping settings (like last_updated)
        scraping_settings = {
            key: value for key, value in db_settings.items() 
            if key in ['update_interval', 'search_radius', 'search_time_range']
        }
        
        self.settings.update(scraping_settings)
        logger.info(f"Settings loaded from database: {self.settings}")
        
        # Validate critical settings
        if self.settings.get('search_time_range') is None or self.settings.get('search_time_range') <= 0:
            logger.warning(f"Invalid search_time_range: {self.settings.get('search_time_range')}, using default 365")
            self.settings['search_time_range'] = 365
        
        if self.settings.get('search_radius') is None or self.settings.get('search_radius') <= 0:
            logger.warning(f"Invalid search_radius: {self.settings.get('search_radius')}, using default 30")
            self.settings['search_radius'] = 30
        
    def get_settings(self):
        """Get current scraper settings"""
        return self.settings.copy()
    
    def update_settings(self, update_interval=None, search_radius=None, search_time_range=None):
        """Update scraper settings and restart scheduler with new interval"""
        if update_interval is not None:
            self.settings['update_interval'] = update_interval
        if search_radius is not None:
            self.settings['search_radius'] = search_radius
        if search_time_range is not None:
            self.settings['search_time_range'] = search_time_range
        
        logger.info(f"Settings updated: {self.settings}")
        
        # Restart scheduler with new interval if it's running
        if self.scheduler.running and update_interval is not None:
            self.stop_scheduler()
            self.start_scheduler()
            
    def scrape_and_store_properties(self):
        """Scrape properties using incremental radius searches and store/update them in the database"""
        try:
            logger.info("Starting property scraping with incremental radius...")
            logger.info(f"Current scraper settings: {self.settings}")
            
            max_radius = self.settings['search_radius']
            search_time_range = self.settings['search_time_range']
            
            # Keep track of all property IDs found in this scraping session
            all_scraped_property_ids = set()
            
            db = SessionLocal()
            try:
                # Get all existing property IDs to avoid database lookups in the loop
                existing_property_ids = set(db.query(Property.property_id).all())
                existing_property_ids = {pid[0] for pid in existing_property_ids}
                
                properties_processed = 0
                properties_updated = 0
                properties_added = 0
                
                # Scrape in incremental radius steps from 1 mile to max_radius
                for current_radius in range(1, max_radius + 1):
                    logger.info(f"Scraping with radius: {current_radius} miles")
                    
                    try:
                        # Scrape properties for current radius
                        properties = scrape_property(
                            location=LOCATION,
                            listing_type="for_sale",
                            past_days=search_time_range,
                            radius=current_radius,
                            return_type="pandas"
                        )
                        
                        if not properties.size > 0:
                            logger.info(f"No properties found for radius {current_radius} miles")
                            continue
                        
                        # Remove duplicates from scraped properties for this radius
                        initial_count = len(properties)
                        properties = properties.drop_duplicates(subset=['property_id'], keep='first')
                        duplicates_removed = initial_count - len(properties)
                        
                        if duplicates_removed > 0:
                            logger.info(f"Removed {duplicates_removed} duplicate properties from radius {current_radius} miles")
                        
                        # Also filter out properties we've already seen in this scraping session
                        properties_before_session_filter = len(properties)
                        properties = properties[~properties['property_id'].isin(all_scraped_property_ids)]
                        session_duplicates_removed = properties_before_session_filter - len(properties)
                        
                        if session_duplicates_removed > 0:
                            logger.info(f"Removed {session_duplicates_removed} properties already seen in this scraping session")
                        
                        logger.info(f"Processing {len(properties)} unique properties from radius {current_radius} miles")
                        
                        # Process each property
                        for idx, prop in properties.iterrows():
                            # Get property ID
                            property_id = prop.get('property_id')
                            if not property_id or pd.isna(property_id) or property_id == 'N/A':
                                logger.warning(f"Skipping property without valid ID: {prop.get('street', 'Unknown address')}")
                                continue
                            
                            # Skip if we've already processed this property in this scraping session
                            # This ensures we only set estdist once per scraping session (from the smallest radius it was found in)
                            if property_id in all_scraped_property_ids:
                                logger.warning(f"Property {property_id} already processed in this session, skipping")
                                continue
                            
                            # Add to our session tracking immediately to prevent duplicate processing
                            all_scraped_property_ids.add(property_id)
                            
                            # Format property type
                            raw_property_type = prop.get('style', 'N/A')
                            if raw_property_type != 'N/A' and isinstance(raw_property_type, str):
                                formatted_property_type = raw_property_type.replace('_', ' ').title()
                            else:
                                formatted_property_type = raw_property_type
                            
                            # Calculate lot acres
                            lot_sqft = prop.get('lot_sqft', 0)
                            if pd.isna(lot_sqft) or lot_sqft == 0:
                                lot_acre = None
                            else:
                                lot_acre = round(lot_sqft / 43560, 2)
                            
                            # Check if property already exists using the pre-loaded set
                            if property_id in existing_property_ids:
                                # Get existing property for update
                                existing_property = db.query(Property).filter(Property.property_id == property_id).first()
                                if existing_property:
                                    # Update existing property (DO NOT update estdist field)
                                    existing_property.address = prop.get('street') if not pd.isna(prop.get('street')) else existing_property.address
                                    existing_property.city = prop.get('city') if not pd.isna(prop.get('city')) else existing_property.city
                                    existing_property.state = prop.get('state') if not pd.isna(prop.get('state')) else existing_property.state
                                    existing_property.zip_code = prop.get('zip_code') if not pd.isna(prop.get('zip_code')) else existing_property.zip_code
                                    existing_property.sqft = int(prop.get('sqft')) if not pd.isna(prop.get('sqft')) else existing_property.sqft
                                    existing_property.lot_acre = lot_acre if lot_acre is not None else existing_property.lot_acre
                                    existing_property.list_price = int(prop.get('list_price')) if not pd.isna(prop.get('list_price')) else existing_property.list_price
                                    existing_property.beds = int(prop.get('beds')) if not pd.isna(prop.get('beds')) else existing_property.beds
                                    existing_property.baths = float(prop.get('full_baths')) if not pd.isna(prop.get('full_baths')) else existing_property.baths
                                    existing_property.year_built = int(prop.get('year_built')) if not pd.isna(prop.get('year_built')) else existing_property.year_built
                                    existing_property.property_type = formatted_property_type if formatted_property_type != 'N/A' else existing_property.property_type
                                    existing_property.stories = int(prop.get('stories')) if not pd.isna(prop.get('stories')) else existing_property.stories
                                    existing_property.parking_garage = float(prop.get('parking_garage')) if not pd.isna(prop.get('parking_garage')) else existing_property.parking_garage
                                    existing_property.listing_date = prop.get('list_date') if not pd.isna(prop.get('list_date')) else existing_property.listing_date
                                    existing_property.primary_photo = prop.get('primary_photo') if not pd.isna(prop.get('primary_photo')) else existing_property.primary_photo
                                    existing_property.description = prop.get('text') if not pd.isna(prop.get('text')) else existing_property.description
                                    existing_property.url = prop.get('property_url') if not pd.isna(prop.get('property_url')) else existing_property.url
                                    existing_property.status = prop.get('status') if not pd.isna(prop.get('status')) else existing_property.status
                                    existing_property.last_updated = datetime.utcnow()
                                    
                                    properties_updated += 1
                            else:
                                # Double-check property doesn't exist in database before creating new one
                                existing_check = db.query(Property).filter(Property.property_id == property_id).first()
                                if existing_check:
                                    logger.warning(f"Property {property_id} found in database during new property creation, updating instead")
                                    existing_property_ids.add(property_id)  # Add to tracking set
                                    # Update the existing property instead
                                    existing_check.address = prop.get('street') if not pd.isna(prop.get('street')) else existing_check.address
                                    existing_check.city = prop.get('city') if not pd.isna(prop.get('city')) else existing_check.city
                                    existing_check.state = prop.get('state') if not pd.isna(prop.get('state')) else existing_check.state
                                    existing_check.zip_code = prop.get('zip_code') if not pd.isna(prop.get('zip_code')) else existing_check.zip_code
                                    existing_check.sqft = int(prop.get('sqft')) if not pd.isna(prop.get('sqft')) else existing_check.sqft
                                    existing_check.lot_acre = lot_acre if lot_acre is not None else existing_check.lot_acre
                                    existing_check.list_price = int(prop.get('list_price')) if not pd.isna(prop.get('list_price')) else existing_check.list_price
                                    existing_check.beds = int(prop.get('beds')) if not pd.isna(prop.get('beds')) else existing_check.beds
                                    existing_check.baths = float(prop.get('full_baths')) if not pd.isna(prop.get('full_baths')) else existing_check.baths
                                    existing_check.year_built = int(prop.get('year_built')) if not pd.isna(prop.get('year_built')) else existing_check.year_built
                                    existing_check.property_type = formatted_property_type if formatted_property_type != 'N/A' else existing_check.property_type
                                    existing_check.stories = int(prop.get('stories')) if not pd.isna(prop.get('stories')) else existing_check.stories
                                    existing_check.parking_garage = float(prop.get('parking_garage')) if not pd.isna(prop.get('parking_garage')) else existing_check.parking_garage
                                    existing_check.listing_date = prop.get('list_date') if not pd.isna(prop.get('list_date')) else existing_check.listing_date
                                    existing_check.primary_photo = prop.get('primary_photo') if not pd.isna(prop.get('primary_photo')) else existing_check.primary_photo
                                    existing_check.description = prop.get('text') if not pd.isna(prop.get('text')) else existing_check.description
                                    existing_check.url = prop.get('property_url') if not pd.isna(prop.get('property_url')) else existing_check.url
                                    existing_check.status = prop.get('status') if not pd.isna(prop.get('status')) else existing_check.status
                                    existing_check.last_updated = datetime.utcnow()
                                    properties_updated += 1
                                    continue
                                
                                # Create new property with estdist set to current radius
                                try:
                                    new_property = Property(
                                        property_id=property_id,
                                        address=prop.get('street') if not pd.isna(prop.get('street')) else None,
                                        city=prop.get('city') if not pd.isna(prop.get('city')) else None,
                                        state=prop.get('state') if not pd.isna(prop.get('state')) else None,
                                        zip_code=prop.get('zip_code') if not pd.isna(prop.get('zip_code')) else None,
                                        sqft=int(prop.get('sqft')) if not pd.isna(prop.get('sqft')) else None,
                                        lot_acre=lot_acre,
                                        list_price=int(prop.get('list_price')) if not pd.isna(prop.get('list_price')) else None,
                                        beds=int(prop.get('beds')) if not pd.isna(prop.get('beds')) else None,
                                        baths=float(prop.get('full_baths')) if not pd.isna(prop.get('full_baths')) else None,
                                        year_built=int(prop.get('year_built')) if not pd.isna(prop.get('year_built')) else None,
                                        property_type=formatted_property_type if formatted_property_type != 'N/A' else None,
                                        stories=int(prop.get('stories')) if not pd.isna(prop.get('stories')) else None,
                                        parking_garage=float(prop.get('parking_garage')) if not pd.isna(prop.get('parking_garage')) else None,
                                        favorited=False,
                                        estdist=current_radius,  # Set estimated distance to current search radius
                                        listing_date=prop.get('list_date') if not pd.isna(prop.get('list_date')) else None,
                                        primary_photo=prop.get('primary_photo') if not pd.isna(prop.get('primary_photo')) else None,
                                        description=prop.get('text') if not pd.isna(prop.get('text')) else None,
                                        url=prop.get('property_url') if not pd.isna(prop.get('property_url')) else None,
                                        status=prop.get('status') if not pd.isna(prop.get('status')) else None,
                                        first_seen=datetime.utcnow(),
                                        last_updated=datetime.utcnow()
                                    )
                                    db.add(new_property)
                                    existing_property_ids.add(property_id)  # Add to our tracking set to prevent duplicates
                                    properties_added += 1
                                except Exception as add_error:
                                    logger.error(f"Error adding property {property_id}: {str(add_error)}")
                                    # If it's an integrity error, the property might already exist
                                    if "UNIQUE constraint failed" in str(add_error):
                                        logger.warning(f"Property {property_id} appears to already exist, skipping")
                                        existing_property_ids.add(property_id)
                                    else:
                                        # Re-raise if it's not a duplicate error
                                        raise add_error
                            
                            properties_processed += 1
                        
                        # Commit after each radius to avoid losing data if later radius fails
                        try:
                            db.commit()
                            logger.info(f"Completed radius {current_radius} miles: {len(properties)} properties processed")
                        except Exception as commit_error:
                            logger.error(f"Error committing radius {current_radius} miles: {str(commit_error)}")
                            db.rollback()
                            raise commit_error
                        
                    except Exception as e:
                        logger.error(f"Error scraping radius {current_radius} miles: {str(e)}")
                        # Rollback any pending changes for this radius
                        try:
                            db.rollback()
                        except:
                            pass
                        # Continue with next radius even if this one fails
                        continue
                
                logger.info(f"Incremental scraping completed: {properties_processed} total processed, {properties_added} added, {properties_updated} updated")
                
            except Exception as e:
                db.rollback()
                logger.error(f"Database error during scraping: {str(e)}")
                raise
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error during property scraping: {str(e)}")
    
    def start_scheduler(self):
        """Start the background scheduler"""
        # Schedule scraping based on current settings
        self.scheduler.add_job(
            func=self.scrape_and_store_properties,
            trigger="interval",
            hours=self.settings['update_interval'],
            id='property_scraper',
            name=f'Scrape properties every {self.settings["update_interval"]} hour(s)',
            replace_existing=True
        )
        
        # Run once immediately on startup
        self.scheduler.add_job(
            func=self.scrape_and_store_properties,
            trigger="date",
            id='initial_scrape',
            name='Initial property scrape on startup'
        )
        
        self.scheduler.start()
        logger.info(f"Property scraper scheduler started with {self.settings['update_interval']} hour interval")
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Property scraper scheduler stopped")

# Global scraper instance
scraper = PropertyScraper()
