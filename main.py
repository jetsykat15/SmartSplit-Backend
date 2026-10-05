from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartSplit - Expense Manager API")

# 1. Enable CORS for React Frontend (runs on localhost:5173 / localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=FileResponse)
def read_root():
    return FileResponse("templates/index.html")

# ==================== USER ROUTES ====================

@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(name=user.name, email=user.email)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

# ==================== EXPENSE ROUTES ====================

@app.post("/expenses/", response_model=schemas.ExpenseResponse)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    payer = db.query(models.User).filter(models.User.id == expense.payer_id).first()
    if not payer:
        raise HTTPException(status_code=404, detail="Payer user not found")

    new_expense = models.Expense(
        title=expense.title,
        amount=expense.amount,
        category=expense.category or "General",
        payer_id=expense.payer_id
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    all_users = db.query(models.User).all()
    if not all_users:
        return new_expense

    # Handle Custom Splits vs Default Equal Split
    if expense.splits and len(expense.splits) > 0:
        for split_data in expense.splits:
            split_record = models.ExpenseSplit(
                expense_id=new_expense.id,
                user_id=split_data.user_id,
                amount_owed=split_data.amount_owed
            )
            db.add(split_record)
    else:
        equal_share = expense.amount / len(all_users)
        for u in all_users:
            split_record = models.ExpenseSplit(
                expense_id=new_expense.id,
                user_id=u.id,
                amount_owed=equal_share
            )
            db.add(split_record)

    db.commit()
    db.refresh(new_expense)
    return new_expense

@app.get("/expenses/", response_model=List[schemas.ExpenseResponse])
def get_all_expenses(db: Session = Depends(get_db)):
    return db.query(models.Expense).all()

# ==================== SETTLEMENT & BALANCE ROUTES ====================

@app.get("/settlements/balances/", response_model=List[schemas.BalanceResponse])
def calculate_balances(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    if not users:
        return []

    net_balances = {u.id: 0.0 for u in users}

    # Add paid amounts
    for u in users:
        for exp in u.expenses_paid:
            net_balances[u.id] += exp.amount

    # Subtract owed amounts from splits
    splits = db.query(models.ExpenseSplit).all()
    for s in splits:
        if s.user_id in net_balances:
            net_balances[s.user_id] -= s.amount_owed

    result = []
    for u in users:
        result.append(
            schemas.BalanceResponse(
                user_id=u.id,
                name=u.name,
                net_balance=round(net_balances[u.id], 2)
            )
        )
    return result

@app.get("/settlements/simplify/", response_model=List[schemas.SettlementResponse])
def simplify_debts(db: Session = Depends(get_db)):
    balances_data = calculate_balances(db)
    if not balances_data:
        return []

    debtors = []
    creditors = []

    for b in balances_data:
        if b.net_balance < -0.01:
            debtors.append({'id': b.user_id, 'name': b.name, 'amount': -b.net_balance})
        elif b.net_balance > 0.01:
            creditors.append({'id': b.user_id, 'name': b.name, 'amount': b.net_balance})

    settlements = []
    i = 0
    j = 0

    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]

        settle_amount = min(debtor['amount'], creditor['amount'])
        
        settlements.append(
            schemas.SettlementResponse(
                payer_id=debtor['id'],
                payer_name=debtor['name'],
                payee_id=creditor['id'],
                payee_name=creditor['name'],
                amount=round(settle_amount, 2)
            )
        )

        debtor['amount'] -= settle_amount
        creditor['amount'] -= settle_amount

        if debtor['amount'] < 0.01:
            i += 1
        if creditor['amount'] < 0.01:
            j += 1

    return settlements
@app.post("/settlements/record/")
def record_settlement(payer_id: int, payee_id: int, amount: float, db: Session = Depends(get_db)):
    # Record a settlement payment as an expense where payer pays payee directly
    settlement_expense = models.Expense(
        title=f"Settlement: User {payer_id} -> User {payee_id}",
        amount=amount,
        category="Settlement",
        payer_id=payer_id
    )
    db.add(settlement_expense)
    db.commit()
    db.refresh(settlement_expense)
    
    # Give all credit of this payment directly to payee
    split = models.ExpenseSplit(
        expense_id=settlement_expense.id,
        user_id=payee_id,
        amount=amount
    )
    db.add(split)
    db.commit()
    
    return {"message": "Settlement recorded successfully"}