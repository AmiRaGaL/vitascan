import unittest

from app.evals.metrics import (
    average_latency_ms,
    citation_rate,
    fallback_rate,
    json_validity_rate,
    red_flag_recall,
    triage_accuracy,
)


class EvalMetricsTest(unittest.TestCase):
    def test_metrics_calculations(self):
        results = [
            {
                "expected_triage_level": "home_care",
                "predicted_triage_level": "home_care",
                "expected_red_flag": False,
                "red_flag_matched": False,
                "citation_count": 1,
                "json_valid": True,
                "fallback_used": False,
                "latency_ms": 10,
            },
            {
                "expected_triage_level": "emergency",
                "predicted_triage_level": "primary_care",
                "expected_red_flag": True,
                "red_flag_matched": True,
                "citation_count": 0,
                "json_valid": False,
                "fallback_used": True,
                "latency_ms": 30,
            },
        ]

        self.assertEqual(triage_accuracy(results), 0.5)
        self.assertEqual(red_flag_recall(results), 1.0)
        self.assertEqual(citation_rate(results), 0.5)
        self.assertEqual(json_validity_rate(results), 0.5)
        self.assertEqual(fallback_rate(results), 0.5)
        self.assertEqual(average_latency_ms(results), 20.0)
