import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.models.amazon import ProductData


class ProductInput(BaseModel):
    product_identifier: str = Field(..., description="Amazon ASIN or product URL")

    @field_validator("product_identifier")
    @classmethod
    def validate_identifier(cls, v: str) -> str:
        val = v.strip()

        if re.fullmatch(r"[A-Z0-9]{10}", val, re.IGNORECASE):
            return val.upper()

        val_lower = val.lower()
        has_amazon = "amazon" in val_lower
        has_path = any(p in val_lower for p in ("dp/", "gp/product/", "/asin/"))

        if has_amazon and has_path:
            return val

        raise ValueError(
            "Must be a valid 10-character Amazon ASIN or an Amazon product URL"
        )


class ProductAnalysisResponse(BaseModel):
    status: str
    message: str
    analysis_id: Optional[str] = None
    data: Optional[ProductData] = None


class ProductAnalysisRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    user_id: str
    product_identifier: str
    asin: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    data: ProductData

    model_config = ConfigDict(populate_by_name=True)
