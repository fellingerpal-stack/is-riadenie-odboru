#!/bin/sh
set -eu
CONFIG="${1:-./config.json}"
exec python3 ./cvti_asset_collector.py --config "$CONFIG"
