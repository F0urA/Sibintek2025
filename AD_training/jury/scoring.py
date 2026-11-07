"""Scoring rules, modelled on ForcAD classic. Swap these functions to change them."""

import math

MAX_MULTIPLIER = 3  # a weak team stealing from a strong one earns at most 3x hardness


def attack_points(attacker_fp, victim_fp, hardness):
    """Points for one stolen flag: more for stealing from stronger teams.

    Returns (attacker_gain, victim_loss). The victim never drops below zero.
    """
    ratio = max(victim_fp, 1.0) / max(attacker_fp, 1.0)
    gain = min(hardness * math.sqrt(ratio), hardness * MAX_MULTIPLIER)
    return round(gain, 2), round(min(gain, max(victim_fp, 0.0)), 2)


def sla(up_rounds, counted_rounds):
    """Share of rounds the service was UP. CHECK_FAILED rounds are not counted."""
    return up_rounds / counted_rounds if counted_rounds else 1.0


def team_score(services):
    """Total like ForcAD's board: sum over services of FP x SLA."""
    return round(sum(item["fp"] * item["sla"] for item in services), 2)
