from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database setup
DATABASE_URL = "sqlite:///properties.db"
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Settings(Base):
    __tablename__ = "settings"
    
    # Use a single row for all settings
    id = Column(Integer, primary_key=True, default=1)
    
    # Scraper settings
    update_interval = Column(Integer, default=1)  # hours
    search_radius = Column(Integer, default=30)   # miles
    search_time_range = Column(Integer, default=365)  # days
    
    # Tracking fields
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert Settings object to dictionary for JSON serialization"""
        return {
            'update_interval': self.update_interval,
            'search_radius': self.search_radius,
            'search_time_range': self.search_time_range,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }

class Property(Base):
    __tablename__ = "properties"
    
    # Primary key
    property_id = Column(String, primary_key=True, index=True)
    
    # Address information
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    
    # Property details
    sqft = Column(Integer)
    lot_acre = Column(Float)
    list_price = Column(Integer)
    beds = Column(Integer)
    baths = Column(Float)
    year_built = Column(Integer)
    property_type = Column(String)
    stories = Column(Integer)
    parking_garage = Column(Float)
    favorited = Column(Boolean, default=False)
    estdist = Column(Integer)  # Estimated distance in miles from search center
    
    # Listing information
    listing_date = Column(String)
    primary_photo = Column(Text)
    description = Column(Text)
    url = Column(Text)
    status = Column(String)
    
    # Tracking fields
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    first_seen = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert Property object to dictionary for JSON serialization"""
        return {
            'property_id': self.property_id,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'zip_code': self.zip_code,
            'sqft': self.sqft,
            'lot_acre': self.lot_acre,
            'list_price': self.list_price,
            'beds': self.beds,
            'baths': self.baths,
            'year_built': self.year_built,
            'property_type': self.property_type,
            'stories': self.stories,
            'parking_garage': self.parking_garage,
            'favorited': self.favorited,
            'estdist': self.estdist,
            'listing_date': self.listing_date,
            'primary_photo': self.primary_photo,
            'description': self.description,
            'url': self.url,
            'status': self.status,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'first_seen': self.first_seen.isoformat() if self.first_seen else None
        }

def create_tables():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
