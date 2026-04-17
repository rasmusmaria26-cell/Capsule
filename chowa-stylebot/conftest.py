import sys
import os

# Add backend/ to sys.path so `from app.xxx import ...` resolves correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
