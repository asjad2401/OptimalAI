from fastapi import APIRouter
from src.models.scraper import ProductInput, ProductAnalysisResponse

router = APIRouter(prefix="/scraper", tags=["scraper"])


@router.post("/analyze", response_model=ProductAnalysisResponse)
async def analyze_product(item: ProductInput):
    return ProductAnalysisResponse(
        status="queued",
        message="Product analysis task received.",
        product_identifier=item.product_identifier,
    )
