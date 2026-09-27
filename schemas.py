from pydantic import BaseModel
from typing import List, Optional

# --- USER SCHEMAS ---
class UserCreate(BaseModel):
    name: str
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


# --- EXPENSE SCHEMAS ---
class ExpenseCreate(BaseModel):
    title: str
    amount: float
    payer_id: int  # ID of the user who paid the bill

class ExpenseResponse(BaseModel):
    id: int
    title: str
    amount: float
    payer_id: int
    payer: UserResponse  # Includes full details of who paid

    class Config:
        from_attributes = True


# --- SETTLEMENT SCHEMA ---
class BalanceResponse(BaseModel):
    user_id: int
    name: str
    net_balance: float  # Positive = Owed money, Negative = Owes money
class DebtSettlementResponse(BaseModel):
    payer_id: int
    payer_name: str
    payee_id: int
    payee_name: str
    amount: float