import asyncio
import subprocess
import sys
import unittest
from unittest.mock import patch

from app.evals.runner import run_eval
from app.schemas.triage import TriageDecision


class EvalRunnerTest(unittest.TestCase):
    def test_emergency_red_flag_recall(self):
        report = asyncio.run(run_eval(mode="mock"))

        self.assertEqual(report["case_count"], 30)
        self.assertEqual(report["metrics"]["red_flag_recall"], 1.0)

    def test_mock_runner_exits_successfully(self):
        result = subprocess.run(
            [sys.executable, "-m", "app.evals.runner", "--mode", "mock"],
            cwd=".",
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("VitaScan AI Triage Eval Report", result.stdout)

    def test_limit_filters_cases(self):
        report = asyncio.run(run_eval(mode="mock", limit=3))

        self.assertEqual(report["case_count"], 3)
        self.assertEqual(
            [result["case_id"] for result in report["results"]],
            [
                "home_001",
                "home_002",
                "home_003",
            ],
        )

    def test_case_id_filters_one_case(self):
        report = asyncio.run(run_eval(mode="mock", case_id="urgent_003"))

        self.assertEqual(report["case_count"], 1)
        self.assertEqual(report["results"][0]["case_id"], "urgent_003")

    def test_live_rate_limit_fallback_reason_is_reported(self):
        async def rate_limited_decision(**kwargs):
            return TriageDecision(
                triage_level="primary_care",
                confidence=0.45,
                reasoning=["groq_rate_limited", "Using conservative fallback."],
                evidence_ids=[],
                follow_up_questions=[],
                safety_override_applied=False,
                validation_passed=False,
                fallback_used=True,
            )

        with patch("app.evals.runner.decide_triage", side_effect=rate_limited_decision):
            report = asyncio.run(
                run_eval(
                    mode="live",
                    case_id="home_001",
                    delay_seconds=0,
                )
            )

        self.assertEqual(report["case_count"], 1)
        self.assertTrue(report["results"][0]["fallback_used"])
        self.assertEqual(report["results"][0]["fallback_reason"], "groq_rate_limited")
