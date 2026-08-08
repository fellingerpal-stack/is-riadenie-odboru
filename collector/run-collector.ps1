param([string]$Config = ".\config.json")
$ErrorActionPreference = "Stop"
python .\cvti_asset_collector.py --config $Config
