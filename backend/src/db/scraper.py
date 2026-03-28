from datetime import datetime

from src.db.connection import get_database
from src.models.amazon import ProductData
from src.models.scraper import AIRecommendations, AnalysisHistoryItem, ProductAnalysisRecord


async def save_product_analysis(product_identifier: str, data: ProductData, user_id: str) -> str:
    db = get_database()
    if db is None:
        raise RuntimeError("Database connection is not available")

    record = ProductAnalysisRecord(
        user_id=user_id,
        product_identifier=product_identifier,
        asin=data.asin,
        data=data,
    )

    now = datetime.utcnow()
    product_doc = data.model_dump()
    product_doc["_id"] = f"{user_id}:{data.asin}"
    product_doc["user_id"] = user_id
    product_doc["asin"] = data.asin
    product_doc["updated_at"] = now

    await db["products"].update_one(
        {"_id": product_doc["_id"]},
        {
            "$set": product_doc,
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    await db["product_analyses"].insert_one(record.model_dump(by_alias=True))
    return record.id


async def get_product_analysis(analysis_id: str, user_id: str) -> ProductAnalysisRecord | None:
    db = get_database()
    if db is None:
        raise RuntimeError("Database connection is not available")

    doc = await db["product_analyses"].find_one({"_id": analysis_id, "user_id": user_id})
    if not doc:
        return None
    return ProductAnalysisRecord(**doc)


async def save_analysis_recommendations(
    analysis_id: str,
    user_id: str,
    recommendations: AIRecommendations,
) -> None:
    db = get_database()
    if db is None:
        raise RuntimeError("Database connection is not available")

    await db["product_analyses"].update_one(
        {"_id": analysis_id, "user_id": user_id},
        {"$set": {"recommendations": recommendations.model_dump()}},
    )


async def get_user_analysis_history(user_id: str, limit: int = 20) -> list[AnalysisHistoryItem]:
    db = get_database()
    if db is None:
        raise RuntimeError("Database connection is not available")

    cursor = (
        db["product_analyses"]
        .find(
            {"user_id": user_id},
            {
                "_id": 1,
                "asin": 1,
                "created_at": 1,
                "data.title": 1,
                "data.image_url": 1,
                "data.price": 1,
                "data.rating": 1,
                "data.review_count": 1,
            },
        )
        .sort("created_at", -1)
        .limit(limit)
    )

    items: list[AnalysisHistoryItem] = []
    async for doc in cursor:
        data = doc.get("data") or {}
        items.append(
            AnalysisHistoryItem(
                analysis_id=str(doc.get("_id", "")),
                asin=doc.get("asin", ""),
                title=data.get("title"),
                image_url=data.get("image_url"),
                price=data.get("price"),
                rating=data.get("rating"),
                review_count=data.get("review_count"),
                created_at=doc.get("created_at") or datetime.utcnow(),
            )
        )

    return items
