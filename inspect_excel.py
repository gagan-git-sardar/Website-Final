
import pandas as pd

try:
    df = pd.read_excel('WebsiteDataTable.xlsx')
    print("Unique property types:")
    print(df['propertytype'].unique())
except Exception as e:
    print(f"Error reading excel: {e}")
