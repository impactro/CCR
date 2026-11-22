"""CCR shared tools; public base caches never contain customer overlays."""
__version__ = "26.11.22a0"
from .geography import GeographyCache, GeographyUnavailable

__all__ = ['GeographyCache', 'GeographyUnavailable', '__version__']
