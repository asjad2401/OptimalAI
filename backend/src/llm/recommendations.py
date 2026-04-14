import importlib
import json

from src.config import settings
from src.models.amazon import ProductData
from src.models.scraper import AIRecommendations


def _to_prompt_payload(data: ProductData) -> dict:
    return {
        "seller": {
            "asin": data.asin,
            "title": data.title,
            "price": data.price,
            "rating": data.rating,
            "review_count": data.review_count,
            "bullet_points": data.bullet_points[:8],
        },
        "competitors": [
            {
                "asin": c.asin,
                "title": c.title,
                "price": c.price,
                "rating": c.rating,
                "review_count": c.review_count,
                "bullet_points": c.bullet_points[:8],
            }
            for c in data.competitors[:5]
        ],
    }


def _build_business_context(data: ProductData) -> dict:
    competitors = data.competitors[:5]

    prices = [c.price for c in competitors if c.price is not None]
    ratings = [c.rating for c in competitors if c.rating is not None]
    reviews = [c.review_count for c in competitors if c.review_count is not None]

    avg_price = (sum(prices) / len(prices)) if prices else None
    avg_rating = (sum(ratings) / len(ratings)) if ratings else None
    avg_reviews = (sum(reviews) / len(reviews)) if reviews else None

    def pct_diff(value: float | None, base: float | None) -> float | None:
        if value is None or base is None or base == 0:
            return None
        return ((value - base) / base) * 100

    return {
        "seller": {
            "asin": data.asin,
            "title": data.title,
            "price": data.price,
            "rating": data.rating,
            "review_count": data.review_count,
            "bullet_point_count": len(data.bullet_points),
        },
        "market_benchmarks": {
            "avg_competitor_price": avg_price,
            "avg_competitor_rating": avg_rating,
            "avg_competitor_review_count": avg_reviews,
            "seller_vs_avg_price_pct": pct_diff(data.price, avg_price),
            "seller_vs_avg_rating_pct": pct_diff(data.rating, avg_rating),
            "seller_vs_avg_reviews_pct": pct_diff(float(data.review_count), float(avg_reviews)) if avg_reviews else None,
        },
        "top_competitor_examples": [
            {
                "asin": c.asin,
                "title": c.title,
                "price": c.price,
                "rating": c.rating,
                "review_count": c.review_count,
                "top_bullets": c.bullet_points[:4],
            }
            for c in competitors
        ],
    }


async def generate_recommendations(data: ProductData) -> AIRecommendations:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    langchain_core_messages = importlib.import_module("langchain_core.messages")
    langchain_google_genai = importlib.import_module("langchain_google_genai")
    HumanMessage = getattr(langchain_core_messages, "HumanMessage")
    SystemMessage = getattr(langchain_core_messages, "SystemMessage")
    ChatGoogleGenerativeAI = getattr(langchain_google_genai, "ChatGoogleGenerativeAI")

    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.1,
    )

    structured_llm = llm.with_structured_output(AIRecommendations)
    payload = _to_prompt_payload(data)
    business_context = _build_business_context(data)

    prompt_rules = (
        "Goal: give practical business recommendations that a non-technical seller can execute this week.\n"
        "Write in plain language. Avoid technical jargon.\n"
        "If you must use a technical term, explain it in simple words.\n"
        "Recommendations must be concrete, specific, and tied to evidence in the input data.\n"
        "Focus on business levers such as product features, pricing, positioning, branding/messaging, offer structure, and conversion improvements.\n"
        "Do not focus only on SEO.\n"
        "For each recommendation:\n"
        "- title: start with an action verb and be very specific (not generic).\n"
        "- rationale: include (1) what to change, (2) why based on competitor evidence, (3) expected business impact.\n"
        "- rationale should be 1-3 short sentences, practical and non-technical.\n"
        "- priority must be one of: high, medium, low.\n"
        "Return 3 to 5 recommendations, ordered from highest impact to lowest impact.\n"
        "Do not output vague advice like 'improve quality' without exact next steps."
    )

    messages = [
        SystemMessage(
            content=(
                "You are a senior ecommerce growth consultant for Amazon sellers. "
                "Your recommendations must be practical, specific, non-technical, and directly tied to the provided product and competitor data. "
                "Prefer concise, high-signal recommendations over long explanations."
            )
        ),
        HumanMessage(
            content=(
                "Analyze the seller against competitors and generate actionable recommendations.\n"
                f"Rules:\n{prompt_rules}\n\n"
                f"Structured product data:\n{json.dumps(payload, ensure_ascii=False)}\n\n"
                f"Business comparison context:\n{json.dumps(business_context, ensure_ascii=False)}"
            )
        ),
    ]

    try:
        return await structured_llm.ainvoke(messages)
    except Exception as e:
        if "503" in str(e) or "UNAVAILABLE" in str(e):
            print(f"Main model {settings.GEMINI_MODEL} failed, trying fallback {settings.GEMINI_FALLBACK_MODEL}. Error: {e}")
            fallback_llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_FALLBACK_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.1,
            )
            fallback_structured_llm = fallback_llm.with_structured_output(AIRecommendations)
            return await fallback_structured_llm.ainvoke(messages)
        raise e
