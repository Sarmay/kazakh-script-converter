#!/usr/bin/env python3

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export a Hugging Face masked language model to a Node scorer-compatible ONNX directory."
    )
    parser.add_argument("--model", required=True, help="Hugging Face model id or local checkpoint path.")
    parser.add_argument("--output", required=True, help="Directory to write the ONNX model and tokenizer files to.")
    parser.add_argument("--cache-dir", default=".hf-cache", help="Local Hugging Face cache directory.")
    parser.add_argument("--task", default="fill-mask", help="Export task. Defaults to fill-mask.")
    parser.add_argument("--device", default="cpu", help="Export device. Defaults to cpu.")
    parser.add_argument("--dtype", choices=("fp32", "fp16", "bf16"), default=None, help="Optional export dtype.")
    parser.add_argument("--opset", type=int, default=None, help="Optional ONNX opset override.")
    parser.add_argument("--optimize", choices=("O1", "O2", "O3", "O4"), default=None, help="Optional ORT optimization level.")
    parser.add_argument("--trust-remote-code", action="store_true", help="Allow custom modeling code from the model repo.")
    parser.add_argument("--revision", default="main", help="Model revision to export.")
    parser.add_argument("--disable-validation", action="store_true", help="Skip exporter validation.")
    return parser.parse_args()


def configure_cache(cache_dir: Path) -> Path:
    cache_root = cache_dir.resolve()
    hub_cache = cache_root / "hub"
    cache_root.mkdir(parents=True, exist_ok=True)
    hub_cache.mkdir(parents=True, exist_ok=True)

    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
    os.environ.setdefault("HF_HOME", str(cache_root))
    os.environ.setdefault("HF_HUB_CACHE", str(hub_cache))

    return cache_root


def ensure_required_files(output_dir: Path) -> None:
    required_files = (
        output_dir / "model.onnx",
        output_dir / "tokenizer.json",
        output_dir / "tokenizer_config.json",
    )

    missing = [path.name for path in required_files if not path.is_file()]
    if missing:
        raise RuntimeError(f"Export completed, but required files are missing: {', '.join(missing)}")


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    cache_root = configure_cache(Path(args.cache_dir))

    try:
        from optimum.exporters.onnx import main_export
        from transformers import AutoTokenizer
    except ImportError as exc:
        raise SystemExit(
            "Missing export dependencies. Install them inside the export venv first, "
            "for example: pip install 'optimum[onnxruntime]' transformers onnx onnxruntime torch accelerate"
        ) from exc

    print(f"[export] model={args.model}")
    print(f"[export] output={output_dir}")
    print(f"[export] cache={cache_root}")

    main_export(
        model_name_or_path=args.model,
        output=output_dir,
        task=args.task,
        opset=args.opset,
        device=args.device,
        dtype=args.dtype,
        optimize=args.optimize,
        monolith=True,
        framework="pt",
        revision=args.revision,
        trust_remote_code=args.trust_remote_code,
        cache_dir=str(cache_root / "hub"),
        do_validation=not args.disable_validation,
        library_name="transformers",
    )

    tokenizer = AutoTokenizer.from_pretrained(
        args.model,
        use_fast=True,
        revision=args.revision,
        trust_remote_code=args.trust_remote_code,
        cache_dir=str(cache_root),
    )
    tokenizer.save_pretrained(output_dir)

    ensure_required_files(output_dir)
    print("[export] completed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
