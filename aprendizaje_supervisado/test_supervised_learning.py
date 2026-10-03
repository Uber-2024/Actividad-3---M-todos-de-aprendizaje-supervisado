"""Pruebas del flujo de aprendizaje supervisado del proyecto."""

import unittest

import pandas as pd

from generate_dataset import FIELDNAMES, generate_dataset
from train_model import FEATURES, TARGET, train_and_evaluate


class SupervisedLearningTests(unittest.TestCase):
    """Valida que el dataset y el entrenamiento del modelo cumplen los requisitos básicos."""

    @classmethod
    def setUpClass(cls):
        """Genera el dataset una sola vez antes de ejecutar las pruebas de la clase."""
        cls.dataset_path = generate_dataset()
        cls.dataset = pd.read_csv(cls.dataset_path)

    def test_dataset_has_expected_shape_and_valid_durations(self):
        """Comprueba que el CSV tiene la estructura esperada y duraciones coherentes."""
        self.assertEqual(list(self.dataset.columns), FIELDNAMES)
        self.assertEqual(len(self.dataset), 1200)
        self.assertTrue((self.dataset["actual_minutes"] >= self.dataset["planned_minutes"]).all())

    def test_training_uses_only_available_prediction_features(self):
        """Verifica que el entrenamiento usa únicamente características válidas y mejora sobre el baseline."""
        self.assertNotIn(TARGET, FEATURES)
        results = train_and_evaluate()
        self.assertEqual(
            set(results), {"baseline_median", "linear_regression", "random_forest"}
        )
        self.assertLess(
            results["random_forest"]["mae_minutes"],
            results["baseline_median"]["mae_minutes"],
        )


if __name__ == "__main__":
    unittest.main()