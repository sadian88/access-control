from datetime import timedelta


def format_duration(delta: timedelta) -> str:
    """Convierte un timedelta en formato legible: '2h 15m', '45m', '3h'."""
    total_seconds = int(delta.total_seconds())
    if total_seconds < 0:
        total_seconds = 0
    hours, remainder = divmod(total_seconds, 3600)
    minutes = remainder // 60
    if hours > 0 and minutes > 0:
        return f"{hours}h {minutes}m"
    if hours > 0:
        return f"{hours}h"
    return f"{minutes}m"
