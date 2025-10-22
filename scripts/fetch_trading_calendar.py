#!/usr/bin/env python3
"""
Fetch trading calendar data from J-Quants API and save to JSON and Parquet files.
"""

import os
import requests
import pandas as pd
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

# J-Quants API configuration
REFRESH_TOKEN_URL = "https://api.jquants.com/v1/token/auth_refresh"
TRADING_CALENDAR_URL = "https://api.jquants.com/v1/markets/trading_calendar"

def get_id_token(refresh_token: str) -> str:
    """Get ID token using refresh token."""
    params = {"refreshtoken": refresh_token}

    response = requests.post(REFRESH_TOKEN_URL, params=params)
    response.raise_for_status()

    return response.json()["idToken"]

def fetch_trading_calendar(id_token: str, from_date: str = None, to_date: str = None) -> dict:
    """Fetch trading calendar from J-Quants API."""
    headers = {"Authorization": f"Bearer {id_token}"}

    params = {}
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date

    response = requests.get(TRADING_CALENDAR_URL, headers=headers, params=params)
    response.raise_for_status()

    return response.json()

def save_data(data: dict, output_dir: str = "data"):
    """Save trading calendar data to JSON and Parquet files."""
    os.makedirs(output_dir, exist_ok=True)

    # Save as JSON
    json_path = os.path.join(output_dir, "trading_calendar.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved JSON file: {json_path}")

    # Convert to DataFrame and save as Parquet
    if "trading_calendar" in data:
        df = pd.DataFrame(data["trading_calendar"])

        # Convert Date column to datetime
        df["Date"] = pd.to_datetime(df["Date"])

        # Convert HolidayDivision to integer
        df["HolidayDivision"] = df["HolidayDivision"].astype(int)

        parquet_path = os.path.join(output_dir, "trading_calendar.parquet")
        df.to_parquet(parquet_path, index=False)
        print(f"✓ Saved Parquet file: {parquet_path}")

        # Display summary
        print(f"\nData summary:")
        print(f"  Total records: {len(df)}")
        print(f"  Date range: {df['Date'].min()} to {df['Date'].max()}")
        print(f"  Trading days (HolidayDivision=1): {len(df[df['HolidayDivision'] == 1])}")
        print(f"  Holidays (HolidayDivision=0): {len(df[df['HolidayDivision'] == 0])}")

def main():
    # Load environment variables from .env.jquants file
    load_dotenv(".env.jquants")

    # Get refresh token from environment variable
    refresh_token = os.getenv("JQUANTS_REFRESH_TOKEN")

    if not refresh_token:
        print("Error: JQUANTS_REFRESH_TOKEN environment variable is not set.")
        print("\nPlease set it in .env.jquants file or using:")
        print("  export JQUANTS_REFRESH_TOKEN='your_refresh_token_here'")
        return 1

    try:
        print("Authenticating with J-Quants API...")
        id_token = get_id_token(refresh_token)
        print("✓ Authentication successful")

        # Fetch trading calendar for the last 2 years and next 1 year
        from_date = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")

        print(f"\nFetching trading calendar from {from_date} to {to_date}...")
        data = fetch_trading_calendar(id_token, from_date, to_date)
        print("✓ Data fetched successfully")

        print("\nSaving data...")
        save_data(data)

        print("\n✓ All done!")
        return 0

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response: {e.response.text}")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
