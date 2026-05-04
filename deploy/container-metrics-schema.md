## Container Metrics OTLP JSON Schema (Alloy -> Kafka)

This Kafka message uses the OpenTelemetry (OTLP) JSON format. OTLP is **metric-first**, meaning it groups by metric name first, not by container. Each metric then contains datapoints, and each datapoint has attributes that identify the container.

### High-level shape

```
{
	"resourceMetrics": [
		{
			"resource": { /* resource-level attributes (often empty) */ },
			"scopeMetrics": [
				{
					"scope": { "name": "otelcol/prometheusreceiver", "version": "..." },
					"metrics": [
						{
							"name": "<metric_name>",
							"gauge"|"sum": {
								"dataPoints": [
									{
										"attributes": [ {"key":"name","value":{"stringValue":"<container>"}} ],
										"timeUnixNano": "<timestamp>",
										"asDouble": <value>
									}
								]
							}
						}
					]
				}
			]
		}
	]
}
```

### How to read it (container-centric)

To view metrics **by container**, iterate all metrics and, for each metric, iterate its datapoints. For each datapoint:

1) Find the container name from `attributes` where `key == "name"` (value is in `value.stringValue`).
2) Store the datapoint value under that container and metric name.

That effectively flips the data from:

```
metric -> datapoints (container names)
```

to:

```
container -> metrics
```

### Basic metrics you kept

These are the only metrics currently emitted:

- `container_cpu_usage_seconds_total`
	- Cumulative CPU seconds used by the container.
	- For CPU rate, compute: `(current - previous) / seconds_between_samples`.
	- CPU percent (optional): `rate * 100`.

- `container_memory_working_set_bytes`
	- Memory working set in bytes (gauge, direct value).

- `container_fs_usage_bytes`
	- Disk usage in bytes (gauge, direct value).

- `container_network_receive_bytes_total`
	- Cumulative bytes received.
	- For network RX rate, compute delta over time.

- `container_network_transmit_bytes_total`
	- Cumulative bytes transmitted.
	- For network TX rate, compute delta over time.

### Notes on fields

- `timeUnixNano`: timestamp for the datapoint (nanoseconds since epoch).
- `asDouble`: numeric value (some metrics are large and still represented as double).
- `resource`: usually empty in your setup because we trimmed resource attributes.
- `metadata`: can be ignored for your use-case.

### Example grouping logic (pseudo-code)

```
containers = {}

for rm in msg.resourceMetrics:
	for sm in rm.scopeMetrics:
		for metric in sm.metrics:
			for dp in metric.gauge.dataPoints:
				name_attr = find(dp.attributes, key == "name")
				container = name_attr.value.stringValue
				containers[container][metric.name] = dp.asDouble
				containers[container]["ts"] = dp.timeUnixNano
```

This produces a container-centric view like:

```
{
	"backend-prod": {
		"container_cpu_usage_seconds_total": 14.95,
		"container_memory_working_set_bytes": 123199488,
		"container_fs_usage_bytes":  ...,
		"container_network_receive_bytes_total": 799468,
		"container_network_transmit_bytes_total": 867076,
		"ts": "1777472002188000000"
	}
}
```

If you want, I can add a tiny consumer to do this reshaping automatically and publish a simplified JSON topic.
