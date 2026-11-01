"""
Safe Mathematical Calculator Tool for MCP Server.
Evaluates math expressions safely using Python's ast (Abstract Syntax Tree) module.
"""

import ast
import math
import operator
from typing import Any, Union

# Allowed operators mapping
OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

# Allowed functions
FUNCTIONS = {
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "asin": math.asin,
    "acos": math.acos,
    "atan": math.atan,
    "sinh": math.sinh,
    "cosh": math.cosh,
    "tanh": math.tanh,
    "sqrt": math.sqrt,
    "abs": abs,
    "round": round,
    "floor": math.floor,
    "ceil": math.ceil,
    "log": math.log,
    "log10": math.log10,
    "log2": math.log2,
    "exp": math.exp,
    "factorial": math.factorial,
    "radians": math.radians,
    "degrees": math.degrees,
}

# Allowed constants
CONSTANTS = {
    "pi": math.pi,
    "e": math.e,
    "tau": math.tau,
}


def _eval_node(node: ast.AST) -> Union[int, float]:
    """Recursively evaluate an AST node safely."""
    if isinstance(node, ast.Expression):
        return _eval_node(node.body)

    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant type: {type(node.value).__name__}")

    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type in OPERATORS:
            operand = _eval_node(node.operand)
            return OPERATORS[op_type](operand)
        raise ValueError(f"Unsupported unary operator: {op_type.__name__}")

    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type in OPERATORS:
            left = _eval_node(node.left)
            right = _eval_node(node.right)
            # Guard against excessive power
            if op_type == ast.Pow and (isinstance(right, (int, float)) and right > 1000):
                raise ValueError("Exponent too large (maximum exponent is 1000)")
            return OPERATORS[op_type](left, right)
        raise ValueError(f"Unsupported binary operator: {op_type.__name__}")

    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise ValueError("Only direct function calls are supported")
        func_name = node.func.id.lower()
        if func_name not in FUNCTIONS:
            raise ValueError(
                f"Unknown function: '{func_name}'. Supported: {', '.join(sorted(FUNCTIONS.keys()))}"
            )
        args = [_eval_node(arg) for arg in node.args]
        return FUNCTIONS[func_name](*args)

    if isinstance(node, ast.Name):
        var_name = node.id.lower()
        if var_name in CONSTANTS:
            return CONSTANTS[var_name]
        raise ValueError(
            f"Unknown identifier: '{var_name}'. Supported constants: {', '.join(CONSTANTS.keys())}"
        )

    raise ValueError(f"Unsupported expression element: {type(node).__name__}")


def evaluate_expression(expression: str) -> str:
    """
    Safely evaluate a mathematical expression and return the formatted result.
    
    Supports basic arithmetic (+, -, *, /, //, %, **),
    constants (pi, e, tau), and functions (sqrt, sin, cos, tan, log, etc.).
    """
    if not expression or not expression.strip():
        return "Error: Expression cannot be empty."

    # Normalize expression (e.g., allow ^ for exponentiation)
    clean_expr = expression.strip().replace("^", "**")

    try:
        parsed = ast.parse(clean_expr, mode="eval")
        result = _eval_node(parsed)

        # Format integer results cleanly
        if isinstance(result, float) and result.is_integer():
            result = int(result)
        elif isinstance(result, float):
            result = round(result, 8)

        return f"{result}"
    except ZeroDivisionError:
        return "Error: Division by zero is not allowed."
    except OverflowError:
        return "Error: Numeric overflow encountered in calculation."
    except SyntaxError as se:
        return f"Syntax Error: Invalid mathematical syntax ('{expression}'). Details: {se.msg}"
    except Exception as exc:
        return f"Calculation Error: {str(exc)}"

