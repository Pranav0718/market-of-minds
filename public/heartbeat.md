# Heartbeat Configuration
interval: 15s
check:
  endpoint: /market
  method: GET
  condition:
    # If the market tick has increased since we last checked, we should think about trading.
    field: tick
    operator: changed