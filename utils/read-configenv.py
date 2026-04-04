#!/usr/bin/env python3
import json
import os
import re
import sys
from pathlib import Path

import yaml

PLACEHOLDER_RE = re.compile(r"\$\{([A-Z0-9_]+)\}")


def resolve_path(configfile: str) -> str:
    if os.path.isabs(configfile):
        return configfile
    cf = configfile.lstrip("./")
    if cf.startswith("cloudrun-config/"):
        return cf
    return os.path.join("cloudrun-config", cf)


def load_yaml(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def render_placeholders(obj, values: dict):
    if isinstance(obj, str):
        def repl(match):
            key = match.group(1)
            if key not in values:
                raise KeyError(f"Missing value for {key}")
            return str(values[key])

        rendered = PLACEHOLDER_RE.sub(repl, obj)
        if rendered.isdigit():
            return int(rendered)
        return rendered

    if isinstance(obj, dict):
        return {k: render_placeholders(v, values) for k, v in obj.items()}

    if isinstance(obj, list):
        return [render_placeholders(v, values) for v in obj]

    return obj


def main():
    if len(sys.argv) < 2:
        print("Usage: render_cloudrun.py <configfile>", file=sys.stderr)
        sys.exit(1)

    configfile = sys.argv[1]
    resolved = resolve_path(configfile)

    print(f"config file: {configfile}")
    print(f"resolved path: {resolved}", file=sys.stderr)

    values = load_yaml(resolved)

    template_path = resolve_path("cloudrun-config.yaml")
    template = load_yaml(template_path)

    rendered = render_placeholders(template, values)

    containers = rendered["spec"]["template"]["spec"].get("containers", [])
    if not containers:
        raise RuntimeError("No containers found in template")

    # Populate app env vars from a separate env file if you want, or keep empty
    containers[0].setdefault("env", [])

    out_manifest = Path("cloudrun-config/rendered-cloudrun.yaml")
    with out_manifest.open("w", encoding="utf-8") as f:
        yaml.safe_dump(rendered, f, sort_keys=False)

    out_json = Path("cloudrun-config/target.json")
    with out_json.open("w", encoding="utf-8") as f:
        json.dump({k: json.dumps(v) for k, v in values.items()}, f, indent=4)

    print("rendered-cloudrun.yaml generated")
    print("target.json generated")


if __name__ == "__main__":
    main()
