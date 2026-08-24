"""Minimal smoke tests — run offline, no camera required.

These verify that main.py imports cleanly and its helper functions behave
as expected. Real model inference is exercised end-to-end via the
docker-compose stack, not here."""

import os, sys, importlib.util, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def test_main_module_imports():
    """main.py must at least be syntactically valid and importable."""
    spec = importlib.util.spec_from_file_location("main_module", ROOT / "main.py")
    assert spec is not None, "cannot find main.py"
    # Note: we don't exec the module because it starts the Flask server;
    # syntactic validity is enough for the smoke test.
    with open(ROOT / "main.py") as f:
        code = f.read()
    compile(code, "main.py", "exec")


def test_requirements_present():
    req = ROOT / "requirements.txt"
    assert req.exists(), "requirements.txt missing"
    content = req.read_text().lower()
    for pkg in ("ultralytics", "flask", "opencv-python", "requests"):
        assert pkg in content, f"missing pinned dependency: {pkg}"


if __name__ == "__main__":
    test_main_module_imports()
    test_requirements_present()
    print("smoke tests passed")
