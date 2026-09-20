import subprocess
import tempfile
import os
import shutil

# Hard ceilings enforced independently of firejail's own limits.
SANDBOX_TIMEOUT_SECONDS = 5
SANDBOX_MEMORY_BYTES = 256 * 1024 * 1024  # 256 MB
SANDBOX_CPU_SECONDS = 5
MAX_OUTPUT_CHARS = 4000

# Defense in depth: firejail is the real boundary, this is just an early
# trip-wire so obviously hostile code never even reaches the sandbox.
BLOCKED_TOKENS = [
    "import os", "import sys", "import subprocess", "import socket",
    "import shutil", "__import__", "open(", "eval(", "exec(",
    "importlib", "ctypes", "pty", "pickle",
]


def _looks_dangerous(code: str):
    """Cheap static check. Returns the offending token, or None if clean."""
    lowered = code.lower()
    for token in BLOCKED_TOKENS:
        if token.lower() in lowered:
            return token
    return None


def run_engineering_calculation(python_code: str) -> str:
    """
    Executes LLM-generated Python in a locked-down, network-isolated,
    resource-limited firejail sandbox. Fails CLOSED: if firejail is
    unavailable, or the static check flags the code, nothing executes.
    """
    print("\n[SANDBOX] Received code for execution.")

    if shutil.which("firejail") is None:
        print("[SANDBOX REFUSED] firejail not found on this host.")
        return (
            "Sandbox execution refused: firejail is not installed, so "
            "there is no verified isolation boundary available. Install "
            "firejail before this tool can be used."
        )

    offending = _looks_dangerous(python_code)
    if offending:
        print(f"[SANDBOX BLOCKED] Disallowed token detected: {offending}")
        return (
            f"Sandbox execution refused: the generated code contains a "
            f"disallowed construct ('{offending}'). Only plain math/"
            f"engineering calculations using math, sympy, and numpy are "
            f"permitted."
        )

    safe_code = f"""
import math
import sympy
import numpy as np

{python_code}
"""

    sandbox_home = tempfile.mkdtemp(prefix="agent_sandbox_")
    script_path = os.path.join(sandbox_home, "task.py")
    with open(script_path, "w") as f:
        f.write(safe_code)

    firejail_cmd = [
        "firejail",
        "--quiet",
        "--net=none",                    # no network namespace at all
        "--private=" + sandbox_home,     # only this throwaway dir is visible
        "--nogroups",
        "--nosound",
        "--no3d",
        "--rlimit-cpu=" + str(SANDBOX_CPU_SECONDS),
        "--rlimit-as=" + str(SANDBOX_MEMORY_BYTES),
        "--rlimit-nproc=32",
        "--seccomp",
        "python3", "task.py",
    ]

    try:
        result = subprocess.run(
            firejail_cmd,
            capture_output=True,
            text=True,
            timeout=SANDBOX_TIMEOUT_SECONDS + 2,  # headroom for firejail itself
            cwd=sandbox_home,
        )

        if result.returncode == 0:
            output = result.stdout.strip()[:MAX_OUTPUT_CHARS]
            print(f"[SANDBOX SUCCESS] Output: {output}")
            return f"Sandbox execution successful. Output:\n{output}"
        else:
            error_msg = result.stderr.strip()[:MAX_OUTPUT_CHARS]
            print(f"[SANDBOX ERROR] {error_msg}")
            return f"Sandbox execution failed with error:\n{error_msg}"

    except subprocess.TimeoutExpired:
        print("[SANDBOX TIMEOUT] Execution took longer than allowed.")
        return "Sandbox execution failed: timeout exceeded."
    finally:
        shutil.rmtree(sandbox_home, ignore_errors=True)
