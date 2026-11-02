"""Source-checkout entry for the same CCR module tools shipped in the wheel."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'python'))
from ccr.cli import main
if __name__=='__main__':raise SystemExit(main())
