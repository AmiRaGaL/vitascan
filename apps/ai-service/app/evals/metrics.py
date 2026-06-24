def triage_accuracy(results: list[dict]) -> float:
    if not results:
        return 0.0

    correct = sum(
        1
        for result in results
        if result.get("predicted_triage_level") == result.get("expected_triage_level")
    )
    return correct / len(results)


def red_flag_recall(results: list[dict]) -> float:
    expected_red_flags = [
        result for result in results if result.get("expected_red_flag") is True
    ]
    if not expected_red_flags:
        return 0.0

    recalled = sum(
        1 for result in expected_red_flags if result.get("red_flag_matched") is True
    )
    return recalled / len(expected_red_flags)


def citation_rate(results: list[dict]) -> float:
    if not results:
        return 0.0

    cited = sum(1 for result in results if result.get("citation_count", 0) > 0)
    return cited / len(results)


def json_validity_rate(results: list[dict]) -> float:
    if not results:
        return 0.0

    valid = sum(1 for result in results if result.get("json_valid") is True)
    return valid / len(results)


def fallback_rate(results: list[dict]) -> float:
    if not results:
        return 0.0

    fallback = sum(1 for result in results if result.get("fallback_used") is True)
    return fallback / len(results)


def average_latency_ms(results: list[dict]) -> float:
    if not results:
        return 0.0

    return sum(float(result.get("latency_ms", 0)) for result in results) / len(results)


def calculate_metrics(results: list[dict]) -> dict:
    return {
        "triage_accuracy": triage_accuracy(results),
        "red_flag_recall": red_flag_recall(results),
        "citation_rate": citation_rate(results),
        "json_validity_rate": json_validity_rate(results),
        "fallback_rate": fallback_rate(results),
        "average_latency_ms": average_latency_ms(results),
    }
