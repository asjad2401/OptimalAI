import logging
import re

from fastapi import APIRouter, Depends, HTTPException

from src.auth.security import get_current_user
from src.db.scraper import (
    get_cached_product_data,
    get_user_analysis_history,
    get_product_analysis,
    save_analysis_recommendations,
    save_analysis_review_themes,
    save_product_analysis,
)
from src.llm.recommendations import generate_recommendations
from src.llm.reviews import generate_review_themes
from src.models.scraper import (
    AnalysisHistoryItem,
    ProductAnalysisRecord,
    ProductAnalysisResponse,
    ProductInput,
)
from src.scraper.amazon_scraper import scrape_product

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scraper", tags=["scraper"])


def _asin_from_identifier(identifier: str) -> str:
    if re.fullmatch(r"[A-Z0-9]{10}", identifier, re.IGNORECASE):
        return identifier.upper()

    match = re.search(r"/(?:dp|gp/product|asin)/([A-Z0-9]{10})", identifier, re.IGNORECASE)
    if match:
        return match.group(1).upper()

    raise ValueError(f"Cannot extract ASIN from: {identifier!r}")


@router.post("/analyze", response_model=ProductAnalysisResponse)
async def analyze_product(item: ProductInput, current_user: dict = Depends(get_current_user)):
    try:
        asin = _asin_from_identifier(item.product_identifier)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    data = None
    if not item.force_fresh:
        try:
            data = await get_cached_product_data(current_user["_id"], asin)
        except RuntimeError as exc:
            logger.error("Cache lookup error for %s: %s", item.product_identifier, exc)
            raise HTTPException(status_code=503, detail="Fetching cached data is temporarily unavailable.") from exc
        except Exception as exc:
            logger.exception("Unexpected cache lookup error for %s", item.product_identifier)
            raise HTTPException(status_code=500, detail="Internal cache lookup error.") from exc

    message = "Loaded cached data."
    if data is None:
        message = "Forced fresh scrape completed." if item.force_fresh else "Scraped successfully."
        try:
            data = await scrape_product(asin)
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
        review_analysis = await generate_review_themes(data)
    except Exception as exc:
        logger.error("AI analysis error for %s: %s", item.product_identifier, exc)
        raise HTTPException(status_code=503, detail="AI analysis is temporarily unavailable.") from exc

    try:
        await save_analysis_recommendations(analysis_id, current_user["_id"], recommendations)
        await save_analysis_review_themes(analysis_id, current_user["_id"], review_analysis)
    except RuntimeError as exc:
        logger.error("Persistence error for %s: %s", item.product_identifier, exc)
        raise HTTPException(status_code=503, detail="Saving analysis is temporarily unavailable.") from exc
    except Exception as exc:
        logger.exception("Unexpected persistence error for %s", item.product_identifier)
        raise HTTPException(status_code=500, detail="Internal persistence error.") from exc

    return ProductAnalysisResponse(
        status="success",
        message=message,
        analysis_id=analysis_id,
        data=data,
        recommendations=recommendations,
        review_analysis=review_analysis,
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


@router.get("/history", response_model=list[AnalysisHistoryItem])
async def get_analysis_history(current_user: dict = Depends(get_current_user)):
    try:
        return await get_user_analysis_history(current_user["_id"])
    except RuntimeError as exc:
        logger.error("History fetch error for user %s: %s", current_user.get("_id"), exc)
        raise HTTPException(status_code=503, detail="Fetching history is temporarily unavailable.") from exc
    except Exception as exc:
        logger.exception("Unexpected history fetch error for user %s", current_user.get("_id"))
        raise HTTPException(status_code=500, detail="Internal history fetch error.") from exc
