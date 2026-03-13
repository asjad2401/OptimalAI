from pydantic import BaseModel, Field


class ProductInput(BaseModel):
    product_identifier: str = Field(..., description="Amazon ASIN or product URL")


class ProductAnalysisResponse(BaseModel):
    status: str
    message: str
    product_identifier: str
