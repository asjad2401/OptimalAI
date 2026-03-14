import logging

from fastapi import APIRouter, HTTPException

from src.models.scraper import ProductAnalysisResponse, ProductInput
from src.scraper.amazon_scraper import scrape_product

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scraper", tags=["scraper"])


@router.post("/analyze", response_model=ProductAnalysisResponse)
async def analyze_product(item: ProductInput):
    try:
        data = await scrape_product(item.product_identifier)
        return ProductAnalysisResponse(status="success", message="Scraped successfully.", data=data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Scraper error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error for %s", item.product_identifier)
        raise HTTPException(status_code=500, detail="Internal scraping error.") from exc
