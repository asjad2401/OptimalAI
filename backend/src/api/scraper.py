import logging

from fastapi import APIRouter, Depends, HTTPException

from src.auth.security import get_current_user
from src.db.scraper import save_product_analysis
from src.models.scraper import ProductAnalysisResponse, ProductInput
from src.scraper.amazon_scraper import scrape_product

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scraper", tags=["scraper"])


@router.post("/analyze", response_model=ProductAnalysisResponse)
async def analyze_product(item: ProductInput, current_user: dict = Depends(get_current_user)):
    try:
        data = await scrape_product(item.product_identifier)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Scraper error for %s: %s", item.product_identifier, exc)
        raise HTTPException(status_code=503, detail="Scraping is temporarily unavailable.") from exc
    except Exception as exc:
        logger.exception("Unexpected scraper error for %s", item.product_identifier)
        raise HTTPException(status_code=500, detail="Internal scraping error.") from exc

    try:
        await save_product_analysis(item.product_identifier, data, current_user["_id"])
    except RuntimeError as exc:
        logger.error("Persistence error for %s: %s", item.product_identifier, exc)
        raise HTTPException(status_code=503, detail="Saving analysis is temporarily unavailable.") from exc
    except Exception as exc:
        logger.exception("Unexpected persistence error for %s", item.product_identifier)
        raise HTTPException(status_code=500, detail="Internal persistence error.") from exc

    return ProductAnalysisResponse(status="success", message="Scraped successfully.", data=data)
