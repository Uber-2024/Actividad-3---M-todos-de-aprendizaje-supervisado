# Proyecto de aprendizaje supervisado

Este proyecto está diseñado para entrenar y comparar modelos de regresión que predicen la duración real de un viaje en un sistema de transporte. La idea principal es generar un dataset sintético a partir de una red de estaciones, entrenar varios modelos y evaluar cuál ofrece mejor rendimiento usando métricas como MAE, RMSE y R².

## 1. Objetivo del proyecto

El sistema busca responder a una pregunta concreta:

> ¿Cuánto tardará un viaje real según la ruta planificada, la hora del día, el clima, la ocupación y otras condiciones operativas?

Para resolverlo, se trabaja con variables como:

- origen y destino
- tiempo planificado del viaje
- hora de salida
- día de la semana
- si es fin de semana
- lluvia
- nivel de ocupación
- si hay incidencia
- número de transbordos
- duración real observada del viaje

La solución compara tres modelos:

- baseline con mediana
- regresión lineal
- random forest

## 2. Cómo está organizado el proyecto

- [app.py](app.py): contiene las clases y la lógica para calcular rutas de transporte.
- [network.json](network.json): define la red de estaciones y conexiones que se usa para crear viajes sintéticos.
- [aprendizaje_supervisado/generate_dataset.py](aprendizaje_supervisado/generate_dataset.py): crea viajes sintéticos reproducibles a partir de la red.
- [aprendizaje_supervisado/train_model.py](aprendizaje_supervisado/train_model.py): prepara los datos, compara los modelos y guarda las métricas.
- [aprendizaje_supervisado/test_supervised_learning.py](aprendizaje_supervisado/test_supervised_learning.py): valida la integridad del dataset y el flujo principal.
- [aprendizaje_supervisado/data/trips.csv](aprendizaje_supervisado/data/trips.csv): archivo generado con los viajes sintéticos.
- [aprendizaje_supervisado/artifacts/metrics.json](aprendizaje_supervisado/artifacts/metrics.json): resultados finales de evaluación.
- [aprendizaje_supervisado/artifacts/random_forest.joblib](aprendizaje_supervisado/artifacts/random_forest.joblib): modelo serializado de Random Forest.
- [web_app.py](web_app.py): servidor web que sirve la interfaz y atiende las operaciones de prueba y exportación.
- [web/index.html](web/index.html): interfaz principal.
- [web/styles.css](web/styles.css): estilos visuales del dashboard.
- [web/app.js](web/app.js): valida las opciones, coordina las acciones y presenta resultados en lenguaje sencillo.

## 3. Flujo completo del proyecto

El proyecto sigue este flujo lógico:

1. Se define la red de transporte en [network.json](network.json).
2. El archivo [aprendizaje_supervisado/generate_dataset.py](aprendizaje_supervisado/generate_dataset.py) calcula rutas válidas entre estaciones.
3. Se genera un dataset sintético de viajes con variables reales simuladas, como lluvia, ocupación e incidencias.
4. El script [aprendizaje_supervisado/train_model.py](aprendizaje_supervisado/train_model.py) divide los datos en entrenamiento y prueba.
5. Se entrenan varios modelos de regresión y se comparan sus métricas.
6. Se guarda el reporte de resultados en [aprendizaje_supervisado/artifacts/metrics.json](aprendizaje_supervisado/artifacts/metrics.json).
7. La interfaz web en [web/index.html](web/index.html) permite ejecutar estos pasos desde el navegador.

## 4. Requisitos previos

Necesitas tener Python 3 instalado y las dependencias del proyecto.

Primero, desde la carpeta raíz del proyecto, instala las librerías:

```powershell
python -m pip install -r .\aprendizaje_supervisado\requirements.txt
```

Las dependencias principales son:

- `pandas`: lectura y manejo tabular del dataset.
- `scikit-learn`: preprocesamiento, entrenamiento y evaluación de los modelos.
- `joblib`: guardado del modelo entrenado.
- `openpyxl`: creación del archivo de comparación en formato Excel (`.xlsx`).

## 5. Paso a paso: ejecutar el proyecto sin la interfaz web

### Paso 1: crear un entorno virtual (opcional, recomendado)

```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
```

### Paso 2: instalar dependencias

```powershell
python -m pip install -r .\aprendizaje_supervisado\requirements.txt
```

### Paso 3: generar el dataset sintético

```powershell
python .\aprendizaje_supervisado\generate_dataset.py
```

Esto crea o actualiza el archivo:

- [aprendizaje_supervisado/data/trips.csv](aprendizaje_supervisado/data/trips.csv)

Este script:

- lee la red desde [network.json](network.json)
- calcula rutas entre estaciones
- genera registros aleatorios con semilla fija
- agrega columnas como hora, lluvia, ocupación, incidencias y duración real simulada

### Paso 4: entrenar los modelos

```powershell
python .\aprendizaje_supervisado\train_model.py
```

Esto:

- carga el CSV generado
- separa datos de entrenamiento y prueba
- compara tres modelos
- calcula MAE, RMSE y R²
- guarda resultados en [aprendizaje_supervisado/artifacts/metrics.json](aprendizaje_supervisado/artifacts/metrics.json)
- serializa el modelo de Random Forest en [aprendizaje_supervisado/artifacts/random_forest.joblib](aprendizaje_supervisado/artifacts/random_forest.joblib)

### Paso 5: validar el flujo con pruebas automáticas

