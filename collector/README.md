# CVTI Asset Collector 0.31.2

Collector performs defensive asset discovery only on explicitly configured RFC1918 IPv4 ranges.

## Enriched discovery

When `enrichment.enabled=true`, the collector can add evidence without endpoint credentials:

- reverse DNS / PTR,
- HTTP and HTTPS status, page title and selected response headers,
- TLS protocol, cipher and certificate SHA-256 fingerprint,
- SSH banner,
- local neighbor MAC when the collector host can see the target at layer 2,
- evidence-based family / role / OS hints with confidence.

These are discovery hints, not authoritative CMDB facts. User confirmation remains required before creating or linking an Asset 360 record.

## Secrets

Do not place keys or collector tokens in `config.json`.

PowerShell example:

```powershell
$env:CVTI_SUPABASE_ANON_KEY="sb_publishable_..."
$env:CVTI_DISCOVERY_TOKEN="..."
```

## Dry run

```powershell
python .\cvti_asset_collector.py --config .\config.json --dry-run --output .\preview-enriched.json
```

## Upload

```powershell
python .\cvti_asset_collector.py --config .\config.json
```

## SNMP

SNMP remains optional and disabled by default. Print Fleet can be enabled later with a dedicated read-only community and ACL. SNMP credentials stay only on the collector host.
