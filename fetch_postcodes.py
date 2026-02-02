import urllib.request
import json
import ssl

# Ignore SSL certificate errors
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

areas = ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC', 'IG', 'RM', 'DA', 'BR', 'CR', 'SM', 'KT', 'TW', 'UB', 'HA', 'EN']
base_url = "https://raw.githubusercontent.com/missinglink/uk-postcode-polygons/master/geojson/{}.geojson"

combined_features = []

print("Starting download and merge...")

for area in areas:
    url = base_url.format(area)
    print(f"Fetching {area} from {url}...")
    try:
        with urllib.request.urlopen(url, context=ctx) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                if 'features' in data:
                    print(f"  Found {len(data['features'])} features for {area}")
                    combined_features.extend(data['features'])
                else:
                    print(f"  Warning: No features found in {area}")
            else:
                print(f"  Error: Failed to fetch {area} (Status: {response.status})")
    except Exception as e:
        print(f"  Exception fetching {area}: {e}")

output_data = {
    "type": "FeatureCollection",
    "features": combined_features
}

output_path = "london_postcodes.geojson"
with open(output_path, 'w') as f:
    json.dump(output_data, f)

print(f"Finished. Saved {len(combined_features)} polygons to {output_path}")
print(f"First 5 feature names: {[f['properties'].get('name') for f in combined_features[:5]]}")
