"""
Unit Tests for MCP Calculator Tool.
"""

import math
import pytest
import os
import sys

# Ensure root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from mcp_server.tools.calculator import evaluate_expression


def test_basic_arithmetic():
    assert evaluate_expression("2 + 2") == "4"
    assert evaluate_expression("10 - 3") == "7"
    assert evaluate_expression("4 * 5") == "20"
    assert evaluate_expression("15 / 3") == "5"
    assert evaluate_expression("7 // 2") == "3"
    assert evaluate_expression("10 % 3") == "1"
    assert evaluate_expression("2 ** 4") == "16"
    assert evaluate_expression("2 ^ 3") == "8"


def test_operator_precedence():
    assert evaluate_expression("2 + 3 * 4") == "14"
    assert evaluate_expression("(2 + 3) * 4") == "20"
    assert evaluate_expression("100 - 5 * (2 + 3)") == "75"


def test_constants():
    pi_val = float(evaluate_expression("pi"))
    assert pytest.approx(pi_val, 0.0001) == math.pi

    e_val = float(evaluate_expression("e"))
    assert pytest.approx(e_val, 0.0001) == math.e


def test_functions():
    assert evaluate_expression("sqrt(144)") == "12"
    assert evaluate_expression("abs(-42)") == "42"
    assert evaluate_expression("round(3.14159, 2)") == "3.14"
    assert evaluate_expression("log10(100)") == "2"


def test_division_by_zero():
    res = evaluate_expression("10 / 0")
    assert "Division by zero" in res


def test_syntax_error():
    res = evaluate_expression("2 + * 4")
    assert "Syntax Error" in res


def test_empty_expression():
    res = evaluate_expression("   ")
    assert "Error" in res

