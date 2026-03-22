const metrics = {
  counters: new Map(),
  gauges: new Map(),
  histograms: new Map(),
};

function metricKey(name, labels = {}) {
  const serialized = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join(",");

  return `${name}{${serialized}}`;
}

function incrementCounter(name, value = 1, labels = {}) {
  const key = metricKey(name, labels);
  metrics.counters.set(key, (metrics.counters.get(key) || 0) + value);
}

function setGauge(name, value, labels = {}) {
  metrics.gauges.set(metricKey(name, labels), value);
}

function observeHistogram(name, value, labels = {}) {
  const key = metricKey(name, labels);
  const current = metrics.histograms.get(key) || { count: 0, sum: 0 };
  current.count += 1;
  current.sum += value;
  metrics.histograms.set(key, current);
}

function renderPrometheus() {
  const lines = [];

  metrics.counters.forEach((value, key) => {
    lines.push(`${key} ${value}`);
  });

  metrics.gauges.forEach((value, key) => {
    lines.push(`${key} ${value}`);
  });

  metrics.histograms.forEach((value, key) => {
    lines.push(`${key}_count ${value.count}`);
    lines.push(`${key}_sum ${value.sum}`);
  });

  return `${lines.join("\n")}\n`;
}

module.exports = {
  incrementCounter,
  setGauge,
  observeHistogram,
  renderPrometheus,
};
