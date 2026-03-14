from typing import Dict, List, Optional
from pydantic import BaseModel


class Review(BaseModel):
    title: str
    body: str
    rating: float
    is_verified: bool = False


class ProductData(BaseModel):
    asin: str
    url: str
    title: Optional[str] = None
    bullet_points: List[str] = []
    specifications: Dict[str, str] = {}
    rating: Optional[float] = None
    review_count: int = 0
    price: Optional[float] = None
    image_url: Optional[str] = None
    reviews: List[Review] = []
    best_seller_link: Optional[str] = None
