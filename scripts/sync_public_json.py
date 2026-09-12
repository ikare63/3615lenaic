from __future__ import annotations
import hashlib, json, pathlib, urllib.request, urllib.error, datetime

ROOT = pathlib.Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "registry.json"
BASE = "https://ikare63.github.io"

registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
manifest = {
    "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "items": [],
}

for item in registry.get("publicJson", []):
    url = item["url"]
    if url.startswith("/"):
        url = BASE + url
    target = ROOT / item["mirror"]
    target.parent.mkdir(parents=True, exist_ok=True)
    row = {"id": item["id"], "label": item.get("label", item["id"]), "source": url, "mirror": item["mirror"]}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "3615-NEXUS/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
        parsed = json.loads(raw.decode("utf-8"))
        pretty = json.dumps(parsed, ensure_ascii=False, indent=2) + "\n"
        target.write_text(pretty, encoding="utf-8")
        encoded = pretty.encode("utf-8")
        row.update({
            "ok": True,
            "bytes": len(encoded),
            "sha256": hashlib.sha256(encoded).hexdigest(),
            "fetchedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
    except Exception as exc:
        row.update({"ok": False, "error": str(exc), "fetchedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()})
    manifest["items"].append(row)

(ROOT / "data" / "mirror" / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
