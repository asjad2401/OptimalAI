import logging

from fastapi import APIRouter, Depends, HTTPException

from src.auth.security import get_current_user
from src.db.scraper import get_product_analysis, save_product_analysis
from src.llm.recommendations import generate_recommendations
from src.models.scraper import ProductAnalysisRecord, ProductAnalysisResponse, ProductInput
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
        analysis_id = await save_product_analysis(item.product_identifier, data, current_user["_id"])
    except RuntimeError as exc:
        logger.error("Persistence error for %s: %s", item.product_identifier, exc)
        raise HTTPException(status_code=503, detail="Saving analysis is temporarily unavailable.") from exc
    except Exception as exc:
        logger.exception("Unexpected persistence error for %s", item.product_identifier)
        raise HTTPException(status_code=500, detail="Internal persistence error.") from exc

    try:
        recommendations = await generate_recommendations(data)
    except Exception as exc:
        logger.error("AI analysis error for %s: %s", item.product_identifier, exc)
        raise HTTPException(status_code=503, detail="AI analysis is temporarily unavailable.") from exc

    return ProductAnalysisResponse(
        status="success",
        message="Scraped successfully.",
        analysis_id=analysis_id,
        data=data,
        recommendations=recommendations,
    )


@router.get("/report/{analysis_id}", response_model=ProductAnalysisRecord)
async def get_report(analysis_id: str, current_user: dict = Depends(get_current_user)):
    try:
        record = await get_product_analysis(analysis_id, current_user["_id"])
    except RuntimeError as exc:
        logger.error("Report fetch error for %s: %s", analysis_id, exc)
        raise HTTPException(status_code=503, detail="Fetching report is temporarily unavailable.") from exc
    except Exception as exc:
        logger.exception("Unexpected report fetch error for %s", analysis_id)
        raise HTTPException(status_code=500, detail="Internal report fetch error.") from exc

    if not record:
        raise HTTPException(status_code=404, detail="Report not found.")

    return record
