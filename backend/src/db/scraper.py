from datetime import datetime

from src.db.connection import get_database
from src.models.amazon import ProductData
from src.models.scraper import ProductAnalysisRecord


async def save_product_analysis(product_identifier: str, data: ProductData) -> str:
    db = get_database()
    if db is None:
        raise RuntimeError("Database connection is not available")

    record = ProductAnalysisRecord(
        product_identifier=product_identifier,
        asin=data.asin,
        data=data,
    )

    now = datetime.utcnow()
    product_doc = data.model_dump()
    product_doc["_id"] = data.asin
    product_doc["updated_at"] = now

    await db["products"].update_one(
        {"_id": data.asin},
        {
            "$set": product_doc,
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    await db["product_analyses"].insert_one(record.model_dump(by_alias=True))
    return record.id
