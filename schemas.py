from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class SplitCreate(BaseModel):
    user_id: int
    amount_owed: float

class SplitResponse(BaseModel):
    user_id: int
    amount_owed: float
    class Config:
        from_attributes = True

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: Optional[str] = "General"
    payer_id: int
    splits: Optional[List[SplitCreate]] = None

class ExpenseResponse(BaseModel):
    id: int
    title: str
    amount: float
    category: str
    created_at: datetime
    payer_id: int
    payer: UserResponse
    splits: List[SplitResponse] = []

    class Config:
        from_attributes = True

class BalanceResponse(BaseModel):
    user_id: int
    name: str
    net_balance: float

class SettlementResponse(BaseModel):
    payer_id: int
    payer_name: str
    payee_id: int
    payee_name: str
    amount: float