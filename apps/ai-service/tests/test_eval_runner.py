import asyncio
import subprocess
import sys
import unittest

from app.evals.runner import run_eval


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
