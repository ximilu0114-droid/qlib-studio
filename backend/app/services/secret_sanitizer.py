"""Helpers for redacting secrets before text is returned to the UI."""

from __future__ import annotations

import re


_SECRET_VALUE_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    re.compile(r"sess-[A-Za-z0-9_-]{20,}"),
    re.compile(r"AKIA[A-Z0-9]{16}"),
    re.compile(r"ghp_[A-Za-z0-9]{30,}"),
    re.compile(r"xox[abprs]-[A-Za-z0-9-]{20,}"),
    re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?"),
]

_SENSITIVE_KEY_RE = re.compile(
    r"(?:^|[_-])("
    r"API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE[_-]?KEY|"
    r"ACCESS[_-]?KEY|AUTH|CREDENTIAL|API[_-]?BASE"
    r")(?:$|[_-])",
    re.IGNORECASE,
)

_KEY_VALUE_RE = re.compile(
    r"(?P<prefix>\b[A-Za-z_][A-Za-z0-9_-]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|AUTH|CREDENTIAL|BASE)[A-Za-z0-9_-]*\s*=\s*)"
    r"(?P<value>\"[^\"]*\"|'[^']*'|[^\s]+)",
    re.IGNORECASE,
)

_FLAG_EQUALS_RE = re.compile(
    r"(?P<prefix>--[A-Za-z0-9_-]*(?:api-key|apikey|token|secret|password|passwd|credential|credentials|auth|api-base)[A-Za-z0-9_-]*=)"
    r"(?P<value>\"[^\"]*\"|'[^']*'|[^\s]+)",
    re.IGNORECASE,
)

_FLAG_SPACE_RE = re.compile(
    r"(?P<prefix>--[A-Za-z0-9_-]*(?:api-key|apikey|token|secret|password|passwd|credential|credentials|auth|api-base)[A-Za-z0-9_-]*\s+)"
    r"(?P<value>\"[^\"]*\"|'[^']*'|[^\s]+)",
    re.IGNORECASE,
)

_SENSITIVE_FLAG_NAMES = {
    "--api-key",
    "--apikey",
    "--token",
    "--secret",
    "--password",
    "--passwd",
    "--credential",
    "--credentials",
    "--auth",
    "--api-base",
}


def is_sensitive_name(name: str) -> bool:
    """Return True if an env var or flag name looks sensitive."""
    return bool(_SENSITIVE_KEY_RE.search(name))


def sanitize_text(text: str) -> str:
    """Redact common secret values and sensitive KEY=value assignments."""
    sanitized = text
    for pattern in _SECRET_VALUE_PATTERNS:
        sanitized = pattern.sub("[REDACTED]", sanitized)

    def replace_key_value(match: re.Match[str]) -> str:
        prefix = match.group("prefix")
        key = prefix.split("=", 1)[0].strip()
        if is_sensitive_name(key):
            return f"{prefix}[REDACTED]"
        return match.group(0)

    sanitized = _KEY_VALUE_RE.sub(replace_key_value, sanitized)
    sanitized = _FLAG_EQUALS_RE.sub(lambda m: f"{m.group('prefix')}[REDACTED]", sanitized)
    return _FLAG_SPACE_RE.sub(lambda m: f"{m.group('prefix')}[REDACTED]", sanitized)


def sanitize_command_args(args: list[str]) -> list[str]:
    """Return a command argv copy with sensitive flag values redacted."""
    sanitized: list[str] = []
    redact_next = False

    for arg in args:
        if redact_next:
            sanitized.append("[REDACTED]")
            redact_next = False
            continue

        if "=" in arg:
            flag, value = arg.split("=", 1)
            if flag.lower() in _SENSITIVE_FLAG_NAMES or is_sensitive_name(flag.lstrip("-")):
                sanitized.append(f"{flag}=[REDACTED]")
            else:
                sanitized.append(sanitize_text(arg))
            continue

        if arg.lower() in _SENSITIVE_FLAG_NAMES or is_sensitive_name(arg.lstrip("-")):
            sanitized.append(arg)
            redact_next = True
        else:
            sanitized.append(sanitize_text(arg))

    return sanitized
