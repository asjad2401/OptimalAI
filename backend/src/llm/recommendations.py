import importlib

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
        temperature=0.2,
    )

    structured_llm = llm.with_structured_output(AIRecommendations)
    payload = _to_prompt_payload(data)

    return await structured_llm.ainvoke(
        [
            SystemMessage(
                content=(
                    "You are an ecommerce strategy analyst. "
                    "Return concise, actionable recommendations in plain business language. "
                    "Use priority values: high, medium, or low."
                )
            ),
            HumanMessage(
                content=(
                    "Compare the seller product against competitors and provide recommendations.\n"
                    f"Input data: {payload}"
                )
            ),
        ]
    )
