"""CCR shared tools; public base caches never contain customer overlays."""
__version__ = '26.11.3a'
from .geography import GeographyCache, GeographyUnavailable

__all__ = ['GeographyCache', 'GeographyUnavailable', '__version__']
