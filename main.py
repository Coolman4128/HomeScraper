from homeharvest import scrape_property
from homeharvest import Property
from datetime import datetime
import pandas as pd

current_timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
filename = f"property_data_{current_timestamp}.json"


# PROPERTY SORTING 
min_sqft = 1000
max_sqft = 5000
min_price = 100000
max_price = 500000
min_lotacre = 0.1
max_lotacre = 5.0
max_radius = 30  # in miles


properties = scrape_property(
    location="2821 Old Rte 15, New Columbia, PA",
    listing_type="for_sale",
    past_days=365,
    radius=30,
    return_type="pandas"
)

# Filter properties and create a list to store indices of matching properties
filtered_indices = []

for idx, prop in properties.iterrows():
    prop_sqft = prop.get('sqft', 0)
    if pd.isna(prop_sqft):
        prop_sqft = 0
    if (min_sqft <= prop_sqft <= max_sqft and
        min_price <= prop.get('list_price', 0) <= max_price):
        filtered_indices.append(idx)

# Create a filtered DataFrame
finalProps = properties.loc[filtered_indices]

# Save the data to CSV
finalProps.to_json(filename, index=False)

# Print property details
for idx, prop in finalProps.iterrows():
    print(f"Property ID: {prop.get('property_id', 'N/A')} | Property SQFT: {prop.get('sqft', 'N/A')} | Lot Acre: {prop.get('lot_acre', 'N/A')} | Price: {prop.get('list_price', 'N/A')}")

print(f"Data saved to {filename}.")