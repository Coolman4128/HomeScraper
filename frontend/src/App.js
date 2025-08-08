import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './index.css';

// Use relative URLs in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [filters, setFilters] = useState({
    min_price: '',
    max_price: '',
    min_sqft: '',
    max_sqft: '',
    max_radius: '',
    min_lot_acre: '',
    max_lot_acre: '',
    min_beds: '',
    max_beds: '',
    min_baths: '',
    max_baths: '',
    min_stories: '',
    max_stories: '',
    min_garage: '',
    max_garage: '',
    min_distance: '',
    max_distance: '',
    listing_age: ''
  });

  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [favoriteProperties, setFavoriteProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [scraperLoading, setScraperLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    update_interval: 1, // hours
    search_radius: 20, // miles
    search_time_range: 365 // days
  });

  // Load all properties on component mount
  useEffect(() => {
    loadAllProperties();
    loadFavorites();
    loadSettings();
  }, []);

  // Debounced filter application
  const debouncedApplyFilters = useCallback(
    useMemo(() => {
      const timeouts = new Map();
      
      return (filtersToApply = filters) => {
        // Clear any existing timeout
        if (timeouts.has('filter')) {
          clearTimeout(timeouts.get('filter'));
        }
        
        // Set new timeout
        const timeoutId = setTimeout(() => {
          let filtered = [...allProperties];

          // Apply each filter if it has a value
          if (filtersToApply.min_price !== '') {
            filtered = filtered.filter(prop => prop.list_price >= parseFloat(filtersToApply.min_price));
          }
          if (filtersToApply.max_price !== '') {
            filtered = filtered.filter(prop => prop.list_price <= parseFloat(filtersToApply.max_price));
          }
          if (filtersToApply.min_sqft !== '') {
            filtered = filtered.filter(prop => prop.sqft >= parseFloat(filtersToApply.min_sqft));
          }
          if (filtersToApply.max_sqft !== '') {
            filtered = filtered.filter(prop => prop.sqft <= parseFloat(filtersToApply.max_sqft));
          }
          if (filtersToApply.min_lot_acre !== '') {
            filtered = filtered.filter(prop => prop.lot_acre >= parseFloat(filtersToApply.min_lot_acre));
          }
          if (filtersToApply.max_lot_acre !== '') {
            filtered = filtered.filter(prop => prop.lot_acre <= parseFloat(filtersToApply.max_lot_acre));
          }
          if (filtersToApply.min_beds !== '') {
            filtered = filtered.filter(prop => prop.beds >= parseFloat(filtersToApply.min_beds));
          }
          if (filtersToApply.max_beds !== '') {
            filtered = filtered.filter(prop => prop.beds <= parseFloat(filtersToApply.max_beds));
          }
          if (filtersToApply.min_baths !== '') {
            filtered = filtered.filter(prop => prop.baths >= parseFloat(filtersToApply.min_baths));
          }
          if (filtersToApply.max_baths !== '') {
            filtered = filtered.filter(prop => prop.baths <= parseFloat(filtersToApply.max_baths));
          }
          if (filtersToApply.min_stories !== '') {
            filtered = filtered.filter(prop => prop.stories >= parseFloat(filtersToApply.min_stories));
          }
          if (filtersToApply.max_stories !== '') {
            filtered = filtered.filter(prop => prop.stories <= parseFloat(filtersToApply.max_stories));
          }
          if (filtersToApply.min_garage !== '') {
            filtered = filtered.filter(prop => prop.parking_garage >= parseFloat(filtersToApply.min_garage));
          }
          if (filtersToApply.max_garage !== '') {
            filtered = filtered.filter(prop => prop.parking_garage <= parseFloat(filtersToApply.max_garage));
          }
          if (filtersToApply.min_distance !== '') {
            filtered = filtered.filter(prop => prop.estdist >= parseFloat(filtersToApply.min_distance));
          }
          if (filtersToApply.max_distance !== '') {
            filtered = filtered.filter(prop => prop.estdist <= parseFloat(filtersToApply.max_distance));
          }

          setFilteredProperties(filtered);
          timeouts.delete('filter');
        }, 300); // 300ms debounce delay
        
        timeouts.set('filter', timeoutId);
      };
    }, [allProperties]),
    [allProperties]
  );

  // Apply filters whenever filters or properties change
  useEffect(() => {
    debouncedApplyFilters();
  }, [filters, allProperties, debouncedApplyFilters]);

  const loadAllProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/properties`);
      setAllProperties(response.data.properties);
      setFilteredProperties(response.data.properties);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/properties/favorites`);
      setFavoriteProperties(response.data.properties);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`);
      setSettings(response.data.settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Fall back to localStorage if backend fails
      const saved = localStorage.getItem('propertySearchSettings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    }
  };

  const manualScrape = async () => {
    setScraperLoading(true);
    setError(null);
    
    try {
      await axios.post(`${API_BASE_URL}/manual-scrape`);
      // Reload properties after successful scrape
      await loadAllProperties();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start manual scrape. Please try again.');
    } finally {
      setScraperLoading(false);
    }
  };

  const toggleFavorite = async (propertyId) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/properties/favorite/${propertyId}`);
      
      // Update the property in all relevant state arrays
      const updateProperty = (properties) => properties.map(prop => 
        prop.property_id === propertyId 
          ? { ...prop, favorited: response.data.favorited }
          : prop
      );
      
      setAllProperties(updateProperty);
      setFilteredProperties(updateProperty);
      
      // Reload favorites to ensure accuracy
      loadFavorites();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = {
      ...filters,
      [name]: value
    };
    setFilters(newFilters);
    
    // Apply filters immediately with the new values
    debouncedApplyFilters(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      min_price: '',
      max_price: '',
      min_sqft: '',
      max_sqft: '',
      max_radius: '',
      min_lot_acre: '',
      max_lot_acre: '',
      min_beds: '',
      max_beds: '',
      min_baths: '',
      max_baths: '',
      min_stories: '',
      max_stories: '',
      min_garage: '',
      max_garage: '',
      min_distance: '',
      max_distance: '',
      listing_age: ''
    };
    setFilters(clearedFilters);
    // Apply cleared filters immediately
    debouncedApplyFilters(clearedFilters);
  };

  const formatPrice = (price) => {
    if (!price || price === 'N/A') return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatNumber = (num) => {
    if (!num || num === 'N/A') return 'N/A';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const isStale = (lastUpdated) => {
    if (!lastUpdated) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(lastUpdated) < sevenDaysAgo;
  };

  const StarIcon = ({ filled, onClick }) => (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      onClick={onClick}
      style={{ cursor: 'pointer', marginLeft: '10px' }}
    >
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? "#ffd700" : "none"}
        stroke="#ffd700"
        strokeWidth="2"
      />
    </svg>
  );

  const PropertyCard = ({ property }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const primaryPhoto = property.primary_photo;
    const stale = isStale(property.last_updated);

    const toggleExpanded = (e) => {
      // Don't toggle if clicking on star
      if (e.target.closest('svg')) return;
      setIsExpanded(!isExpanded);
    };

    const handleStarClick = (e) => {
      e.stopPropagation();
      toggleFavorite(property.property_id);
    };

    return (
      <div 
        className={`property-card ${stale ? 'stale' : ''}`} 
        onClick={toggleExpanded} 
        style={{ cursor: 'pointer' }}
      >
        {primaryPhoto ? (
          <img 
            src={primaryPhoto} 
            alt="Property" 
            className="property-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="property-image-placeholder" style={{display: primaryPhoto ? 'none' : 'flex'}}>
          No Image Available
        </div>
        
        <div className="property-content">
          <div className="property-header">
            <div className="property-price">
              {formatPrice(property.list_price)}
            </div>
            <StarIcon 
              filled={property.favorited} 
              onClick={handleStarClick}
            />
          </div>
          
          <div className="property-address">
            {property.address}, {property.city}, {property.state} {property.zip_code}
          </div>
          
          <div className="property-dates">
            <div className="date-item">
              <span className="date-label">Added:</span>
              <span className="date-value">{formatDate(property.first_seen)}</span>
            </div>
            <div className="date-item">
              <span className="date-label">Updated:</span>
              <span className="date-value">{formatDate(property.last_updated)}</span>
            </div>
          </div>
          
          <div className="property-details">
            <div className="detail-item">
              <span className="detail-label">Beds:</span>
              <span className="detail-value">{property.beds || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Baths:</span>
              <span className="detail-value">{property.baths || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Sqft:</span>
              <span className="detail-value">{formatNumber(property.sqft)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Lot Acre:</span>
              <span className="detail-value">{property.lot_acre || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Year Built:</span>
              <span className="detail-value">{property.year_built || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{property.property_type || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Stories:</span>
              <span className="detail-value">{property.stories || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Garage:</span>
              <span className="detail-value">{property.parking_garage || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Distance:</span>
              <span className="detail-value">{property.estdist ? `${property.estdist} mi` : 'N/A'}</span>
            </div>
          </div>
          
          {property.description && property.description !== 'N/A' && isExpanded && (
            <div className="property-description" style={{
              maxHeight: '150px',
              overflowY: 'auto',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              marginTop: '10px'
            }}>
              {property.description}
            </div>
          )}
          
          {property.url && property.url !== 'N/A' && (
            <a 
              href={property.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="property-link"
              onClick={(e) => e.stopPropagation()}
            >
              View Details
            </a>
          )}
          
          <div className="expand-indicator" style={{
            textAlign: 'center',
            marginTop: '10px',
            fontSize: '12px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            {isExpanded ? '↑ Click to collapse' : '↓ Click to expand'}
          </div>
        </div>
      </div>
    );
  };

  const Sidebar = () => (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Property Search</h2>
      </div>
      <nav className="sidebar-nav">
        <button 
          className={`nav-button ${currentPage === 'home' ? 'active' : ''}`}
          onClick={() => setCurrentPage('home')}
        >
          🏠 Home
        </button>
        <button 
          className={`nav-button ${currentPage === 'favorites' ? 'active' : ''}`}
          onClick={() => setCurrentPage('favorites')}
        >
          ⭐ Favorites ({favoriteProperties.length})
        </button>
        <button 
          className={`nav-button ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentPage('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>
    </div>
  );

  const HomePage = () => (
    <div className="main-content">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Property Search</h1>
          <p>Properties near 2821 Old Rte 15, New Columbia, PA</p>
        </div>
        <button 
          className="manual-scrape-button" 
          onClick={manualScrape}
          disabled={scraperLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: scraperLoading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: scraperLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {scraperLoading ? 'Scraping...' : '🔄 Manual Scrape'}
        </button>
      </div>

      <div className="filters-section">
        <div 
          className="filters-header" 
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            marginBottom: filtersExpanded ? '20px' : '0'
          }}
        >
          <h2 className="filters-title" style={{ margin: 0 }}>
            Search Filters ({filteredProperties.length} of {allProperties.length} properties)
          </h2>
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {filtersExpanded ? '−' : '+'}
          </span>
        </div>
        
        {filtersExpanded && (
          <div className="filters-content" style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            {/* Price Filters */}
            <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="min_price">Min Price ($)</label>
                <input
                  type="number"
                  id="min_price"
                  name="min_price"
                  value={filters.min_price}
                  onChange={handleFilterChange}
                  placeholder="e.g. 100000"
                />
              </div>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="max_price">Max Price ($)</label>
                <input
                  type="number"
                  id="max_price"
                  name="max_price"
                  value={filters.max_price}
                  onChange={handleFilterChange}
                  placeholder="e.g. 500000"
                />
              </div>
            </div>

            {/* Square Feet Filters */}
            <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="min_sqft">Min Square Feet</label>
                <input
                  type="number"
                  id="min_sqft"
                  name="min_sqft"
                  value={filters.min_sqft}
                  onChange={handleFilterChange}
                  placeholder="e.g. 1000"
                />
              </div>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="max_sqft">Max Square Feet</label>
                <input
                  type="number"
                  id="max_sqft"
                  name="max_sqft"
                  value={filters.max_sqft}
                  onChange={handleFilterChange}
                  placeholder="e.g. 5000"
                />
              </div>
            </div>

            {/* Bedroom Filters */}
            <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="min_beds">Min Bedrooms</label>
                <input
                  type="number"
                  id="min_beds"
                  name="min_beds"
                  value={filters.min_beds}
                  onChange={handleFilterChange}
                  placeholder="e.g. 2"
                  min="0"
                  max="10"
                />
              </div>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="max_beds">Max Bedrooms</label>
                <input
                  type="number"
                  id="max_beds"
                  name="max_beds"
                  value={filters.max_beds}
                  onChange={handleFilterChange}
                  placeholder="e.g. 5"
                  min="0"
                  max="10"
                />
              </div>
            </div>

            {/* Bathroom Filters */}
            <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="min_baths">Min Bathrooms</label>
                <input
                  type="number"
                  id="min_baths"
                  name="min_baths"
                  value={filters.min_baths}
                  onChange={handleFilterChange}
                  placeholder="e.g. 1"
                  min="0"
                  max="10"
                  step="0.5"
                />
              </div>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="max_baths">Max Bathrooms</label>
                <input
                  type="number"
                  id="max_baths"
                  name="max_baths"
                  value={filters.max_baths}
                  onChange={handleFilterChange}
                  placeholder="e.g. 4"
                  min="0"
                  max="10"
                  step="0.5"
                />
              </div>
            </div>

            {/* Lot Size Filters */}
            <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="min_lot_acre">Min Lot Acres</label>
                <input
                  type="number"
                  id="min_lot_acre"
                  name="min_lot_acre"
                  value={filters.min_lot_acre}
                  onChange={handleFilterChange}
                  step="0.1"
                  placeholder="e.g. 0.1"
                />
              </div>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="max_lot_acre">Max Lot Acres</label>
                <input
                  type="number"
                  id="max_lot_acre"
                  name="max_lot_acre"
                  value={filters.max_lot_acre}
                  onChange={handleFilterChange}
                  step="0.1"
                  placeholder="e.g. 5.0"
                />
              </div>
            </div>

            {/* Stories Filters */}
            <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="min_stories">Min Stories</label>
                <input
                  type="number"
                  id="min_stories"
                  name="min_stories"
                  value={filters.min_stories}
                  onChange={handleFilterChange}
                  placeholder="e.g. 1"
                  min="0"
                  max="10"
                />
              </div>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="max_stories">Max Stories</label>
                <input
                  type="number"
                  id="max_stories"
                  name="max_stories"
                  value={filters.max_stories}
                  onChange={handleFilterChange}
                  placeholder="e.g. 3"
                  min="0"
                  max="10"
                />
              </div>
            </div>

            {/* Garage Filters */}
            <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="min_garage">Min Garage Spaces</label>
                <input
                  type="number"
                  id="min_garage"
                  name="min_garage"
                  value={filters.min_garage}
                  onChange={handleFilterChange}
                  placeholder="e.g. 1"
                  min="0"
                  max="10"
                />
              </div>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="max_garage">Max Garage Spaces</label>
                <input
                  type="number"
                  id="max_garage"
                  name="max_garage"
                  value={filters.max_garage}
                  onChange={handleFilterChange}
                  placeholder="e.g. 4"
                  min="0"
                  max="10"
                />
              </div>
            </div>

            {/* Distance Filters */}
            <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="min_distance">Min Distance (miles)</label>
                <input
                  type="number"
                  id="min_distance"
                  name="min_distance"
                  value={filters.min_distance}
                  onChange={handleFilterChange}
                  placeholder="e.g. 0"
                  min="0"
                  max="100"
                />
              </div>
              <div className="filter-group" style={{ flex: 1 }}>
                <label htmlFor="max_distance">Max Distance (miles)</label>
                <input
                  type="number"
                  id="max_distance"
                  name="max_distance"
                  value={filters.max_distance}
                  onChange={handleFilterChange}
                  placeholder="e.g. 20"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="filter-actions" style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="clear-filters-button" 
                onClick={clearFilters}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
              <button 
                className="refresh-button" 
                onClick={loadAllProperties}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading properties... This may take a moment.</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!loading && filteredProperties.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h2>Properties</h2>
            <p className="results-count">
              Showing {filteredProperties.length} of {allProperties.length} properties
            </p>
          </div>
          
          <div className="properties-grid">
            {filteredProperties.map((property, index) => (
              <PropertyCard key={property.property_id || index} property={property} />
            ))}
          </div>
        </div>
      )}

      {!loading && !error && allProperties.length === 0 && (
        <div className="no-results">
          <p>No properties found in the database. The scraper may still be collecting data.</p>
        </div>
      )}

      {!loading && !error && allProperties.length > 0 && filteredProperties.length === 0 && (
        <div className="no-results">
          <p>No properties match your current filters. Try adjusting your criteria.</p>
        </div>
      )}
    </div>
  );

  const FavoritesPage = () => (
    <div className="main-content">
      <div className="header">
        <h1>Favorite Properties</h1>
        <p>Your saved properties</p>
      </div>

      {favoriteProperties.length > 0 ? (
        <div className="results-section">
          <div className="results-header">
            <h2>Favorites</h2>
            <p className="results-count">
              {favoriteProperties.length} favorited properties
            </p>
          </div>
          
          <div className="properties-grid">
            {favoriteProperties.map((property, index) => (
              <PropertyCard key={property.property_id || index} property={property} />
            ))}
          </div>
        </div>
      ) : (
        <div className="no-results">
          <p>No favorite properties yet. Click the star icon on any property to add it to your favorites!</p>
        </div>
      )}
    </div>
  );

  const SettingsPage = () => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Update local settings when global settings change
    useEffect(() => {
      setLocalSettings(settings);
    }, [settings]);

    const handleSettingChange = (e) => {
      const { name, value } = e.target;
      setLocalSettings(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    };

    const saveSettings = async () => {
      setSaving(true);
      setSaveMessage('');
      
      try {
        const response = await axios.put(`${API_BASE_URL}/settings`, {
          updateInterval: localSettings.update_interval,
          searchRadius: localSettings.search_radius,
          searchTimeRange: localSettings.search_time_range
        });
        
        // Update global settings state
        setSettings(response.data.settings);
        setLocalSettings(response.data.settings);
        
        // Save to localStorage as backup
        localStorage.setItem('propertySearchSettings', JSON.stringify(response.data.settings));
        
        setSaveMessage(response.data.message);
      } catch (err) {
        setSaveMessage('Failed to save settings: ' + (err.response?.data?.error || err.message));
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="main-content">
        <div className="header">
          <h1>Settings</h1>
          <p>Configure your search preferences</p>
        </div>

        <div className="settings-section">
          <div className="setting-group">
            <label htmlFor="update_interval">Database Update Interval (hours)</label>
            <input
              type="number"
              id="update_interval"
              name="update_interval"
              value={localSettings.update_interval}
              onChange={handleSettingChange}
              min="1"
              max="24"
            />
            <small>How often the database should be updated with new properties</small>
          </div>

          <div className="setting-group">
            <label htmlFor="search_radius">Search Radius (miles)</label>
            <input
              type="number"
              id="search_radius"
              name="search_radius"
              value={localSettings.search_radius}
              onChange={handleSettingChange}
              min="1"
              max="100"
            />
            <small>Search radius around 2821 Old Rte 15, New Columbia, PA</small>
          </div>

          <div className="setting-group">
            <label htmlFor="search_time_range">Search Time Range (days)</label>
            <input
              type="number"
              id="search_time_range"
              name="search_time_range"
              value={localSettings.search_time_range}
              onChange={handleSettingChange}
              min="1"
              max="1000"
            />
            <small>How far back to look for property listings</small>
          </div>

          <button 
            onClick={saveSettings} 
            className="save-settings-button"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          
          {saveMessage && (
            <div className={`settings-message ${saveMessage.includes('Failed') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'favorites':
        return <FavoritesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      {renderCurrentPage()}
    </div>
  );
}

export default App;
