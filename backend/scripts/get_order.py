#!/usr/bin/env python3
"""Simple script to fetch a single order from Supabase for integration testing.
Usage:
  python get_order.py --order-id <order_id>
  python get_order.py            # fetch most recent order
"""
import argparse
import os
import sys
from typing import Optional

# Ensure the backend package directory is on sys.path so imports like
# `database.supabase_db` work when running this script directly.
from pathlib import Path
SCRIPT_DIR = Path(__file__).resolve().parent
# backend/scripts -> parent is backend
BACKEND_DIR = str(SCRIPT_DIR.parent)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database.supabase_db import create_supabase_client


def _get_db_table(client, table_name: str):
    if hasattr(client, "table"):
        return client.table(table_name)
    if hasattr(client, "from_"):
        return client.from_(table_name)
    # last resort
    return getattr(client, "table")(table_name)


def main(order_id: Optional[str]):
    client = None
    try:
        client = create_supabase_client()
    except Exception as e:
        print(f"Failed to create Supabase client: {e}")
        sys.exit(2)

    if client is None:
        print("Supabase client is not configured. Ensure PROJECT_URL and API_KEY (or NEXT_PUBLIC_* envs) are set.")
        sys.exit(2)

    try:
        table = _get_db_table(client, "orders")
    except Exception as e:
        print(f"Supabase client does not expose expected query methods: {e}")
        sys.exit(2)

    try:
        if order_id:
            resp = table.select("*").eq("order_id", order_id).execute()
        else:
            # fetch most recent order
            resp = table.select("*").order("created_at", desc=True).range(0, 0).execute()

        # supabase python client returns an object with `data` attribute
        data = getattr(resp, "data", None)
        if not data:
            print("No order found.")
            sys.exit(1)

        # print pretty result
        import json

        print(json.dumps(data[0], indent=2, default=str))
        return 0

    except Exception as e:
        print(f"Query failed: {e}")
        sys.exit(2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--order-id", dest="order_id", help="Order ID to fetch (optional)")
    args = parser.parse_args()
    sys.exit(main(args.order_id))
