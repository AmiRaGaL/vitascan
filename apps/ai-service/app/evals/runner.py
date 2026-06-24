import asyncio
import argparse
import json
from asyncio import sleep
from pathlib import Path
from time import perf_counter

from app.agents.red_flag import detect_red_flags
from app.agents.symptom_intake import normalize_symptoms
from app.agents.triage_decision import decide_triage
from app.evals.metrics import calculate_metrics
from app.schemas.triage import HealthProfile


CASES_PATH = Path(__file__).with_name("cases.json")
LATEST_RESULT: dict | None = None


def load_cases() -> list[dict]:
    return json.loads(CASES_PATH.read_text(encoding="utf-8"))


async def run_eval(
    mode: str = "mock",
    limit: int | None = None,
    case_id: str | None = None,
    delay_seconds: float | None = None,
) -> dict:
    if mode not in {"mock", "live"}:
        raise ValueError("mode must be mock or live")
    if limit is not None and limit < 1:
        raise ValueError("limit must be greater than 0")

    cases = filter_cases(load_cases(), limit=limit, case_id=case_id)
    delay = default_delay_seconds(mode, delay_seconds)
    results = []
    for index, case in enumerate(cases, start=1):
        if mode == "live":
            print(f"Running case {index}/{len(cases)}: {case['id']}", flush=True)

        started_at = perf_counter()
        normalized = normalize_symptoms(case["message"])
        red_flags = detect_red_flags(normalized)
        fallback_reason = None

        if mode == "mock":
            prediction = mock_prediction(case, red_flags.matched)
            citation_count = 0
            json_valid = True
            fallback_used = False
            follow_up_count = len(prediction["follow_up_questions"])
        else:
            decision = await decide_triage(
                normalized=normalized,
                health_profile=HealthProfile(),
                retrieved_chunks=[],
                red_flags=red_flags,
            )
            prediction = {
                "triage_level": decision.triage_level,
                "follow_up_questions": decision.follow_up_questions,
            }
            citation_count = len(decision.evidence_ids)
            json_valid = decision.validation_passed
            fallback_used = decision.fallback_used
            fallback_reason = (
                decision.reasoning[0]
                if decision.fallback_used and decision.reasoning
                else None
            )
            follow_up_count = len(decision.follow_up_questions)

        latency_ms = int((perf_counter() - started_at) * 1000)
        if mode == "live":
            print(
                f"Finished case {case['id']} in {latency_ms} ms: "
                f"triage={prediction['triage_level']}, "
                f"fallback={fallback_used}, "
                f"fallback_reason={fallback_reason}",
                flush=True,
            )

        results.append(
            {
                "case_id": case["id"],
                "category": case["category"],
                "expected_triage_level": case["expected_triage_level"],
                "predicted_triage_level": prediction["triage_level"],
                "expected_red_flag": case["expected_red_flag"],
                "red_flag_matched": red_flags.matched,
                "expected_follow_up_needed": case["expected_follow_up_needed"],
                "follow_up_question_count": follow_up_count,
                "citation_count": citation_count,
                "json_valid": json_valid,
                "fallback_used": fallback_used,
                "fallback_reason": fallback_reason,
                "latency_ms": latency_ms,
            }
        )

        if mode == "live" and delay > 0 and index < len(cases):
            await sleep(delay)

    report = {
        "mode": mode,
        "case_count": len(cases),
        "metrics": calculate_metrics(results),
        "results": results,
    }
    set_latest_result(report)
    return report


def filter_cases(
    cases: list[dict],
    limit: int | None = None,
    case_id: str | None = None,
) -> list[dict]:
    if case_id:
        cases = [case for case in cases if case["id"] == case_id]

    if limit is not None:
        cases = cases[:limit]

    return cases


def default_delay_seconds(mode: str, delay_seconds: float | None) -> float:
    if delay_seconds is not None:
        return delay_seconds

    return 3.0 if mode == "live" else 0.0


def mock_prediction(case: dict, red_flag_matched: bool) -> dict:
    if red_flag_matched:
        return {"triage_level": "emergency", "follow_up_questions": []}

    if case["category"] == "ambiguous":
        return {
            "triage_level": "primary_care",
            "follow_up_questions": [
                "Can you describe the main symptom, timing, and severity?"
            ],
        }

    return {"triage_level": case["expected_triage_level"], "follow_up_questions": []}


def set_latest_result(report: dict) -> None:
    global LATEST_RESULT
    LATEST_RESULT = report


def get_latest_result() -> dict | None:
    return LATEST_RESULT


def format_report(report: dict) -> str:
    metrics = report["metrics"]
    lines = [
        "VitaScan AI Triage Eval Report",
        f"Mode: {report['mode']}",
        f"Cases: {report['case_count']}",
        "",
        "Metrics:",
    ]
    for key, value in metrics.items():
        if key == "average_latency_ms":
            lines.append(f"- {key}: {value:.1f} ms")
        else:
            lines.append(f"- {key}: {value:.2%}")

    failures = [
        result
        for result in report["results"]
        if result["predicted_triage_level"] != result["expected_triage_level"]
    ]
    if failures:
        lines.extend(["", "Triage mismatches:"])
        for failure in failures:
            lines.append(
                f"- {failure['case_id']}: expected {failure['expected_triage_level']}, "
                f"got {failure['predicted_triage_level']}"
            )

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["mock", "live"], default="mock")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--case-id", default=None)
    parser.add_argument("--delay-seconds", type=float, default=None)
    args = parser.parse_args()

    report = asyncio.run(
        run_eval(
            mode=args.mode,
            limit=args.limit,
            case_id=args.case_id,
            delay_seconds=args.delay_seconds,
        )
    )
    print(format_report(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
