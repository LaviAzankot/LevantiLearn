"""
Payments API — PayPal integration with 17% Israeli VAT.
Flow:
  1. POST /payments/create-order  → returns PayPal order ID
  2. User approves on PayPal (frontend)
  3. POST /payments/capture-order → captures payment, upgrades user
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.supabase_client import get_supabase
from api.dependencies import get_current_user
import httpx
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

PAYPAL_CLIENT_ID     = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_ENV           = os.getenv("PAYPAL_ENV", "sandbox")
PREMIUM_PRICE_ILS    = float(os.getenv("PREMIUM_PRICE_ILS", "34.99"))
VAT_RATE             = float(os.getenv("VAT_RATE", "0.17"))

PAYPAL_BASE = (
    "https://api-m.sandbox.paypal.com"
    if PAYPAL_ENV == "sandbox"
    else "https://api-m.paypal.com"
)


# ── PayPal helpers ────────────────────────────────────────────────────────────

def _get_paypal_token() -> str:
    """Obtain a PayPal OAuth2 access token."""
    res = httpx.post(
        f"{PAYPAL_BASE}/v1/oauth2/token",
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        data={"grant_type": "client_credentials"},
        timeout=10,
    )
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail="PayPal auth failed")
    return res.json()["access_token"]


def _paypal_headers() -> dict:
    return {
        "Authorization": f"Bearer {_get_paypal_token()}",
        "Content-Type": "application/json",
    }


# ── Schemas ───────────────────────────────────────────────────────────────────

class CapturePayload(BaseModel):
    order_id: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/pricing")
def get_pricing():
    """Return pricing with VAT breakdown (no auth required)."""
    base = round(PREMIUM_PRICE_ILS / (1 + VAT_RATE), 2)
    vat  = round(PREMIUM_PRICE_ILS - base, 2)
    return {
        "currency": "ILS",
        "base_price": base,
        "vat_rate": VAT_RATE,
        "vat_amount": vat,
        "total": PREMIUM_PRICE_ILS,
        "label": f"₪{PREMIUM_PRICE_ILS:.2f} (incl. {int(VAT_RATE*100)}% VAT)",
    }


@router.post("/create-order")
def create_order(current_user: dict = Depends(get_current_user)):
    """
    Create a PayPal order for the premium subscription.
    Returns order ID that the frontend uses to launch the PayPal sheet.
    """
    # Convert ILS → USD for PayPal (PayPal doesn't support ILS natively)
    # Using a fixed rate placeholder — in production fetch live rate from an FX API
    ILS_TO_USD = 0.27
    amount_usd = round(PREMIUM_PRICE_ILS * ILS_TO_USD, 2)

    try:
        res = httpx.post(
            f"{PAYPAL_BASE}/v2/checkout/orders",
            headers=_paypal_headers(),
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {
                        "currency_code": "USD",
                        "value": str(amount_usd),
                    },
                    "description": "LevantiLearn Premium — All topics unlocked",
                    "custom_id": current_user["id"],  # tie order to user
                }],
                "application_context": {
                    "brand_name": "LevantiLearn",
                    "user_action": "PAY_NOW",
                },
            },
            timeout=15,
        )
        if res.status_code not in (200, 201):
            logger.error("PayPal create-order failed: %s", res.text)
            raise HTTPException(status_code=502, detail="PayPal order creation failed")

        order = res.json()
        order_id = order["id"]

        # Log pending payment
        supabase = get_supabase()
        supabase.table("payments").insert({
            "user_id": current_user["id"],
            "paypal_order_id": order_id,
            "amount_ils": PREMIUM_PRICE_ILS,
            "vat_amount_ils": round(PREMIUM_PRICE_ILS - PREMIUM_PRICE_ILS / (1 + VAT_RATE), 2),
            "status": "pending",
        }).execute()

        return {"order_id": order_id, "amount_usd": amount_usd}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_order error: %s", e)
        raise HTTPException(status_code=502, detail="Payment service unavailable")


@router.post("/capture-order")
def capture_order(
    payload: CapturePayload,
    current_user: dict = Depends(get_current_user),
):
    """
    Capture a PayPal order after user approval.
    On success: marks user as premium in Supabase.
    """
    supabase = get_supabase()
    user_id = current_user["id"]

    # Verify the order belongs to this user
    payment = (
        supabase.table("payments")
        .select("*")
        .eq("user_id", user_id)
        .eq("paypal_order_id", payload.order_id)
        .single()
        .execute()
    )
    if not payment.data:
        raise HTTPException(status_code=403, detail="Order not found for this user")

    try:
        res = httpx.post(
            f"{PAYPAL_BASE}/v2/checkout/orders/{payload.order_id}/capture",
            headers=_paypal_headers(),
            timeout=15,
        )
        if res.status_code not in (200, 201):
            logger.error("PayPal capture failed: %s", res.text)
            raise HTTPException(status_code=502, detail="Payment capture failed")

        capture = res.json()
        capture_status = capture.get("status")

        if capture_status == "COMPLETED":
            # Upgrade user
            supabase.table("profiles").update({"is_premium": True}).eq("id", user_id).execute()
            # Update payment record
            supabase.table("payments").update({"status": "completed"}).eq(
                "paypal_order_id", payload.order_id
            ).execute()
            return {"success": True, "is_premium": True, "message": "Welcome to Premium!"}
        else:
            raise HTTPException(status_code=402, detail=f"Payment not completed: {capture_status}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("capture_order error: %s", e)
        raise HTTPException(status_code=502, detail="Payment capture failed")


@router.get("/status")
def payment_status(current_user: dict = Depends(get_current_user)):
    """Check if current user is premium."""
    supabase = get_supabase()
    prof = supabase.table("profiles").select("is_premium").eq("id", current_user["id"]).single().execute()
    return {"is_premium": (prof.data or {}).get("is_premium", False)}
