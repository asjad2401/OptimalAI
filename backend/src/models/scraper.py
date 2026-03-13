import re
from pydantic import BaseModel, Field, field_validator


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
    product_identifier: str
