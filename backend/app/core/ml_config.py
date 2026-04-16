"""
ML Configuration for Roboflow Integration
Centralizes all ML model configuration and API keys
"""
import os
from dataclasses import dataclass
from typing import List

@dataclass
class RoboflowModel:
    """Configuration for a single Roboflow model"""
    name: str
    model_id: str
    version: int
    api_key: str
    url: str

# Load API keys from environment (fallback to hardcoded for backward compatibility)
WINDOWS_API_KEY = os.getenv("ROBOFLOW_WINDOWS_KEY", "rAPgd7z8fy90FMC7RvEQ")
DOORS_API_KEY = os.getenv("ROBOFLOW_DOORS_KEY", "rAPgd7z8fy90FMC7RvEQ")
HALL_API_KEY = os.getenv("ROBOFLOW_HALL_KEY", "Qmr1K2CkeGUoEFjfEJvn")
STAIRS_API_KEY = os.getenv("ROBOFLOW_STAIRS_KEY", "Qmr1K2CkeGUoEFjfEJvn")

# Model configurations
MODELS: List[RoboflowModel] = [
    RoboflowModel(
        name="windows",
        model_id="windows-kgiak-ql3ky",
        version=1,
        api_key=WINDOWS_API_KEY,
        url=f"https://detect.roboflow.com/windows-kgiak-ql3ky/1?api_key={WINDOWS_API_KEY}"
    ),
    RoboflowModel(
        name="doors",
        model_id="doors-xbzaj-hbokf",
        version=4,
        api_key=DOORS_API_KEY,
        url=f"https://detect.roboflow.com/doors-xbzaj-hbokf/4?api_key={DOORS_API_KEY}"
    ),
    RoboflowModel(
        name="hallways",
        model_id="hall-lgh2b-tcnin",
        version=2,
        api_key=HALL_API_KEY,
        url=f"https://detect.roboflow.com/hall-lgh2b-tcnin/2?api_key={HALL_API_KEY}"
    ),
    RoboflowModel(
        name="stairs",
        model_id="stairs-lusiz-ydka4",
        version=1,
        api_key=STAIRS_API_KEY,
        url=f"https://detect.roboflow.com/stairs-lusiz-ydka4/1?api_key={STAIRS_API_KEY}"
    ),
]

# API Configuration
ROBOFLOW_BASE_URL = "https://detect.roboflow.com"
ROBOFLOW_TIMEOUT = 30  # seconds

def get_model_by_name(name: str) -> RoboflowModel:
    """Get model configuration by name"""
    for model in MODELS:
        if model.name.lower() == name.lower():
            return model
    raise ValueError(f"Model '{name}' not found")

def get_all_model_names() -> List[str]:
    """Get list of all model names"""
    return [model.name for model in MODELS]
