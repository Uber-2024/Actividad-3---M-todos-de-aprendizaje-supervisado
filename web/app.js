// Se definen los elementos del DOM que se van a manipular para controlar la interfaz.
const sampleSizeInput = document.getElementById('sampleSize');
const seedInput = document.getElementById('seed');
const generateBtn = document.getElementById('generateBtn');
const trainBtn = document.getElementById('trainBtn');
// Referencia al control que limpia los resultados visibles de la página.
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const statusBox = document.getElementById('status');
const resultBox = document.getElementById('resultBox');
const chartBox = document.getElementById('chart');
const emptyState = document.getElementById('emptyState');
const maeSummary = document.getElementById('maeSummary');
const rmseSummary = document.getElementById('rmseSummary');
const r2Summary = document.getElementById('r2Summary');
const winnerBadge = document.getElementById('winnerBadge');
const comparisonTable = document.getElementById('comparisonTable');
let lastMetrics = null;

// Unifica las métricas que llegan del entrenamiento y las cargadas desde el archivo guardado.
function readMetricsSource(data) {
  return data && (data.results || data.models) ? (data.results || data.models) : {};
}

// Actualiza el estado visual del panel de mensajes para informar al usuario de éxito o error.
function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.style.background = isError ? 'rgba(239, 68, 68, 0.14)' : 'rgba(59, 130, 246, 0.15)';
  statusBox.style.borderColor = isError ? 'rgba(248, 113, 113, 0.3)' : 'rgba(96, 165, 250, 0.3)';
}

// Muestra el JSON recibido en el panel de salida para facilitar la depuración.
function renderJson(data) {
  resultBox.textContent = JSON.stringify(data, null, 2);
}

// Devuelve el método con el menor error promedio y sus métricas asociadas.
function findBestModel(data) {
  const metricsSource = readMetricsSource(data);
  const models = [
    { name: 'Referencia simple (mediana)', metrics: metricsSource.baseline_median },
    { name: 'Regresión lineal', metrics: metricsSource.linear_regression },
    { name: 'Bosque aleatorio', metrics: metricsSource.random_forest },
  ].filter((model) => typeof model.metrics?.mae_minutes === 'number');

  return models.reduce((best, current) =>
    !best || current.metrics.mae_minutes < best.metrics.mae_minutes ? current : best, null);
}

// Presenta los valores del método ganador según el error promedio.
function updateSummary(metrics) {
  const bestModel = findBestModel(metrics);
  if (!bestModel) {
    maeSummary.textContent = '-';
    rmseSummary.textContent = '-';
    r2Summary.textContent = '-';
    return;
  }

  maeSummary.textContent = `${bestModel.metrics.mae_minutes} min`;
  rmseSummary.textContent = `${bestModel.metrics.rmse_minutes} min`;
  r2Summary.textContent = bestModel.metrics.r2.toFixed(3);
}