```powershell
python -m unittest discover -s aprendizaje_supervisado -v
```

Las pruebas comprueban que:

- el dataset tiene la estructura esperada
- la columna objetivo existe
- el entrenamiento usa solo variables válidas
- el flujo principal no rompe la integridad del proyecto

## 6. Paso a paso: usar la interfaz web

La interfaz permite probar el proyecto sin escribir comandos manuales. Las operaciones se realizan en orden: crear ejemplos, comparar predicciones y, si se desea, descargar la comparación.

### Paso 1: arrancar el servidor

Desde la raíz del proyecto:

```powershell
python .\web_app.py
```

Si todo está bien, verás un mensaje similar a:

```text
Servidor web activo en http://127.0.0.1:8001
```

### Paso 2: abrir la aplicación

En el navegador accede a:

```text
http://127.0.0.1:8001
```

### Paso 3: elegir las opciones

La pantalla permite configurar:

- Cantidad de viajes: cuántos ejemplos sintéticos se crearán, entre 50 y 10 000.
- Número para repetir la prueba: si se mantiene el mismo número, se generan los mismos ejemplos.

### Paso 4: generar el dataset

Haz clic en **Crear viajes de ejemplo**. La aplicación confirma cuántos viajes creó y te indica que continúes con la comparación.

### Paso 5: comparar predicciones

Haz clic en **Comparar predicciones**. El programa prepara y compara tres métodos:

- una referencia simple basada en la mediana
- regresión lineal
- bosque aleatorio

Para comparar, utiliza el conjunto de ejemplos creado. Los ejemplos son sintéticos, no registros reales de viajes.

### Paso 6: entender los resultados

La pantalla explica las cifras y marca el método que tuvo el menor error promedio:

- **Error promedio (MAE):** cuántos minutos se desvía normalmente una predicción. Menos es mejor.
- **Errores grandes (RMSE):** da más peso a las predicciones que se alejan mucho. Menos es mejor.
- **Qué tanto explica (R²):** indica cuánto ayudan las variables a explicar los datos. Cerca de 1 es mejor; puede ser negativo.

Los tres indicadores principales corresponden al método con menor MAE. La tabla y los gráficos permiten comparar cada método. Los datos técnicos están disponibles en **Ver datos técnicos**.

### Paso 7: empezar otra prueba o exportar

Usa **Borrar resultados** para limpiar la comparación visible. Crear nuevos viajes también quita los resultados anteriores para evitar confusiones. **Descargar Excel** guarda un archivo `.xlsx`; la fila del menor MAE queda resaltada.

La interfaz envía las métricas al endpoint `POST /api/export-comparison`. El servidor crea el libro en memoria y lo descarga sin guardar una copia adicional dentro del proyecto. Si aún no hay resultados, la interfaz indica que primero debes crear los ejemplos y compararlos.

## 7. Qué significa cada métrica

### Error promedio (MAE, Mean Absolute Error)

Es la diferencia media absoluta entre el valor real y la predicción.

- Cuanto menor, mejor.
- Indica cuánta desviación tiene el modelo en minutos promedio.

### Errores grandes (RMSE, Root Mean Squared Error)

Es la raíz cuadrada del error cuadrático medio.

- Penaliza más los errores grandes.
- También cuanto más bajo, mejor.

### Qué tanto explica (R², coeficiente de determinación)

Mide qué tan bien el modelo explica la variabilidad del dato.

- Cuanto más cerca de 1, más variación de los datos consigue explicar el modelo.
- Un valor cercano a 0 significa que explica poco; un valor negativo indica que puede funcionar peor que usar una predicción constante.

## 8. Cómo interpretar un resultado exitoso

Un resultado bueno suele presentar:

- MAE bajo
- RMSE bajo
- R² alto

Por ejemplo, si la regresión lineal obtiene un MAE cercano a 2 y un R² cercano a 0.93, eso indica que el modelo predice con bastante precisión los tiempos reales.

## 9. Dependencias y archivos de salida

### Dataset generado

- [aprendizaje_supervisado/data/trips.csv](aprendizaje_supervisado/data/trips.csv)

### Resultados del entrenamiento

- [aprendizaje_supervisado/artifacts/metrics.json](aprendizaje_supervisado/artifacts/metrics.json)

### Modelo entrenado

- [aprendizaje_supervisado/artifacts/random_forest.joblib](aprendizaje_supervisado/artifacts/random_forest.joblib)

## 10. Solución de problemas comunes

### El comando de instalación falla

Verifica que tengas Python 3 y que estés ejecutando el comando desde la raíz del proyecto.

```powershell
python --version
```

### No existe el archivo CSV

Primero genera el dataset:

```powershell
python .\aprendizaje_supervisado\generate_dataset.py
```

### El entrenamiento no encuentra el dataset

Asegúrate de que la carpeta [aprendizaje_supervisado/data](aprendizaje_supervisado/data) exista y que se haya generado el archivo `trips.csv`.

### La interfaz web no abre

Comprueba que el servidor está ejecutándose:

```powershell
python .\web_app.py
```

Y luego entra a:

```text
http://127.0.0.1:8001
```

### El proyecto no carga funciones del backend

Asegúrate de que estás ejecutando el servidor desde la raíz correcta y que la estructura del proyecto no ha sido modificada.

## 11. Resumen práctico

El proyecto sigue una lógica clara:

1. crear red de transporte
2. generar viajes sintéticos
3. entrenar modelos
4. comparar métricas
5. validar resultados
6. probar desde la interfaz web