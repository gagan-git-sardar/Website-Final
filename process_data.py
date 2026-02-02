import pandas as pd
import json
import collections

# Input/Output
input_file = 'WebsiteDataTable.xlsx'
output_file = 'london_data.json'

# Mappings
borough_column = 'borough'
postcode_column = 'outward'
property_type_column = 'propertytype'

type_map = {
    'D': 'detached',
    'F': 'flat',
    'S': 'semi',
    'T': 'terraced'
}

def process():
    print(f"Reading {input_file}...")
    try:
        df = pd.read_excel(input_file)
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return

    # Structure:
    # final_data[postcode] = { "borough": "...", "prices": { "2015": { "flat": 123, ... } } }
    
    final_data = {}
    
    # Iterate through rows
    print("Processing rows...")
    count = 0
    
    for index, row in df.iterrows():
        postcode = str(row[postcode_column]).strip()
        borough = str(row[borough_column]).strip()
        p_type_code = str(row[property_type_column]).strip()
        
        # Skip invalid postcodes
        if not postcode or postcode.lower() == 'nan':
            continue
            
        p_type = type_map.get(p_type_code, 'other')
        
        if postcode not in final_data:
            final_data[postcode] = {
                "borough": borough,
                "prices": {}
            }
            
        # Process years 2015-2026
        for year in range(2015, 2027):
            col_name = f'{year}_price'
            if col_name in df.columns:
                val = row[col_name]
                # Check if val is valid number
                if pd.notna(val):
                    try:
                        price = int(float(val))
                        if price > 0:
                            year_str = str(year)
                            if year_str not in final_data[postcode]["prices"]:
                                final_data[postcode]["prices"][year_str] = {}
                            
                            # For the aggregated view in frontend, it expects:
                            # prices[year][type] = value
                            
                            # Note: The Excel structure seems to be one row per property type per postcode?
                            # Let's verify: "rows" in dataframe iterate linearly.
                            # If multiple rows exist for same postcode but different property types,
                            # we need to merge them.
                             
                            final_data[postcode]["prices"][year_str][p_type] = price
                            
                    except ValueError:
                        pass
        count += 1

    # Calculate 'all' type averages if missing? 
    # The previous script calculated 'all' by summing everything up.
    # We should do the same here for consistency if 'all' isn't explicitly provided.
    
    for postcode, data in final_data.items():
        for year, prices in data["prices"].items():
            if 'all' not in prices and prices:
                # Calculate average of available types
                # Note: This is an approximation since we don't have counts, just averages per type.
                # But it's better than nothing.
                values = list(prices.values())
                if values:
                    prices['all'] = round(sum(values) / len(values))

    with open(output_file, 'w') as f:
        json.dump(final_data, f, indent=2)
        
    print(f"Processed {count} rows. Output saved to {output_file}. Total postcodes: {len(final_data)}")

if __name__ == '__main__':
    process()
