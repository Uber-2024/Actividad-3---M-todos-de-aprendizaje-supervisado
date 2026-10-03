"""Entrena y compara modelos de regresión supervisada para estimar tiempos de viaje.

La lógica principal consiste en cargar el dataset sintético, preparar las
características numéricas y categóricas, entrenar varios modelos y guardar
las métricas de rendimiento para comparar su calidad.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

PROJECT_DIR = Path(__file__).resolve().parent
DATA_PATH = PROJECT_DIR / "data" / "trips.csv"
OUTPUT_DIR = PROJECT_DIR / "artifacts"
TARGET = "actual_minutes"
CATEGORICAL_FEATURES = ["origin", "destination"]
NUMERIC_FEATURES = [
    "planned_minutes",
    "departure_hour",
    "weekday",
    "is_weekend",
    "rain_mm",
    "occupancy_level",
    "incident",
    "transfers",
]
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def create_preprocessor(scale_numeric: bool) -> ColumnTransformer:
    """Prepara el flujo de transformación de características para los modelos.

    Args:
        scale_numeric: si es True, normaliza las columnas numéricas con StandardScaler.

    Returns:
        Un ColumnTransformer que aplica imputación y codificación adecuadas.
    """
    numeric_steps = [("imputer", SimpleImputer(strategy="median"))]
    if scale_numeric:
        numeric_steps.append(("scaler", StandardScaler()))
    numeric_pipeline = Pipeline(numeric_steps)
    categorical_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        [
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )


def evaluate(y_true: pd.Series, predictions) -> dict[str, float]:
    """Calcula las métricas principales del problema de regresión.

    Args:
        y_true: valores reales del objetivo.
        predictions: predicciones generadas por el modelo.

    Returns:
        Diccionario con MAE, RMSE y coeficiente R² redondeados.
    """
    return {
        "mae_minutes": round(float(mean_absolute_error(y_true, predictions)), 3),
        "rmse_minutes": round(float(mean_squared_error(y_true, predictions) ** 0.5), 3),
        "r2": round(float(r2_score(y_true, predictions)), 4),
    }


def train_and_evaluate() -> dict[str, dict[str, float]]:
    """Entrena los modelos y genera el reporte de resultados.

    Returns:
        Un diccionario con las métricas por modelo: baseline, regresión lineal y bosque aleatorio.
    """
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"No existe {DATA_PATH}. Ejecute primero generate_dataset.py."
        )

    # Carga del dataset y partición 80/20 para entrenamiento y validación.
    data = pd.read_csv(DATA_PATH)
    X_train, X_test, y_train, y_test = train_test_split(
        data[FEATURES], data[TARGET], test_size=0.2, random_state=42
    )

    # Definición de los modelos que se comparan en la evaluación.
    models = {
        "baseline_median": Pipeline(
            [
                ("preprocessor", create_preprocessor(scale_numeric=False)),
                ("model", DummyRegressor(strategy="median")),
            ]
        ),
        "linear_regression": Pipeline(
            [
                ("preprocessor", create_preprocessor(scale_numeric=True)),
                ("model", LinearRegression()),
            ]
        ),
        "random_forest": Pipeline(
            [
                ("preprocessor", create_preprocessor(scale_numeric=False)),
                (
                    "model",
                    RandomForestRegressor(
                        n_estimators=250,
                        min_samples_leaf=2,
                        random_state=42,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
    }

    results: dict[str, dict[str, float]] = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        results[name] = evaluate(y_test, model.predict(X_test))

    # Persistencia de artefactos para análisis posterior.
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(models["random_forest"], OUTPUT_DIR / "random_forest.joblib")
    report = {
        "dataset": str(DATA_PATH.relative_to(PROJECT_DIR)),
        "rows": len(data),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "target": TARGET,
        "features": FEATURES,
        "data_origin": "synthetic, generated from network.json and assumed delays",
        "models": results,
    }
    (OUTPUT_DIR / "metrics.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return results


if __name__ == "__main__":
    # Muestra las métricas de cada modelo al ejecutar este archivo de forma directa.
    for model_name, metrics in train_and_evaluate().items():
        print(
            f"{model_name}: MAE={metrics['mae_minutes']} min | "
            f"RMSE={metrics['rmse_minutes']} min | R2={metrics['r2']}"
        )