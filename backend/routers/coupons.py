
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Coupon, User
from security import bearer_scheme, get_current_user_id


router = APIRouter(
    prefix="/api/v1/coupons",
    tags=["Coupons & Discounts"]
)


class CouponCreate(BaseModel):
    coupon_code: str = Field(..., min_length=3, max_length=50)
    discount_type: str = Field(...)
    discount_value: float = Field(..., gt=0)
    minimum_booking_amount: float = Field(default=0, ge=0)
    expiry_date: datetime
    usage_limit: int = Field(..., gt=0)
    is_active: bool = True


class CouponResponse(BaseModel):
    id: int
    coupon_code: str
    discount_type: str
    discount_value: float
    minimum_booking_amount: float
    expiry_date: datetime
    usage_limit: int
    used_count: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CouponValidate(BaseModel):
    coupon_code: str = Field(..., min_length=3, max_length=50)
    booking_amount: float = Field(..., gt=0)


def require_admin(credentials, db):
    user_id = get_current_user_id(credentials)
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    if user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can manage coupons."
        )

    return user


def calculate_discount(coupon, booking_amount):
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is inactive.")

    if coupon.expiry_date <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Coupon has expired.")

    if coupon.used_count >= coupon.usage_limit:
        raise HTTPException(
            status_code=400,
            detail="Coupon usage limit has been reached."
        )

    if booking_amount < coupon.minimum_booking_amount:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Minimum booking amount is "
                f"{coupon.minimum_booking_amount:.2f}."
            )
        )

    if coupon.discount_type == "PERCENTAGE":
        discount = booking_amount * coupon.discount_value / 100
    else:
        discount = coupon.discount_value

    # A discount cannot exceed the booking amount.
    return round(min(discount, booking_amount), 2)


@router.post(
    "/",
    response_model=CouponResponse,
    status_code=status.HTTP_201_CREATED
)
def create_coupon(
    data: CouponCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    require_admin(credentials, db)

    code = data.coupon_code.strip().upper()
    discount_type = data.discount_type.strip().upper()

    if discount_type not in {"PERCENTAGE", "FIXED"}:
        raise HTTPException(
            status_code=400,
            detail="discount_type must be PERCENTAGE or FIXED."
        )

    if discount_type == "PERCENTAGE" and data.discount_value > 100:
        raise HTTPException(
            status_code=400,
            detail="Percentage discount cannot exceed 100."
        )

    if data.expiry_date <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Expiry date must be in the future."
        )

    existing = db.query(Coupon).filter(
        Coupon.coupon_code == code
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Coupon code already exists."
        )

    coupon = Coupon(
        coupon_code=code,
        discount_type=discount_type,
        discount_value=data.discount_value,
        minimum_booking_amount=data.minimum_booking_amount,
        expiry_date=data.expiry_date,
        usage_limit=data.usage_limit,
        is_active=data.is_active,
        used_count=0
    )

    try:
        db.add(coupon)
        db.commit()
        db.refresh(coupon)
        return coupon
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create coupon."
        )


@router.get("/", response_model=list[CouponResponse])
def list_coupons(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    require_admin(credentials, db)

    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()


@router.post("/validate")
def validate_coupon(
    data: CouponValidate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    # Any authenticated user may validate a coupon.
    user_id = get_current_user_id(credentials)
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    code = data.coupon_code.strip().upper()
    coupon = db.query(Coupon).filter(
        Coupon.coupon_code == code
    ).first()

    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found.")

    discount = calculate_discount(coupon, data.booking_amount)
    final_amount = round(data.booking_amount - discount, 2)

    return {
        "valid": True,
        "coupon_id": coupon.id,
        "coupon_code": coupon.coupon_code,
        "discount_type": coupon.discount_type,
        "discount_amount": discount,
        "original_amount": round(data.booking_amount, 2),
        "final_amount": final_amount
    }


@router.patch("/{coupon_id}/deactivate", response_model=CouponResponse)
def deactivate_coupon(
    coupon_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    require_admin(credentials, db)

    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()

    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found.")

    coupon.is_active = False

    try:
        db.commit()
        db.refresh(coupon)
        return coupon
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not deactivate coupon."
        )