// Compara los tres indicadores entre métodos y crea un panel explicativo para cada uno.
function buildChart(metrics) {
  const metricsSource = readMetricsSource(metrics);

  if (!findBestModel(metrics)) {
    chartBox.innerHTML = '';
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  // Asocia cada métrica con su nombre sencillo, explicación y dirección deseable.
  const metricConfig = [
    { key: 'mae_minutes', label: 'Error promedio', help: 'Cuántos minutos suele fallar.', better: 'lower', color: '#22d3ee' },
    { key: 'rmse_minutes', label: 'Errores grandes', help: 'Penaliza más los fallos muy alejados.', better: 'lower', color: '#fbbf24' },
    { key: 'r2', label: 'Qué tanto explica', help: 'Cerca de 1 es mejor; puede ser negativo.', better: 'higher', color: '#34d399' },
  ];

  const modelOrder = ['baseline_median', 'linear_regression', 'random_forest'];
  const namesMap = {
    baseline_median: 'Referencia simple',
    linear_regression: 'Regresión lineal',
    random_forest: 'Bosque aleatorio',
  };

  const colors = ['#64748b', '#22d3ee', '#34d399'];

  chartBox.innerHTML = metricConfig
    .map(({ key, label, help, better, color }) => {
      const values = modelOrder.map((modelName) => metricsSource[modelName]?.[key]);
      const numericValues = values.filter((value) => typeof value === 'number');
      const lower = Math.min(...numericValues);
      const upper = Math.max(...numericValues);

      const modelRows = modelOrder
        .map((modelName, index) => {
          const value = metricsSource[modelName]?.[key];
          const displayValue = typeof value !== 'number'
            ? 'Sin dato'
            : key === 'r2'
              ? value.toFixed(3)
              : `${value.toFixed(2)} min`;

          return `
            <div class="model-row">
              <span><span class="tag" style="background:${colors[index]};"></span>${namesMap[modelName]}</span>
              <strong>${displayValue}</strong>
            </div>
          `;
        })
        .join('');

      const winnerValue = modelOrder
        .map((modelName) => metricsSource[modelName]?.[key])
        .filter((value) => typeof value === 'number')
        .reduce((best, current) => {
          if (better === 'lower') return Math.min(best, current);
          return Math.max(best, current);
        }, better === 'lower' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);

      const displayValue = key === 'r2'
        ? winnerValue.toFixed(3)
        : `${winnerValue.toFixed(2)} min`;
      const percent = better === 'lower'
        ? Math.max(20, 100 - ((winnerValue - lower) / Math.max(upper - lower || 1, 1)) * 100)
        : Math.max(20, ((winnerValue - lower) / Math.max(upper - lower || 1, 1)) * 100);

      return `
        <div class="metric-panel">
          <h3>${label}</h3>
          <p class="metric-help">${help}</p>
          <div class="metric-body">
            <div class="donut" style="--value:${percent}; --color:${color};">
              <span class="donut-value">${displayValue}</span>
            </div>
            <div class="model-list">
              ${modelRows}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

// Explica cuál método logra el menor error promedio.
function updateWinnerBadge(data) {
  const bestModel = findBestModel(data);
  if (!bestModel) {
    winnerBadge.textContent = 'Aún no hay resultados';
    return;
  }

  winnerBadge.textContent = `La predicción más cercana es ${bestModel.name}: se desvía ${bestModel.metrics.mae_minutes} minutos en promedio.`;
}

// Genera la tabla comparativa de modelos y resalta la fila del mejor rendimiento.
function renderComparisonTable(data) {
  const metricsSource = readMetricsSource(data);

  if (!findBestModel(data)) {
    comparisonTable.innerHTML = '<tbody><tr><td colspan="4">Primero crea viajes y luego compara las predicciones.</td></tr></tbody>';
    return;
  }

  const rows = [
    { name: 'Referencia simple (mediana)', values: metricsSource.baseline_median },
    { name: 'Regresión lineal', values: metricsSource.linear_regression },
    { name: 'Bosque aleatorio', values: metricsSource.random_forest },
  ];

  const best = rows.reduce((winner, current) => {
    if (!current.values) return winner;
    if (!winner.values) return current;
    return current.values.mae_minutes < winner.values.mae_minutes ? current : winner;
  }, { name: '', values: null });

  comparisonTable.innerHTML = `
    <thead>
      <tr>
        <th>Método</th>
        <th>Error promedio (min)</th>
        <th>Errores grandes (min)</th>
        <th>Qué tanto explica (R²)</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr class="${row.name === best.name ? 'winner-row' : ''}">
          <td>${row.name}</td>
          <td>${row.values ? `${row.values.mae_minutes} min` : '-'}</td>
          <td>${row.values ? `${row.values.rmse_minutes} min` : '-'}</td>
          <td>${row.values ? row.values.r2.toFixed(3) : '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

// Coordina la actualización completa de la vista al recibir las métricas del backend.
function renderMetrics(data) {
  renderJson(data);
  updateSummary(data);
  buildChart(data);
  updateWinnerBadge(data);
  renderComparisonTable(data);
  lastMetrics = data;
}

// Restablece los resultados visibles sin borrar el dataset ni los artefactos guardados.
function clearResults() {
  lastMetrics = null;
  renderJson({ status: 'idle' });
  updateSummary(null);
  buildChart(null);
  updateWinnerBadge(null);
  renderComparisonTable(null);
  setStatus('Resultados borrados. Crea viajes de ejemplo para empezar otra prueba.');
}

// Solicita al servidor un archivo Excel con las métricas del entrenamiento actual.
async function exportComparison() {
  if (!findBestModel(lastMetrics)) {
    setStatus('Primero crea los viajes y compara las predicciones; después podrás descargar el Excel.', true);
    return;
  }

  setStatus('Preparando archivo Excel...');

  try {
    // Envía las métricas actuales al backend para construir el archivo .xlsx.
    const response = await fetch('/api/export-comparison', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lastMetrics),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'No se pudo exportar la comparación.');
    }

    // Convierte la respuesta binaria en una descarga iniciada por el navegador.
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comparacion_modelos.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Comparación exportada como archivo Excel (.xlsx).');
  } catch (error) {
    setStatus(error.message, true);
  }
}

// Realiza la llamada al backend para generar el dataset sintético con la semilla y tamaño indicados.
async function generateDataset() {
  const sampleSize = Number(sampleSizeInput.value);
  const seed = Number(seedInput.value);

  if (!Number.isInteger(sampleSize) || sampleSize < 50 || sampleSize > 10000) {
    setStatus('Escribe una cantidad entera de viajes entre 50 y 10 000.', true);
    sampleSizeInput.focus();
    return;
  }

  if (!Number.isInteger(seed) || seed < 1 || seed > 9999) {
    setStatus('Escribe un número entero entre 1 y 9 999 para repetir la prueba.', true);
    seedInput.focus();
    return;
  }

  const payload = {
    sample_size: sampleSize,
    seed,
  };

  setStatus('Creando viajes de ejemplo...');

  try {
    const response = await fetch('/api/generate-dataset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron crear los viajes de ejemplo.');
    }

    clearResults();
    renderJson(data);
    setStatus(`${data.sample_size} viajes creados. Ahora pulsa “Comparar predicciones”.`);
  } catch (error) {
    renderJson({ error: error.message });
    setStatus(error.message, true);
  }
}

// Ejecuta el entrenamiento del modelo desde el backend y recoge los resultados para mostrarlos.
async function trainModel() {
  setStatus('Comparando las predicciones...');

  try {
    const response = await fetch('/api/train-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron comparar las predicciones.');
    }

    renderMetrics(data);
    const bestModel = findBestModel(data);
    setStatus(bestModel
      ? `Comparación lista. La predicción más cercana es ${bestModel.name}.`
      : 'La comparación terminó, pero no hay métricas para mostrar.');
  } catch (error) {
    renderJson({ error: error.message });
    setStatus(error.message, true);
  }
}

// Carga las métricas almacenadas para mostrar de inmediato el último resultado disponible.
async function loadMetrics() {
  try {
    const response = await fetch('/api/metrics');
    const data = await response.json();
    renderMetrics(data);
    setStatus(findBestModel(data)
      ? 'Se cargaron resultados anteriores. Puedes crear otra prueba o descargar el Excel.'
      : 'Para empezar, crea los viajes de ejemplo.');
  } catch (error) {
    renderJson({ error: 'No se pudieron cargar las métricas.' });
    setStatus('No se pudieron cargar los resultados anteriores. Puedes crear una prueba nueva.', true);
  }
}

// Registra los eventos de la interfaz para cada botón disponible.
generateBtn.addEventListener('click', generateDataset);
trainBtn.addEventListener('click', trainModel);
// Ejecuta el restablecimiento visual cuando el usuario pulsa "Limpiar resultados".
clearBtn.addEventListener('click', clearResults);
exportBtn.addEventListener('click', exportComparison);

// Inicializa la vista con el estado base y carga cualquier métrica previa.
updateWinnerBadge(null);
loadMetrics();
